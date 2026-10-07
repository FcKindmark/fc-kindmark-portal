import { stockholmToday } from './schedule.js';
export const CLUB_SWISH='1230830323';
export const CLUB_BANKGIRO='5246-1142';
export function paymentPayload(form, players) {
  const raw=String(form.amount ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw)<=0 || Number(raw)>9999999999.99) throw new Error('Ange ett positivt belopp med högst två decimaler.');
  const player=players.find(p=>p.id===form.player_id);
  if(form.player_id && !player) throw new Error('Välj en giltig spelare.');
  const name=(player?.name || form.player_name || '').trim();
  if(!name) throw new Error('Välj spelare eller ange namn.');
  if(!['pending','paid'].includes(form.status)) throw new Error('Välj en giltig status.');
  for(const key of ['due_date','paid_date']) {
    if(!form[key])continue;
    const date=new Date(`${form[key]}T12:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(form[key]) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==form[key]) throw new Error('Ange ett giltigt datum.');
  }
  if(form.status==='paid' && !(form.paid_reference || '').trim()) throw new Error('Ange transaktionsreferensen från den mottagna betalningen.');
  return {paid_reference:form.status==='paid' ? form.paid_reference.trim() : null,player_id:player?.id || null,player_name:name,amount:Number(raw),description:(form.description || '').trim(),swish:(form.swish || '').trim() || null,bankgiro:(form.bankgiro || '').trim() || null,reference:(form.reference || '').trim() || null,status:form.status,due_date:form.due_date || null,paid_date:form.status==='paid' ? form.paid_date || stockholmToday() : null};
}
export function overdue(payment, today=stockholmToday()) {return payment.status==='pending' && !!payment.due_date && payment.due_date<today;}
export function sek(amount) {return new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK'}).format(Number(amount)||0);}
