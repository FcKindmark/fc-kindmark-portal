import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) Object.defineProperty(globalThis,"crypto",{value:webcrypto});
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path,'utf8')).toString('base64'));
const {invoiceFields}=await load('app/lib/economy-documents.js');
assert.deepEqual(invoiceFields('Leverantör: LEGEA AB\nFakturadatum: 2026-10-08\nFörfallodatum: 2026-11-08\nFakturanummer: INV-300\nAtt betala: 1 250,50 SEK'),{document_date:'2026-10-08',due_date:'2026-11-08',amount:1250.50,reference:'INV-300',party:'LEGEA AB'});
assert.equal(invoiceFields('Fakturadatum: 2026-02-30').document_date,undefined);
assert.equal(invoiceFields('Förfallodatum: 2026-11-08').document_date,undefined);
assert.equal(invoiceFields('Moms: 250,00\nBankgiro: 123-4567').amount,undefined);
const {makeBackup,verifyBackup,readStoredZip,zipStored}=await load('app/lib/economy-backup.js');
const snapshot={documents:[{name:'kvitto.pdf',path:'test/kvitto.pdf'}],journal:[{id:'j'}],audit:[]};
const bytes=await makeBackup(snapshot,async()=>new Blob(['Original evidence']));
assert.equal((await verifyBackup(bytes)).documents,1);
fs.writeFileSync('/tmp/kindmark-backup-test.zip',bytes);
const files=readStoredZip(bytes);
files['originals/test/kvitto.pdf']=new TextEncoder().encode('Modified evidence');
await assert.rejects(()=>verifyBackup(zipStored(files)),/Kontrollsumman/);
delete files['originals/test/kvitto.pdf'];await assert.rejects(()=>verifyBackup(zipStored(files)),/Kontrollsumman/);
await assert.rejects(()=>makeBackup(snapshot,async()=>{throw Error('Storage unavailable');}),/Storage unavailable/);
console.log('PASS: labelled invoice extraction, invalid date rejection, portable full backup, checksum validation and missing originals.');

assert.deepEqual(invoiceFields('Faktureras till\nExample Sponsor AB\nFakturanummer [0001]\nFakturadatum 2026-06-30\nFörfallodatum 2026-07-30\nSponsring\nAtt betala 1 000 kr'), {document_date:'2026-06-30',due_date:'2026-07-30',amount:1000,reference:'0001',party:'Example Sponsor AB',kind:'sponsor'});
const foreign=invoiceFields('EXAMPLE S.P.A.\nTipo documento Nr. Data documento\nFattura proforma FPR26-00001 07/09/2026\nTotale fattura\nEUR\n1.175,82');
assert.equal(foreign.document_date,'2026-09-07');assert.equal(foreign.reference,'FPR26-00001');assert.equal(foreign.currency,'EUR');assert.equal(foreign.original_amount,1175.82);assert.equal(foreign.amount,undefined);assert.equal(foreign.proforma,true);
assert.equal(invoiceFields('Data documento: 31/02/2026').document_date,undefined);
const {pdfTextRows}=await load('app/lib/economy-documents.js');
assert.equal(pdfTextRows([{str:'1000 kr',transform:[1,0,0,1,200,50]},{str:'Att betala',transform:[1,0,0,1,10,50]},{str:'Faktura',transform:[1,0,0,1,10,100]}]),'Faktura\nAtt betala 1000 kr');
console.log('PASS: whole-krona totals, bracketed invoice numbers, outgoing sponsor, EUR proforma, European dates and PDF row order.');

assert.equal(invoiceFields('Fakturadatum:\n2026 - 09 - 07\nFörfallodatum:\n2026-09-30').document_date,'2026-09-07');
assert.equal(invoiceFields('Fakturadatum:\n2026 - 09 - 07\nFörfallodatum:\n2026-09-30').due_date,'2026-09-30');
assert.equal(invoiceFields('Dokument Fakturadatum: 7/9/2026').document_date,'2026-09-07');
assert.equal(invoiceFields('Fakturadatum: Förfallodatum 2026-09-30').document_date,undefined);
console.log('PASS: split PDF date rows, spaced separators, inline labels and no due-date substitution.');

assert.equal(pdfTextRows([{str:'S',width:7,height:11,transform:[1,0,0,1,0,100]},{str:'kene',width:25,height:11,transform:[1,0,0,1,7,100]},{str:'Pizzeria',width:40,height:11,transform:[1,0,0,1,35,100]}]),'Skene Pizzeria');

const {invoicePartner}=await load('app/lib/economy-documents.js');
const partnerFields={kind:'sponsor',party:' Example AB ',document_date:'2026-09-07'};
const partnerRows=[{id:'one',kind:'sponsor',year:2026,name:'example ab'},{id:'old',kind:'sponsor',year:2025,name:'Example AB'}];
assert.equal(invoicePartner(partnerFields,partnerRows),'one');
assert.equal(invoicePartner({...partnerFields,party:'Unknown'},partnerRows),'');
assert.equal(invoicePartner(partnerFields,[...partnerRows,{...partnerRows[0],id:'duplicate'}]),'');
assert.equal(invoicePartner({...partnerFields,kind:'purchase'},partnerRows),'');
console.log('PASS: exact sponsor/year linking; unknown and ambiguous parties require manual selection.');
