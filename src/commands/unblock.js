const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createSuccessEmbed, createErrorEmbed, isValidUUID } = require('../utils/helpers');

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

        // 1. Validation
        if (!isValidUUID(targetAnonId)) {
             return interaction.reply({
                embeds: [createErrorEmbed("Invalid Anonymous ID format.")],
                ephemeral: true
            });
        }

        // 2. Execution
        // We use run with logic to check if anything was actually deleted?
        // SQLite 'run' doesn't return changes easily without context.
        // We'll just check first.
        const existing = await db.get("SELECT * FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [interaction.user.id, targetAnonId]);

        if (!existing) {
             return interaction.reply({
                embeds: [createErrorEmbed("This user is not in your block list.")],
                ephemeral: true
            });
        }

        await db.run("DELETE FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [interaction.user.id, targetAnonId]);

        return interaction.reply({
            embeds: [createSuccessEmbed("User Unblocked", `User \`${targetAnonId}\` has been unblocked.`)],
            ephemeral: true
        });
    },
};
