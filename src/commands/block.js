const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('block')
        .setDescription('Block a user by their Anonymous ID')
        .addStringOption(option =>
            option.setName('anon_id')
                .setDescription('The Anonymous ID to block')
                .setRequired(true)),
    async execute(interaction) {
        const targetAnonId = interaction.options.getString('anon_id');

        // Validation: Can't block yourself
        const me = await db.get("SELECT anon_id FROM users WHERE discord_id = ?", [interaction.user.id]);
        if (me && me.anon_id === targetAnonId) {
            return interaction.reply({ content: "You cannot block yourself.", ephemeral: true });
        }

        // Check if already blocked
        const existing = await db.get("SELECT * FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [interaction.user.id, targetAnonId]);
        if (existing) {
             return interaction.reply({ content: "User is already blocked.", ephemeral: true });
        }

        await db.run("INSERT INTO blocks (blocker_id, blocked_anon_id) VALUES (?, ?)", [interaction.user.id, targetAnonId]);

        // If in active chat with this user, end it?
        // Logic requires checking active sessions.
        // For simplicity, we assume this command is used after a chat or if they know the ID.
        // But if they ARE in a chat, we should probably end it.

        // Check active session with this anon id
        const session = await db.get(
            "SELECT * FROM sessions WHERE is_active = 1 AND ((user_a_id = ? AND user_b_anon_id = ?) OR (user_b_id = ? AND user_a_anon_id = ?))",
            [interaction.user.id, targetAnonId, interaction.user.id, targetAnonId]
        );

        if (session) {
             // End chat
             await db.run("UPDATE sessions SET is_active = 0 WHERE session_id = ?", [session.session_id]);
             await interaction.user.send("Active chat with this user has been ended due to blocking.");
             // We should notify the other user too that chat ended, but not necessarily that they were blocked.
             const partnerId = session.user_a_id === interaction.user.id ? session.user_b_id : session.user_a_id;
             try {
                 const partner = await interaction.client.users.fetch(partnerId);
                 await partner.send({ embeds: [createEmbed("Chat Ended", "The chat was ended.", COLORS.ERROR)] });
             } catch (e) {}
        }

        const embed = createEmbed("User Blocked", `User ${targetAnonId} has been blocked. You will not match with them again.`, COLORS.SUCCESS);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
