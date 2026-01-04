const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View BlindBond statistics'),
    async execute(interaction) {
        const queueCount = await db.get("SELECT COUNT(*) as count FROM queue");
        const sessionCount = await db.get("SELECT COUNT(*) as count FROM sessions WHERE is_active = 1");
        const totalUsers = await db.get("SELECT COUNT(*) as count FROM users");

        // Average wait time
        // This is harder to calculate without storing historical wait times.
        // We can approximate by looking at current queue wait times.
        const queue = await db.all("SELECT join_time FROM queue");
        let avgWait = 0;
        if (queue.length > 0) {
            const now = Date.now();
            const totalWait = queue.reduce((acc, q) => acc + (now - q.join_time), 0);
            avgWait = Math.round((totalWait / queue.length) / 1000);
        }

        const embed = createEmbed("BlindBond Statistics",
            `**Active Chats:** ${sessionCount.count}\n**Users in Queue:** ${queueCount.count}\n**Total Users:** ${totalUsers.count}\n**Avg. Current Wait:** ${avgWait}s`,
            COLORS.MATCH
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
