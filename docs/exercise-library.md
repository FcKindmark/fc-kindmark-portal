# Training library

Träningsprogram → Övningsbibliotek contains exactly 200 original football/futsal practice records, IDs `fck-ex-001` through `fck-ex-200`. The 29 pre-existing complete sessions remain under Träningsprogram → Kompletta pass. Träningar contains booked training and its exercise plan. Invitations, attendance, authentication and existing role assignments are unchanged.

Each practice has its own explicit player positions, example actions and relevant gates/zones/goals. Coordinates describe that practice's area, not a generic pitch diagram. Individual-ball work depicts each player's ball; two parallel pair tasks depict both balls. Blue/red colours and player identities describe the specific setup. Arrows are examples of decisions, not mandatory sequences.

## Framework and sources

The supplied `FC Kindmark Development Framework.docx` governs age/readiness, progression, role rotation, calm feedback and load adaptation. Cross-references use its actual section headings rather than unstable Word page numbers. Foundation records reference Phase 1 (6–12), development records Phase 2 (13–16), and preparation records Phase 3 (17–19)/senior readiness. Every record includes its source link, what that source supports, club alignment and an observation objective.

Public FIFA Training Centre and The FA resources are methodological references. The additional 100 cover ten areas: ball technique, receiving/passing, combinations, finishing, individual defending, defending in units, transition, progression/build-up, futsal and senior-readiness scenarios. They reference public RFEF, FFF regional/district, KNVB, FIGC and The FA publications. Source metadata describes the actual relationship: RFEF's U19 report is a report rather than a complete drill manual; FIGC's Ussia publication is an authored UEFA Pro thesis, not an official curriculum. Futsal adaptations of football principles are explicitly club proposals. The practice text and diagrams are authored for this library, not copied book pages or federation-endorsed sessions. Reference links were checked on 12 October 2026. No claim is made to have exhaustively searched every federation publication or externally validated coaching effectiveness.

## Persistence and permissions

Apply `database/exercise-library.sql` once, via the Supabase migration tool, before releasing the UI. It seeds 100 state rows, enables RLS and restricts reading/updating to the existing `public.is_admin()` app-metadata predicate. No DELETE/INSERT privilege is granted to the browser. The SECURITY INVOKER RPC updates only `archived_at`; the trigger stamps the authenticated actor, server time and new version. Stale versions fail rather than overwrite another admin's change. Exercise content stays in version-controlled code.

Removal requires a native-dialog confirmation, hides the library item for all admins after reading state, and is reversible under Borttagna. Historical complete sessions and booked trainings are preserved. Errors never show a successful removal. The library follows current admin-only program access; coaches receive published exercise plans for their assigned teams.

## Building and publishing a training plan

Apply `database/training-exercise-plans.sql` after the original library migration. It adds state rows 101–200 using ON CONFLICT DO NOTHING, preserving previous removals and versions. No existing training row or permission policy is changed.

In Träningsprogram, open an exercise, choose a booked training and select Lägg till i träningsplan. The portal opens that training and places the exercise in an unsaved draft. Alternatively, open Träningar → Träningsplan and select exercises directly. Reorder or remove plan entries, add session instructions, then Spara utkast or Publicera för tränarna. The plan holds up to 50 distinct exercise IDs, with stable ordering. Archiving an exercise in the library preserves it in existing plans.

Drafts and publications are separate RLS tables. Only admins read/write drafts. The SECURITY INVOKER save RPC checks the existing trusted admin role, locks the training, validates known IDs/duplicates/length, and checks the expected version. Direct REST writes are blocked by a trigger. Publication copies an ordered snapshot, notes, authenticated actor and server time. Coaches can read publications only when their app-metadata role is coach and their current club_coach_teams assignment matches the training team. Parent/player/anonymous access is denied. Editing a draft leaves the published snapshot unchanged until republished. Återkalla publicering hides the snapshot, preserves the draft and allows republishing. This does not send player invitations, email or push messages.

## Verification

`npm test` includes geometry/content invariants, all existing session checks, mocked component-event tests for confirmation/archive/reload/restore/failure, member/document filtering, library-to-plan transfer, draft/publish/order/conflict/unpublish and private published snapshots. `node tests/render-exercises.cjs [output.html]` renders the real SVG component for all 200 records and validates label/marker uniqueness. `tests/exercise-library.sql` and `tests/training-exercise-plans.sql` test the live schema with simulated role claims, including unauthorized users, team assignment isolation, private drafts, optimistic versions, actor stamping and restore. Transactions roll back every fixture and plan change. These SQL and mocked UI tests are distinct from a logged-in browser end-to-end test.

The member view has Medlemmar/Stödmedlemmar selectors, while personal member-card access is unchanged. Economy defaults to unpaid documents, separates paid and other evidence/drafts, derives payment status from posted invoice settlements and keeps partial balances unpaid. Only an unpaid document with a due date strictly before today's Stockholm date receives a red row. Due today, missing due dates, fully paid documents, proformas and bank statements are not marked overdue.
