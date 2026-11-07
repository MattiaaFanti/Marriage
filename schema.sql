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


-- Individual RSVP members belonging to invitation groups. Legacy 'guests' stays unchanged.
CREATE TABLE IF NOT EXISTS rsvp_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_code TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS rsvp_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES rsvp_groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK(rsvp_status IN ('pending','attending','not_attending')),
  updated_at TEXT DEFAULT NULL,
  UNIQUE(group_id, display_name)
);
CREATE INDEX IF NOT EXISTS rsvp_members_group ON rsvp_members(group_id);
CREATE INDEX IF NOT EXISTS rsvp_members_status ON rsvp_members(rsvp_status);
CREATE TABLE IF NOT EXISTS rsvp_aliases (
  alias TEXT NOT NULL,
  member_id INTEGER NOT NULL REFERENCES rsvp_members(id) ON DELETE CASCADE,
  PRIMARY KEY(alias,member_id)
);
CREATE INDEX IF NOT EXISTS rsvp_aliases_member ON rsvp_aliases(member_id);
CREATE TABLE IF NOT EXISTS rsvp_member_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES rsvp_members(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('guest','admin')),
  received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rsvp_lookup_limiter (
  ip_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Confirmation e-mail throttling. Stores only a hash of the recipient address.
-- The Worker also creates this table lazily on existing D1 databases.
CREATE TABLE IF NOT EXISTS rsvp_confirmation_deliveries (
  group_id INTEGER NOT NULL,
  email_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (group_id,email_hash)
);
CREATE INDEX IF NOT EXISTS rsvp_confirmation_deliveries_time
  ON rsvp_confirmation_deliveries(created_at);


-- Group-wide response for the optional email confirmation.
-- All members of a group share the same choice and address.
-- The D1 Worker creates this table automatically for existing deployments.
CREATE TABLE IF NOT EXISTS rsvp_confirmation_choices (
  group_id INTEGER PRIMARY KEY,
  choice TEXT NOT NULL CHECK(choice IN ('NO','EMAIL')),
  email TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- A manual change by the admin clears the confirmation address only on
-- that person's row. Group members not edited retain their shared email.
-- Clear markers survive Pending -> Attending manual transitions and are
-- reset only by a new guest RSVP submission or an explicit Reset All.
CREATE TABLE IF NOT EXISTS rsvp_member_email_clears (
  member_id INTEGER PRIMARY KEY,
  cleared_at TEXT NOT NULL
);

-- A confirmation email belongs to an individual RSVP guest. Two members
-- of the same invitation may supply different recipient addresses without
-- overwriting one another. The Worker migrates old group emails only once.
CREATE TABLE IF NOT EXISTS rsvp_member_email_choices (
  member_id INTEGER PRIMARY KEY REFERENCES rsvp_members(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK(choice IN ('NO','EMAIL')),
  email TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
