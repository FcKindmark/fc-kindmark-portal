"use client";
import { useState } from 'react';
import { Button, Input, Select } from '../UI';
import { money, matchedBank, cents } from '../../lib/economy';
import { incomingInvoice, invoiceSettlement, settlementProposal, settlementDraft } from '../../lib/economy-settlements';

export default function SettlementPanel({data,payments,invoice,initialBank,onSave,onManual,busy,error}) {
  const [bankId,setBankId]=useState(initialBank?.id || '');
  const [selected,setSelected]=useState(()=>settlementDraft(initialBank,data).documents);
  const [paymentIds,setPaymentIds]=useState(()=>settlementDraft(initialBank,data).paymentIds);
  const [search,setSearch]=useState('');
  const bank=data.bank.find(b=>b.id===bankId);
  const state=invoice ? invoiceSettlement(invoice,data) : null;
  function chooseBank(id) {
    const b=data.bank.find(b=>b.id===id),saved=settlementDraft(b,data);setBankId(id);setPaymentIds(saved.paymentIds);
    setSelected(saved.exists ? saved.documents : invoice && b && state.remaining>0 ? [{document_id:invoice.id,amount:Math.min(state.remaining,Math.abs(b.amount)),account:state.account}] : []);
  }
  let proposal,problem='';
  try {if(bank) proposal=settlementProposal(bank,selected,paymentIds,data,payments);} catch(e) {problem=e.message;}
  const available=bank ? data.documents.filter(d=>d.document_date<=bank.date && !d.is_proforma && ['sales','sponsor','grant','purchase','receipt'].includes(d.kind) && incomingInvoice(d)===(bank.amount>0) && invoiceSettlement(d,data).remaining>0) : [];
  const visible=d=>`${d.party || d.player_name} ${d.reference || ''} ${d.description || ''}`.toLocaleLowerCase('sv').includes(search.toLocaleLowerCase('sv'));
  const usablePayments=payments.filter(p=>!data.payment_links.some(a=>a.payment_id===p.id && data.journal.some(j=>j.id===a.journal_id && j.status==='posted') && !data.journal.some(j=>j.reversal_of===a.journal_id)));
  return <div className="economy-settlement">
    {invoice && <>{state.needsCorrection && <p role="alert" className="economy-notice">Betalningen är kopplad. Bokförd fordran/skuld stämmer inte med kvarvarande fakturabelopp. Kontrollera rättelse i Bokföring innan bokslut; bokför inte betalningen igen.</p>}<p><strong>{invoice.party} · {invoice.reference}</strong></p><p>Fakturadatum {invoice.document_date} · Förfallodatum {invoice.due_date || 'Ej angivet'}</p><p>{incomingInvoice(invoice)?'Inbetalt':'Utbetalt'}: {money(state.paid)} · Kvar: <strong>{money(state.remaining)}</strong></p><details open><summary>Betalningshistorik</summary>{data.journal.filter(j=>j.status==='posted' && (j.document_id===invoice.id && j.bank_id || data.document_links?.some(a=>a.journal_id===j.id && a.document_id===invoice.id))).map(j=><p key={j.id}>{j.date} · {j.description} · {money(data.document_links?.find(a=>a.journal_id===j.id && a.document_id===invoice.id)?.amount ?? data.lines.filter(l=>l.journal_id===j.id && l.account==='1930').reduce((n,l)=>n+(incomingInvoice(invoice)?1:-1)*(Number(l.debit)-Number(l.credit)),0))}</p>)}</details></>}
    <label>Välj banktransaktion<Select value={bankId} onChange={e=>chooseBank(e.target.value)}><option value="">Välj inbetalning / utbetalning</option>{data.bank.filter(b=>!matchedBank(b,data.journal,data.lines) && (!invoice || (b.amount>0)===incomingInvoice(invoice) && b.date>=invoice.document_date)).map(b=><option key={b.id} value={b.id}>{b.date} · {b.description || b.reference} · {money(b.amount)}</option>)}</Select></label>
    {bank && <><p className="economy-notice">Bankbelopp: <strong>{money(Math.abs(bank.amount))}</strong> · Fördelat: {money(Math.abs(bank.amount)-(proposal?.remaining ?? Math.abs(bank.amount)))} · Kvar att fördela: <strong>{money(proposal?.remaining ?? Math.abs(bank.amount))}</strong></p><p>Välj alla fakturor och medlemsbetalningar som ingår i den samlade banktransaktionen. Du kan ange delbetalning på en faktura.</p><label>Sök namn eller referens<Input value={search} onChange={e=>setSearch(e.target.value)} /></label><h3>{bank.amount>0?'Kundfakturor / inbetalningar':'Leverantörsfakturor / utbetalningar'}</h3>
      {available.filter(visible).map(d=>{
        const a=selected.find(a=>a.document_id===d.id),remaining=invoiceSettlement(d,data).remaining;
        return <div className="settlement-row" key={d.id}><label className="economy-check"><input type="checkbox" checked={Boolean(a)} onChange={e=>setSelected(e.target.checked?[...selected,{document_id:d.id,amount:remaining,account:invoiceSettlement(d,data).account}]:selected.filter(a=>a.document_id!==d.id))} /><span>{d.party} · {d.reference}<small>Kvar {money(remaining)}</small></span></label>{a && <label>Belopp SEK<Input type="number" min="0.01" max={remaining} step="0.01" value={a.amount} onChange={e=>setSelected(selected.map(a=>a.document_id===d.id?{...a,amount:e.target.value}:a))} /></label>}</div>;
      })}
      {bank.amount>0 && <><h3>Medlemsbetalningar</h3>{usablePayments.filter(visible).map(p=><label className="economy-check" key={p.id}><input type="checkbox" checked={paymentIds.includes(p.id)} onChange={e=>setPaymentIds(e.target.checked?[...paymentIds,p.id]:paymentIds.filter(id=>id!==p.id))} /><span>{p.player_name} · {p.description} · {money(p.amount)}<small>{p.reference}</small></span></label>)}</>}
      {problem && <p role="alert" className="error-banner">{problem}</p>}{error && <p role="alert" className="error-banner">{error}</p>}
      {proposal && <details><summary>Visa konteringsförslag</summary><p>Kontrollera moms mot originalet. Fördelningen beräknar inte moms automatiskt. Bokför först fakturan med korrekt moms om beloppet behöver delas på moms och kostnad/intäkt.</p>{proposal.lines.map((l,i)=><p key={i}>{l.account} · Debet {money(l.debit)} · Kredit {money(l.credit)}</p>)}</details>}
      <div className="economy-actions"><Button disabled={busy || !proposal || cents(proposal.remaining)!==0 || !selected.length && !paymentIds.length} onClick={()=>onSave(proposal,'post')}>Bekräfta avstämning</Button><Button variant="secondary" disabled={busy || !proposal || cents(proposal.remaining)!==0 || !selected.length && !paymentIds.length} onClick={()=>onSave(proposal,'save')}>Spara utkast</Button></div>
      <details><summary>Annan transaktion eller avancerad kontering</summary><Button variant="secondary" disabled={busy} onClick={()=>onManual(bank)}>Öppna manuell kontering</Button></details>
    </>}
  </div>;
}
