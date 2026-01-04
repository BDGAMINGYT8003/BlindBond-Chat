const db = require('../db');
const { createEmbed, COLORS } = require('./helpers');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function attemptMatch(client) {
    try {
        const queue = await db.all("SELECT * FROM queue ORDER BY join_time ASC");

        if (queue.length < 2) return; // Need at least 2 people

        const users = [];
        // Fetch full user profiles for everyone in queue
        for (const q of queue) {
            const user = await db.get("SELECT * FROM users WHERE discord_id = ?", [q.discord_id]);
            users.push({ ...user, ...q }); // Merge queue info with user info
        }

        const matched = new Set();

        for (let i = 0; i < users.length; i++) {
            const userA = users[i];
            if (matched.has(userA.discord_id)) continue;

            let bestMatch = null;
            let bestScore = -1;

            for (let j = i + 1; j < users.length; j++) {
                const userB = users[j];
                if (matched.has(userB.discord_id)) continue;

                const score = await calculateCompatibility(userA, userB);

                if (score !== -1 && score > bestScore) {
                    bestScore = score;
                    bestMatch = userB;
                }
            }

            if (bestMatch) {
                matched.add(userA.discord_id);
                matched.add(bestMatch.discord_id);
                await createSession(client, userA, bestMatch);
            }
        }
    } catch (err) {
        console.error("Matchmaking error:", err);
    }
}

async function calculateCompatibility(userA, userB) {
    // 1. Hard Filters

    // Check Blocks
    const blockedA = await db.get("SELECT * FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [userA.discord_id, userB.anon_id]);
    const blockedB = await db.get("SELECT * FROM blocks WHERE blocker_id = ? AND blocked_anon_id = ?", [userB.discord_id, userA.anon_id]);

    if (blockedA || blockedB) return -1;

    // Gender Preference
    // userA.partner_pref must match userB.gender OR be 'Anyone'
    // userB.partner_pref must match userA.gender OR be 'Anyone'

    const aMatchesB = userA.partner_pref === 'Anyone' || userA.partner_pref === userB.gender;
    const bMatchesA = userB.partner_pref === 'Anyone' || userB.partner_pref === userA.gender;

    // Check for Broadened Search
    const aBroad = userA.broadened_search === 1;
    const bBroad = userB.broadened_search === 1;

    if (!aMatchesB && !aBroad) return -1;
    if (!bMatchesA && !bBroad) return -1;

    // 2. Scoring
    let score = 0;

    // Wait Time Bonus (1 point per 10 seconds)
    const now = Date.now();
    const waitA = (now - userA.join_time) / 10000;
    const waitB = (now - userB.join_time) / 10000;
    score += waitA + waitB;

    // Region Match
    if (userA.region === userB.region) score += 50;

    // Age Gap (Smaller is better)
    const ageGap = Math.abs(userA.age - userB.age);
    if (ageGap <= 5) score += 30;
    else if (ageGap <= 10) score += 10;

    // Interest Overlap
    const interestsA = userA.interests ? userA.interests.split(',') : [];
    const interestsB = userB.interests ? userB.interests.split(',') : [];
    const sharedInterests = interestsA.filter(i => interestsB.includes(i));
    score += (sharedInterests.length * 20);

    return score;
}

async function createSession(client, userA, userB) {
    const sessionId = require('uuid').v4();
    const now = Date.now();

    // Create Session DB Entry
    await db.run(
        "INSERT INTO sessions (session_id, user_a_id, user_b_id, user_a_anon_id, user_b_anon_id, started_at, last_activity) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sessionId, userA.discord_id, userB.discord_id, userA.anon_id, userB.anon_id, now, now]
    );

    // Remove from Queue
    await db.run("DELETE FROM queue WHERE discord_id = ?", [userA.discord_id]);
    await db.run("DELETE FROM queue WHERE discord_id = ?", [userB.discord_id]);

    // Notify Users
    const embed = createEmbed("Match Found!", "You are now connected with an anonymous partner. Say hello!", COLORS.MATCH);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('end_chat')
                .setLabel('End Chat')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('report_user')
                .setLabel('Report')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('emergency_block')
                .setLabel('Emergency Block')
                .setStyle(ButtonStyle.Danger),
        );

    try {
        const discordUserA = await client.users.fetch(userA.discord_id);
        const discordUserB = await client.users.fetch(userB.discord_id);

        await discordUserA.send({ embeds: [embed], components: [row] });
        await discordUserB.send({ embeds: [embed], components: [row] });

        console.log(`Session created: ${sessionId}`);

    } catch (err) {
        console.error("Failed to start chat session", err);
        // Clean up session if notification fails?
        // For now we assume if database insert worked, session is valid,
        // but if we can't DM them, we should probably end it immediately.
    }
}

module.exports = {
    attemptMatch
};
