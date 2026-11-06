# RSVP backend — Cloudflare D1 + GitHub Pages

## Resources
- GitHub Pages: https://mattiaafanti.github.io/Marriage/
- Cloudflare Worker: https://marriage.yaboyo95.workers.dev
- D1: mattia-kirsten-wedding (binding DB)
- Worker name: marriage

## Current configuration
- `config.js` points to the live Worker. There is no preview-only mode when the API is reachable.
- The 31 original groups and 50 guests were imported to D1. A one-time automatic migration adds the second family group of three guests (34 groups, 53 guests total after splitting the original six-person group into three pairs) and updates four relatives' roles. No guest names are published in this repository.
- Public lookup suggests all matching guests after at least three letters. Each suggestion includes the guest's role and the actual group seat count; selecting a name opens that guest's group RSVP.
- The dashboard lists Mattia/Kirsten first; Butch/Alexis second; Raphiel/Rose Ann third; Maria Assunta/Jessica/Andrea fourth. Each group has its own invitation and every member must answer Attend / Not attend.
- The confirmation token is a randomly generated, one-hour opaque session stored hashed in D1's existing `admin_sessions` table. It is not a password. No INVITE_SECRET or ADMIN_PASSWORD variable is needed.
- The dashboard at **/admin** is intentionally passwordless and public, by request. Users can change each RSVP to Attend, Not attend, or Pending (Reset), and Reset all to Pending. All guests and replies are visible and editable by anyone who knows the address. Changes are logged in `rsvp_member_events`.
- The Worker root redirects to the wedding website.

## Deploy updates
The linked GitHub repository deploys automatically to the existing Worker. Use `npx wrangler deploy` as the deploy command. D1 tables are already present; do not repeat the schema import for normal deployments.

## Verification
1. Visit `https://marriage.yaboyo95.workers.dev/api/health`: expect `{"ok":true}`.
2. Visit `https://marriage.yaboyo95.workers.dev/admin`: the live dashboard loads without a login screen.
3. Search a real name on the GitHub Pages invitation. The modal shows every member of that group.
4. Ensure "Continue" remains disabled until every member has an answer.
5. Save the responses and refresh /admin. Individual counts update.

## Files
- `schema.sql`: database schema
- `group-api.js`: D1 exact-match lookup, temporary sessions, atomic RSVP saves, read-only dashboard APIs
- `worker.js`: Cloudflare Worker routing
- `admin-groups.js`: public read-only dashboard
- `wedding.js`: guest UI
