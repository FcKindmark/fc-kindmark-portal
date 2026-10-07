# FC Kindmark portal

Next.js club portal with admin, coach and parent views, attendance exports, equipment tracking and development records.

## Run locally

Create an untracked `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then run `npm ci` and `npm run dev`.

Validation: `npm test`, `node tests/render-smoke.cjs`, `npm run lint`, `npm run build`.

## Database release prerequisite

`database/club-platform-secure.sql` proposes the required UUID schema, account links, trusted role metadata and access policies. It has not been applied or database-tested. Review and explicitly approve the production migration before enabling the new modules. It changes existing grants and policies and requires authenticated role/access checks after execution.

Do not commit credentials, real member records, dependencies or build output.
