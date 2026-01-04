const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('new')
        .setDescription('Start searching for a chat partner'),
    async execute(interaction) {
        // Check if user exists
        let user = await db.get("SELECT * FROM users WHERE discord_id = ?", [interaction.user.id]);

        // Check if banned
        if (user && user.is_banned) {
             if (user.ban_expiration && Date.now() > user.ban_expiration) {
                 // Ban expired
                 await db.run("UPDATE users SET is_banned = 0, warnings = 0, ban_expiration = NULL WHERE discord_id = ?", [interaction.user.id]);
                 user.is_banned = 0; // Update local obj for flow
             } else {
                 const expiryDate = user.ban_expiration ? `<t:${Math.floor(user.ban_expiration / 1000)}:R>` : "Permanently";
                 const embed = createEmbed("Banned", `You are currently banned from using this service.\nExpires: ${expiryDate}`, COLORS.ERROR);
                 return interaction.reply({ embeds: [embed], ephemeral: true });
             }
        }

        // Onboarding Check
        if (!user || !user.is_onboarded) {
            if (!user) {
                // Create minimal user record to start
                const { generateAnonId } = require('../utils/helpers');
                const anonId = generateAnonId();
                const now = Date.now();
                await db.run(
                    "INSERT INTO users (discord_id, anon_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    [interaction.user.id, anonId, now, now]
                );
            }

            const embed = createEmbed(
                "Welcome to BlindBond Chat!",
                "To ensure a safe and enjoyable experience, please agree to our rules and set up your profile.\n\n**Rules:**\n1. No harassment or hate speech.\n2. Do not share personal identifiable information (PII).\n3. Be respectful.",
                COLORS.INFO
            );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('agree_rules')
                        .setLabel('I Understand and Agree')
                        .setStyle(ButtonStyle.Success),
                );

            return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // Check if already in a session
        const activeSession = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [interaction.user.id, interaction.user.id]);
        if (activeSession) {
            return interaction.reply({ content: "You are already in an active chat! Use `/end` to leave it before starting a new one.", ephemeral: true });
        }

        // Check if already in queue
        const inQueue = await db.get("SELECT * FROM queue WHERE discord_id = ?", [interaction.user.id]);
        if (inQueue) {
            return interaction.reply({ content: "You are already in the queue! Please wait...", ephemeral: true });
        }

        // Add to queue
        const now = Date.now();
        await db.run("INSERT INTO queue (discord_id, anon_id, join_time) VALUES (?, ?, ?)", [interaction.user.id, user.anon_id, now]);

        const embed = createEmbed("Searching...", "You have joined the matchmaking queue. We will notify you when a partner is found.", COLORS.INFO);
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('leave_queue')
                    .setLabel('Leave Queue')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        // Trigger Matchmaking (This would typically be an event or interval, but we can trigger a check here)
        // For simplicity, we'll let the background task handle it, or call a matchmaker function directly.
        const matchmaker = require('../utils/matchmaker');
        matchmaker.attemptMatch(interaction.client);
    },
};
