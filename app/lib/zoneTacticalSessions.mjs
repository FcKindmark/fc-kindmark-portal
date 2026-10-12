// FC Kindmark zone-based training drafts. Review diagrams before field use.
const lanes=['Vänster kant','Vänster halvyta','Centrum','Höger halvyta','Höger kant'];
const thirds=['Egen tredjedel','Mittzon','Sista tredjedelen'];
const minutes=[15,15,20,25];
const reactions=[
 ['Press från insidan','Spela utåt eller tillbaka'],
 ['Press från utsidan','Hitta halvyta eller centrum'],
 ['Dubbelpress','Vänd via tredje spelare'],
 ['Bollen bryts','Motpress eller fall hem']
];
function diagram(l,t,b){
 const x=65+t*100,y=45+l*50,clip=v=>Math.max(30,Math.min(390,v));
 return {players:[[x,y,'B','blue'],[clip(x+55),clip(y+32),'2','blue'],[clip(x+110),clip(y-20),'3','blue'],[clip(x+45),clip(y-27),'X','red'],[clip(x+125),clip(y+20),'Y','red']],balls:[[x+17,y]],goals:true,paths:['M'+x+' '+y+'L'+clip(x+55)+' '+clip(y+32),'M'+clip(x+110)+' '+clip(y-20)+'L'+clip(x+120+b*12)+' '+clip(y-30)],kinds:['pass','run'],caption:lanes[l]+' · '+thirds[t]+' · del '+(b+1)+'. Schematisk tränarskiss.'};
}
export const ZONE_TACTICAL_SESSIONS=['futsal','football'].flatMap(sport=>lanes.flatMap((lane,l)=>thirds.map((third,t)=>({
 id:sport+'-zone-'+l+'-'+t,sport,age:'14–16',status:'draft',version:1,
 title:lane+' · '+third,minutes:75,players:sport==='futsal'?10:14,
 goal:'Lös spel från '+lane.toLowerCase()+' i '+third.toLowerCase()+' när motståndaren ändrar pressriktning.',
 equipment:'Bollar, västar, koner, två mål och markerade zoner.',
 principle:'Färdigt pass i fast ordning: mönster, igenkänning, aktiv press, fritt spel.',
 ballPriority:'Korta instruktioner och många omstarter med boll.',
 blocks:minutes.map((m,b)=>{
  const r=reactions[(l+t+b)%4];
  return {title:['Lär rörelsen','Läs pressen','Välj under press','Anpassa i spel'][b],minutes:m,timing:m+' min',
   organisation:sport==='futsal'?'4 mot 4 plus målvakter på markerad futsalplan.':'6 mot 6 plus målvakter på markerad halvplan.',
   steps:['Starta med boll i '+lane+', '+third+'.','Visa två möjliga vägar förbi pressen.','Motståndaren: '+r[0]+'. Lagets alternativ: '+r[1]+'.','Spela mot mål; starta om från samma zon och rotera roller.'],
   diagram:diagram(l,t,b),say:'Se pressen innan du bestämmer dig.',observe:'Orientering, stödvinkel, tempo och beslut.',restart:'Ny boll i dagens startzon.',rotation:'Byt roller efter varje omgång.',easier:'Passiv press.',harder:'Aktiv press med kortare beslutstid.'};
 })
}))));
