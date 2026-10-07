"use client";
import {useState} from "react";
import {Card,Input,Button,Empty,Badge} from "../UI";
import {supabase} from "../../lib/supabaseClient";
import {stockholmToday} from "../../lib/schedule";
import {overdue,sek,CLUB_SWISH,CLUB_BANKGIRO} from "../../lib/payments";
import {downloadMembershipReport,confirmedMemberCount,membershipPayments} from "../../lib/membershipReport";
import PaymentInstructions from "../PaymentInstructions";
import PaymentForm from "./PaymentForm";
export default function PaymentsTab({data,onUpdate}) {
  const payments=data?.payments || [],players=data?.players || [],members=data?.memberCards || [];
  const [editor,setEditor]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const today=stockholmToday();
  const [reportYear,setReportYear]=useState(new Date().getFullYear());
  const reportYears=[...new Set([new Date().getFullYear(),...payments.map(p=>p.membership_year).filter(Boolean)])].sort((a,b)=>b-a);
  const rows=payments.filter(p=>(filter==='all' || (filter==='overdue' ? overdue(p,today) : p.status===filter)) && `${p.player_name || ''} ${p.description || ''} ${p.reference || ''}`.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')));
  async function write(operation,success){
    setBusy(true);setError('');setNotice('');
    try{const result=await operation();if(result.error)throw result.error;if(!result.data?.length)throw new Error('Posten kunde inte sparas. Uppdatera sidan och försök igen.');setEditor(null);await onUpdate();setNotice(success);}
    catch(err){setError(err.message);throw err;}finally{setBusy(false);}
  }
  async function save(payload){await write(()=>editor.payment ? supabase.from('payments').update(payload).eq('id',editor.payment.id).select('id') : supabase.from('payments').insert(payload).select('id'),'Betalningen har sparats.');}
  async function status(payment){if(payment.status!=='paid'){setError('');setEditor({payment:{...payment,status:'paid',paid_date:today}});return;}if(!confirm('Markera betalningen som väntande igen?'))return;try{await write(()=>supabase.from('payments').update({status:'pending',paid_date:null,paid_reference:null}).eq('id',payment.id).select('id'),'Betalningsstatus har uppdaterats.');}catch{}}
  async function remove(payment){if(!confirm(`Ta bort betalningsposten för ${payment.player_name}, ${sek(payment.amount)}? En genomförd bankbetalning återbetalas inte.`))return;try{await write(()=>supabase.from('payments').delete().eq('id',payment.id).select('id'),'Betalningsposten har tagits bort.');}catch{}}
  return <>
    <div className="page-heading"><h2>Betalningar</h2><Button disabled={busy} onClick={()=>{setError('');setEditor({payment:null});}}>+ Lägg till betalning</Button></div>
    {error && !editor && <p role="alert" className="error-banner">{error}</p>}{notice && <p role="status">{notice}</p>}
    <Card className="payment-bank-details"><strong>FC Kindmark Idrottsförening</strong><p>Swish: {CLUB_SWISH} · Bankgiro: {CLUB_BANKGIRO}</p><p className="muted">Matcha namn, belopp och referens med den mottagna betalningen innan du markerar den som betald.</p></Card>
    <div className="payment-summary"><Card><span>Totalt</span><strong>{sek(payments.reduce((s,p)=>s+Number(p.amount || 0),0))}</strong></Card><Card><span>Väntande</span><strong>{sek(payments.filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.amount || 0),0))}</strong></Card><Card><span>Betalt</span><strong>{sek(payments.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount || 0),0))}</strong></Card></div>
    <Card className="payment-bank-details"><h3>Medlemsbetalningar – årslista</h3><div className="button-group"><select aria-label="Rapportår" value={reportYear} onChange={e=>setReportYear(Number(e.target.value))}>{reportYears.map(y=><option key={y} value={y}>{y}</option>)}</select><Button disabled={!membershipPayments(payments,reportYear).length} onClick={()=>downloadMembershipReport(payments,reportYear)}>Exportera medlemsbetalningar (CSV)</Button></div><p>{confirmedMemberCount(payments,reportYear)} medlemmar med kopplad, betald medlemsavgift och transaktionsreferens.</p><p className="muted">Endast poster märkta Medlemsavgift för valt år tas med. Kontrollera uppgifterna mot bankutdraget. Detta är klubbens underlag; uppgifter skickas inte automatiskt till RF eller kommunen.</p></Card>
    <div className="payment-filters"><Input aria-label="Sök betalningar" placeholder="Sök namn, beskrivning eller referens" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filtrera betalningsstatus" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Alla betalningar</option><option value="pending">Väntande</option><option value="paid">Betalda</option><option value="overdue">Förfallna</option></select><span>{rows.length} poster</span></div>
    {editor && <div className="club-modal"><Card role="dialog" aria-modal="true" aria-labelledby="payment-form-title"><PaymentForm key={editor.payment?.id || 'new'} payment={editor.payment} players={players} members={members} onSave={save} busy={busy} onClose={()=>setEditor(null)}/></Card></div>}
    {!rows.length ? <Empty message={payments.length ? 'Inga betalningar matchar filtret' : 'Inga betalningar än'}/> : <div className="payment-list">{rows.map(p=><Card key={p.id}>
      <div className="payment-row-heading"><div><h3>{p.player_name}</h3><p className="muted">{p.description || 'Betalning'}</p>{!p.player_id && <p className="muted">Utan spelarkoppling · välj spelare via Ändra</p>}</div><Badge variant={p.status==='paid' ? 'success':'pending'}>{p.status==='paid' ? 'Betald':overdue(p,today) ? 'Förfallen':'Väntande'}</Badge></div>
      <p className="payment-amount">{sek(p.amount)}</p><div className="payment-details">{p.membership_no && <p>Medlemsnummer: {p.membership_no}{p.membership_year ? ` · Medlemsår: ${p.membership_year}` : ''}</p>}{p.due_date && <p>Förfallodatum: {p.due_date}</p>}{p.status==='paid' && p.paid_date && <p>Betald: {p.paid_date}</p>}{p.status==='paid' && p.paid_reference && <p>Transaktionsreferens: {p.paid_reference}</p>}{p.reference && <p>Betalningsreferens: {p.reference}</p>}{p.swish && <p>Swish: <strong>{p.swish}</strong></p>}{p.bankgiro && <p>Bankgiro: <strong>{p.bankgiro}</strong></p>}</div>
      <PaymentInstructions payment={p}/><div className="button-group"><Button disabled={busy} onClick={()=>{setError('');setEditor({payment:p});}}>Ändra</Button><Button disabled={busy} variant="secondary" onClick={()=>status(p)}>{p.status==='paid' ? 'Markera väntande':'Markera betald'}</Button><Button disabled={busy} variant="danger" onClick={()=>remove(p)}>Ta bort</Button></div>
    </Card>)}</div>}
  </>;
}
