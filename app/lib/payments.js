import { stockholmToday } from './schedule.js';
export const CLUB_SWISH='1230830323';
export const CLUB_BANKGIRO='5246-1142';
export function paymentPayload(form, players, members=[]) {
  const raw=String(form.amount ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw)<=0 || Number(raw)>9999999999.99) throw new Error('Ange ett positivt belopp med högst två decimaler.');
  const player=players.find(p=>p.id===form.player_id);
  if(form.player_id && !player) throw new Error('Välj en giltig spelare.');
  const name=(player?.name || members.find(m=>m.id===form.member_id)?.name || form.player_name || '').trim();
  if(!name) throw new Error('Välj spelare eller ange namn.');
  if(!['pending','paid'].includes(form.status)) throw new Error('Välj en giltig status.');
  for(const key of ['due_date','paid_date']) {
    if(!form[key])continue;
    const date=new Date(`${form[key]}T12:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(form[key]) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==form[key]) throw new Error('Ange ett giltigt datum.');
  }
  if(form.status==='paid' && !(form.paid_reference || '').trim()) throw new Error('Ange transaktionsreferensen från den mottagna betalningen.');
  const member=members.find(m=>m.id===form.member_id);
  if(form.member_id && !member) throw new Error('Välj en giltig medlem.');
  if(form.payment_kind==='membership' && (!Number.isInteger(Number(form.membership_year)) || Number(form.membership_year)<1900 || Number(form.membership_year)>2200)) throw new Error('Ange vilket år medlemsavgiften gäller.');
  if(member && (member.player_id || null)!==(player?.id || null)) throw new Error('Medlemmen och spelarkopplingen måste stämma överens.');
  return {member_id:member?.id || null,membership_no:member?.membership_no || form.membership_no || null,membership_year:form.payment_kind==='membership' ? Number(form.membership_year) : null,payment_kind:form.payment_kind==='membership' ? 'membership':'other',payer_name:(form.payer_name || '').trim() || null,bank_message:(form.bank_message || '').trim() || null,paid_reference:form.status==='paid' ? form.paid_reference.trim() : null,player_id:player?.id || null,player_name:name,amount:Number(raw),description:(form.description || '').trim(),swish:(form.swish || '').trim() || null,bankgiro:(form.bankgiro || '').trim() || null,reference:(form.payment_kind==='membership' && member ? `${member.membership_no}-${form.membership_year}` : (form.reference || '').trim()) || null,status:form.status,due_date:form.due_date || null,paid_date:form.status==='paid' ? form.paid_date || stockholmToday() : null};
}
export function overdue(payment, today=stockholmToday()) {return payment.status==='pending' && !!payment.due_date && payment.due_date<today;}
export function sek(amount) {return new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK'}).format(Number(amount)||0);}
export function swishPaymentLink(payment){
  const payee=String(payment.swish || CLUB_SWISH).replace(/\s/g,'');
  const amount=Number(payment.amount);
  if(!/^\d{10}$/.test(payee) || !Number.isFinite(amount) || amount<=0)return null;
  const params=new URLSearchParams({sw:payee,amt:amount.toFixed(2),cur:'SEK',msg:String(payment.reference || payment.player_name || '').slice(0,50)});
  return `https://app.swish.nu/1/p/sw/?${params}`;
}
