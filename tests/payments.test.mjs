import assert from 'node:assert/strict';
import {paymentPayload,overdue} from '../app/lib/payments.js';
const players=[{id:'p1',name:'Example Player'}];
const form={player_id:'p1',amount:'150,50',description:' Fee ',status:'pending',due_date:'2026-10-10',paid_date:'2026-10-08'};
assert.deepEqual(paymentPayload(form,players),{paid_reference:null,player_id:'p1',player_name:'Example Player',amount:150.5,description:'Fee',swish:null,bankgiro:null,reference:null,status:'pending',due_date:'2026-10-10',paid_date:null});
for(const amount of ['','0','-5','NaN','Infinity','15abc','1.234','1e3','10000000000'])assert.throws(()=>paymentPayload({...form,amount},players));
for(const date of ['2026-02-30','wrong','2026-13-01'])assert.throws(()=>paymentPayload({...form,due_date:date},players));
assert.throws(()=>paymentPayload({...form,player_id:'missing'},players));
assert.throws(()=>paymentPayload({...form,status:'other'},players));
assert.equal(paymentPayload({...form,player_id:'',player_name:'Legacy Member'},players).player_name,'Legacy Member');
assert.equal(paymentPayload({...form,status:'paid',paid_date:'2026-10-08',paid_reference:'BANK-TEST'},players).paid_date,'2026-10-08');
assert.equal(overdue({status:'pending',due_date:'2026-10-07'},'2026-10-07'),false);
assert.equal(overdue({status:'pending',due_date:'2026-10-06'},'2026-10-07'),true);
assert.equal(overdue({status:'paid',due_date:'2026-10-06'},'2026-10-07'),false);
assert.equal(overdue({status:'pending',due_date:null},'2026-10-07'),false);
console.log('PASS: payment amount validation, date validation, legacy editing, status changes and overdue boundaries.');

assert.throws(()=>paymentPayload({...form,status:'paid',paid_reference:''},players));
