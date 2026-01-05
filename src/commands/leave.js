const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the matchmaking queue'),
    async execute(interaction) {
        // 1. Check if in Active Chat (Safety Railguard)
        // Leaving queue while in chat makes no sense, but user might be confused.
        const activeSession = await db.get(
            "SELECT session_id FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1",
            [interaction.user.id, interaction.user.id]
        );

        if (activeSession) {
            return interaction.reply({
                embeds: [createErrorEmbed("You are currently in an active chat session.\nTo leave the chat, please use `/end`.")],
                ephemeral: true
            });
        }

        // 2. Check if actually in Queue
        const inQueue = await db.get("SELECT * FROM queue WHERE discord_id = ?", [interaction.user.id]);

        if (!inQueue) {
             return interaction.reply({
                embeds: [createInfoEmbed("Not in Queue", "You are not currently in the matchmaking queue.")],
                ephemeral: true
            });
        }

        // 3. Remove
        await db.run("DELETE FROM queue WHERE discord_id = ?", [interaction.user.id]);

        return interaction.reply({
            embeds: [createSuccessEmbed("Queue Left", "You have been removed from the matchmaking queue.")],
            ephemeral: true
        });
    },
};
