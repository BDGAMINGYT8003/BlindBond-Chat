const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, createErrorEmbed, createInfoEmbed, COLORS, generateAnonId } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('new')
        .setDescription('Start searching for a chat partner'),
    async execute(interaction) {
        // 1. Check for Active Session
        const activeSession = await db.get(
            "SELECT session_id FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1",
            [interaction.user.id, interaction.user.id]
        );

        if (activeSession) {
             return interaction.reply({
                 embeds: [createErrorEmbed("You are already in an active chat!\nUse `/end` to leave it before starting a new one.")],
                 ephemeral: true
             });
        }

        // 2. Check for Queue Presence
        const inQueue = await db.get("SELECT discord_id FROM queue WHERE discord_id = ?", [interaction.user.id]);
        if (inQueue) {
            return interaction.reply({
                embeds: [createInfoEmbed("Already Searching", "You are already in the matchmaking queue.\nPlease wait while we find you a partner.")],
                ephemeral: true
            });
        }

        // 3. User & Ban Check
        let user = await db.get("SELECT * FROM users WHERE discord_id = ?", [interaction.user.id]);

        // Handle Bans
        if (user && user.is_banned) {
             if (user.ban_expiration && Date.now() > user.ban_expiration) {
                 // Unban Logic
                 await db.run("UPDATE users SET is_banned = 0, warnings = 0, ban_expiration = NULL WHERE discord_id = ?", [interaction.user.id]);
                 user.is_banned = 0;
             } else {
                 const expiryDate = user.ban_expiration ? `<t:${Math.floor(user.ban_expiration / 1000)}:R>` : "Permanently";
                 return interaction.reply({
                     embeds: [createErrorEmbed(`You are banned from BlindBond.\nExpires: ${expiryDate}`)],
                     ephemeral: true
                 });
             }
        }

        // 4. Onboarding Logic
        if (!user || !user.is_onboarded) {
            if (!user) {
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

        // 5. Join Queue
        const now = Date.now();
        await db.run("INSERT INTO queue (discord_id, anon_id, join_time) VALUES (?, ?, ?)", [interaction.user.id, user.anon_id, now]);

        const embed = createEmbed(
            "Searching...",
            "You have joined the matchmaking queue.\nWe will notify you when a partner is found.",
            COLORS.INFO,
            "Tip: Use /leave if you want to stop searching."
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('leave_queue')
                    .setLabel('Leave Queue')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        // Trigger Matchmaking
        const matchmaker = require('../utils/matchmaker');
        matchmaker.attemptMatch(interaction.client);
    },
};
