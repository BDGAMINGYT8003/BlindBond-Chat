CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    anon_id TEXT UNIQUE NOT NULL,
    gender TEXT,
    age INTEGER,
    region TEXT,
    partner_pref TEXT,
    interests TEXT,
    is_onboarded INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    ban_expiration INTEGER,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL,
    user_b_id TEXT NOT NULL,
    user_a_anon_id TEXT NOT NULL,
    user_b_anon_id TEXT NOT NULL,
    started_at INTEGER,
    last_activity INTEGER,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id TEXT,
    blocked_anon_id TEXT,
    PRIMARY KEY (blocker_id, blocked_anon_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id TEXT,
    reported_anon_id TEXT,
    reason TEXT,
    description TEXT,
    chat_snippet TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS connection_requests (
    session_id TEXT,
    user_id TEXT,
    PRIMARY KEY(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS queue (
    discord_id TEXT PRIMARY KEY,
    anon_id TEXT NOT NULL,
    join_time INTEGER,
    broadened_search INTEGER DEFAULT 0,
    last_update_sent INTEGER
);
