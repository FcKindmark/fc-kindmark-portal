"use client";
import {useState} from "react";
import {Card,Input,Button,Empty,Badge} from "../UI";
import {supabase} from "../../lib/supabaseClient";
import {stockholmToday} from "../../lib/schedule";
import {overdue,sek,CLUB_SWISH,CLUB_BANKGIRO} from "../../lib/payments";
import {downloadMembershipReport,confirmedMemberCount,membershipPayments} from "../../lib/membershipReport";
import PaymentInstructions from "../PaymentInstructions";
import {PAYMENT_CATEGORIES,paymentCategory,paymentYear,filterPayments} from "../../lib/paymentFilters.mjs";
import MembershipFees from "./MembershipFees";
import PlayerPaymentCorrection from "./PlayerPaymentCorrection";
import PaymentForm from "./PaymentForm";
export default function PaymentsTab({data,onUpdate,initialView="payments"}) {
  const [correction,setCorrection]=useState(null);
  const [view,setView]=useState(initialView);
  const payments=data?.payments || [],players=data?.players || [],members=data?.memberCards || [];
  const [editor,setEditor]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const today=stockholmToday();
  const [category,setCategory]=useState('all'),[team,setTeam]=useState('all'),[year,setYear]=useState('all');
  const years=[...new Set(payments.map(paymentYear).filter(Boolean))].sort().reverse();
  const [reportYear,setReportYear]=useState(new Date().getFullYear());
  const reportYears=[...new Set([new Date().getFullYear(),...payments.map(p=>p.membership_year).filter(Boolean)])].sort((a,b)=>b-a);
  const rows=filterPayments(payments,{query,status:filter,category,team,year,today},players,members);
  async function write(operation,success){
    setBusy(true);setError('');setNotice('');
    try{const result=await operation();if(result.error)throw result.error;if(!result.data?.length)throw new Error('Posten kunde inte sparas. Uppdatera sidan och försök igen.');setEditor(null);await onUpdate();setNotice(success);}
    catch(err){setError(err.message);throw err;}finally{setBusy(false);}
  }
  async function save(payload){await write(()=>editor.payment ? supabase.from('payments').update(payload).eq('id',editor.payment.id).select('id') : supabase.from('payments').insert(payload).select('id'),'Betalningen har sparats.');}
  async function status(payment){if(payment.status!=='paid'){setError('');setEditor({payment:{...payment,status:'paid',paid_date:today}});return;}if(!confirm('Markera betalningen som väntande igen?'))return;try{await write(()=>supabase.from('payments').update({status:'pending',paid_date:null,paid_reference:null}).eq('id',payment.id).select('id'),'Betalningsstatus har uppdaterats.');}catch{}}
  async function remove(payment){if(!confirm(`Ta bort betalningsposten för ${payment.player_name}, ${sek(payment.amount)}? En genomförd bankbetalning återbetalas inte.`))return;try{await write(()=>supabase.from('payments').delete().eq('id',payment.id).select('id'),'Betalningsposten har tagits bort.');}catch{}}
  return <>
    <div className="page-heading"><h2>Betalningar</h2><div className="button-group"><Button disabled={busy} onClick={()=>{setError('');setEditor({payment:null});}}>+ Lägg till betalning</Button></div></div>
    {error && !editor && <p role="alert" className="error-banner">{error}</p>}{notice && <p role="status">{notice}</p>}
    {view==="payments"&&<div className="payment-summary"><Card><span>Summa för valt filter</span><strong>{sek(rows.reduce((s,p)=>s+Number(p.amount || 0),0))}</strong></Card><Card><span>Väntande</span><strong>{sek(rows.filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.amount || 0),0))}</strong></Card><Card><span>Betalt</span><strong>{sek(rows.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount || 0),0))}</strong></Card></div>}
    <div className="payment-view-tabs" role="group" aria-label="Betalningsvy">{[["payments","Betalningar"],["fees","Medlemsavgifter"],["reports","Rapporter"]].map(([id,label])=><Button key={id} variant={view===id?"primary":"secondary"} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</Button>)}</div>
    {view === "fees" && <MembershipFees members={members} payments={payments} onUpdate={onUpdate}/>}
    {view === "reports" && <Card className="payment-bank-details"><h3>Medlemsbetalningar – årslista</h3><div className="button-group"><select aria-label="Rapportår" value={reportYear} onChange={e=>setReportYear(Number(e.target.value))}>{reportYears.map(y=><option key={y} value={y}>{y}</option>)}</select><Button disabled={!membershipPayments(payments,reportYear).length} onClick={()=>downloadMembershipReport(payments,reportYear)}>Exportera medlemsbetalningar (CSV)</Button></div><p>{confirmedMemberCount(payments,reportYear)} medlemmar med kopplad, betald medlemsavgift och transaktionsreferens.</p><p className="muted">Endast poster märkta Medlemsavgift för valt år tas med. Kontrollera uppgifterna mot bankutdraget. Detta är klubbens underlag; uppgifter skickas inte automatiskt till RF eller kommunen.</p></Card>}
    {view === "payments" && <>
    <details className="payment-bank-panel"><summary>Swish och Bankgiro</summary><Card className="payment-bank-details"><strong>FC Kindmark Idrottsförening</strong><p>Swish: {CLUB_SWISH} · Bankgiro: {CLUB_BANKGIRO}</p><p className="muted">Matcha namn, belopp och referens med den mottagna betalningen innan du markerar den som betald.</p></Card></details>
    <div className="payment-filters"><Input aria-label="Sök betalningar" placeholder="Sök namn, beskrivning eller referens" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filtrera betalningsstatus" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Alla statusar</option><option value="pending">Obetalda / väntande</option><option value="paid">Betalda</option><option value="overdue">Förfallna</option></select><select aria-label="Filtrera avgiftstyp" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Alla avgiftstyper</option>{PAYMENT_CATEGORIES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><select aria-label="Filtrera betalningar efter lag" value={team} onChange={e=>setTeam(e.target.value)}><option value="all">Alla lag</option><option value="none">Utan lag / personlig medlem</option>{(data?.teams||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select aria-label="Filtrera betalningsår" value={year} onChange={e=>setYear(e.target.value)}><option value="all">Alla år</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select><Button variant="secondary" onClick={()=>{setQuery("");setFilter("all");setCategory("all");setTeam("all");setYear("all");}}>Rensa filter</Button><span role="status">{rows.length} av {payments.length} poster</span></div>

    {!rows.length ? <Empty message={payments.length ? 'Inga betalningar matchar filtret' : 'Inga betalningar än'}/> : <div className="payment-list">{rows.map(p=><Card key={p.id}>
      <div className="payment-row-heading"><div><h3>{p.player_name}</h3><p className="muted">{PAYMENT_CATEGORIES.find(([id])=>id===paymentCategory(p))?.[1]} · {p.description || "Betalning"}</p>{!p.player_id && !p.member_id && <p className="muted">Utan spelarkoppling · välj spelare via Ändra</p>}</div><Badge variant={p.status==='paid' ? 'success':'pending'}>{p.status==='paid' ? 'Betald':overdue(p,today) ? 'Förfallen':'Väntande'}</Badge></div>
      <p className="payment-amount">{sek(p.amount)}</p>{p.due_date && <p className="muted">Förfallodatum: {p.due_date}</p>}<details className="payment-extra"><summary>Referens och betalningsdetaljer</summary><div className="payment-details">{p.membership_no && <p>Medlemsnummer: {p.membership_no}{p.membership_year ? ` · Medlemsår: ${p.membership_year}` : ''}</p>}{p.due_date && <p>Förfallodatum: {p.due_date}</p>}{p.status==='paid' && p.paid_date && <p>Betald: {p.paid_date}</p>}{p.status==='paid' && p.paid_reference && <p>Transaktionsreferens: {p.paid_reference}</p>}{p.reference && <p>Betalningsreferens: {p.reference}</p>}{p.swish && <p>Swish: <strong>{p.swish}</strong></p>}{p.bankgiro && <p>Bankgiro: <strong>{p.bankgiro}</strong></p>}</div></details>
      <details className="payment-extra"><summary>Betalningsinstruktioner</summary><PaymentInstructions payment={p}/></details><div className="button-group"><Button disabled={busy} variant="secondary" onClick={()=>{setError('');setEditor({payment:p});}}>Ändra</Button><Button disabled={busy} variant={p.status==='paid'?'secondary':'primary'} onClick={()=>status(p)}>{p.status==='paid' ? 'Markera väntande':'Markera betald'}</Button>{p.status==="paid"&&p.payment_kind==="membership"&&Number(p.amount)===50&&p.player_id&&<Button disabled={busy} variant="secondary" onClick={()=>setCorrection(p)}>Rätta spelare · 850 SEK</Button>}<Button disabled={busy} variant="danger" onClick={()=>remove(p)}>Ta bort</Button></div>
    </Card>)}</div>}
    </>}
    {correction&&<PlayerPaymentCorrection payment={correction} players={players} onClose={()=>setCorrection(null)} onSaved={async()=>{await onUpdate();setNotice("Rättelsen är genomförd. 50 SEK medlemsavgift och 800 SEK träningskläder är kopplade till rätt spelare.");}}/>}
    {editor && <div className="club-modal"><Card role="dialog" aria-modal="true" aria-labelledby="payment-form-title"><PaymentForm key={editor.payment?.id || 'new'} payment={editor.payment} players={players} members={members} onSave={save} busy={busy} onClose={()=>setEditor(null)}/></Card></div>}
  </>;
}
