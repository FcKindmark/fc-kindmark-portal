import fs from 'node:fs';import assert from 'node:assert/strict';
const source=fs.readFileSync('app/lib/invoice-pdf.js','utf8');
const {invoicePdfBytes,invoiceTotals}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(invoiceTotals([{quantity:'1.005',unit_price:'1'}],'exempt').total,1.01);
assert.equal(invoiceTotals([{quantity:'3',unit_price:'0.10'}],'vat25').total,.38);
const record={status:'issued',total:2000,payload:{invoice_no:'FCK-2026-0001',invoice_date:'2026-10-08',due_date:'2026-11-07',customer:'Örby Företag AB',customer_address:'Ängsvägen 1\n511 70 Rydal',customer_org:'123456-7890',tax_mode:'exempt',tax_note:'Ingen moms debiteras. Föreningen är momsbefriad.',net_total:2000,vat_total:0,items:[{description:'Bronssponsor - 12 månader',quantity:1,unit_price:2000}],seller:{name:'FC Kindmark Idrottsförening',org_no:'802555-1931',address:'Boråsvägen 256C, 511 70 Rydal',email:'info@fckindmark.se',bankgiro:'5246-1142',swish:'1230830323'}}};
const bytes=invoicePdfBytes(record);assert.ok(Buffer.from(bytes).toString('latin1').startsWith('%PDF-1.4'));assert.ok(Buffer.from(bytes).toString('latin1').includes('Föreningen är momsbefriad'));assert.throws(()=>invoicePdfBytes({...record,status:'draft'}));
if(process.argv[2]){fs.writeFileSync(process.argv[2],bytes);fs.writeFileSync(process.argv[2].replace('.pdf','-long.pdf'),invoicePdfBytes({...record,payload:{...record.payload,items:Array.from({length:20},(_,i)=>({description:`Rad ${i+1}: sponsorarbete och ungdomsverksamhet i föreningen. `.repeat(4),quantity:1,unit_price:100}))}}));}
console.log('PASS: exact decimal rounding, valid PDF header, Swedish letters, exempt text and draft export rejection.');
