# Supplier proforma reconciliation

The supplier document uploaded on 23 October was classified as a proforma. Both the settlement picker and entry RPC rejected proformas, so it could not be linked to an outgoing bank payment.

Supplier proformas (`purchase`) are now available under Stäm av konto and through their Utbetalningar action. They remain clearly labelled as proformas. The bank payment is allocated to the existing advance account 1480 regardless of whether it precedes or follows the document date; this does not book an expense, supplier liability or VAT deduction. Partial payments, drafts, remaining amounts, reversals and bank fees use the existing settlement flow. Incoming proformas and proforma receipts remain excluded.

The overview/report includes outstanding proforma advances. Clearing stays unavailable while the document is a proforma; final-invoice and delivery review remain required. The original uploaded file and proforma flag are preserved. No real payment was confirmed or posted while implementing this fix.

The SQL patch changes only the relevant checks in the installed RPC, retaining its later player-payment correction branch, trusted admin check, grants, empty search path, core validation and year locks. It rejects an unexpected function version rather than replacing it with an older copy. No table or RLS policy changes are needed.

References: [BAS account plan, account 1480](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf), [Supabase function security](https://supabase.com/docs/guides/database/functions).

Validation: `npm run test:proforma` covers actual component callbacks with a mocked save plus allocation rules. SQL tests `economy-proforma-advances.sql`, `economy-supplier-prepayments.sql` and `economy-person-payments.sql` passed against the installed schema, with synthetic transactions rolled back. They cover draft/post, advance-only accounting, duplicate protection, direct expense denial, non-admin denial, reversal, ordinary advances, person allocations and fees. This is not a logged-in production browser test.

The broad `npm test` suite currently stops at the unchanged payment test expecting a payload without `payment_category`. The combined member/document test also fails in the unchanged member-card fixture after its document assertions pass. Focused economy, settlement, invoice, extraction and proforma UI tests passed; the unrelated test expectations were not rewritten for this fix.
