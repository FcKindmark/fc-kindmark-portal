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


const zoneProblems=[
 {name:'Högerback under hög press',lane:4,third:0,role:'Högerback',threat:'Yttern pressar utifrån och deras nia skär av passet till mittbacken.',choices:['Spela in i höger halvyta när deras mittfältare kliver ut.','Spela tillbaka via målvakten och vänd mot vänsterbacken.','Spela längs linjen bakom yttern om vår ytter är fri.'],loss:'Vid brytning: närmaste bromsar deras ytter, mittbacken täcker ytan bakom.'},
 {name:'Vänsterback låst vid linjen',lane:0,third:0,role:'Vänsterback',threat:'Ytter och central mittfältare bildar pressfälla mot sidlinjen.',choices:['Väggspela med innermittfältaren förbi pressen.','Spela tillbaka till vänster mittback och byt kant.','Lyft kontrollerat till ytter som löper bakom pressen.'],loss:'Skydda centrala korridoren innan ni jagar bollen vid linjen.'},
 {name:'Mittback lockar första presslinjen',lane:2,third:0,role:'Mittback',threat:'Anfallaren stänger ena mittbacken och pressar bollföraren i båge.',choices:['Driv framåt tills en mittfältare måste kliva.','Spela till fri sexa bakom första presslinjen.','Byt via målvakten till motsatt mittback.'],loss:'Närmaste mittfältare täcker centralt, mittbackar faller i balans.'},
 {name:'Sexan får bollen felvänd',lane:2,third:1,role:'Defensiv mittfältare',threat:'Deras tia attackerar ryggen vid mottagning.',choices:['Spela på ett tillslag tillbaka och löp ur skuggan.','Vänd mot fri sida om scanning visar utrymme.','Spela tredjemanspass till åttan.'],loss:'Säkra bakom mottagaren och förhindra direkt pass genom centrum.'},
 {name:'Höger ytter i två mot en',lane:4,third:2,role:'Höger ytter',threat:'Deras ytterback avvaktar och deras ytter jagar tillbaka.',choices:['Utmaning direkt om ytterbacken står ensam.','Väggspel med överlappande back när hjälpen kommer.','Spela snett bakåt till sen löpning i halvyta.'],loss:'Första press på boll, backen säkrar ytan bakom.'},
 {name:'Vänster halvyta mot kompakt block',lane:1,third:2,role:'Offensiv mittfältare',threat:'Deras sexa skär instick och mittbacken står kvar.',choices:['Locka sexan och släpp till överlappande ytter.','Spela tillbaka för spelvändning mot bortre kanten.','Gå själv i mellanrummet om mittbacken kliver ut.'],loss:'Skydda returpass in centralt och organisera restförsvar.'},
 {name:'Bollvinst centralt med fri högerkant',lane:2,third:1,role:'Central mittfältare',threat:'Deras backlinje faller medan en mittfältare försöker stoppa omställningen.',choices:['Första pass framåt mot löpande höger ytter.','Driv centralt och bind mittback innan instick.','Säkra bollen om motståndaren hunnit samla laget.'],loss:'Efter misslyckad kontring: direkt press på första pass, balansspelare kvar.'},
 {name:'Målvakt under tvåmannapress',lane:2,third:0,role:'Målvakt',threat:'Två anfallare pressar båda mittbackarna och lämnar en kant.',choices:['Spela snabbt till fri ytterback.','Lura press mot ena sidan och hitta motsatt mittback.','Spela förbi första presslinjen till fri central spelare.'],loss:'Backlinjen återgår omedelbart och stänger mitten.'}
];
const roleMinutes=[15,15,20,25];
function roleDiagram(problem,stage,sport){
 const bx=70+problem.third*100,by=48+problem.lane*50;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const a=[[bx,by,'B','blue'],[clamp(bx-48,30,390),clamp(by+32,30,290),'S','blue'],[clamp(bx+60,30,390),clamp(by-36,30,290),'3','blue'],[clamp(bx+104,30,390),clamp(by+32,30,290),'4','blue']];
 const x=[clamp(bx+27,30,390),clamp(by-20,30,290),'X','red'],y=[clamp(bx+75,30,390),clamp(by+20,30,290),'Y','red'];
 const target=a[stage%3+1],runner=a[(stage+1)%3+1];
 return {players:[...a,x,y],balls:[[clamp(bx+18,30,395),by]],goals:true,
 paths:['M'+bx+' '+by+'L'+target[0]+' '+target[1],'M'+runner[0]+' '+runner[1]+'L'+clamp(runner[0]+20+stage*8,30,395)+' '+clamp(runner[1]-25,30,290)],kinds:['pass','run'],
 caption:problem.name+' · del '+(stage+1)+' · schematisk startbild, ej verifierad motståndaranalys.'};
}
export const ROLE_PROBLEM_SESSIONS=['football','futsal'].flatMap(sport=>zoneProblems.map((p,index)=>({
 id:sport+'-role-problem-'+index,sport,age:'14–16',status:'draft',version:1,
 title:p.name+' · '+(sport==='futsal'?'Futsal':'Fotboll'),minutes:75,players:sport==='futsal'?10:14,
 goal:'Lös denna matchsituation: '+p.threat,
 equipment:'Två mål, bollar, koner och två västfärger.',
 principle:'Tränaren följer exakt fyra moment i ordning; alternativen är motståndarreaktioner inom övningen, inte separata övningsval.',
 ballPriority:'Ny boll direkt efter avslut eller brytning.',
 blocks:roleMinutes.map((m,stage)=>({
  title:['1. Repetera två utvägar','2. Läs försvararens pressvinkel','3. Aktivt försvar och omställning','4. Matchspel med återstart i problemzonen'][stage],
  minutes:m,timing:m+' min',
  organisation:sport==='futsal'?'4 mot 4 plus målvakter. Starta från utpekad zon.':'6 mot 6 plus målvakter. Starta från utpekad zon.',
  steps:['Placera bollen hos '+p.role+'. '+p.threat,
    'Första lösningen: '+p.choices[stage%3],
    'Om motståndaren stänger den: '+p.choices[(stage+1)%3],
    'Efter bollförlust: '+p.loss,
    'Spela '+(stage<2?'med styrd press och byt roller var 90:e sekund.':'med aktivt försvar mot mål; tränaren återstartar i samma zon.')],
  diagram:roleDiagram(p,stage,sport),say:'Vad stänger motståndaren, och vad blir då fritt?',
  observe:'Scannar bollhållaren? Finns en stödspelare bakom och en spelare bakom presslinjen?',
  restart:'Ny boll till '+p.role+' i startzonen.',rotation:'Byt försvar och anfall efter varje kort omgång.',
  easier:'Passiv press och extra neutral spelare.',harder:'Pressignal och kortare tid för beslut.'
 }))
})));
