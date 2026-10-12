# Training library

Training → Övningsbibliotek contains exactly 100 original football/futsal practice records, IDs `fck-ex-001` through `fck-ex-100`. The 29 pre-existing complete sessions remain available under Training → Kompletta pass and their existing navigation entry. Booked training, invitations, attendance, authentication and role assignments are unchanged.

Each practice has its own explicit player positions, example actions and relevant gates/zones/goals. Coordinates describe that practice's area, not a generic pitch diagram. Individual-ball work depicts each player's ball; two parallel pair tasks depict both balls. Blue/red colours and player identities describe the specific setup. Arrows are examples of decisions, not mandatory sequences.

## Framework and sources

The supplied `FC Kindmark Development Framework.docx` governs age/readiness, progression, role rotation, calm feedback and load adaptation. Cross-references use its actual section headings rather than unstable Word page numbers. Foundation records reference Phase 1 (6–12), development records Phase 2 (13–16), and preparation records Phase 3 (17–19)/senior readiness. Every record includes its source link, what that source supports, club alignment and an observation objective.

Public FIFA Training Centre and The FA resources are methodological references. The practice text and diagrams are authored for this library, not copied book pages or a claim that these are official federation sessions. Reference links were checked on 12 October 2026. Coaching/field effectiveness has not been externally validated.

## Persistence and permissions

Apply `database/exercise-library.sql` once, via the Supabase migration tool, before releasing the UI. It seeds 100 state rows, enables RLS and restricts reading/updating to the existing `public.is_admin()` app-metadata predicate. No DELETE/INSERT privilege is granted to the browser. The SECURITY INVOKER RPC updates only `archived_at`; the trigger stamps the authenticated actor, server time and new version. Stale versions fail rather than overwrite another admin's change. Exercise content stays in version-controlled code.

Removal requires a native-dialog confirmation, hides the library item for all admins after reading state, and is reversible under Borttagna. Historical complete sessions and booked trainings are preserved. Errors never show a successful removal. Existing coach/parent permissions are retained: this new library follows the current admin-only program access.

## Verification

`npm test` includes geometry/content invariants, all existing session checks, mocked component-event tests for confirmation/archive/reload/restore/failure, and member/document filtering. `node tests/render-exercises.cjs [output.html]` renders the real SVG component for all 100 records and validates label/marker uniqueness. `tests/exercise-library.sql` tests the live schema with simulated role claims, including unauthorized users, optimistic versions, actor stamping and restore; the transaction rolls back all test changes. These SQL tests are distinct from a logged-in browser end-to-end test.

The member view has Medlemmar/Stödmedlemmar selectors, while personal member-card access is unchanged. Economy defaults to unpaid documents, separates paid and other evidence/drafts, derives payment status from posted invoice settlements and keeps partial balances unpaid. Only an unpaid document with a due date strictly before today's Stockholm date receives a red row. Due today, missing due dates, fully paid documents, proformas and bank statements are not marked overdue.
