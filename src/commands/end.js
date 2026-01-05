const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createErrorEmbed } = require('../utils/helpers');
const { endSession } = require('../utils/sessionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('end')
        .setDescription('End the current active chat session'),
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

        // 2. Execute End
        await interaction.reply({ content: "Ending chat...", ephemeral: true });
        await endSession(interaction.client, session.session_id, "Chat ended by user.");
    },
};
