// Focused FC Kindmark curriculum: five consecutive drills, five scripted opponent reactions per drill.
// Coach-review drafts: verify geometry and local player numbers before use.
const themes=[
 ['Defensive Organisation','Kompakt block','Skydda centrum','Flytta tillsammans','Styr spelet utåt','Försvara inlägg','Återställ blocket'],
 ['Defensive Transitions','Direkt reaktion','Första press','Andra spelaren täcker','Säkra djupet','Återerövra eller falla'],
 ['Attacking Transitions','Första pass framåt','2 mot 1','3 mot 2','Löpningar bakom','Avsluta kontring'],
 ['Pressing Triggers','Dålig första touch','Bakåtpass','Felvänd mottagare','Pass mot sidlinjen','Gemensam pressignal'],
 ['Breaking Press','Målvakt som stöd','Tredje man','Vänd spel','Spela bakom press','Lös dubbelpress'],
 ['Overloads & Underloads','2 mot 1','3 mot 2','4 mot 3','2 mot 3','3 mot 4'],
 ['Switching Play','Locka ena sidan','Tillbakaspel','Central spelvändning','Diagonal spelvändning','Attackera bortre kanten'],
 ['Set Pieces','Hörna kort','Hörna lång','Frispark','Inkast eller kick-in','Försvara fast situation'],
 ['Crosses & Cutbacks','Överlapp','Tidigt inlägg','Första stolpen','Cutback','Andra stolpen'],
 ['Finishing Under Pressure','Första touch och skott','Avslut efter väggspel','Avslut med jagande back','Retur och andraboll','Avslut efter spelvändning'],
 ['Game Management','Ledning ett mål','Underläge ett mål','Sista fem minuterna','Spelare färre','Kontrollera omstarter'],
 ['Futsal Special Situations','Pivot under press','Kick-in under press','Flying goalkeeper 5 mot 4','Försvara 4 mot 5','Omställning efter målvaktsräddning']
];
const responses=[
 ['Press från insidan','Hitta utsidan eller understöd bakom boll'],
 ['Press från utsidan','Spela via halvyta eller tredje spelare'],
 ['Två försvarare kliver samtidigt','Lura pressen och byt sida snabbt'],
 ['Försvararna faller och stänger djup','Behåll boll, flytta blocket och växla tempo'],
 ['Motståndaren vinner bollen','Fördröj, täck mitten och återställ balans']
];
function drawing(theme,drill,sport){
 const x=65+drill*54,y=75+(theme%4)*42;
 const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
 const a=[x,y],b=[cap(x+50,30,380),cap(y-38,30,280)],c=[cap(x+93,30,380),cap(y+30,30,280)];
 return {players:[[...a,'1','blue'],[...b,'2','blue'],[...c,'3','blue'],[cap(x+32,30,380),cap(y-12,30,280),'X','red'],[cap(x+88,30,380),cap(y-15,30,280),'Y','red']],
 balls:[[cap(x+18,30,395),y]],goals:true,
 paths:['M'+x+' '+y+'L'+b[0]+' '+b[1],'M'+b[0]+' '+b[1]+'L'+c[0]+' '+c[1]],
 kinds:['pass','run'],caption:themes[theme][0]+' · övning '+(drill+1)+' · '+sport+'. Schematisk skiss för tränargranskning.'};
}
export const FOCUSED_TACTICAL_SESSIONS=['football','futsal'].flatMap(sport=>themes.map((topic,t)=>({
 id:sport+'-focused-'+t,sport,age:'14–16',status:'draft',version:1,
 title:topic[0]+' · fem övningar',minutes:75,players:sport==='futsal'?10:14,
 goal:'Träna '+topic[0].toLowerCase()+' med fem matchnära moment och förutbestämda motståndarreaktioner.',
 equipment:'Bollar, koner, västar och två mål.',
 principle:'Ett komplett 75-minuterspass: fem övningar à 15 minuter, i given ordning. Fem reaktioner tränas inom varje övning; tränaren behöver inte välja.',
 ballPriority:'Korta instruktioner, 60–90 sekunders omgångar och snabb omstart.',
 blocks:topic.slice(1).map((name,i)=>({
  title:(i+1)+'. '+name,minutes:15,timing:'15 min · 5 min grundläge + 5 min aktivt motstånd + 5 min matchspel',
  organisation:sport==='futsal'?'4 mot 4 med målvakter; använd halvplan vid behov.':'6 mot 6 med målvakter; anpassa ytan till övningens mål.',
  steps:[
   'Spelsituation: '+name+'. Visa startpositioner och två möjliga utvägar.',
   'Minut 0–5: repetera med passivt försvar och korta coachningsstopp.',
   'Minut 5–10: försvararna introducerar följande reaktioner i denna ordning:',
   ...responses.map((r,j)=>(j+1)+'. '+r[0]+' → '+r[1]+'.'),
   'Minut 10–15: riktat spel mot mål, tränaren startar om samma matchsituation. Byt roller efter varje omgång.'
  ],
  diagram:drawing(t,i,sport),
  say:'Läs försvararnas val. Hitta lösningen som är öppen, inte en förutbestämd passning.',
  observe:'Orientering före mottagning, avstånd, pressignal, timing och reaktion vid bolltapp.',
  restart:'Ny boll direkt i dagens utgångsläge.',rotation:'Byt anfall och försvar efter varje omgång.',
  easier:'Passiv press och större yta.',harder:'Aktiv press och begränsad beslutstid.'
 }))
})));
