import assert from 'node:assert/strict';
import {paymentCategory,paymentYear,filterPayments,membershipFeeStatus} from '../app/lib/paymentFilters.mjs';
const players=[{id:'p1',name:'Alice',team_id:'a'},{id:'p2',name:'Bob',team_id:'b'}];
const members=[{id:'m1',name:'Alice',player_id:'p1'},{id:'m2',name:'Supporter',player_id:null},{id:'m3',name:'Missing'}];
const payments=[
 {id:'member',member_id:'m1',payment_kind:'membership',status:'paid',membership_year:2026,paid_date:'2027-01-01',amount:150},
 {id:'shirt',player_id:'p1',payment_kind:'other',payment_category:'clothing',status:'pending',due_date:'2026-10-01',amount:450},
 {id:'training',player_id:'p2',payment_kind:'other',payment_category:'training',status:'paid',paid_date:'2026-10-10',amount:200},
 {id:'supporter',member_id:'m2',payment_kind:'membership',status:'pending',membership_year:2026,amount:150},
 {id:'legacy',payment_kind:'other',description:'Unknown old payment',status:'pending',created_at:'2025-01-01',amount:300}
];
const ids=filters=>filterPayments(payments,{today:'2026-10-16',...filters},players,members).map(p=>p.id);
assert.equal(paymentCategory({payment_kind:'membership',payment_category:'clothing'}),'membership');
assert.equal(paymentCategory({payment_kind:'other'}),'other');
assert.equal(paymentYear(payments[0]),'2026');
assert.deepEqual(ids({category:'membership',status:'paid',year:'2026',team:'a'}),['member']);
assert.deepEqual(ids({category:'clothing',status:'pending',team:'a'}),['shirt']);
assert.deepEqual(ids({status:'overdue'}),['shirt']);
assert.deepEqual(ids({query:'alice'}),['member','shirt']);
assert.deepEqual(ids({team:'none',category:'membership'}),['supporter']);
assert.deepEqual(ids({year:'2025'}),['legacy']);
assert.deepEqual(ids({category:'equipment'}),[]);
assert.equal(membershipFeeStatus(members[0],payments,2026),'paid');
assert.equal(membershipFeeStatus(members[1],payments,2026),'pending');
assert.equal(membershipFeeStatus(members[2],payments,2026),'missing');
assert.equal(membershipFeeStatus(members[0],payments,2027),'missing');
console.log('PASS: combined category/status/team/year/name filters, overdue status, supporter cards, missing fees, and legacy categories.');
