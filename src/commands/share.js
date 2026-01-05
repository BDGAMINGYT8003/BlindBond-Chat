const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, createErrorEmbed, COLORS } = require('../utils/helpers');
const { canShare } = require('../utils/shareManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('share')
        .setDescription('Share your real identity with your chat partner'),
    async execute(interaction) {
        // 1. Check Active Session
        const session = await db.get(
            "SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1",
            [interaction.user.id, interaction.user.id]
        );

        if (!session) {
            return interaction.reply({
                embeds: [createErrorEmbed("You are not currently in an active chat session.")],
                ephemeral: true
            });
        }

        // 2. Check Permissions (Limits & Cooldowns)
        const check = await canShare(session.session_id, interaction.user.id);
        if (!check.allowed) {
            return interaction.reply({
                embeds: [createErrorEmbed(check.reason)],
                ephemeral: true
            });
        }

        // 3. Prompt
        const embed = createEmbed(
            "Share Identity?",
            "Are you sure you want to reveal your real Discord username to your partner?\n\n**This cannot be undone.**",
            COLORS.WARNING
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_share_${session.session_id}`)
                    .setLabel('Yes, Reveal Identity')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_share')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },
};
