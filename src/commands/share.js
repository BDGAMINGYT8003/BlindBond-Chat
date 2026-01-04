const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');
const { canShare } = require('../utils/shareManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('share')
        .setDescription('Share your real identity with your chat partner'),
    async execute(interaction) {
        const session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [interaction.user.id, interaction.user.id]);

        if (!session) {
            return interaction.reply({ content: "You are not in an active chat.", ephemeral: true });
        }

        // Check Logic
        const check = await canShare(session.session_id, interaction.user.id);
        if (!check.allowed) {
            return interaction.reply({ content: check.reason, ephemeral: true });
        }

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
            content: "Are you sure you want to reveal your real Discord username to your partner? This cannot be undone.",
            components: [row],
            ephemeral: true
        });
    },
};
