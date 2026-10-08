import { cents } from './economy';

export const incomingInvoice = d => ['sales','sponsor','grant'].includes(d.kind);
export function invoiceSettlement(d, data) {
  const posted = new Set(data.journal.filter(j=>j.status==='posted').map(j=>j.id));
  const allocations = data.document_links || [];
  let paid = allocations.filter(a=>a.document_id===d.id && posted.has(a.journal_id)).reduce((n,a)=>n+cents(a.amount),0);
  // Old single-invoice postings remain readable without migrating accounting history.
  for (const j of data.journal.filter(j=>posted.has(j.id) && j.bank_id && j.document_id===d.id && !allocations.some(a=>a.journal_id===j.id))) {
    paid += data.lines.filter(l=>l.journal_id===j.id && l.account==='1930').reduce((n,l)=>n+(incomingInvoice(d)?1:-1)*(cents(l.debit)-cents(l.credit)),0);
  }
  const ids=new Set(data.journal.filter(j=>posted.has(j.id) && !j.bank_id && j.document_id===d.id).map(j=>j.id));
  const control=incomingInvoice(d)?'1510':'2440';
  const booked=data.lines.filter(l=>ids.has(l.journal_id) && l.account===control).reduce((n,l)=>n+(incomingInvoice(d)?1:-1)*(cents(l.debit)-cents(l.credit)),0)>0;
  return {paid:paid/100,remaining:Math.max(0,cents(d.amount)-paid)/100,booked,account:booked?control:d.kind==='sponsor'?'3910':d.kind==='grant'?'3980':incomingInvoice(d)?'3990':'6990'};
}
export function settlementProposal(bank, allocations, paymentIds, data, payments) {
  const incoming=Number(bank.amount)>0, total=cents(Math.abs(bank.amount));
  const lines=[{account:'1930',debit:incoming?total/100:0,credit:incoming?0:total/100}];
  let allocated=0;
  const seen=new Set(), documents=[];
  function add(account,amount) {
    const same=lines.find(l=>l.account===account);
    if(same) same[incoming?'credit':'debit']+=amount/100;
    else lines.push({account,debit:incoming?0:amount/100,credit:incoming?amount/100:0});
  }
  for(const a of allocations) {
    const d=data.documents.find(d=>d.id===a.document_id), amount=cents(a.amount);
    if(!d || seen.has(d.id) || d.is_proforma || !['sales','sponsor','grant','purchase','receipt'].includes(d.kind) || incomingInvoice(d)!==incoming) throw Error('Kontrollera fakturorna och betalningsriktningen.');
    seen.add(d.id);
    const state=invoiceSettlement(d,data);
    if(!Number.isFinite(amount) || amount<=0 || amount>cents(state.remaining)) throw Error('Beloppet måste rymmas i fakturans kvarvarande belopp.');
    const account=state.booked?state.account:(a.account || state.account);
    documents.push({document_id:d.id,amount:amount/100,account});add(account,amount);allocated+=amount;
  }
  const unique=[...new Set(paymentIds)];
  for(const id of unique) {
    const p=payments.find(p=>p.id===id);
    if(!incoming || !p || cents(p.amount)<=0) throw Error('Kontrollera medlemsbetalningen.');
    const linked=data.payment_links?.some(l=>l.payment_id===id && !data.journal.some(j=>j.reversal_of===l.journal_id));
    if(linked) throw Error('Betalningen är redan avstämd.');
    const amount=cents(p.amount);allocated+=amount;add(p.payment_kind==='membership'?'3901':'3990',amount);
  }
  if(allocated>total) throw Error('Valda betalningar överstiger bankbeloppet.');
  return {date:bank.date,bank_id:bank.id,document_id:'',partner_id:'',description:bank.description || 'Samlad bankbetalning',document_allocations:documents,payment_ids:unique,lines,remaining:(total-allocated)/100};
}
