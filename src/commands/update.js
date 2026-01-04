const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Update your profile information'),
    async execute(interaction) {
        const user = await db.get("SELECT * FROM users WHERE discord_id = ?", [interaction.user.id]);
        if (!user) {
            return interaction.reply({ content: "You don't have a profile yet. Use `/new` to create one.", ephemeral: true });
        }

        const embed = createEmbed("Update Profile",
            `**Gender:** ${user.gender}\n**Age:** ${user.age}\n**Region:** ${user.region}\n**Interested In:** ${user.partner_pref}\n**Interests:** ${user.interests}`,
            COLORS.INFO
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('update_menu')
                    .setPlaceholder('Select what to update')
                    .addOptions(
                        { label: 'Gender', value: 'update_gender' },
                        { label: 'Age', value: 'update_age' },
                        { label: 'Region', value: 'update_region' },
                        { label: 'Partner Preference', value: 'update_pref' },
                        { label: 'Interests', value: 'update_interests' },
                    ),
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
