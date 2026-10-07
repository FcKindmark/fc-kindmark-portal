"use client";
import {useState} from "react";
import {Button,Input} from "../UI";
import {paymentPayload} from "../../lib/payments";
import {stockholmToday} from "../../lib/schedule";
export default function PaymentForm({payment,players,onSave,onClose,busy}) {
  const [form,setForm]=useState(()=>({player_id:payment?.player_id || '',player_name:payment?.player_name || '',amount:payment?.amount ?? '',description:payment?.description || '',swish:payment ? payment.swish || '' : '1230830323',bankgiro:payment?.bankgiro || '',reference:payment?.reference || '',due_date:payment?.due_date || '',paid_date:payment?.paid_date || '',status:payment?.status || 'pending'}));
  const [error,setError]=useState('');
  function change(key,value){setForm(f=>({...f,[key]:value,...(key==='status' ? {paid_date:value==='paid' ? f.paid_date || stockholmToday() : ''} : {})}));}
  async function submit(e){e.preventDefault();setError('');try{await onSave(paymentPayload(form,players));}catch(err){setError(err.message);}}
  return <form onSubmit={submit}><h3 id="payment-form-title">{payment ? 'Ändra betalning' : 'Lägg till betalning'}</h3>{error && <p className="error-banner" role="alert">{error}</p>}<fieldset disabled={busy} className="payment-fieldset"><div className="form-grid">
    <label className="field">Spelare<select value={form.player_id} onChange={e=>change('player_id',e.target.value)}><option value="">Ange namn utan spelarkoppling</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {!form.player_id && <label className="field">Namn<Input required value={form.player_name} onChange={e=>change('player_name',e.target.value)}/></label>}
    <label className="field">Belopp (SEK)<Input required inputMode="decimal" placeholder="150,00" value={form.amount} onChange={e=>change('amount',e.target.value)}/></label>
    <label className="field">Beskrivning<Input placeholder="Medlemsavgift" value={form.description} onChange={e=>change('description',e.target.value)}/></label>
    <label className="field">Status<select value={form.status} onChange={e=>change('status',e.target.value)}><option value="pending">Väntande</option><option value="paid">Betald</option></select></label>
    <label className="field">Förfallodatum<Input type="date" value={form.due_date} onChange={e=>change('due_date',e.target.value)}/></label>
    {form.status==='paid' && <label className="field">Betaldatum<Input type="date" value={form.paid_date} onChange={e=>change('paid_date',e.target.value)}/></label>}
    <label className="field">Referens / OCR<Input value={form.reference} onChange={e=>change('reference',e.target.value)}/></label>
    <label className="field">Swish<Input value={form.swish} onChange={e=>change('swish',e.target.value)}/></label>
    <label className="field">Bankgiro<Input value={form.bankgiro} onChange={e=>change('bankgiro',e.target.value)}/></label>
  </div><div className="button-group"><Button type="submit" disabled={busy}>{busy ? 'Sparar…' : 'Spara betalning'}</Button><Button variant="secondary" disabled={busy} onClick={onClose}>Avbryt</Button></div></fieldset></form>;
}
