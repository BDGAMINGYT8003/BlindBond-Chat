const db = require('../db');

// We need a persistent store for share tracking if we want it to survive restarts,
// but for now we'll use a simple in-memory store backed by the session ID,
// assuming the bot stays up during a chat.
// Or we can add a table. The blueprint says "Check database", so let's add a table.
// `username_shares`: session_id, user_id, count, last_shared

// Since I can't easily modify schema.sql and restart without wiping data in this env easily (or I can),
// I will ensure the table exists on init in this file or use the db index.
// I'll add a helper to ensure table exists.

async function initShareTable() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS username_shares (
            session_id TEXT,
            user_id TEXT,
            count INTEGER DEFAULT 0,
            last_shared INTEGER DEFAULT 0,
            PRIMARY KEY (session_id, user_id)
        )
    `);
}

async function canShare(sessionId, userId) {
    await initShareTable(); // Ensure table exists

    const record = await db.get("SELECT * FROM username_shares WHERE session_id = ? AND user_id = ?", [sessionId, userId]);

    if (!record) return { allowed: true };

    // Check Limit (Max 2)
    if (record.count >= 2) {
        return { allowed: false, reason: "You have reached the limit of 2 identity shares per session." };
    }

    // Check Cooldown (60s)
    const now = Date.now();
    if (now - record.last_shared < 60000) {
        const timeLeft = Math.ceil((60000 - (now - record.last_shared)) / 1000);
        return { allowed: false, reason: `Please wait ${timeLeft} seconds before sharing again.` };
    }

    return { allowed: true };
}

async function recordShare(sessionId, userId) {
    await initShareTable();

    const record = await db.get("SELECT * FROM username_shares WHERE session_id = ? AND user_id = ?", [sessionId, userId]);

    const now = Date.now();

    if (record) {
        await db.run("UPDATE username_shares SET count = count + 1, last_shared = ? WHERE session_id = ? AND user_id = ?", [now, sessionId, userId]);
    } else {
        await db.run("INSERT INTO username_shares (session_id, user_id, count, last_shared) VALUES (?, ?, 1, ?)", [sessionId, userId, now]);
    }
}

module.exports = { canShare, recordShare };
