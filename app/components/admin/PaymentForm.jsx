"use client";
import {useState} from "react";
import {Button,Input} from "../UI";
import {paymentPayload,CLUB_SWISH,CLUB_BANKGIRO} from "../../lib/payments";
import {stockholmToday} from "../../lib/schedule";
export default function PaymentForm({payment,players,members=[],onSave,onClose,busy}) {
  const [form,setForm]=useState(()=>({player_id:payment?.player_id || '',player_name:payment?.player_name || '',amount:payment?.amount ?? '',description:payment?.description || '',swish:payment?.swish || CLUB_SWISH,bankgiro:payment?.bankgiro || CLUB_BANKGIRO,reference:payment?.reference || '',paid_reference:payment?.paid_reference || '',due_date:payment?.due_date || '',paid_date:payment?.paid_date || '',status:payment?.status || 'pending',member_id:payment?.member_id || '',membership_no:payment?.membership_no || null,membership_year:payment?.membership_year || new Date().getFullYear(),payment_kind:payment?.payment_kind || 'other',payer_name:payment?.payer_name || '',bank_message:payment?.bank_message || ''}));
  const [error,setError]=useState('');
  const [verified,setVerified]=useState(false);
  function chooseMember(id){const member=members.find(m=>m.id===id);setForm(f=>({...f,member_id:id,membership_no:member?.membership_no || null,player_id:member?.player_id || '',player_name:member?.name || f.player_name,reference:f.payment_kind==='membership' && member ? `${member.membership_no}-${f.membership_year}` : f.reference}));}
  function choosePlayer(id){const matches=members.filter(m=>m.player_id===id);const member=id && matches.length===1 ? matches[0]:null;setForm(f=>({...f,player_id:id,member_id:member?.id || '',membership_no:member?.membership_no || null,reference:f.payment_kind==='membership' && member ? `${member.membership_no}-${f.membership_year}` : f.reference}));}
  function change(key,value){setForm(f=>({...f,[key]:value,...((key==='membership_year' || key==='payment_kind') && f.membership_no && (key==='payment_kind' ? value==='membership':f.payment_kind==='membership') ? {reference:`${f.membership_no}-${key==='membership_year' ? value:f.membership_year}`} : {}),...(key==='status' ? {paid_date:value==='paid' ? f.paid_date || stockholmToday() : ''} : {})}));}
  async function submit(e){e.preventDefault();setError('');try{if(form.status==='paid' && !verified)throw new Error('Bekräfta först att betalningen har kommit in på klubbens konto.');await onSave(paymentPayload(form,players,members));}catch(err){setError(err.message);}}
  return <form onSubmit={submit}><h3 id="payment-form-title">{payment ? 'Ändra betalning' : 'Lägg till betalning'}</h3>{error && <p className="error-banner" role="alert">{error}</p>}<fieldset disabled={busy} className="payment-fieldset"><div className="form-grid">
    <label className="field">Avgiftstyp<select value={form.payment_kind} onChange={e=>change('payment_kind',e.target.value)}><option value="other">Annan betalning / utrustning</option><option value="membership">Medlemsavgift</option></select></label>
    <label className="field">Medlem<select value={form.member_id} onChange={e=>chooseMember(e.target.value)}><option value="">Koppla senare</option>{members.map(m=><option key={m.id} value={m.id}>{m.membership_no} · {m.name}</option>)}</select></label>
    {form.payment_kind==='membership' && <label className="field">Medlemsår<Input required type="number" min="1900" max="2200" value={form.membership_year} onChange={e=>change('membership_year',e.target.value)}/></label>}
    {form.payment_kind==='membership' && form.membership_no && <div className="field"><span>Medlemsreferens: {form.membership_no}-{form.membership_year}</span><Button variant="secondary" onClick={()=>change('reference',`${form.membership_no}-${form.membership_year}`)}>Använd medlemsreferens</Button></div>}
    <label className="field">Spelare<select value={form.player_id} onChange={e=>choosePlayer(e.target.value)}><option value="">Ange namn utan spelarkoppling</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {!form.player_id && <label className="field">Namn<Input required value={form.player_name} onChange={e=>change('player_name',e.target.value)}/></label>}
    <label className="field">Belopp (SEK)<Input required inputMode="decimal" placeholder="150,00" value={form.amount} onChange={e=>change('amount',e.target.value)}/></label>
    <label className="field">Beskrivning<Input placeholder="Medlemsavgift" value={form.description} onChange={e=>change('description',e.target.value)}/></label>
    <label className="field">Status<select value={form.status} onChange={e=>change('status',e.target.value)}><option value="pending">Väntande</option><option value="paid">Betald</option></select></label>
    <label className="field">Förfallodatum<Input type="date" value={form.due_date} onChange={e=>change('due_date',e.target.value)}/></label>
    {form.status==='paid' && <label className="field">Betaldatum<Input type="date" value={form.paid_date} onChange={e=>change('paid_date',e.target.value)}/></label>}
    {form.status==='paid' && <><label className="field">Mottagen betalning – transaktionsreferens<Input required placeholder="Referens från Swish eller bankkontot" value={form.paid_reference} onChange={e=>change('paid_reference',e.target.value)}/></label><label className="payment-verification"><input type="checkbox" required checked={verified} onChange={e=>setVerified(e.target.checked)}/> Jag har kontrollerat att betalningen har kommit in på klubbens konto.</label></>}
    <label className="field">Betalarens namn<Input placeholder="Namn i banktransaktionen" value={form.payer_name} onChange={e=>change('payer_name',e.target.value)}/></label>
    <label className="field">Ursprungligt bankmeddelande<Input placeholder="Kopiera namn / meddelande från den faktiska uppgiften" value={form.bank_message} onChange={e=>change('bank_message',e.target.value)}/></label>
    <label className="field">Betalningsreferens / meddelande<Input value={form.reference} onChange={e=>change('reference',e.target.value)}/></label>
    <label className="field">Swish<Input value={form.swish} onChange={e=>change('swish',e.target.value)}/></label>
    <label className="field">Bankgiro<Input value={form.bankgiro} onChange={e=>change('bankgiro',e.target.value)}/></label>
  </div><div className="button-group"><Button type="submit" disabled={busy}>{busy ? 'Sparar…' : 'Spara betalning'}</Button><Button variant="secondary" disabled={busy} onClick={onClose}>Avbryt</Button></div></fieldset></form>;
}
