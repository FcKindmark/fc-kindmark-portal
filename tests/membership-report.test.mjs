import assert from 'node:assert/strict';
import {membershipReportRows,confirmedMemberCount} from '../app/lib/membershipReport.js';
const paid={payment_kind:'membership',membership_year:2026,membership_no:1001,member_id:'m1',player_name:'Example',amount:150,status:'paid',paid_date:'2026-10-07',paid_reference:'BANK-1',payer_name:'Guardian',bank_message:'Example'};
const payments=[paid,{...paid,amount:20},{...paid,member_id:null,membership_no:1002},{...paid,payment_kind:'other'},{...paid,membership_year:2025}];
assert.equal(confirmedMemberCount(payments,2026),1);
const rows=membershipReportRows(payments,2026);assert.equal(rows.length,4);assert.ok(rows[1].includes('BANK-1'));assert.ok(rows[1].includes('Guardian'));assert.ok(rows[3].includes('Kontrollera koppling'));
console.log('PASS: annual membership report excludes equipment and other years, retains bank evidence, deduplicates confirmed members and flags unlinked payments.');
