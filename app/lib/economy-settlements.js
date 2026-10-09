import { cents } from './economy';
import { SWISH_INCOME } from './swish-income';

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
  const controlBalance=data.lines.filter(l=>ids.has(l.journal_id) && l.account===control).reduce((n,l)=>n+(incomingInvoice(d)?1:-1)*(cents(l.debit)-cents(l.credit)),0)
    -allocations.filter(a=>a.document_id===d.id && a.account===control && posted.has(a.journal_id)).reduce((n,a)=>n+cents(a.amount),0)
    +data.journal.filter(j=>posted.has(j.id) && j.bank_id && j.document_id===d.id && !allocations.some(a=>a.journal_id===j.id)).reduce((n,j)=>n+data.lines.filter(l=>l.journal_id===j.id && l.account===control).reduce((n,l)=>n+(incomingInvoice(d)?1:-1)*(cents(l.debit)-cents(l.credit)),0),0);
  const advance=allocations.filter(a=>a.document_id===d.id && a.account==='1480' && posted.has(a.journal_id)).reduce((n,a)=>n+cents(a.amount),0)
    -data.lines.filter(l=>ids.has(l.journal_id) && l.account==='1480').reduce((n,l)=>n+cents(l.credit)-cents(l.debit),0);
  const needsCorrection=booked && controlBalance!==Math.max(0,cents(d.amount)-paid);
  return {advance:Math.max(0,advance)/100,needsCorrection,controlBalance:controlBalance/100,paid:paid/100,remaining:Math.max(0,cents(d.amount)-paid)/100,booked,account:booked?control:d.kind==='sponsor'?'3910':d.kind==='grant'?'3980':incomingInvoice(d)?'3990':'6990'};
}
export function settlementProposal(bank, allocations, paymentIds, data, payments, incomeAllocations = [], bankFee = 0) {
  const incoming=Number(bank.amount)>0, total=cents(Math.abs(bank.amount));
  const fee=cents(bankFee);
  if(!Number.isFinite(fee) || fee<0)throw Error('Kontrollera bankprovisionen.');
  const target=total+(incoming?fee:-fee);
  if(target<0)throw Error('Bankprovisionen överstiger bankbeloppet.');
  const lines=[{account:'1930',debit:incoming?total/100:0,credit:incoming?0:total/100}];
  if(fee>0)lines.push({account:'6570',debit:fee/100,credit:0});
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
    const account=!incoming && bank.date<d.document_date?'1480':state.booked?state.account:(a.account || state.account);
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
  const incomeSeen=new Set();
  for(const a of incomeAllocations){
    const category=SWISH_INCOME[a.category],amount=cents(a.amount);
    if(!incoming || !category || incomeSeen.has(`${a.category}|${a.member_id || ''}|${a.player_id || ''}`) || !Number.isFinite(amount) || amount<=0)throw Error('Kontrollera inbetalningens fördelning.');
    incomeSeen.add(`${a.category}|${a.member_id || ''}|${a.player_id || ''}`);add(category.account,amount);allocated+=amount;
  }
  if(allocated>target) throw Error('Valda betalningar överstiger bankbeloppet.');
  return {date:bank.date,bank_id:bank.id,document_id:'',partner_id:'',description:bank.description || 'Samlad bankbetalning',document_allocations:documents,payment_ids:unique,income_allocations:incomeAllocations.map(a=>({category:a.category,amount:cents(a.amount)/100,member_id:a.member_id || null,player_id:a.player_id || null,note:(a.note || '').trim()})),bank_fee:fee/100,lines,remaining:(target-allocated)/100};
}

// Reopening or changing bank rows must preserve saved drafts, including old
// single-document drafts and payment selections written before allocations.
export function settlementDraft(bank, data) {
  const draft=data.journal.find(j=>j.bank_id===bank?.id && j.status==='draft');
  if(!draft)return {exists:false,documents:[],paymentIds:[],incomeAllocations:[],bankFee:0};
  let documents=(data.document_links || []).filter(a=>a.journal_id===draft.id).map(a=>({...a}));
  if(!documents.length){
    const d=data.documents.find(d=>d.id===draft.document_id && d.kind!=='statement');
    if(d){const state=invoiceSettlement(d,data);documents=[{document_id:d.id,amount:Math.min(Math.abs(Number(bank.amount)),state.remaining),account:state.account}];}
  }
  const saved=data.settlement_selections?.find(s=>s.journal_id===draft.id);
  const audit=(data.audit || []).filter(a=>a.entity_id===draft.id && ['save','post'].includes(a.action)).sort((a,b)=>new Date(b.at)-new Date(a.at)).find(a=>Array.isArray(a.detail?.payment_ids));
  const savedFee=Number(saved?.bank_fee ?? audit?.detail.bank_fee ?? 0);
  const hasAllocations=documents.length || saved?.payment_ids?.length || saved?.income_allocations?.length || audit?.detail.payment_ids?.length || audit?.detail.income_allocations?.length;
  const bankFee=savedFee>0?savedFee:hasAllocations?0:Math.max(0,(data.lines || []).filter(l=>l.journal_id===draft.id && l.account==='6570').reduce((n,l)=>n+cents(l.debit)-cents(l.credit),0)/100);
  return {exists:true,documents,bankFee,incomeAllocations:saved?.income_allocations || audit?.detail.income_allocations || [],paymentIds:saved?.payment_ids || audit?.detail.payment_ids || (data.payment_links || []).filter(a=>a.journal_id===draft.id).map(a=>a.payment_id)};
}

export function invoiceBookingProposal(d,data) {
 const state=invoiceSettlement(d,data),incoming=incomingInvoice(d);
 const account=d.kind==='sponsor'?'3910':d.kind==='grant'?'3980':incoming?'3990':'6990';
 if(incoming)return [{account:'1510',debit:Number(d.amount),credit:0},{account,debit:0,credit:Number(d.amount)}];
 if(state.advance>0 && state.booked)return [{account:'2440',debit:state.advance,credit:0},{account:'1480',debit:0,credit:state.advance}];
 const amount=(cents(d.amount)-cents(state.paid)+cents(state.advance))/100;
 return [{account,debit:amount,credit:0},...(state.advance>0?[{account:'1480',debit:0,credit:state.advance}]:[]),...(amount>state.advance?[{account:'2440',debit:0,credit:(cents(amount)-cents(state.advance))/100}]:[])];
}

// Report outstanding advances at the selected year end, including earlier payments.
export function supplierAdvances(data, year) {
  const cutoff = `${year}-12-31`;
  const snapshot = {...data, journal:data.journal.filter(j=>j.date<=cutoff)};
  return data.documents.filter(d=>['purchase','receipt'].includes(d.kind) && !d.is_proforma)
    .map(document=>({document,amount:invoiceSettlement(document,snapshot).advance}))
    .filter(a=>a.amount>0);
}
