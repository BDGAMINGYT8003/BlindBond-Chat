const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the matchmaking queue'),
    async execute(interaction) {
        await db.run("DELETE FROM queue WHERE discord_id = ?", [interaction.user.id]);

        const embed = createEmbed("Queue Left", "You have been removed from the matchmaking queue.", COLORS.INFO);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
