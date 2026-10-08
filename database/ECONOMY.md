# FC Kindmark economy workspace

This is a first accounting workspace, not a certified replacement for all Fortnox functionality. Admin-only, SEK, calendar years and one bank ledger (1930). `economy.sql` contains the complete schema for a fresh install. The incremental `economy-*.sql` files document changes already applied to the existing FC Kindmark project; do not run both the complete schema and incremental patches against a fresh database.

## Working flow

1. Save invoices/receipts/decisions as private source files with date, party, reference and gross amount. PDF/photo extraction is manual in this version.
2. Import a bank CSV with header mapping and preview. The original CSV is preserved as evidence. CSV rows must contain signed amounts and ISO dates. Matching fingerprints prevent repeat imports of the same rows. Identical same-day transactions with no distinct bank reference cannot always be distinguished across overlapping statements; review the import counts and reconcile to the original bank statement.
3. Open the bank proposal. Account suggestions use text, sponsor names and payment references. Confirm accounts, document and any tax allocation. Split receipts across income accounts when needed.
4. Invoice recognition uses receivables (1510) or payables (2440). When settling a previously booked invoice, use that balance account rather than recognizing income/expense twice. The workspace does not automatically reconcile invoice balances or determine VAT treatment.
5. Optionally choose whole member payment demands included in a receipt. Posting marks pending demands paid atomically with the journal. Reversal restores their previous payment state. Linking cannot exceed bank income or booked income; membership links cannot exceed the membership revenue line. Partial payments require manual ledger allocations; they are not automatically marked fully paid.
6. All journal entries balance in integer cents. Confirmation assigns sequential numbers by calendar year. Posted entries and evidence are immutable through the client; corrections create linked opposite entries with reason, actor and timestamp. Original payment links remain for traceability.
7. Start with an evidenced opening balance dated January 1. Prepare year-end adjustments manually. Reports contain only posted entries, and prior untransferred results are shown separately in equity. They are accounting reports and year-end preparation data, not a signed K1/K2 annual closing or tax return.
8. Year locking requires no drafts, all imported bank rows reconciled and the entered statement ending balance equal to ledger account 1930. Earlier-year posting is also blocked once a later year is locked so prior reports cannot silently change. There is no unlock UI.
9. Export the ledger/year-end account balances as CSV and print reports to PDF. JSON export includes complete accounting metadata and audit history; download source files separately. Restore, independent scheduled backups, SIE interchange, fiscal years other than calendar years, automated OCR, tax declarations, payroll, depreciation automation and automatic bank feeds are not implemented.

## Database integrity and access

Journal, lines, year state, allocation links and audit tables only grant authenticated SELECT with trusted admin RLS. A consistent-snapshot SECURITY INVOKER read RPC and two guarded SECURITY DEFINER write RPCs provide atomic posting and year locking; they require auth.uid() and trusted app_metadata through is_admin(), pin an empty search path, and revoke PUBLIC/anon execution. Definer status is intentional: clients have no direct ledger write privilege. Document, sponsor and bank metadata have admin-only policies and audit triggers. Bank rows are immutable. Private storage permits administrator reads/inserts and deletion of orphan files only, with no overwrite policy. Current signed-in coach/parent/player users receive no finance access.

## Validation

`node tests/economy.test.mjs`, `node tests/economy-render.cjs` and `tests/economy.sql` (transactional rollback) verify split receipts, decimal parsing, duplicate imports, reports, opening balances, reversals, balanced entries, immutable postings, linked payment confirmation/restoration, bank closing checks, locked periods and parent denial. Storage policy scope has been reviewed; direct SQL deletion tests are blocked by Supabase Storage protection and therefore do not validate API file deletion.

Before treating this as the club's sole accounting system, configure/check the chart and accounting policies for the actual club, establish a verified opening balance and test the independent backup/restoration/archive process with the treasurer/bookkeeper.

## October 8 automation update

- PDF text extraction and Swedish/English image OCR run on the administrator's device using pinned PDF.js 4.10.38 and Tesseract.js 6.0.1 CDN assets. Scanned PDFs render before OCR. Maximum 10 pages / 15 MB. No third-party document upload or paid OCR API. CDN/language downloads need internet; manual input remains available on failure. Labels only are extracted; inspect and edit suggestions. Browser OCR itself still needs a real-device acceptance test.
- Bank CSV import creates draft proposals automatically. `club_econ_bank_draft` serializes duplicate checks; re-running does not create another draft for a bank row. Drafts require review and explicit posting. Ambiguous payment matching, VAT, invoice settlement and combined payments need review.
- `Ändra / rätta` uses `club_econ_correct`: reversal and replacement post in one transaction. Invalid replacement rolls back the reversal. Existing ledger, audit, membership payment and year-lock guards remain in force.
- Complete ZIP export contains ledger metadata, full audit history and every referenced original. CRC and SHA-256 are verified before downloading. Re-upload a downloaded ZIP to check integrity. Downloads fail if any original cannot be fetched; no partial archive is presented as complete. 100 MB limit. ZIP is an unencrypted administrative export; store it securely on another device.
- This adds verified manual export, not scheduled offsite backups or a database restore button. No restore operation has been tested. Existing balance and profit reports are review material, not a signed statutory closing package or tax return.
- Fresh installations: apply `economy.sql`, then `economy-correction.sql` (earlier patch files are already consolidated in economy.sql).
