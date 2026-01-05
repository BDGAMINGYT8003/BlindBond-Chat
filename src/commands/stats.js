const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS, ICONS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View BlindBond statistics'),
    async execute(interaction) {
        // Fetch Stats
        const queueCount = await db.get("SELECT COUNT(*) as count FROM queue");
        const sessionCount = await db.get("SELECT COUNT(*) as count FROM sessions WHERE is_active = 1");
        const totalUsers = await db.get("SELECT COUNT(*) as count FROM users");

        // Calculate Wait Time
        const queue = await db.all("SELECT join_time FROM queue");
        let avgWait = 0;
        if (queue.length > 0) {
            const now = Date.now();
            const totalWait = queue.reduce((acc, q) => acc + (now - q.join_time), 0);
            avgWait = Math.round((totalWait / queue.length) / 1000);
        }

        const embed = createEmbed(
            "BlindBond Statistics",
            "Current system metrics and activity.",
            COLORS.MATCH
        );

        embed.addFields(
            { name: `${ICONS.MATCH} Active Chats`, value: `${sessionCount.count}`, inline: true },
            { name: `${ICONS.SEARCH} Users in Queue`, value: `${queueCount.count}`, inline: true },
            { name: '👥 Total Users', value: `${totalUsers.count}`, inline: true },
            { name: '⏱️ Avg Wait Time', value: `${avgWait}s`, inline: true }
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
