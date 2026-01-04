const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../db');
const { generateAnonId, createEmbed, COLORS } = require('../utils/helpers');

// Helper to check user status
async function getUser(discordId) {
    return await db.get("SELECT * FROM users WHERE discord_id = ?", [discordId]);
}

async function createUser(discordId) {
    const anonId = generateAnonId();
    const now = Date.now();
    await db.run(
        "INSERT INTO users (discord_id, anon_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [discordId, anonId, now, now]
    );
    return await getUser(discordId);
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        }

        else if (interaction.isButton()) {
            // Handle Onboarding Buttons
            if (interaction.customId === 'agree_rules') {
                // Start Wizard - Step 1: Gender
                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_gender')
                            .setPlaceholder('Select your gender')
                            .addOptions(
                                { label: 'Male', value: 'Male' },
                                { label: 'Female', value: 'Female' },
                                { label: 'Non-binary', value: 'Non-binary' },
                                { label: 'Other', value: 'Other' },
                            ),
                    );

                await interaction.reply({ content: 'Step 1/5: What is your gender?', components: [row], ephemeral: true });
            }
        }

        else if (interaction.isStringSelectMenu()) {
            // Handle Update Menu
            if (interaction.customId === 'update_menu') {
                const selection = interaction.values[0];
                if (selection === 'update_gender') {
                     const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId('select_gender').setPlaceholder('Select your gender')
                            .addOptions({ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Non-binary', value: 'Non-binary' }, { label: 'Other', value: 'Other' })
                     );
                     await interaction.reply({ content: 'Update Gender:', components: [row], ephemeral: true });
                } else if (selection === 'update_age') {
                     const modal = new ModalBuilder().setCustomId('modal_age').setTitle('Update Age');
                     const ageInput = new TextInputBuilder().setCustomId('ageInput').setLabel("Your Age (13-99)").setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(2).setRequired(true);
                     modal.addComponents(new ActionRowBuilder().addComponents(ageInput));
                     await interaction.showModal(modal);
                } else if (selection === 'update_region') {
                     const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId('select_region').setPlaceholder('Select your region')
                             .addOptions({ label: 'North America', value: 'NA' }, { label: 'Europe', value: 'EU' }, { label: 'Asia', value: 'Asia' }, { label: 'South America', value: 'SA' }, { label: 'Oceania', value: 'OC' }, { label: 'Africa', value: 'AF' })
                     );
                     await interaction.reply({ content: 'Update Region:', components: [row], ephemeral: true });
                } else if (selection === 'update_pref') {
                     const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId('select_partner_pref').setPlaceholder('Partner Preference?')
                             .addOptions({ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Non-binary', value: 'Non-binary' }, { label: 'Anyone', value: 'Anyone' })
                     );
                     await interaction.reply({ content: 'Update Partner Preference:', components: [row], ephemeral: true });
                } else if (selection === 'update_interests') {
                     const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId('select_interests').setPlaceholder('Select up to 5 interests').setMinValues(1).setMaxValues(5)
                             .addOptions({ label: 'Gaming', value: 'Gaming' }, { label: 'Music', value: 'Music' }, { label: 'Tech', value: 'Tech' }, { label: 'Movies', value: 'Movies' }, { label: 'Sports', value: 'Sports' }, { label: 'Art', value: 'Art' }, { label: 'Reading', value: 'Reading' }, { label: 'Travel', value: 'Travel' })
                     );
                     await interaction.reply({ content: 'Update Interests:', components: [row], ephemeral: true });
                }
                return;
            }

            // Handle Onboarding/Update Select Menus
            const user = await getUser(interaction.user.id);
            const isOnboarded = user && user.is_onboarded;

            if (interaction.customId === 'select_gender') {
                const gender = interaction.values[0];
                await db.run("UPDATE users SET gender = ? WHERE discord_id = ?", [gender, interaction.user.id]);

                if (isOnboarded) {
                    await interaction.reply({ content: "Gender updated.", ephemeral: true });
                } else {
                    // Step 2: Age (Modal)
                    const modal = new ModalBuilder().setCustomId('modal_age').setTitle('Step 2/5: How old are you?');
                    const ageInput = new TextInputBuilder().setCustomId('ageInput').setLabel("Your Age (13-99)").setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(2).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(ageInput));
                    await interaction.showModal(modal);
                }
            }

            else if (interaction.customId === 'select_region') {
                const region = interaction.values[0];
                await db.run("UPDATE users SET region = ? WHERE discord_id = ?", [region, interaction.user.id]);

                if (isOnboarded) {
                     await interaction.reply({ content: "Region updated.", ephemeral: true });
                } else {
                    // Step 4: Partner Preference
                    const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder().setCustomId('select_partner_pref').setPlaceholder('Who are you interested in chatting with?')
                                .addOptions({ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Non-binary', value: 'Non-binary' }, { label: 'Anyone', value: 'Anyone' })
                        );
                    await interaction.reply({ content: 'Step 4/5: Partner Preference?', components: [row], ephemeral: true });
                }
            }

            else if (interaction.customId === 'select_partner_pref') {
                const pref = interaction.values[0];
                await db.run("UPDATE users SET partner_pref = ? WHERE discord_id = ?", [pref, interaction.user.id]);

                if (isOnboarded) {
                    await interaction.reply({ content: "Preference updated.", ephemeral: true });
                } else {
                    // Step 5: Interests
                    const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder().setCustomId('select_interests').setPlaceholder('Select up to 5 interests').setMinValues(1).setMaxValues(5)
                                .addOptions({ label: 'Gaming', value: 'Gaming' }, { label: 'Music', value: 'Music' }, { label: 'Tech', value: 'Tech' }, { label: 'Movies', value: 'Movies' }, { label: 'Sports', value: 'Sports' }, { label: 'Art', value: 'Art' }, { label: 'Reading', value: 'Reading' }, { label: 'Travel', value: 'Travel' })
                        );
                    await interaction.reply({ content: 'Step 5/5: Select your interests', components: [row], ephemeral: true });
                }
            }

            else if (interaction.customId === 'select_interests') {
                const interests = interaction.values.join(',');
                await db.run("UPDATE users SET interests = ?, is_onboarded = 1 WHERE discord_id = ?", [interests, interaction.user.id]);

                const msg = isOnboarded ? "Interests updated." : "Profile Setup Complete! You are all set! Use `/new` to start searching for a chat partner.";
                const embed = createEmbed(isOnboarded ? "Updated" : "Setup Complete", msg, COLORS.SUCCESS);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_age') {
                const age = parseInt(interaction.fields.getTextInputValue('ageInput'));
                if (isNaN(age) || age < 13 || age > 99) {
                    await interaction.reply({ content: 'Invalid age. Please enter a number between 13 and 99. Run `/update` to retry.', ephemeral: true });
                    return;
                }

                await db.run("UPDATE users SET age = ? WHERE discord_id = ?", [age, interaction.user.id]);

                const user = await getUser(interaction.user.id);
                if (user && user.is_onboarded) {
                     await interaction.reply({ content: "Age updated.", ephemeral: true });
                } else {
                    // Step 3: Location
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('select_region')
                                .setPlaceholder('Select your region')
                                .addOptions(
                                    { label: 'North America', value: 'NA' },
                                    { label: 'Europe', value: 'EU' },
                                    { label: 'Asia', value: 'Asia' },
                                    { label: 'South America', value: 'SA' },
                                    { label: 'Oceania', value: 'OC' },
                                    { label: 'Africa', value: 'AF' },
                                ),
                        );
                    await interaction.reply({ content: 'Step 3/5: Where are you located?', components: [row], ephemeral: true });
                }
            }
        }
    },
};
