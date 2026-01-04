const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

// We need to access the endSession helper, maybe refactor it to a utility file?
// For now, I'll copy the logic but ideally it should be shared.
// Let's create `src/utils/sessionManager.js` in the next step to avoid duplication,
// but for now I will implement basic logic.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('end')
        .setDescription('End the current active chat session'),
    async execute(interaction) {
        const session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [interaction.user.id, interaction.user.id]);

        if (!session) {
            return interaction.reply({ content: "You are not in an active chat.", ephemeral: true });
        }

        // We can trigger the button handler logic by emitting an event or just updating DB and notifying.
        // I'll update DB here and notify.

        const { endSession } = require('../utils/sessionManager');
        await interaction.reply({ content: "Ending chat...", ephemeral: true });
        await endSession(interaction.client, session.session_id, "Chat ended by command.");
    },
};
