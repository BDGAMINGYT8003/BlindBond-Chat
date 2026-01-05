const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../db');
const { createInfoEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blocklist')
        .setDescription('View your list of blocked users'),
    async execute(interaction) {
        const blocks = await db.all("SELECT blocked_anon_id FROM blocks WHERE blocker_id = ?", [interaction.user.id]);

        if (blocks.length === 0) {
            return interaction.reply({
                embeds: [createInfoEmbed("Block List", "You have not blocked anyone.")],
                ephemeral: true
            });
        }

        // Pagination Logic
        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(blocks.length / ITEMS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const slice = blocks.slice(start, end);

            const list = slice.map(b => `• \`${b.blocked_anon_id}\``).join('\n');

            return createInfoEmbed(
                "Blocked Users",
                `${list}\n\nPage ${page + 1}/${totalPages}`
            );
        };

        const generateRow = (page) => {
            const row = new ActionRowBuilder();

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );
            return row;
        };

        const response = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: totalPages > 1 ? [generateRow(currentPage)] : [],
            ephemeral: true,
            fetchReply: true
        });

        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'prev') {
                    currentPage = Math.max(0, currentPage - 1);
                } else if (i.customId === 'next') {
                    currentPage = Math.min(totalPages - 1, currentPage + 1);
                }
                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [generateRow(currentPage)]
                });
            });

            collector.on('end', () => {
                // Disable buttons after timeout
                 const disabledRow = generateRow(currentPage);
                 disabledRow.components.forEach(b => b.setDisabled(true));
                 interaction.editReply({ components: [disabledRow] }).catch(() => {});
            });
        }
    },
};
