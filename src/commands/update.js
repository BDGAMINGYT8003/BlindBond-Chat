const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');
const { createEmbed, createErrorEmbed, COLORS } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Update your profile information'),
    async execute(interaction) {
        // 1. Check Profile Existence
        const user = await db.get("SELECT * FROM users WHERE discord_id = ?", [interaction.user.id]);
        if (!user) {
            return interaction.reply({
                embeds: [createErrorEmbed("You don't have a profile yet.\nUse `/new` to create one.")],
                ephemeral: true
            });
        }

        // 2. Display Current Profile
        const embed = createEmbed(
            "Update Profile",
            "Select a field below to update your information.",
            COLORS.INFO
        );

        embed.addFields(
            { name: 'Gender', value: user.gender || 'Not Set', inline: true },
            { name: 'Age', value: user.age ? user.age.toString() : 'Not Set', inline: true },
            { name: 'Region', value: user.region || 'Not Set', inline: true },
            { name: 'Interested In', value: user.partner_pref || 'Not Set', inline: true },
            { name: 'Interests', value: user.interests ? user.interests.replace(/,/g, ', ') : 'None', inline: false }
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('update_menu')
                    .setPlaceholder('Select what to update')
                    .addOptions(
                        { label: 'Gender', value: 'update_gender', description: 'Update your gender identity' },
                        { label: 'Age', value: 'update_age', description: 'Update your age' },
                        { label: 'Region', value: 'update_region', description: 'Update your location region' },
                        { label: 'Partner Preference', value: 'update_pref', description: 'Update who you want to match with' },
                        { label: 'Interests', value: 'update_interests', description: 'Update your interest tags' },
                    ),
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
