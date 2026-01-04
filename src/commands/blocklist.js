const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blocklist')
        .setDescription('View your list of blocked users'),
    async execute(interaction) {
        const blocks = await db.all("SELECT blocked_anon_id FROM blocks WHERE blocker_id = ?", [interaction.user.id]);

        if (blocks.length === 0) {
            return interaction.reply({ content: "You have not blocked anyone.", ephemeral: true });
        }

        const list = blocks.map(b => `• ${b.blocked_anon_id}`).join('\n');
        // Pagination logic omitted for brevity, but simple list works for small counts.
        const embed = createEmbed("Blocked Users", list.substring(0, 4000), COLORS.INFO);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
