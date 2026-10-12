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


const attackingPhases=[
 ['Build-up Play','Bygg spel från målvakt och backlinje','Första presslinjen stänger korta alternativ','Skapa överläge bakom första presslinjen'],
 ['Positional Play','Behåll struktur och hitta spelare mellan linjerna','Motståndaren flyttar kompakt och stänger mitten','Locka över, skapa tredje man och byt spelriktning'],
 ['Hold-up Ball Play','Ta emot felvänd, skydda boll och koppla in stöd','Försvararen pressar i ryggen och understöd skärs av','Skydda boll, tajma understöd och frigör tredje spelare'],
 ['Attack & Finishing','Skapa avslut från sista tredjedelen','Backlinjen skyddar boxen och blockerar inspel','Skapa instick, cutback eller avslut på bortre yta']
];
const attackingLanes=['vänster kant','vänster halvyta','centrum','höger halvyta','höger kant'];
function phaseDrawing(lane,phase,step){
 const x=phase===0?65:phase===1?145:phase===2?205:260;
 const y=45+lane*50,clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const x2=clamp(x+45+step*6,30,385),y2=clamp(y-35,30,285);
 return {players:[[x,y,'B','blue'],[clamp(x-45,30,385),clamp(y+27,30,285),'S','blue'],[x2,y2,'3','blue'],[clamp(x+80,30,385),clamp(y+35,30,285),'4','blue'],[clamp(x+25,30,385),clamp(y-12,30,285),'X','red'],[clamp(x+75,30,385),clamp(y+10,30,285),'Y','red']],
 balls:[[clamp(x+18,30,395),y]],goals:true,
 paths:['M'+x+' '+y+'L'+x2+' '+y2,'M'+clamp(x+80,30,385)+' '+clamp(y+35,30,285)+'L'+clamp(x+95+step*8,30,395)+' '+clamp(y+5,30,285)],
 kinds:['pass','run'],caption:attackingPhases[phase][0]+' · '+attackingLanes[lane]+' · övning '+(step+1)+'. Schematisk bild för tränargranskning.'};
}
export const ATTACKING_PHASE_SESSIONS=['football','futsal'].flatMap(sport=>attackingPhases.flatMap(([phase,objective,opposition,response],p)=>attackingLanes.map((lane,l)=>({
 id:sport+'-phase-'+p+'-'+l,sport,age:'14–16',status:'draft',version:1,
 title:phase+' · '+lane,minutes:75,players:sport==='futsal'?10:14,
 goal:objective+' via '+lane+'. '+response+'.',
 equipment:'Bollar, koner, västar, zonmarkeringar och två mål.',
 principle:'Färdigt pass, fyra övningar i fast ordning. Spelarna läser motståndaren och väljer mellan två lösningar.',
 ballPriority:'Direkt omstart efter varje avslut eller bolltapp.',
 blocks:[15,15,20,25].map((minutes,step)=>({
  title:['1. Grundrörelse och stöd','2. Känn igen motståndarens val','3. Spela igenom aktiv press','4. Matchspel med avslut'][step],
  minutes,timing:minutes+' min',
  organisation:sport==='futsal'?'4 mot 4 plus målvakter, markera fem korridorer.':'6 mot 6 plus målvakter, markera fem korridorer.',
  steps:['Startläge: boll i '+lane+'. Fokus: '+objective+'.',
   'Försvararnas uppgift: '+opposition+'.',
   'Lösning A: '+response+'.',
   'Lösning B: om första vägen stängs, använd understöd bakom bollen och byt spelriktning.',
   step===0?'Börja utan aktiv press och repetera rörelser.':step===1?'Försvararna växlar mellan att stänga insidan och utsidan.':step===2?'Spela aktivt mot mål med tidsbegränsning.':'Fritt spel, men tränaren återstartar från dagens zon och poängsätter rätt beslut.',
   'Efter bolltapp: närmaste fördröjer och balansspelaren skyddar mitten.'],
  diagram:phaseDrawing(l,p,step),say:'Var är den fria spelaren när motståndaren flyttar?',
  observe:'Scanning, stödvinkel, timing, beslut och avslutskvalitet.',
  restart:'Tränaren lägger in ny boll i '+lane+'.',
  rotation:'Byt anfall och försvar varannan omgång.',
  easier:'Större yta och passiv press.',harder:'Aktiv press och kortare beslutstid.'
 }))
}))));


const advancedThemes=[
 ['Pressing','Styr motståndaren mot förutbestämd pressfälla','Motståndaren spelar förbi första pressen','Närmaste pressar, nästa täcker passningslinjen och tredje skyddar djupet.'],
 ['Second Ball','Vinn ytan kring förväntad andraboll','Motståndaren vinner första luftduellen','En utmanar första boll, två läser nedslaget, balansspelare stoppar omställning.'],
 ['Third-Man Attack','Frigör tredje spelare bakom motståndarens linje','Första mottagaren är hårt markerad','Spela till felvänd stödspelare som sätter tredje spelare i fart.'],
 ['Target Man','Använd felvänd target som länk i anfallet','Mittback pressar target i ryggen','Target skyddar bollen och lägger av till understöd eller vänder när pressen släpper.'],
 ['Second-Man Runs','Tajma understöd och djupledslöpning runt bollhållaren','Första spelaren drar på sig två försvarare','Andra spelaren attackerar ytan bakom eller erbjuder snett understöd.']
];
const advancedMinutes=[15,15,20,25];
function advancedSketch(theme,lane,stage){
 const x=theme===0?100:theme===1?170:theme===2?195:theme===3?240:270;
 const y=45+lane*49,cap=(v,a,b)=>Math.max(a,Math.min(b,v));
 const a=[x,y],b=[cap(x+48,30,385),cap(y-34,30,285)],c=[cap(x+94,30,385),cap(y+20,30,285)];
 return {players:[[...a,'1','blue'],[...b,'2','blue'],[...c,'3','blue'],[cap(x+23,30,385),cap(y-17,30,285),'X','red'],[cap(x+75,30,385),cap(y+5,30,285),'Y','red']],balls:[[cap(x+18,30,390),y]],goals:true,paths:['M'+a[0]+' '+a[1]+'L'+b[0]+' '+b[1],'M'+b[0]+' '+b[1]+'L'+c[0]+' '+c[1],'M'+c[0]+' '+c[1]+'L'+cap(c[0]+20+stage*5,30,390)+' '+cap(c[1]-25,30,285)],kinds:['pass','pass','run'],caption:advancedThemes[theme][0]+' · '+attackingLanes[lane]+' · del '+(stage+1)+'. Tränarskiss för granskning.'};
}
export const ADVANCED_TACTICAL_SESSIONS=['football','futsal'].flatMap(sport=>advancedThemes.flatMap(([theme,aim,problem,solution],t)=>attackingLanes.map((lane,l)=>({
 id:sport+'-advanced-'+t+'-'+l,sport,age:'14–16',status:'draft',version:1,
 title:theme+' · '+lane,minutes:75,players:sport==='futsal'?10:14,
 goal:aim+'. '+problem+'.',
 equipment:'Bollar, koner, västar och mål.',
 principle:'Komplett tränarlett pass: fyra fasta moment med ökande motstånd.',
 ballPriority:'Flera bollar för snabb återstart.',
 blocks:advancedMinutes.map((minutes,stage)=>({
 title:['1. Grundmönster','2. Läs motståndarens reaktion','3. Beslut med aktivt motstånd','4. Matchspel och omställning'][stage],
 minutes,timing:minutes+' min',
 organisation:sport==='futsal'?'4 mot 4 med målvakter; fem markerade korridorer.':'6 mot 6 med målvakter; fem markerade korridorer.',
 steps:['Starta i '+lane+'. Målet är: '+aim+'.','Motståndaren gör detta: '+problem+'.','Lösning som ska tränas: '+solution+'.',stage===0?'Repetera först med passivt motstånd.':stage===1?'Låt försvararna växla mellan att stänga inre och yttre pass.':stage===2?'Aktivt motstånd med mål och snabb omstart.':'Fritt spel med omstarter i startzonen och fokus på rätt beslut.','Vid bolltapp: skydda centralt och agera tillsammans.'],
 diagram:advancedSketch(t,l,stage),say:'Läs motståndarens position innan du väljer.',
 observe:'Avstånd, tajming, orientering, reaktion på brytning.',
 restart:'Tränaren spelar in ny boll i startzonen.',rotation:'Byt roller varje omgång.',
 easier:'Passiv press och mer utrymme.',harder:'Aktiv press och mindre utrymme.'
 }))
}))));
