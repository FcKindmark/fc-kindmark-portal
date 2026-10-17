export function activeFamilyMessages(data,invitations){
 const targets=new Map((data.messageTargets||[]).map(t=>[t.message_id,t]));
 return (data.messages||[]).filter(message=>{
  const target=targets.get(message.id);
  if(!target)return true;
  const called=invitations.filter(i=>i.kind===target.event_kind&&i.event.id===target.event_id);
  return !called.length||called.some(i=>i.answer!==true&&i.answer!==false);
 });
}
export function familyInvitations(data,players){
 const people=new Map(players.map(p=>[p.id,p]));
 return [{kind:"training",events:data.trainings||[],calls:data.trainingCalls||[],replies:data.trainingReplies||[],idKey:"training_id",valueKey:"attended"},{kind:"match",events:data.matches||[],calls:data.matchCalls||[],replies:data.matchReplies||[],idKey:"match_id",valueKey:"attending"}].flatMap(group=>{
  const activities=new Map(group.events.map(e=>[e.id,e]));
  return group.calls.flatMap(call=>{
   const event=activities.get(call[group.idKey]),player=people.get(call.player_id);
   if(!event||!player||event.team_id!==player.team_id)return [];
   const reply=group.replies.find(r=>r[group.idKey]===event.id&&r.player_id===player.id);
   return [{key:`${group.kind}:${event.id}:${player.id}`,kind:group.kind,event,player,answer:reply?.[group.valueKey]??undefined}];
  });
 }).sort((a,b)=>`${a.event.date} ${a.event.time||""}`.localeCompare(`${b.event.date} ${b.event.time||""}`));
}
export function familyNotifications(data,invitations,today){
 const read=new Set((data.messageReads||[]).map(r=>r.message_id));
 const unread=activeFamilyMessages(data,invitations).filter(m=>!read.has(m.id));
 const notices=new Map();
 for(const item of invitations){
  if(item.answer!==undefined||item.event.date<today)continue;
  const key=`${item.kind}:${item.event.id}`;
  const existing=notices.get(key);
  if(existing)existing.players.push(item.player.name);
  else notices.set(key,{id:key,tab:"calls",kind:item.kind,eventId:item.event.id,title:item.kind==="match"?`Match mot ${item.event.opponent}`:"Kallelse till träning",detail:`${item.event.date} · ${item.event.time?.slice(0,5)||"Tid ej angiven"}`,players:[item.player.name],messageIds:[]});
 }
 for(const message of unread){
  const target=(data.messageTargets||[]).find(t=>t.message_id===message.id),key=target?`${target.event_kind}:${target.event_id}`:`message:${message.id}`;
  if(notices.has(key)){notices.get(key).messageIds.push(message.id);continue;}
  notices.set(key,{id:key,tab:target?"calls":"messages",kind:target?.event_kind,eventId:target?.event_id,messageId:message.id,messageIds:[message.id],title:message.subject,detail:"Nytt meddelande",players:[]});
 }
 return {unreadCount:unread.length,pendingCount:invitations.filter(i=>i.answer===undefined&&i.event.date>=today).length,notifications:[...notices.values()]};
}
