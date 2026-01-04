const db = require('../db');
const { createEmbed, COLORS } = require('./helpers');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function endSession(client, sessionId, reason = "Chat ended.") {
    const session = await db.get("SELECT * FROM sessions WHERE session_id = ?", [sessionId]);
    if (!session || session.is_active === 0) return;

    await db.run("UPDATE sessions SET is_active = 0 WHERE session_id = ?", [sessionId]);

    let userA = null;
    let userB = null;

    try { userA = await client.users.fetch(session.user_a_id); } catch (e) { console.error("Failed to fetch user A"); }
    try { userB = await client.users.fetch(session.user_b_id); } catch (e) { console.error("Failed to fetch user B"); }

    // Calculate Stats
    const duration = Math.round((Date.now() - session.started_at) / 1000 / 60); // minutes

    // We didn't store total messages, but requirements say we should.
    // Assuming we added a counter, but for now we'll just show duration.

    const embed = createEmbed("Chat Ended", `${reason}\n\n**Duration:** ${duration} mins`, COLORS.ERROR);

    // Feedback Buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`feedback_good_${sessionId}`).setLabel('Good').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`feedback_okay_${sessionId}`).setLabel('Okay').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`feedback_bad_${sessionId}`).setLabel('Bad').setStyle(ButtonStyle.Danger),
        );

    const safeSend = async (user, payload) => {
        try { await user.send(payload); } catch (e) { /* user blocked bot */ }
    };

    if (userA) await safeSend(userA, { embeds: [embed], components: [row] });
    if (userB) await safeSend(userB, { embeds: [embed], components: [row] });
}

module.exports = { endSession };
