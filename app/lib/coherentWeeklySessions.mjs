// FC Kindmark: one coherent 75-minute session, progressively built from activation to match play.
// Coaching draft. Confirm positions, workload and available players before use.
const plan=[
 {title:'1. Aktivering med boll och snabbhet',minutes:10,organisation:'Två stationer: koordinationsstege (eller markerade rutor) och passningsyta 12×12 m. Spelarna arbetar i par; korta accelerationer 5–10 m.',
 steps:['0–3 min: lätt löpning och dynamiska rörelser med boll.','3–6 min: 2–3 korta stegmönster genom stegen; accelerera 5 m efter sista rutan.','6–10 min: längre passningar i par med mottagning i rörelse; byt fot och riktning.','Inga maximala sprinter utan successiv uppvärmning.'],
 say:'Orientera dig innan du tar emot; första touchen förbereder nästa pass.',
 observe:'Teknik i fart och kontrollerade accelerationer.'},
 {title:'2. A–B–C–D: skapa passning ut mot kanten',minutes:15,organisation:'Fyra startpositioner: A centralt längre bak, B centralt framför A, C i inre korridoren och D i yttre korridoren. En boll per grupp, 12–20 m mellan positionerna beroende på nivå.',
 steps:['A passar B och löper ut mot kanten.','B spelar till C med öppen kroppsställning.','C spelar i ytan mot D.','D möter, tar emot och spelar tillbaka in mot startpunkten.','Rotera A→B→C→D→A efter varje sekvens. Börja utan försvarare, öka sedan fart och tajming.'],
 say:'Passningen till ytan måste komma före löpningen blir offside eller stannar.',
 observe:'Rätt fot, kroppsvinkel, tajming och avstånd mellan pass och löpning.'},
 {title:'3. Samma A–B–C–D till inlägg och avslut',minutes:15,organisation:'Behåll samma fyra startpunkter, förläng kanten mot straffområdet. Lägg till målvakt och två avslutare, med rotation efter varje omgång.',
 steps:['Starta med exakt samma A–B–C-kombination.','D spelar vidare till den fria kantspelaren eller driver själv till inläggsläge.','En avslutare attackerar första stolpen, en annan bortre ytan; en tredje spelare kan stanna för snett-inåt-bakåt-pass.','Slå inlägg på rörelse, avsluta och samla bollen direkt.','Byt sida efter halva tiden så båda fötter och båda kanter tränas.'],
 say:'Titta upp före inlägg; anfallarna måste komma med fart, inte vänta i boxen.',
 observe:'Inläggets höjd och yta, löpningarnas startögonblick och avslut med balans.'},
 {title:'4. Inlägg mot aktivt försvar',minutes:15,organisation:'Samma utgångskombination och inläggszon, nu två försvarare i boxen och en försvarare som pressar kanten. Spela mot målvakt.',
 steps:['Starta i A med samma rörelsemönster som i övning 2 och 3.','Kantförsvararen väljer att pressa tidigt eller skydda inläggslinjen.','Om tidig press: använd väggspel med understöd. Om backen faller: driv fram och slå inlägg.','Om boxen skyddar första stolpen: sök bortre ytan eller cutback.','Efter brytning spelar försvararna till markerat utgångsmål och anfallet återpressar kort.'],
 say:'Lös situationen som uppstår – slå inte inlägg bara för att övningen heter inlägg.',
 observe:'Beslut före inlägg, stöd bakom boll, första och bortre löpning, balans efter avslut.'},
 {title:'5. Riktat spel med fri lösning',minutes:15,organisation:'Spela smålagsspel med målvakter och två breda inläggskorridorer. Anpassa spelplan och lagstorlek till närvaro.',
 steps:['Första två minuterna: visa hur A–B–C–D-principen kan uppstå naturligt i spel.','Spela i korta matcher med snabb omstart.','Mål efter inlägg ger extra poäng; vanliga mål räknas också så spelarna kan välja bästa lösning.','Om kanten är stängd: spela genom mitten eller byt kant, inte tvinga fram inlägg.','Stoppa endast kort vid ett tydligt lärmoment; låt annars spelarna lösa problemet.'],
 say:'När är kanten fri? Vem attackerar första, bortre och cutback-ytan?',
 observe:'Överföring till match, val av avslut, avstånd och motpress.'},
 {title:'6. Nedvarvning och reflektion',minutes:5,organisation:'Samla laget på planen. Lugn gång och lätt rörlighet.',
 steps:['Sänk tempot och samla in material.','Fråga: När valde vi rätt tillfälle för inlägg?','Fråga: Vad gjorde vi när motståndaren stängde kanten?','Ge en konkret sak att ta med till nästa match.'],
 say:'Vad såg du innan du valde lösning?',observe:'Spelarnas egna förklaringar och förståelse.'}
];
const variations=[
 ['Kanten fri','Spela igenom kombinationen och slå inlägg i fart.'],
 ['Ytterback pressar tidigt','Kantspelaren lägger tillbaka och löper bakom för väggspel.'],
 ['Första stolpen är stängd','Sök bortre stolpen med sen löpning.'],
 ['Försvararna faller djupt','Driv närmare och spela snett inåt bakåt till sen ankomst.'],
 ['Båda kanterna är stängda','Spela tillbaka via C, vänd spelet eller avsluta centralt.']
];
function sketch(index){
 const base=[[80,155,'A','blue'],[135,118,'B','blue'],[195,100,'C','blue'],[265,60,'D','blue']];
 const players=[...base];
 if(index>=2)players.push([330,135,'9','blue'],[348,220,'11','blue']);
 if(index>=3)players.push([285,115,'X','red'],[340,165,'Y','red'],[365,195,'Z','red']);
 const paths=index===0?['M80 155L135 118']:index===1?['M80 155L135 118','M135 118L195 100','M195 100L265 60']:['M80 155L135 118','M135 118L195 100','M195 100L265 60','M265 60L330 135'];
 return {players,balls:[[96,155]],goals:index>=2,goalSide:'right',paths,kinds:paths.map((_,i)=>i===3?'run':'pass'),caption:'A–B–C–D: steg '+(index+1)+'. Förenklad organisationsskiss, inte skalenlig.'};
}
export const COHERENT_WEEKLY_SESSIONS=['football','futsal'].map(sport=>({
 id:sport+'-coherent-cross-finishing',sport,age:'14–16',status:'draft',version:1,
 title:'Inlägg & avslut · från A–B–C–D till matchspel',minutes:75,players:sport==='futsal'?10:14,
 goal:'Utveckla korrekt passning ut till kanten, tajmade inlägg och avslut genom ett sammanhängande pass.',
 equipment:'8–12 bollar, koner, västar, koordinationsstege (valfri), två mål och målvaktshandskar.',
 principle:'Röd tråd: aktivering → A–B–C–D → samma kombination med inlägg → aktivt försvar → spel → nedvarvning.',
 ballPriority:'Få köer, två parallella grupper vid stor trupp, snabb rotation.',
 blocks:plan.map((p,i)=>({...p,timing:p.minutes+' min',restart:'Ny boll till A efter varje avslut.',rotation:'Byt startposition efter varje repetition.',easier:'Större yta och passivt motstånd.',harder:'Aktivt motstånd och kortare tid.',diagram:sketch(i),variations:i>=2&&i<=4?variations.map(([name,response])=>({name,response})):[]})),
 coachPreparation:'Välj passet i början av veckan. Kontrollera spelarantal, målvakt, plan, inläggszoner, mål och bollar. Läs alla sex delar innan träningen.',
 coachQuestions:['Kan spelarna förklara varför passningen går via B och C?','Vilken rörelse öppnar kanten?','När ska inlägget slås och när ska laget spela tillbaka?']
}));
