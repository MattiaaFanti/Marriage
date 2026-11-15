-- One-time, repeatable manual D1 migration: Tess Rada (single-person invitation).
-- Run in Cloudflare D1 > mattia-kirsten-wedding > Console.
-- Safe to re-run: INSERT OR IGNORE and unique constraints prevent duplicates.
-- Does not change any existing RSVP response.
INSERT OR IGNORE INTO rsvp_groups (group_code)
VALUES ('single-tess-rada-2026');

INSERT OR IGNORE INTO rsvp_members
  (group_id, display_name, role, rsvp_status, updated_at)
SELECT id, 'Tess Rada', '', 'pending', NULL
FROM rsvp_groups WHERE group_code = 'single-tess-rada-2026';

INSERT OR IGNORE INTO rsvp_aliases (alias, member_id)
SELECT a.alias, m.id
FROM rsvp_members AS m
JOIN rsvp_groups AS g ON g.id = m.group_id
CROSS JOIN (
  SELECT 'tess rada' AS alias
  UNION ALL SELECT 'tess'
  UNION ALL SELECT 'rada'
) AS a
WHERE g.group_code = 'single-tess-rada-2026' AND m.display_name = 'Tess Rada';

-- Verify after applying:
SELECT m.id, m.display_name, m.role, m.rsvp_status, g.group_code
FROM rsvp_members m JOIN rsvp_groups g ON g.id = m.group_id
WHERE g.group_code = 'single-tess-rada-2026';
