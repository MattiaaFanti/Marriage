PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS guests(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 display_name TEXT NOT NULL,
 category TEXT NOT NULL DEFAULT 'Main',
 seats INTEGER NOT NULL DEFAULT 1 CHECK(seats>=1 AND seats<=20),
 expected_absence INTEGER NOT NULL DEFAULT 0,
 tentative INTEGER NOT NULL DEFAULT 0,
 proxy TEXT NOT NULL DEFAULT '',
 internal_note TEXT NOT NULL DEFAULT '',
 excluded INTEGER NOT NULL DEFAULT 0,
 rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK(rsvp_status IN ('pending','attending','not_attending')),
 guest_count INTEGER NOT NULL DEFAULT 0,
 email TEXT NOT NULL DEFAULT '',
 message TEXT NOT NULL DEFAULT '',
 updated_at TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS guests_status ON guests(rsvp_status);
CREATE INDEX IF NOT EXISTS guests_category ON guests(category);
CREATE TABLE IF NOT EXISTS rsvp_events(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
 previous_status TEXT NOT NULL,
 status TEXT NOT NULL,
 guest_count INTEGER NOT NULL,
 received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_sessions(
 token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts(
 ip_hash TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 first_at INTEGER NOT NULL
);
