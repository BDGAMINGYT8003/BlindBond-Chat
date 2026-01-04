const db = require('../db');
const matchmaker = require('../utils/matchmaker');
const { createEmbed, COLORS } = require('./helpers');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { endSession } = require('./sessionManager');

const QUEUE_INTERVAL = 60 * 1000; // 60s
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5m

function startTasks(client) {
    // Queue Monitor
    setInterval(async () => {
        try {
            const queue = await db.all("SELECT * FROM queue");
            const now = Date.now();

            for (const q of queue) {
                // If waiting > 60s and hasn't been updated recently
                if (now - q.join_time > 60000 && (!q.last_update_sent || now - q.last_update_sent > 60000)) {
                    try {
                        const user = await client.users.fetch(q.discord_id);
                        // Send "Still searching..."

                         const embed = createEmbed("Still Searching...", "We are still looking for a partner. Would you like to broaden your search?", COLORS.INFO);

                         const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('broaden_search').setLabel('Broaden Search').setStyle(ButtonStyle.Primary),
                                new ButtonBuilder().setCustomId('leave_queue').setLabel('Leave Queue').setStyle(ButtonStyle.Secondary)
                            );

                        await user.send({ embeds: [embed], components: [row] });

                        await db.run("UPDATE queue SET last_update_sent = ? WHERE discord_id = ?", [now, q.discord_id]);
                    } catch (e) {
                         // User might have blocked bot or left server
                         await db.run("DELETE FROM queue WHERE discord_id = ?", [q.discord_id]);
                    }
                }
            }

            // Trigger matchmaking
            await matchmaker.attemptMatch(client);

            // Update Presence
            const activeChats = await db.get("SELECT COUNT(*) as count FROM sessions WHERE is_active = 1");
            const waiting = await db.get("SELECT COUNT(*) as count FROM queue");

            client.user.setActivity(`${waiting.count} Searching | ${activeChats.count} Chatting`);

        } catch (err) {
            console.error("Queue Monitor Error:", err);
        }
    }, QUEUE_INTERVAL);

    // Cleanup Monitor
    setInterval(async () => {
        try {
             const now = Date.now();

             // 1. Idle Warning (15 mins)
             // We need to track if we sent a warning. We can add a column or just check last_activity strictly.
             // If last_activity is > 15m ago AND < 16m ago (approx), send warning.
             // Or better, add `idle_warning_sent` to sessions table. But I can't easily change schema now without migration.
             // I'll check if last_activity is between 15 and 20 mins and I'll rely on memory or repeated warnings (bad).
             // Let's assume we can tolerate sending it every 5 mins if they are idle (it's a nag).

             const idleTime = 15 * 60 * 1000;
             const idleSessions = await db.all("SELECT * FROM sessions WHERE is_active = 1 AND ? - last_activity > ?", [now, idleTime]);

             for (const s of idleSessions) {
                 // To avoid spamming, we could check if we already warned.
                 // Since I don't have a column, I'll just check if it's been *exactly* around 15 mins (within the interval window).
                 // Interval is 5 mins. So if idle time is between 15m and 20m.
                 const diff = now - s.last_activity;
                 if (diff >= idleTime && diff < idleTime + CLEANUP_INTERVAL) {
                     try {
                        const embed = createEmbed("Idle Warning", "This chat has been idle for 15 minutes. It will automatically close in 15 more minutes.", COLORS.WARNING);
                        const uA = await client.users.fetch(s.user_a_id);
                        if (uA) uA.send({ embeds: [embed] });
                        const uB = await client.users.fetch(s.user_b_id);
                        if (uB) uB.send({ embeds: [embed] });
                     } catch (e) {}
                 }
             }

             // 2. Timeout (30 mins)
             const timeout = 30 * 60 * 1000;
             const staleSessions = await db.all("SELECT * FROM sessions WHERE is_active = 1 AND ? - last_activity > ?", [now, timeout]);

             for (const s of staleSessions) {
                 await endSession(client, s.session_id, "Chat timed out due to inactivity.");
             }
        } catch (err) {
            console.error("Cleanup Monitor Error:", err);
        }
    }, CLEANUP_INTERVAL);

    // Queue Janitor (1 min)
    setInterval(async () => {
        try {
            const staleTime = 5 * 60 * 1000;
            const now = Date.now();
            const staleUsers = await db.all("SELECT * FROM queue WHERE ? - join_time > ?", [now, staleTime]);

            for (const u of staleUsers) {
                 // Check if user is still reachable or interested
                 // Simple implementation: Remove them if > 10 mins (super stale),
                 // If > 5 mins, maybe ping them?
                 // Blueprint says: "Identify users > 5 mins. Remove them or trigger a 'Are you still there?' DM."
                 // We'll remove them to keep queue fresh and send a notification.

                 await db.run("DELETE FROM queue WHERE discord_id = ?", [u.discord_id]);
                 try {
                     const user = await client.users.fetch(u.discord_id);
                     await user.send("You have been removed from the queue due to inactivity (5 mins). Use `/new` to join again.");
                 } catch (e) {}
            }
        } catch (err) {
             console.error("Queue Janitor Error:", err);
        }
    }, 60 * 1000);
}

module.exports = { startTasks };
