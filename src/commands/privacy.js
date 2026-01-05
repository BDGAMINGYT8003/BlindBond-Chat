const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS, ICONS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('privacy')
        .setDescription('View the Privacy Policy'),
    async execute(interaction) {
        const policy = `
**Data Storage Policy**
BlindBond Chat is committed to protecting your privacy and anonymity.

**What we store:**
• **Discord ID:** To manage your account and send DMs.
• **Anonymous ID:** To mask your identity while allowing blocks/reports.
• **Demographics:** Gender, Age, Location (as provided) for matchmaking only.
• **Preferences:** Who you want to match with and your interests.
• **Block List:** IDs of users you have blocked.
• **Reports:** If you report someone, reason and chat context are stored for moderation.

**What we DO NOT store:**
• **Chat History:** Messages are relayed in real-time. We do not store logs of your conversations (except snippets attached to reports).
• **Real Identity:** We never reveal your username to partners unless you explicitly use the \`/share\` command.

**Your Rights:**
You may request deletion of your data by contacting the bot administrator.
        `;

        const embed = createEmbed(`${ICONS.BLOCK} Privacy Policy`, policy, COLORS.INFO);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
