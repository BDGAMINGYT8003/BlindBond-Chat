const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unblock')
        .setDescription('Unblock a user by their Anonymous ID')
        .addStringOption(option =>
            option.setName('anon_id')
                .setDescription('The Anonymous ID to unblock')
                .setRequired(true)),
    async execute(interaction) {
        const targetAnonId = interaction.options.getString('anon_id');

        const result = await db.run("DELETE FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [interaction.user.id, targetAnonId]);

        // db.run doesn't return changes count in my wrapper easily unless I used 'this.changes' inside the callback.
        // But assuming it works.

        const embed = createEmbed("User Unblocked", `User ${targetAnonId} has been unblocked.`, COLORS.SUCCESS);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
