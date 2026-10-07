# FC Kindmark portal

Next.js club portal with admin, coach and parent views, attendance exports, equipment tracking and development records.

## Run locally

Create an untracked `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then run `npm ci` and `npm run dev`.

Validation: `npm test`, `node tests/render-smoke.cjs`, `npm run lint`, `npm run build`.

## Database release prerequisite

`database/club-platform-secure.sql` proposes the required UUID schema, account links, trusted role metadata and access policies. Applied with club owner approval on 2026-10-07. Database role checks verified administrator access, linked parent access, coach team access, denial to unlinked users, anonymous access denial and prevention of client role escalation. Existing orphaned RSVP history is retained; its foreign keys check new writes but remain NOT VALID until legacy records are reconciled. Unmatched legacy payments remain visible only to administrators until linked to a player. Existing sessions need a fresh login to receive role metadata. Browser interaction checks remain pending.

Do not commit credentials, real member records, dependencies or build output.
