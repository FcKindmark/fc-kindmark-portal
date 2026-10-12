import {EXERCISE_LIBRARY} from './exerciseLibrary.mjs';
// FC Kindmark curated weekly sessions. Each card is ONE complete 75-minute training.
// Coaching drafts: diagrams show organisation, not a substitute for coach validation.
const TOPICS=[
 {id:'passing',title:'Passning och spelbarhet',action:'passa och skapa ny passningsvinkel',pattern:'A spelar B, löper ur passningsskugga; B hittar C som spelar vidare till D',pressure:'Försvararen stänger passningen till C',choice:'B spelar tillbaka till A som hittar D på andra sidan',game:'Extra poäng efter tre passningar och spelvändning'},
 {id:'first-touch',title:'Första touch och orientering',action:'orientera sig och ta med bollen ur press',pattern:'A passar B, B öppnar kroppen och spelar C, C tar med mot D',pressure:'Försvararen pressar B från ena axeln',choice:'B tar första touch bort från press och hittar C eller A',game:'Poäng när första touch bryter en presslinje'},
 {id:'width',title:'Spelbredd och spelvändning',action:'öppna och byta anfallssida',pattern:'A spelar B, B lockar press, C ger understöd och D håller bortre bredd',pressure:'Försvaret överbelastar bollsidan',choice:'C spelar via A till fri D; attackera ytan före försvaret flyttar',game:'Poäng efter spelvändning och anfall mot mål'},
 {id:'cross',title:'Inlägg och avslut',action:'skapa kantläge och avsluta inlägg',pattern:'A spelar B och löper ut; B hittar C, C spelar D i ytan; D går till inlägg',pressure:'Ytterbacken stänger D och mittbacken skyddar första stolpen',choice:'D använder väggspel eller cutback; avslutare attackerar olika ytor',game:'Extra poäng för mål efter inlägg; vanliga mål räknas också'},
 {id:'third-man',title:'Tredje man och kombinationsspel',action:'spela förbi press via tredje spelare',pattern:'A spelar B, B lägger tillbaka till C, C spelar framåt till löpande D',pressure:'Försvararen markerar B tätt och stänger vändningen',choice:'B spelar på ett tillslag och D löper i rätt ögonblick',game:'Poäng för mål efter tredje-mans-kombination'},
 {id:'finishing',title:'Avslut efter kombination',action:'skapa skottläge med samspel',pattern:'A passar B, B väggspelar med C, D löper in i fri avslutsyta',pressure:'Försvararen stänger skottfoten eller målvakten går ut',choice:'D väljer tidigt skott, sidledspass eller extra touch',game:'Poäng för väl valt avslut efter samspel'},
 {id:'press',title:'Gemensam press och pressignaler',action:'känna igen pressignal och täcka bakom press',pattern:'A styr bollhållaren åt sidan, B stänger inåtpass, C täcker djupet och D säkrar bortre ytan',pressure:'Bollhållaren spelar bakåt eller vänder ur press',choice:'Pressa tillsammans vid bakåtpass; fall kompakt om pressen bryts',game:'Poäng vid bollvinst i markerad presszon'},
 {id:'defence',title:'Försvarsspel och täckning',action:'försvara centrum och hjälpa varandra',pattern:'A går mot boll, B täcker bakom, C skyddar mitten och D balanserar bortre sidan',pressure:'Anfallaren väggspelar eller byter sida',choice:'A bromsar, B täcker och laget flyttar tillsammans',game:'Poäng för bollvinst följd av kontrollerad uppspelning'},
 {id:'transition',title:'Omställning efter bollvinst',action:'vända bollvinst till anfall med balans',pattern:'A vinner boll, B ger kort stöd, C löper i djupet och D håller bredd',pressure:'Första passet framåt blockeras av återvändande försvarare',choice:'A hittar B och C i rätt ordning eller säkrar boll när ytan stängs',game:'Poäng för kontrollerad kontring inom kort tid'},
 {id:'possession',title:'Behålla boll under press',action:'skapa stöd och spela ur trånga ytor',pattern:'A passar B, C skapar diagonal vinkel och D ger stöd bakom press',pressure:'Två försvarare pressar samma bollhållare',choice:'Spela via tredje man eller säkert tillbaka och byt sida',game:'Poäng för att spela från en zon till en annan utan bolltapp'},
 {id:'setpiece',title:'Fasta situationer och andraboll',action:'ta en omstart och säkra nästa situation',pattern:'A startar kort, B spelar tillbaka, C löper i yta och D säkrar andrabollen',pressure:'Försvaret stänger den korta varianten',choice:'A hittar längre alternativ eller startar om med nytt passningsläge',game:'Poäng för avslut efter omstart eller vunnen andraboll'},
 {id:'duels',title:'1 mot 1 till samarbete',action:'utmana och känna igen när stöd behövs',pattern:'A driver mot B, C erbjuder överlapp och D ger understöd bakom',pressure:'Försvararen blockerar drivningen mot mål',choice:'A fintar åt fri sida eller använder C i rätt ögonblick',game:'Poäng för att skapa överläge genom dribbling eller pass'}
];
const AGES=[
 {age:'8–10',players:10,area:'15×20 m',activation:'Lekfull rörelse med egen boll, riktningsbyten och korta accelerationer; inga köer.',rule:'Förenkla till A–B–C eller två parallella par. Låt alla pröva varje roll.',defenders:'En försvarare börjar passivt; gör uppgiften lekfull.',match:'3 mot 3 eller 4 mot 4, flera små mål och många bollkontakter.'},
 {age:'11–13',players:12,area:'20×25 m',activation:'Dynamisk bolluppvärmning, koordinationssteg och passning i rörelse.',rule:'Använd A–B–C–D med tydlig rotation och öppna kroppsställningar.',defenders:'En till två aktiva försvarare, korta repetitioner.',match:'4 mot 4 eller 5 mot 5 med målvakter där det passar.'},
 {age:'14–16',players:14,area:'25×35 m',activation:'Dynamisk aktivering, stegfrekvens, acceleration 5–10 m och längre passningar.',rule:'A–B–C–D med matchtempo, scanning, olika fötter och korrekt timing.',defenders:'Aktiva försvarare med pressignal och omställning vid bollvinst.',match:'5 mot 5 eller 6 mot 6 med målvakter, anpassat till sport.'}
];
const EXERCISE_MATCH={
 passing:['pass','spelbar','triangel','rondo'], 'first-touch':['touch','mottag','orienter','vänd'],
 width:['bredd','spelvänd','kant'],cross:['inlägg','kant','avslut','inspel'],
 'third-man':['tredje','kombination','väggspel'],finishing:['avslut','skott','mål'],
 press:['press','återerövr','jaga'],defence:['försvar','täck','markera'],
 transition:['omställ','kontring','bollvinst'],possession:['bollinnehav','rondo','behåll'],
 setpiece:['fast','hörna','frispark','igångsätt'],duels:['duell','1 mot 1','dribbl','fint']
};
function sourceExercises(topic,sport,ageIndex){
 const terms=EXERCISE_MATCH[topic.id];
 const ageType=ageIndex===0?'foundation':'development';
 const eligible=EXERCISE_LIBRARY.filter(e=>(e.sport===sport||e.sport==='both')&&(e.framework===ageType||ageIndex===2&&e.framework==='preparation'));
 const scored=eligible.map(e=>{
  const hay=(e.title+' '+e.category+' '+e.steps.join(' ')+' '+e.observe).toLowerCase();
  return {e,score:terms.reduce((n,t)=>n+(e.title.toLowerCase().includes(t)?5:hay.includes(t)?1:0),0)};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 return scored.slice(0,5).map(x=>x.e);
}
const PHASES=[['Aktivering och bollkänsla',10],['Grundteknik och första rörelsen',15],['Samma kombination mot mål eller målzon',15],['Samma situation med motståndare',15],['Riktad matchlik spelövning',15],['Nedvarvning och reflektion',5]];
const VARIANTS=[
 ['Ingen press','Visa grundmönstret och kontrollera tajming'],
 ['Press från bollens insida','Öppna ny vinkel på utsidan'],
 ['Press från sidlinjen','Använd understöd och spela tillbaka'],
 ['Två försvarare kliver','Använd tredje man eller byt sida'],
 ['Motståndaren bryter','Direkt försvarsomställning och ny start']
];
function diagram(topic,phase,ageIndex,sport){
 const layouts={
 cross:[[75,230],[150,195],[225,170],[325,70]],
 press:[[110,115],[175,165],[250,215],[320,105]],
 defence:[[125,115],[185,160],[245,200],[310,235]],
 width:[[70,240],[120,120],[200,205],[330,80]],
 finishing:[[75,220],[155,165],[240,205],[335,135]],
 'first-touch':[[70,175],[165,175],[255,105],[330,215]],
 'third-man':[[65,230],[160,125],[135,225],[325,95]],
 transition:[[120,205],[185,235],[300,115],[320,250]],
 possession:[[85,220],[180,160],[275,220],[180,85]],
 setpiece:[[65,65],[120,95],[320,140],[275,220]],
 duels:[[80,200],[170,170],[230,100],[235,255]],
 passing:[[75,225],[155,180],[235,155],[325,105]]
 };
 const routes={
 cross:[[0,1],[1,2],[2,3]],press:[],defence:[],
 width:[[0,1],[1,2],[2,0],[0,3]],
 finishing:[[0,1],[1,2],[2,1],[1,3]],
 'first-touch':[[0,1],[1,2],[2,3]],
 'third-man':[[0,1],[1,2],[2,3]],
 transition:[[0,1],[1,2]],
 possession:[[0,1],[1,3],[3,2]],
 setpiece:[[0,1],[1,2]],
 duels:[[0,1],[1,2]],
 passing:[[0,1],[1,2],[2,3]]
 };
 const points=layouts[topic.id],offset=ageIndex===2?4:0;
 const at=i=>[points[i][0]+offset,points[i][1]];
 const line=(a,b)=>'M'+a[0]+' '+a[1]+'L'+b[0]+' '+b[1];
 let players=[],paths=[],kinds=[];
 if(phase===0){
  players=[[85,95,'1','blue'],[190,200,'2','blue'],[295,105,'3','blue']];
  paths=[line([85,95],[125,135]),line([190,200],[230,170]),line([295,105],[325,140])];
  kinds=['run','run','run'];
 }else if(phase===5){
  players=[[105,130,'A','blue'],[190,190,'B','blue'],[280,130,'C','blue']];
  paths=[line([105,130],[145,145])];kinds=['run'];
 }else{
  players=points.map((p,i)=>[p[0]+offset,p[1],'ABCD'[i],'blue']);
  const links=routes[topic.id];
  const count=phase===1?Math.min(links.length,ageIndex===0?2:3):links.length;
  for(const [a,b] of links.slice(0,count)){paths.push(line(at(a),at(b)));kinds.push('pass');}
  if(phase>=2){
   if(topic.id==='cross'){
    paths.push(line(at(3),[375,155]),line(at(0),[335,165]),line(at(2),[355,220]));
    kinds.push('pass','run','run');
   }else if(topic.id==='press'||topic.id==='defence'){
    paths.push(line(at(0),[95,150]),line(at(1),[155,205]),line(at(2),[235,240]));
    kinds.push('run','run','run');
   }else if(topic.id==='duels'){
    paths.push(line(at(1),[220,160]),line(at(2),[310,115]));
    kinds.push('dribble','run');
   }else{
    paths.push(line(at(3),[365,155]));kinds.push('run');
   }
  }
  if(phase>=3){
   const defenders=topic.id==='cross'?[[310,125,'X','red'],[350,195,'Y','red']]:
    topic.id==='press'||topic.id==='defence'?[[85,135,'X','red'],[120,235,'Y','red']]:
    [[190,205,'X','red'],[265,165,'Y','red']];
   players.push(...defenders);
  }
  if(phase===4){
   players.push([75,85,'E','blue'],[335,255,'F','blue'],[240,260,'Z','red']);
  }
 }
 return {players,balls:phase===5?[]:[[phase===0?100:at(0)[0]+13,phase===0?95:at(0)[1]]],
 goals:phase>=2&&phase<=4,goalSide:'right',paths,kinds,
 caption:topic.title+' · '+PHASES[phase][0]+' · '+(sport==='futsal'?'futsal':'fotboll')+'. Tränarskiss; kontrollera avstånd och roller före användning.'};
}

// Theme-specific coaching progression. Each phase builds on the same game problem.
const COACHING={
 passing:{warm:'Parvis passning genom två portar: efter varje passning skapas en ny diagonal vinkel.',base:'Triangel A–B–C: B möter, C breddar, A tar ny position. Spela vidare till D när vinkeln öppnas.',finish:'Förflytta triangeln framåt och spela genom målport efter tredje passningen.',defend:'En försvarare skär av C; hitta understöd och byt riktning innan ni går framåt.',game:'4v4 med två breda målportar. Poäng när laget först skapar en ny passningsvinkel.'},
 'first-touch':{warm:'Passa i par med scanning över axeln före mottagning; första touch genom vald port.',base:'A spelar B; B tar emot med öppen kropp bort från pressriktningen och hittar C.',finish:'Samma mottagning följd av passning till D som avslutar mot mål.',defend:'Försvararen får välja pressaxel. B måste orientera sig och ta första touch mot fri yta.',game:'4v4: bonus om en första touch passerar en försvarslinje och följs av avslut.'},
 width:{warm:'Två breda korridorer: driv inåt, passa utåt och byt sida utan att korsa köer.',base:'A–B–C på en sida lockar över försvar; D väntar brett på motsatt sida.',finish:'Spela tillbaka via A, vänd till D och attackera mål innan motståndarna hinner flytta.',defend:'Två försvarare överbelastar bollsidan; hitta bortre bredd med högst två mellanspel.',game:'4v4 med sidokorridorer. Bonus för mål efter kontrollerad spelvändning.'},
 cross:{warm:'Koordinationssteg, acceleration 5 meter och passning till medspelare som rör sig på kanten.',base:'A spelar B, B hittar C centralt, C spelar D i ytterkorridor; A och C startar avslutslöpningar.',finish:'D tar med längs kanten och väljer lågt inspel eller inlägg; A går främre ytan och C bakre.',defend:'Ytterback pressar D och mittback skyddar mål. D kan väggspela med B eller spela snett bakåt.',game:'5v5 med ytterkorridorer: mål efter inspel ger bonus, men andra lösningar är tillåtna.'},
 'third-man':{warm:'Tre spelare i triangel: passa, möt, spela på ett tillslag och löp till fri kon.',base:'A spelar B som möter felvänd; B lägger tillbaka till C som spelar D bakom presslinjen.',finish:'D tar emot tredje-mans-passningen i fart och avslutar eller passar vidare till fri spelare.',defend:'En försvarare följer B, en annan skyddar D. Välj timing och använd C som fri spelare.',game:'4v4: bonus när en tredje spelare tar emot framåtriktad passning bakom press.'},
 finishing:{warm:'Passning i par följt av acceleration och kontrollerat avslut mot små mål.',base:'A passar B, B väggspelar med C, D tajmar löpning in i skottkorridoren.',finish:'Samma väggspel, D får passning i fart och väljer placering med få tillslag.',defend:'Försvarare stänger skottlinjen; D måste välja skott, extra passning eller riktningsbyte.',game:'4v4 med målvakt: belöna skapade avslutslägen efter kombination, inte bara mål.'},
 press:{warm:'Jaktlek 2v1: när bollhållaren tappar kontroll samordnar båda försvararna sin press.',base:'A styr bollhållaren utåt, B stänger passningen inåt, C täcker bakom och D balanserar.',finish:'Starta från målvakt eller målzon; vid dålig första touch pressar A och B tillsammans för bollvinst och avslut.',defend:'Anfallarna kan spela tillbaka eller vända sida. Försvararna avgör press eller kompakt återgång.',game:'4v4: bonus vid bollvinst efter gemensam pressignal; spela vidare direkt mot mål.'},
 defence:{warm:'Spegelövning i par: försvarare bromsar, håller avstånd och styr angripare från centrum.',base:'A bromsar bollhållare; B ger sned täckning, C skyddar centrum, D säkrar bortre sidan.',finish:'Anfallare försöker nå målzon. Försvararna stänger centrum och vinner boll för pass till utgångsmål.',defend:'Anfallarna får väggspela och vända sida; försvararna växlar press och täckning utan att tappa djup.',game:'4v4: poäng för att styra ut mot sidlinje och vinna boll med organiserat understöd.'},
 transition:{warm:'Två färger: vid tränarens signal vänd mot nytt mål och hitta första framåtpassningen.',base:'A vinner boll, B kommer nära som stöd, C löper framåt, D håller fri bredd.',finish:'Efter bollvinst: A–B–C till avslut, eller A direkt mot D om passningslinjen är öppen.',defend:'Återvändande försvarare blockerar första passet; avgör snabbt om kontring eller bollsäkring.',game:'4v4 med omställningsmål: direkt avslut efter bollvinst belönas, men tvinga inte riskpass.'},
 possession:{warm:'Rondo 3v1 med byte av position efter passning och tydlig spelbarhet bakom press.',base:'A–B–C bildar triangel, D skapar stöd bakom. Behåll två passningsalternativ kring bollen.',finish:'Efter minst tre passningar hitta fri spelare i målzon på motsatt sida.',defend:'Två försvarare jagar. Bollhållare använder tredje man eller säkert återspel för att byta sida.',game:'4v4 med två zoner: poäng för att spela kontrollerat från en zon till den andra.'},
 setpiece:{warm:'Korta igångsättningar i par: signal, första touch, återpass och rörelse mot fri yta.',base:'A startar kort till B, B spelar tillbaka, C löper i fri korridor och D bevakar andraboll.',finish:'Efter A–B–A väljer A pass till C eller direkt boll mot mål; D säkrar returen.',defend:'Försvararna stänger kort variant; välj längre lösning och håll balans vid bollförlust.',game:'Starta varje anfall med fast situation. Poäng för välorganiserad första och andra aktion.'},
 duels:{warm:'Dribblingsportar: fint, riktningsbyte och acceleration efter att ha läst motspelarens position.',base:'A driver mot försvarare B, C ger överlapp och D säkrar bakom boll.',finish:'A utmanar B och väljer eget avslut eller passning till överlappande C.',defend:'B kan styra åt olika håll och en andra försvarare kommer in; avgör när passning slår dribbling.',game:'3v3: bonus när 1v1 skapar överläge och leder till passning eller avslut.'}
};
const FUTSAL_NOTES={
 cross:'I futsal: använd spel mot bortre stolpen och lågt inspel längs golvet, inte höga inlägg.',
 width:'I futsal: skapa bredd med ala-spelare och byt sida snabbt via fixo.',
 press:'I futsal: pressa i par på signal vid sidlinjen; säkra centralt med fixo.',
 defence:'I futsal: skydda centrala korridoren och markera löpningar mot bortre stolpen.',
 transition:'I futsal: första passningen efter bollvinst går mot fri ala eller pivot; skydda ytan bakom.',
 setpiece:'I futsal: arbeta med inkast med fot, hörna och snabb återgång till defensiv balans.',
 finishing:'I futsal: korta avslut, tåskott när det är lämpligt och returer vid bortre stolpen.',
 possession:'I futsal: rotation mellan fixo, alas och pivot utan att tappa defensiv balans.'
};
function create(topic,ageSpec,ageIndex,sport){
 const isFutsal=sport==='futsal';
 const plan=COACHING[topic.id];
 const matched=sourceExercises(topic,sport,ageIndex);
 const sportNote=isFutsal?(FUTSAL_NOTES[topic.id]||'I futsal: använd mindre yta, snabba riktningsbyten och spelbarhet via ala och pivot.'):'I fotboll: anpassa korridorernas bredd, löpningar och avstånd till planen.';
 const blocks=PHASES.map(([title,minutes],i)=>{
 const specific=[
 [ageSpec.activation,'Lägg in en enkel bolluppgift kopplad till dagens tema: '+topic.action+'.','Avsluta med 2 minuter passning och rörelse i par.'],
 ['Visa grundsekvens: '+topic.pattern+'.',ageSpec.rule,'Rotera A→B→C→D efter varje repetition; byt håll efter halva tiden.'],
 ['Bygg vidare på samma sekvens, byt inte övningsidé.','Lägg till mål eller målzon och tydlig sista handling: '+topic.action+'.','Låt två spelare följa upp aktionen; övriga förbereder nästa boll.'],
 ['Starta med samma sekvens: '+topic.pattern+'.','Motståndarnas problem: '+topic.pressure+'.','Lösning: '+topic.choice+'.','Vid bollvinst går försvararna mot kontringsmål; anfallet återställer balans.'],
 ['Spela '+ageSpec.match,'Behåll samma tema i spel: '+topic.game+'.','Belöna goda beslut även om spelarna väljer ett annat bättre alternativ.','Korta coachningsstopp, snabb omstart, byt lag/roller.'],
 ['Lugn gång och enkel rörlighet.','Fråga: Vad öppnade ytan? Vad gjorde vi när första lösningen stängdes?','Låt två spelare beskriva var sitt val från spelet.']
 ][i];
 if(i===0)specific.splice(1,1,plan.warm);
 if(i===1)specific.splice(0,1,plan.base);
 if(i===2)specific.splice(0,3,plan.finish,'Behåll samma roller och startpositioner från föregående del.','Avsluta, hämta boll och rotera direkt.');
 if(i===3)specific.splice(0,3,plan.defend,'Motståndaren kan välja flera lösningar; spelarna måste läsa situationen.','Efter bollvinst: snabb omställning åt andra hållet.');
 if(i===4)specific.splice(1,1,plan.game);
 if(i>=1&&i<=4)specific.push(sportNote);
 const example=matched[i===0?0:i===1?1:i===2?2:i===3?3:4];
 if(example&&i<5){specific.push('Övningsinspiration '+example.id+': '+example.title+'. '+example.steps[0]);}
 return {title:(i+1)+'. '+title,minutes,timing:minutes+' min',organisation:i===0?'Par och små grupper, bollar till alla.':i===5?'Samling på planen.':ageSpec.area+' som utgångspunkt; anpassa ytan till närvaro och '+(isFutsal?'hall':'plan')+'. '+(i===3?ageSpec.defenders:'Två grupper om truppen är stor.'),
 steps:specific,variations:i===3?VARIANTS.map(([name,response])=>({name,response})):[],
 say:i===0?'Rör dig med kontroll och orientera före pass.':i===5?'Vad lärde du dig av motståndaren?':'Läs situationen. '+topic.choice+'.',
 observe:i===0?'Aktivitet, bollkontakter och rörelsekvalitet.':i===5?'Kan spelarna förklara sina beslut?':'Timing, spelbarhet, orientering och beslut kopplade till '+topic.title+'.',
 restart:'Ny boll till A, kort instruktion och direkt omstart.',rotation:'Byt roller och sidor regelbundet.',easier:'Större yta, långsammare tempo och passiv press.',harder:'Mindre yta, aktiv press och tidsgräns.',diagram:diagram(topic,i,ageIndex,sport)};
 });
 return {id:sport+'-weekly-'+ageIndex+'-'+topic.id,sport,age:ageSpec.age,status:'coaching-review',version:2,
 title:topic.title+' · komplett 75-minuterspass',minutes:75,players:ageSpec.players,
 goal:'Utveckla förmågan att '+topic.action+' från grundrörelse till match.',
 equipment:'Bollar till alla, 12–16 koner, västar, små mål eller riktiga mål; koordinationsstege valfri.',
 principle:'En röd tråd: aktivering → grundmönster → större situation → motståndare → spel → reflektion.',
 ballPriority:'Kort instruktion och hög aktivitet. Anpassa individuellt efter mognad, trygghet och erfarenhet.',
 coachPreparation:'Läs hela passet före veckan, rita upp A–B–C–D och kontrollera mål, yta, bollar, spelare och rotation.',
 sourceExerciseIds:matched.map(e=>e.id),blocks};
}
export const CURATED_WEEKLY_SESSIONS=['football','futsal'].flatMap(sport=>AGES.flatMap((age,i)=>TOPICS.map(topic=>create(topic,age,i,sport))));
