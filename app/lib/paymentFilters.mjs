export const PAYMENT_CATEGORIES=[['membership','Medlemsavgift'],['clothing','Kläder och utrustning'],['training','Träningsavgift'],['equipment','Utrustning'],['other','Övrigt']];
export function paymentCategory(payment){return payment.payment_kind==='membership'?'membership':PAYMENT_CATEGORIES.some(([id])=>id===payment.payment_category&&id!=='membership')?payment.payment_category:'other';}
export function paymentYear(payment){return String(payment.membership_year||String(payment.paid_date||payment.due_date||payment.created_at||'').slice(0,4));}
export function filterPayments(payments,{query='',status='all',category='all',team='all',year='all',today=''},players=[],members=[]){
 const needle=query.trim().toLocaleLowerCase('sv');
 const playerMap=new Map(players.map(p=>[p.id,p]));const memberMap=new Map(members.map(m=>[m.id,m]));
 return payments.filter(p=>{
  const member=memberMap.get(p.member_id),player=playerMap.get(p.player_id||member?.player_id);
  if(category!=='all'&&paymentCategory(p)!==category)return false;
  if(year!=='all'&&paymentYear(p)!==String(year))return false;
  if(team!=='all'&&(team==='none'?Boolean(player?.team_id):player?.team_id!==team))return false;
  if(status!=='all'&&(status==='overdue'?!(p.status==='pending'&&p.due_date&&p.due_date<today):p.status!==status))return false;
  return !needle||[PAYMENT_CATEGORIES.find(([id])=>id===paymentCategory(p))?.[1],paymentCategory(p)==='clothing'?'Träningskläder':null,p.player_name,player?.name,member?.name,p.membership_no,p.description,p.reference,p.paid_reference,p.payer_name,p.bank_message].filter(v=>v!=null).join(' ').toLocaleLowerCase('sv').includes(needle);
 });
}
export function membershipFeeStatus(member,payments,year){const fee=payments.find(p=>p.member_id===member.id&&p.payment_kind==='membership'&&Number(p.membership_year)===Number(year));return fee?fee.status==='paid'?'paid':'pending':'missing';}
