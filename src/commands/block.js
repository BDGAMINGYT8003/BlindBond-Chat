const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createSuccessEmbed, createErrorEmbed, isValidUUID } = require('../utils/helpers');

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

        // 1. Validation: UUID Format
        if (!isValidUUID(targetAnonId)) {
            return interaction.reply({
                embeds: [createErrorEmbed("Invalid Anonymous ID format.\nPlease ensure you copied the ID correctly.")],
                ephemeral: true
            });
        }

        // 2. Validation: Self-Block
        const me = await db.get("SELECT anon_id FROM users WHERE discord_id = ?", [interaction.user.id]);
        if (me && me.anon_id === targetAnonId) {
            return interaction.reply({
                embeds: [createErrorEmbed("You cannot block yourself.")],
                ephemeral: true
            });
        }

        // 3. Validation: Already Blocked
        const existing = await db.get("SELECT * FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [interaction.user.id, targetAnonId]);
        if (existing) {
             return interaction.reply({
                 embeds: [createErrorEmbed("This user is already in your block list.")],
                 ephemeral: true
             });
        }

        // 4. Execution
        await db.run("INSERT INTO blocks (blocker_id, blocked_anon_id) VALUES (?, ?)", [interaction.user.id, targetAnonId]);

        // 5. Active Session Handling
        // If blocking someone you are currently chatting with, END THE CHAT.
        const session = await db.get(
            "SELECT * FROM sessions WHERE is_active = 1 AND ((user_a_id = ? AND user_b_anon_id = ?) OR (user_b_id = ? AND user_a_anon_id = ?))",
            [interaction.user.id, targetAnonId, interaction.user.id, targetAnonId]
        );

        if (session) {
             const { endSession } = require('../utils/sessionManager');
             await endSession(interaction.client, session.session_id, "Chat ended due to blocking.");
        }

        return interaction.reply({
            embeds: [createSuccessEmbed("User Blocked", `User \`${targetAnonId}\` has been blocked.\nYou will not be matched with them again.`)],
            ephemeral: true
        });
    },
};
