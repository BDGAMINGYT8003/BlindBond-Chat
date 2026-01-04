const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../db');
const { createEmbed, COLORS } = require('../utils/helpers');

const { endSession } = require('../utils/sessionManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // Button Handling
        if (interaction.isButton()) {
            if (interaction.customId === 'end_chat') {
                const session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [interaction.user.id, interaction.user.id]);
                if (session) {
                    await interaction.reply({ content: "Ending chat...", ephemeral: true });
                    await endSession(interaction.client, session.session_id);
                } else {
                    await interaction.reply({ content: "No active chat found.", ephemeral: true });
                }
            }

            else if (interaction.customId === 'cancel_share') {
                await interaction.update({ content: "Share cancelled.", components: [] });
            }

            else if (interaction.customId.startsWith('confirm_share_')) {
                const sessionId = interaction.customId.split('_')[2];
                const session = await db.get("SELECT * FROM sessions WHERE session_id = ? AND is_active = 1", [sessionId]);

                if (!session) {
                    return interaction.update({ content: "Chat ended.", components: [] });
                }

                const isUserA = session.user_a_id === interaction.user.id;
                const partnerId = isUserA ? session.user_b_id : session.user_a_id;

                try {
                    // Double check before sending
                    const { canShare, recordShare } = require('../utils/shareManager');
                    const check = await canShare(session.session_id, interaction.user.id);
                    if (!check.allowed) {
                         return interaction.update({ content: check.reason, components: [] });
                    }

                    const partner = await interaction.client.users.fetch(partnerId);
                    const embed = createEmbed("Identity Revealed!", `Your partner has revealed their identity:\n**${interaction.user.tag}**`, COLORS.WARNING);
                    await partner.send({ embeds: [embed] });
                    await interaction.update({ content: "Identity revealed to partner!", components: [] });

                    await recordShare(session.session_id, interaction.user.id);

                } catch (e) {
                    console.error(e);
                    await interaction.update({ content: "Failed to share identity.", components: [] });
                }
            }

            else if (interaction.customId === 'leave_queue') {
                await db.run("DELETE FROM queue WHERE discord_id = ?", [interaction.user.id]);
                await interaction.update({ content: "You have left the matchmaking queue.", embeds: [], components: [] });
            }

            else if (interaction.customId === 'broaden_search') {
                await db.run("UPDATE queue SET broadened_search = 1 WHERE discord_id = ?", [interaction.user.id]);
                await interaction.update({ content: "Search criteria broadened! We will try to find a match faster.", components: [] });
            }

            else if (interaction.customId === 'emergency_block') {
                // Block + Report + End
                const session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [interaction.user.id, interaction.user.id]);

                if (session) {
                    const isUserA = session.user_a_id === interaction.user.id;
                    const partnerId = isUserA ? session.user_b_id : session.user_a_id;
                    const partnerAnonId = isUserA ? session.user_b_anon_id : session.user_a_anon_id;

                    // 1. Block
                    await db.run("INSERT OR IGNORE INTO blocks (blocker_id, blocked_anon_id) VALUES (?, ?)", [interaction.user.id, partnerAnonId]);

                    // 2. Report (Auto)
                    await db.run(
                        "INSERT INTO reports (reporter_id, reported_anon_id, reason, description, created_at) VALUES (?, ?, ?, ?, ?)",
                        [interaction.user.id, partnerAnonId, "Emergency Block", "User initiated emergency block.", Date.now()]
                    );

                    // 3. End Session
                    await interaction.reply({ content: "Emergency Block activated. User blocked and reported. Ending chat...", ephemeral: true });
                    await endSession(interaction.client, session.session_id, "Chat ended due to Emergency Block.");
                } else {
                    await interaction.reply({ content: "No active chat found.", ephemeral: true });
                }
            }

            else if (interaction.customId === 'report_user') {
                // Show Report Modal
                const modal = new ModalBuilder()
                    .setCustomId('modal_report')
                    .setTitle('Report User');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('reportReason')
                    .setLabel("Reason")
                    .setStyle(TextInputStyle.Short);

                const descInput = new TextInputBuilder()
                    .setCustomId('reportDesc')
                    .setLabel("Description")
                    .setStyle(TextInputStyle.Paragraph);

                const row1 = new ActionRowBuilder().addComponents(reasonInput);
                const row2 = new ActionRowBuilder().addComponents(descInput);

                modal.addComponents(row1, row2);
                await interaction.showModal(modal);
            }

            // Feedback Handling
            else if (interaction.customId.startsWith('feedback_')) {
                const [_, type, sessionId] = interaction.customId.split('_');

                if (type === 'good') {
                    // Connect Prompt
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`connect_${sessionId}`).setLabel('Let\'s Connect!').setStyle(ButtonStyle.Primary)
                        );
                    await interaction.reply({ content: "Glad you enjoyed it! Do you want to reveal your identity to connect?", components: [row], ephemeral: true });
                } else if (type === 'bad') {
                    // Offer block/report
                     const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('report_user').setLabel('Report Last User').setStyle(ButtonStyle.Danger)
                        );
                    await interaction.reply({ content: "Sorry to hear that. Would you like to report the user?", components: [row], ephemeral: true });
                } else {
                    await interaction.reply({ content: "Thanks for your feedback!", ephemeral: true });
                }
            }

            else if (interaction.customId.startsWith('connect_')) {
                // Connect logic (Mutual Handshake) - This requires storing the request in DB usually.
                // For simplicity, we'll just check if the other person already clicked.
                // We'll use a temporary store or the session table via a new column or a separate table.
                // Let's assume a separate 'connections' table or similar, but since we didn't define it in schema,
                // we'll hack it by checking if a "connect_request" exists.
                // Actually we can create a simple in-memory map for this session since it's transient or add to DB.
                // Let's use DB 'reports' table or create a new 'connection_requests' table.

                const sessionId = interaction.customId.split('_')[1];
                const session = await db.get("SELECT * FROM sessions WHERE session_id = ?", [sessionId]);

                if (!session) return interaction.reply({ content: "Session expired.", ephemeral: true });

                const isUserA = session.user_a_id === interaction.user.id;
                const partnerId = isUserA ? session.user_b_id : session.user_a_id;

                await db.run("INSERT OR IGNORE INTO connection_requests (session_id, user_id) VALUES (?, ?)", [sessionId, interaction.user.id]);

                const partnerRequest = await db.get("SELECT * FROM connection_requests WHERE session_id = ? AND user_id = ?", [sessionId, partnerId]);

                if (partnerRequest) {
                    // Mutual Match!
                    const userAObj = await interaction.client.users.fetch(session.user_a_id);
                    const userBObj = await interaction.client.users.fetch(session.user_b_id);

                    // Send A's name to B
                    const embedForB = createEmbed("It's a Match!", `You both wanted to connect! Here is your partner's username:\n\n**${userAObj.tag}**`, COLORS.SUCCESS);
                    // Send B's name to A
                    const embedForA = createEmbed("It's a Match!", `You both wanted to connect! Here is your partner's username:\n\n**${userBObj.tag}**`, COLORS.SUCCESS);

                    try { await userAObj.send({ embeds: [embedForA] }); } catch (e) {}
                    try { await userBObj.send({ embeds: [embedForB] }); } catch (e) {}

                    await interaction.reply({ content: "Connected! Check your DMs.", ephemeral: true });
                } else {
                    await interaction.reply({ content: "Request sent! Waiting for partner...", ephemeral: true });
                }
            }
        }

        // Modal Handling
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_report') {
                const reason = interaction.fields.getTextInputValue('reportReason');
                const desc = interaction.fields.getTextInputValue('reportDesc');

                // Find the last session or active session
                // If triggered from button in active chat
                let session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1", [interaction.user.id, interaction.user.id]);

                // If no active session, look for the most recent inactive one
                if (!session) {
                     session = await db.get("SELECT * FROM sessions WHERE (user_a_id = ? OR user_b_id = ?) ORDER BY last_activity DESC LIMIT 1", [interaction.user.id, interaction.user.id]);
                }

                if (session) {
                    const isUserA = session.user_a_id === interaction.user.id;
                    const reportedAnonId = isUserA ? session.user_b_anon_id : session.user_a_anon_id;

                    await db.run(
                        "INSERT INTO reports (reporter_id, reported_anon_id, reason, description, created_at) VALUES (?, ?, ?, ?, ?)",
                        [interaction.user.id, reportedAnonId, reason, desc, Date.now()]
                    );

                    await interaction.reply({ content: "Report submitted. Thank you for keeping our community safe.", ephemeral: true });
                } else {
                    await interaction.reply({ content: "Could not identify the user to report.", ephemeral: true });
                }
            }
        }
    },
};
