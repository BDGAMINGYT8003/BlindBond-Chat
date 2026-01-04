const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('privacy')
        .setDescription('View the Privacy Policy'),
    async execute(interaction) {
        const policy = `
**Data Storage Policy**
BlindBond Chat is committed to protecting your privacy.

**What we store:**
• **Discord ID:** To send you messages and manage your account.
• **Anonymous ID:** To mask your identity and manage blocks/reports.
• **Demographics:** Gender, Age, Location (as provided by you) for matchmaking.
• **Preferences:** Who you want to match with and your interests.
• **Block List:** IDs of users you have blocked.
• **Reports:** If you report someone, we store the reason and a snippet of the chat.

**What we DO NOT store:**
• **Chat History:** Messages are relayed in real-time and not permanently stored, except for snippets attached to reports.
• **Real Identity:** We never reveal your username to partners unless you explicitly agree to "Connect" or use the "/share" command.

By using this service, you agree to these terms.
        `;
        const embed = createEmbed("Privacy Policy", policy, COLORS.INFO);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
