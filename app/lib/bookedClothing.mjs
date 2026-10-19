import {paymentCategory} from './paymentFilters.mjs';

// Project existing posted allocations into the payment list without writing
// payment rows or changing the ledger. Linked payment rows take precedence.
export function withBookedClothing(payments,economy={},players=[],members=[]){
 const rows=[...payments],journal=economy.journal||[],links=economy.payment_links||[];
 const reversed=new Set(journal.filter(j=>j.status==='posted'&&j.reversal_of).map(j=>j.reversal_of));
 const people=new Map(players.map(p=>[p.id,p])),cards=new Map(members.map(m=>[m.id,m]));
 const paymentMap=new Map(payments.map(p=>[p.id,p]));
 for(const entry of journal){
  if(entry.status!=='posted'||entry.reversal_of||reversed.has(entry.id))continue;
  const selection=(economy.settlement_selections||[]).find(s=>s.journal_id===entry.id);
  const linked=[...new Set([...links.filter(l=>l.journal_id===entry.id).map(l=>l.payment_id),...(selection?.payment_ids||[])])].map(id=>paymentMap.get(id)).filter(Boolean);
  const represented=new Map();
  for(const p of linked.filter(p=>p.status==='paid'&&paymentCategory(p)==='clothing')){
   const key=p.player_id||cards.get(p.member_id)?.player_id||p.member_id||'';
   represented.set(key,(represented.get(key)||0)+Math.round(Number(p.amount)*100));
  }
  const candidates=new Map();
  for(const p of linked){
   const member=cards.get(p.member_id),player=people.get(p.player_id||member?.player_id);
   const key=player?.id||p.player_id||member?.id||p.member_id;
   if(key)candidates.set(key,{player_id:player?.id||p.player_id||null,member_id:p.member_id||null,player_name:player?.name||member?.name||p.player_name});
  }
  for(const [index,allocation] of (selection?.income_allocations||[]).entries()){
   if(allocation.category!=='clothing')continue;
   const member=cards.get(allocation.member_id);
   const player=people.get(allocation.player_id||member?.player_id);
   const explicit=allocation.player_id||allocation.member_id;
   const person=explicit?{player_id:player?.id||allocation.player_id||null,member_id:allocation.member_id||null,player_name:player?.name||member?.name||allocation.person_name}:!allocation.person_name&&candidates.size===1?[...candidates.values()][0]:{player_id:null,member_id:null,player_name:allocation.person_name};
   let amount=Math.round(Number(allocation.amount)*100);
   if(!Number.isFinite(amount)||amount<=0)continue;
   const key=person.player_id||person.member_id||'';
   const covered=Math.min(amount,represented.get(key)||0);
   represented.set(key,Math.max(0,(represented.get(key)||0)-covered));amount-=covered;
   if(!amount)continue;
   rows.push({id:`booked-clothing:${entry.id}:${index}`,...person,player_name:person.player_name||'Utan personkoppling',amount:amount/100,status:'paid',payment_kind:'other',payment_category:'clothing',description:'Kläder och utrustning',paid_date:entry.date,reference:entry.number?`Verifikation ${entry.number}/${entry.year||entry.date.slice(0,4)}`:'Bokförd inbetalning',bank_message:allocation.note||'',read_only:true,source_journal_id:entry.id});
  }
 }
 return rows;
}
