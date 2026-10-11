// Authored session combinations, not a coach-facing exercise mixer.
// Repetition of familiar preparation is intentional; main tasks and sport context differ.
const ages = ['8–10','11–13','14–16'];
const timings = [
  ['1 min visa · 3 × 2 min arbete · 3 min vila, frågor och byte.','2 min visa · 3 × 2 min arbete · 4 min vila, rollbyten och byte.'],
  ['1 min visa · 3 × 2 min arbete · 3 min vila, frågor och byte.','1 min visa · 6 × 90 sek arbete · 5 × 1 min vila/rotation.'],
  ['2 min visa · 3 × 2 min arbete · 5 min vila, frågor och byte.','2 min visa · 6 × 2 min arbete · 5 × 1 min vila/rotation · 1 min byte.']
];
const blue = (x,y,n)=>[x,y,n,'blue'];
const red = (x,y,n)=>[x,y,n,'red'];
const diagram = (players,paths,caption,extras={})=>({players,paths,caption,...extras});
const pairDiagram=diagram([blue(90,160,'A'),blue(310,160,'B')],['M110 150L288 150','M305 180Q245 250 215 220'],'Ett av sex par visas. A passar; B tar emot och för bollen mot fri yta.',{kinds:['pass','dribble']});
const duelDiagram=diagram([blue(95,160,'A'),red(265,160,'B')],['M110 150Q180 75 330 105'],'Ett av sex par visas. Blå försöker nå bortre linjen, röd vinner boll och går mot den motsatta linjen.',{kinds:['dribble']});
const supportDiagram=diagram([blue(90,95,'A'),blue(95,245,'B'),red(270,165,'C')],['M111 108L270 120','M110 236L220 245'],'En av fyra planer: två blå mot en röd. Pilar visar alternativa lösningar, inte en passningsföljd.',{kinds:['dribble','pass'],goals:true});
const finishDiagram=diagram([blue(70,160,'A'),blue(185,95,'B'),blue(300,225,'C')],['M90 148L169 104','M200 102Q270 100 377 149'],'En station visas.',{goals:true,goalSide:'right',kinds:['pass','pass']});
const widthDiagram=diagram([blue(75,160,'A'),blue(190,80,'B'),blue(300,235,'C')],['M90 147L172 90','M202 95L284 220'],'En av fyra grupper. Spelarna hittar nya stödplatser i bredd och djup; linjerna är bara exempel.');
const gameDiagram=diagram([blue(90,85,'1'),blue(110,240,'2'),blue(180,150,'3'),red(280,85,'4'),red(300,240,'5'),red(240,190,'6')],['M109 93L162 143'],'En av två planer: tre mot tre mot mål åt båda hållen.',{goals:true});
const transitionDiagram=diagram([blue(210,75,'1'),blue(185,145,'2'),blue(205,220,'3'),blue(270,265,'4'),red(75,70,'5'),red(90,145,'6'),red(75,220,'7'),red(130,275,'8'),[325,60,'9','gold'],[335,130,'10','gold'],[340,215,'11','gold'],[330,280,'12','gold']],['M170 145L110 150'],'Blå anfaller röd till vänster. Gul väntar vid höger mål. Vid blått mål fortsätter blå åt höger; vid röd bollvinst anfaller röd åt höger.',{goals:true});

function makeBlock(title,minutes,timing,organisation,steps,restart,rotation,say,observe,easier,harder,picture){
  return {title,minutes,timing,organisation,steps,restart,rotation,say,observe,easier,harder,diagram:picture};
}
function prep(sport,a,theme){
  const young=a===0, football=sport==='football';
  const minutes=[10,10,13][a];
  const distance=football?['6–8','8–12','10–15'][a]:['4–6','6–8','7–10'][a];
  const size=football?['10 × 8','12 × 10','15 × 12'][a]:['8 × 6','10 × 8','12 × 10'][a];
  const isDuel=theme==='duel', isFinish=theme==='finish';
  return makeBlock(isDuel?'Skydda och vänd med kontroll':isFinish?'Första touch mot ett avslut':'Passa och visa en ny stödplats',minutes,timings[a][0],
    `Sex par med en boll per par. Varje par har en ruta ${size} m. Passningsavstånd cirka ${distance} m. Två konportar i varje ruta. Ingen boll får skjutas mot en annan grupp.`,
    isDuel?[
      'A har boll. B står en armlängd bort och följer lugnt utan att tackla i första omgången.',
      'A håller kroppen mellan B och bollen, vänder när en sida blir fri och för bollen genom en valfri port. Inga knuffar, inga låsta grepp.',
      young?'Behåll lugnt tempo. Byt medspelare som har bollen efter varje försök.':'När kontrollen fungerar får B försöka peta bollen stående; inga glidtacklingar. A väljer om hen ska vända eller fortsätta skydda.'
    ]:isFinish?[
      'A passar till B som står mellan två portar. B tittar på portarna innan bollen kommer.',
      'B tar första touchen mot en fri port och slår en kontrollerad markpassning genom den. A hämtar bollen från sidan, aldrig framför en pågående avslutning.',
      'Byt efter varje försök. Prova båda fötterna, men sänk fart och avstånd när kontrollen försvinner.'
    ]:[
      'A passar till B och flyttar två meter till en ny stödplats. B tittar före mottagningen.',
      football?'B tar emot mot en fri sida, tittar igen och passar över det nya avståndet till A. Anpassa passningens kraft till gräset och avståndet.':'B tar emot med kontroll på hallgolvet, gärna med sulan när det passar situationen, och väljer sedan nästa passning.',
      'B flyttar efter sin passning. Spelarna väljer själva vilken fot och riktning som hjälper nästa handling; ingen obligatorisk direktpassning.'
    ],
    'Boll ut: paret hämtar sin boll och börjar med kontroll. Avbryt direkt om någon boll eller spelare hamnar i en annan grupps arbetsyta.',
    'Byt bollhållare/mottagare efter varje försök. Byt startspelare efter varje tvåminutersomgång.',
    isDuel?'Var är bollen trygg — och var kan du vända?':isFinish?'Kan din första touch hjälpa nästa passning eller skott?':'Var behöver du stå för att din kompis ska se dig?',
    isDuel?'Balans, lugn bollkontakt och att spelaren upptäcker en fri sida.':isFinish?'Blick före mottagning och om första touchen skapar en kontrollerad nästa handling.':'Blick före mottagning, passningens kraft och en användbar ny stödplats.',
    'Kortare avstånd och helt utan bollvinnande motståndare.',
    'Låt medspelaren ändra plats tidigare. Öka bara en svårighet åt gången.',
    isDuel?duelDiagram:{...pairDiagram,caption:'Ett av sex par visas. Första pilen visar passningen till B; prickad pil visar ett möjligt vägval efter mottagning. Anpassa nästa handling till instruktionen.'});
}
function duel(sport,a){
  const size=sport==='football'?['12 × 8','16 × 10','20 × 12'][a]:['8 × 6','10 × 8','12 × 9'][a];
  return makeBlock('En mot en: välj väg och försvara', [12,15,20][a],timings[a][1],
    `Sex separata planer ${size} m, ett par per plan och en boll. A börjar vid ena kortlinjen, B mitt på planen. Båda kortlinjerna är mållinjer: mål genom att driva bollen kontrollerat över linjen. Inga målvakter.`,
    ['A startar med boll och väljer en väg förbi B. B närmar sig med balans och försöker vinna boll utan att knuffa eller glidtackla.',
     'Vinner B bollen fortsätter B direkt mot A:s startlinje. A blir försvarare — vänta inte på tränaren.',
     'Efter mål eller boll ut börjar ett nytt försök. Den som började försvara får börja med boll.',
     a===0?'Första omgången följer B bara. Inför aktiv bollvinst först när barnen är trygga. Korta aktioner, inga fartdueller.':'Spelaren får välja att skydda, vända eller gå förbi. Tränaren frågar efter försöket, inte medan spelaren löser det.'],
    'Mål eller boll ut: hämta bollen, gå till startplatsen och byt anfallare. Ingen extrasprint och ingen utslagning.',
    'A och B byter startroll efter varje försök. Behåll samma par under omgången; använd pauserna för vila. Byt jämna par efter två omgångar.',
    'Vad gör försvararen? Välj den väg du ser.',
    'Om anfallaren reagerar på försvararens plats och om försvararen kan bromsa och byta riktning utan att rusa förbi.',
    'B följer utan att vinna bollen, eller gör planen bredare.',
    'Låt B börja lite närmare. Behåll korta försök och båda lagens möjlighet att göra mål.',duelDiagram);
}
function support(sport,a){
  const size=sport==='football'?['16 × 12','22 × 16','26 × 18'][a]:['12 × 9','16 × 12','18 × 14'][a];
  return makeBlock('Två mot en: passa eller gå själv',[12,15,20][a],timings[a][1],
    `Fyra grupper om tre på fyra planer ${size} m. Ett konmål, cirka två meter, på varje kortlinje. A och B anfaller ena målet, C försvarar och kan anfalla det motsatta. En boll per plan.`,
    ['A börjar med bollen vid startlinjen. B visar sig snett framför eller vid sidan så att passningen kan nå fram. C börjar i mitten.',
     'A väljer mellan att driva och att passa. B får ändra stödplats när C flyttar sig; ingen bestämd passningsföljd.',
     'Om C vinner bollen anfaller C startmålet direkt. A och B försöker vinna tillbaka utan att stoppa spelet.',
     'Efter mål eller boll ut startar en ny aktion med samma roller tills omgången slutar.'],
    'Efter mål eller boll ut lägger A bollen vid startlinjen, C går tillbaka till mitten och B hittar en stödplats. Vänta tills alla är redo.',
    'Efter varje omgång: A → B → C → A. Tre omgångar för 8–10 år, sex för äldre. Alla provar bollhållare, stöd och försvar.',
    'Om försvararen går mot dig — var kan din kompis hjälpa?',
    'Om stödet är spelbart och bollhållaren väljer utifrån försvararen, inte alltid passar bara för att det är en passningsövning.',
    'Försvararen börjar längre bort eller följer utan bollvinst i första omgången.',
    'Minska bredden lite när gruppen har kontroll. Inför inte en touchregel för alla.',supportDiagram);
}
function finishing(sport,a){
  const football=sport==='football';
  const size=football?['18 × 10','22 × 12','26 × 14'][a]:['12 × 8','15 × 10','18 × 12'][a];
  return makeBlock(football?'Markpassning och avslut på gräs':'Mottagning och avslut i hall',[12,15,20][a],timings[a][1],
    `Sex par på sex avgränsade stationer ${size} m med ett konmål och en boll per station. A passar, B avslutar. Avsluta i samma riktning och lämna säkerhetsavstånd mellan stationerna. Inga målvakter eller köer i denna del.`,
    ['A passar längs marken till B som har tittat mot målet och står vänd så att nästa handling blir möjlig.',
     football?'B tar emot, låter bollen komma i skottavstånd och avslutar kontrollerat längs marken. Prova olika mottagningsvinklar — inte höga inlägg eller nickar.':'B tar emot den lågt studsande futsalbollen, väljer en fri sida och avslutar kontrollerat. Sulan är ett alternativ, inte ett krav.',
     'När bollen stannat hämtar B den via sidan och för tillbaka den med små kontrollerade bollkontakter. A väntar säkert bakom startplatsen. Skjut inte medan någon hämtar.',
     a===0?'B får stanna bollen och välja fot. Beröm en trygg handling, inte vem som skjuter hårdast.':'B varierar första touchen utifrån passningen. Inga tävlingar i skottkraft och inget skott innan spelaren har balans.'],
    'Miss eller boll ut: hämta via sidan. Starta inte ett nytt avslut medan någon står mellan boll och mål.',
    'Efter varje försök byter A och B passare/avslutare. Bollhämtningen sker med bollkontroll, inte som en löptävling. Pauserna gäller hela gruppen.',
    'Se målet före mottagningen. Gör första touchen användbar.',
    'Blick, balans, passningens kvalitet och valet av första touch. Målantal är inte betyg.',
    'Kortare passning, större konmål och helt stillastående mottagning.',
    'Variera passningens riktning och skottvinkel lite. Motstånd kommer i nästa speldel, inte genom att placera en bollhämtare i skottlinjen.',{...finishDiagram,players:finishDiagram.players.slice(0,2),caption:'En av sex stationer visas. A passar till B; B tar emot och avslutar mot konmålet. Därefter hämtar B säkert via sidan och rollerna byts.'});
}
function width(sport,a){
  const football=sport==='football';
  const size=football?['16 × 12','22 × 16','26 × 18'][a]:['12 × 9','16 × 12','18 × 14'][a];
  return makeBlock(football?'Hitta bredd och spelbar yta':'Skapa en ny passningsvinkel',[12,15,20][a],timings[a][1],
    `Fyra grupper om tre på varsin ruta ${size} m. Markera två portar på vardera långsidan. En boll per grupp. Alla är medspelare i denna lugna förberedelse; ingen försvarare.`,
    ['A har bollen. B och C flyttar så att A kan se två skilda passningsalternativ, inte två spelare bakom varandra.',
     'A väljer en mottagare. Mottagaren tittar före första touchen och väljer nästa passning; A och den tredje spelaren söker nya stödplatser.',
     football?'Efter några passningar hittar gruppen en fri sidport och för bollen genom den. Fortsätt i samma ruta; målet är att känna av avstånd och riktning på gräs.':'Spela genom en fri sidport med kontrollerad markpassning. På hallgolvet behöver mottagaren kunna bromsa bollen och vara nära nog för ett spelbart stöd.',
     'Variera vilken port som används. Portarna hjälper att se ytan men skapar ingen obligatorisk passningsbana.'],
    'Boll ut: närmaste spelare hämtar och startar lugnt. Efter en lyckad portpassning fortsätter gruppen med samma boll.',
    'Alla tre byter plats efter sina passningar. Byt vem som börjar efter varje omgång. Ingen blir permanent kantspelare.',
    'Kan den som har bollen se båda medspelarna?',
    'Om spelarna flyttar för att bli spelbara och om passningens kraft passar det nya avståndet.',
    'Kortare avstånd och stanna bollen före varje val.',
    'Låt stödet ändra plats tidigare; verkligt motstånd kommer i nästa del.',{...widthDiagram,sidePorts:true});
}
function transition(sport,a){
  if(a===0) return support(sport,a); // young group first learns loss/regain in a simpler 2v1.
  if(a===1) return makeBlock('Två mot två: ny uppgift vid bollvinst',15,timings[a][1],
    `Tre planer ${sport==='football'?'22 × 16':'16 × 12'} m. Fyra spelare per plan: två blå och två röda. Ett konmål på vardera kortlinjen. Alla tolv är aktiva; inget väntande tredje lag.`,
    ['Blå börjar med boll och anfaller rött mål. Röd försöker vinna boll med balans och säkra dueller.',
     'Vinner röd bollen fortsätter röd direkt mot blått mål. Blå ändrar från anfall till försvar; ingen tränarsignal.',
     'Efter mål får laget som släppte in börja vid sitt eget mål. Det andra laget backar några meter. Vid boll ut får andra laget en lugn markpassning in.',
     'Medspelaren söker en ny stödplats direkt efter bollvinst. Behåll fria val — det måste inte vara en passning.'],
    'Efter mål eller boll ut startar rätt lag lugnt med reservboll. Vänta på säker placering, inte på en lång förklaring.',
    'Båda lagens två spelare anfaller och försvarar hela omgången. Byt vilken spelare som startar varje aktion och använd omgångspauserna till vila.',
    'Vi vann eller tappade bollen — vad är vår uppgift nu?',
    'Om båda spelarna upptäcker bollbytet och om den nya bollhållaren får ett spelbart stöd.',
    'Öka bredden och gå igenom ett bollbyte lugnt först.',
    'Minska ytan lite när kontrollen fungerar; inga extra sprintkrav.',
    diagram([blue(90,90,'1'),blue(125,235,'2'),red(275,100,'3'),red(305,225,'4')],['M109 101L190 150'],'En av tre planer. Två mot två åt båda håll; samtliga tolv spelare deltar samtidigt.',{goals:true}));
  const size=sport==='football'?['','36 × 24','40 × 28'][a]:['','28 × 18','30 × 20'][a];
  return makeBlock('Tre lag: fortsätt efter mål eller bollvinst',[0,15,20][a],
    a===1?'1 min visa · 3 × 4 min spel · 2 × 1 min vila/byte.':'2 min visa · 3 × 5 min spel · 2 × 1 min vila · 1 min nästa organisation.',
    `Tre lag om fyra på en plan ${size} m med två konmål. Blå börjar i mitten, röd försvarar vänster mål, gul väntar vid höger mål. Inga målvakter. Bara två lag är aktiva åt gången; det tredje är redo vid sitt mål.`,
    ['Blå anfaller röd till vänster. Gul väntar vid höger mål utan att ta bollen eller delta i vänstra anfallet.',
     'Gör blå mål behåller blå bollen, vänder och anfaller gul åt höger. Röd stannar vid vänster mål och väntar. Gul blir aktivt försvarande lag när blå vänder.',
     'Vinner röd bollen anfaller röd gul åt höger direkt. Blå stannar vid vänster mål och blir nästa väntande försvarslag. Gul är nu aktivt försvarande lag.',
     'Samma princip fortsätter: laget som gör mål behåller bollen och vänder; laget som vinner boll anfaller målet i andra änden. Laget som inte anfaller stannar vid det mål där aktionen nyss avslutades.',
     'Vid boll ut får laget som inte rörde bollen sist starta med en markpassning och anfalla det motsatta målet från där bollen gick ut. Tränaren säger tydligt vilket lag som anfaller och vilket mål. Ingen extra försvarare släpps in.'],
    'Ha reservbollar vid sidan. Vid oklarhet stoppar tränaren kort och pekar ut anfallare och mål. Efter mål startar målskyttens lag igen nära det målet; motståndaren backar så att laget kan vända tryggt.',
    'I första omgången startar blå i mitten/röd vänster/gul höger. Andra: röd i mitten/gul vänster/blå höger. Tredje: gul i mitten/blå vänster/röd höger. Tränaren följer väntetiden och fördelar startboll om samma lag blir stående länge.',
    'Har vi mål eller bollvinst? Vilket mål anfaller vi nu?',
    'Om laget känner igen när det ska vända, om nya försvarslaget är redo och om bollhållaren får stöd i den nya riktningen.',
    'Gå igenom mål, bollvinst och boll ut långsamt utan motstånd först. Använd två lag tre mot tre om trelagssystemet blir för svårt.',
    'Kortare tid för att organisera stöd efter vändning; behåll tydlig mål- och rollfördelning. Ingen strafflöpning.',transitionDiagram);
}
function application(sport,a,theme){
  const football=sport==='football', young=a===0;
  const size=football?['24 × 16','32 × 22','40 × 28'][a]:['18 × 12','24 × 16','28 × 18'][a];
  const focus={duel:'Våga gå förbi när vägen är fri och hjälp till efter bollförlust.',support:'Ge bollhållaren en spelbar stödplats och välj mellan passning och dribbling.',finish:'Se målet och skapa ett kontrollerat avslut utan krav på skott direkt.',width:'Flytta isär när laget har boll och bli spelbar i en ny riktning.',build:'Hitta en fri väg framåt; spela tillbaka när framåtvägen är stängd.',transition:'Känn igen bollvinst och bollförlust och ändra uppgift direkt.'}[theme];
  return makeBlock(football?'Fotboll: använd dagens lösning i spel':'Futsal: använd dagens lösning i spel',[18,20,25][a],
    ['2 min visa · 3 × 4 min spel · 2 × 1 min vila · 2 min samla.','2 min visa · 3 × 5 min spel · 2 × 1 min vila · 1 min samla.','2 min visa · 4 × 5 min spel · 3 × 1 min vila.'][a],
    `Två planer ${size} m, sex spelare per plan. Tre mot tre, små mål eller konmål i båda ändarna. Inga målvakter i denna tillämpning. Avgränsa säkert och håll planer och bollar åtskilda.`,
    ['Spela tre mot tre mot motsatta mål. Alla får både anfalla och försvara. Inga fasta positioner.',focus,
     'Vinner ett lag bollen fortsätter det direkt åt andra hållet. Efter mål startar laget som släppte in vid sitt eget mål; motståndaren backar några meter.',
     football?'Vid boll ut startar andra laget med en lugn markpassning från sidlinjen. Detta är ett förenklat träningsspel utan offside, inte ett officiellt matchformat.':'Vid boll ut startar andra laget med markpassning från sidlinjen. Använd hallens futsalboll; detta är ett utvecklingsspel med förenklade igångsättningar.',
     young?'Låt ett försök spelas färdigt. Ställ en enkel fråga i pausen i stället för att ropa lösningar.':'Tränaren observerar om dagens mål syns i verkliga val. Ta en konkret situation i pausen och låt spelarna beskriva alternativ.'],
    'Reservbollar vid varje plan. Starta om snabbt men inte innan alla är säkert placerade. Ingen bollhämtare får springa över den andra planen.',
    'Alla tolv spelar samtidigt. Byt några jämna lagkamrater i pauserna och låt barnen själva prova olika platser. Ingen utslagning eller bonuskonditionering.',
    focus, 'Om dagens beteende syns spontant i spel — och hur spelaren reagerar när ett val misslyckas.',
    'Större yta eller större konmål. Sänk komplexiteten, inte spelarens värde.',
    'Minska ytan något om gruppen har kontroll. Behåll fria val och möjlighet att göra mål åt båda håll.',gameDiagram);
}
function build(sport,a){
  if(a===0) return width(sport,a);
  const football=sport==='football';
  return makeBlock(football?'Spela från målvakten förbi första pressen':'Målvakten som stöd mot press',[12,15,20][a],timings[a][1],
    `Två grupper om sex på ${football?['','26 × 18','32 × 22'][a]:['','18 × 14','22 × 16'][a]} m. Varje grupp: MV och tre blå utespelare mot två röda. Ett mål bakom MV och en två meter djup målzon på motsatt kortsida. Sex spelare per plan, inga reserver.`,
    ['MV startar med boll och passar till en blå. Röda försöker vinna bollen. Blå försöker driva bollen kontrollerat in i målzonen, inte skjuta dit.',
     'Blå får använda MV som stöd när vägen framåt är stängd. MV tittar efter en annan spelbar väg, inte automatiskt tillbaka till samma spelare.',
     'Vid röd bollvinst anfaller röda målet framför MV. Blå försöker vinna tillbaka. MV får försvara målet; avslut hålls kontrollerade.',
     'Aktionen slutar vid mål, boll ut eller kontrollerad blå inpassage i målzonen. Nästa boll börjar hos MV.'],
    'Tränaren eller MV startar ny boll när alla är redo. Röda backar till mitten vid varje nystart. I denna uppgift tillåts återpassning till MV som träningsanpassning, även i futsal; det är inte fullständiga futsalregler.',
    'Numrera rollerna: 1 MV, 2–4 blå, 5–6 röda. Efter varje omgång flyttar alla ett nummer, 6 → 1. Sex omgångar ger varje spelare varje roll. Rollen MV används bara av spelare som är trygga; annars spelar 1 som stöd med fötterna och målet ersätts av en konport.',
    'Om vägen framåt är stängd — vem kan hjälpa oss hitta en annan?',
    'Blick hos MV, mottagarens kroppsvinkel, stödavstånd och val mellan framåt och tillbaka.',
    'En av röda följer utan bollvinst i första omgången.',
    'Röda börjar närmare när gruppen är trygg. Sätt inte tidsgräns före kontroll.',
    diagram([[45,160,'MV','gold'],blue(145,70,'2'),blue(150,250,'3'),blue(260,160,'4'),red(235,85,'5'),red(285,245,'6')],['M60 148L129 79','M162 80L245 147'],'En av två planer. MV och tre blå försöker nå den markerade målzonen. Röda kan göra mål vid bollvinst.',{targetZone:true,goals:true,goalSide:'left'}));
}

export function buildAdditionalSessions(originals){
  const plans = [
    ['futsal',0,'duel','Våga vända och gå förbi', 'Trygg bollkontroll och ett eget val i en enkel duell.'],
    ['futsal',0,'support','Hjälp kompisen: två mot en','Upptäcka när en passning hjälper och när den egna vägen är fri.'],
    ['futsal',0,'finish','Första touch och ett lugnt avslut','Koppla ihop mottagning, blick mot mål och kontrollerat avslut.'],
    ['futsal',1,'duel','Skydda bollen och välj väg','Skydda boll under gradvis press och reagera vid bollförlust.'],
    ['futsal',1,'support','Skapa fördel med två mot en','Använda stödvinkel och välja rätt ögonblick att passa eller driva.'],
    ['futsal',1,'transition','Två mot två: reagera vid bollvinst','Känna igen ny spelriktning och snabbt bli ett användbart stöd.'],
    ['futsal',2,'duel','Lös duellen utan att tappa kontroll','Värdera skydd, vändning och genombrott under aktivt motstånd.'],
    ['futsal',2,'build','Målvakt och lag spelar ur första pressen','Skapa stöd kring målvakten och välja en öppen väg förbi press.'],
    ['futsal',2,'transition','Byt ansvar när bollinnehavet ändras','Organisera stöd och försvar i den nya riktningen efter en omställning.'],
    ['football',0,'width','Hitta fri yta på gräs','Bli synlig för en medspelare och uppleva bredd utan fasta positioner.'],
    ['football',0,'finish','Ta emot och sikta mot mål','Anpassa bollkontroll och markavslut till utomhusunderlaget.'],
    ['football',0,'duel','Våga prova i en mot en','Välja en fri väg och lugnt byta uppgift vid bollförlust.'],
    ['football',1,'width','Bredd, stöd och nästa passning','Skapa spelbara avstånd och använda mer av planens bredd.'],
    ['football',1,'finish','Från markpassning till avslut','Förbereda ett avslut genom blick och en riktad första touch.'],
    ['football',1,'build','Börja hos målvakten och hitta vägen fram','Upptäcka öppen yta förbi första pressen med målvakten som stöd.'],
    ['football',2,'width','Spela förbi motståndaren med stöd och bredd','Välja spelbar riktning och anpassa stödavstånd under motstånd.'],
    ['football',2,'finish','Skapa ett avslut genom ett bättre första val','Koppla mottagning och avslut till spelets verkliga alternativ.'],
    ['football',2,'transition','Från bollvinst till nytt anfall','Vända spelriktning och fördela uppgifter utan att vänta på tränaren.']
  ];
  return plans.map(([sport,a,theme,title,goal])=>{
    const base=originals[a];
    const warm={...base.blocks[0],title:sport==='football'?'Bollaktivering på gräs':base.blocks[0].title};
    if(sport==='football') warm.organisation=a===0?'Alla tolv har egen fotboll i en säker yta cirka 22 × 18 m. Kontrollera gräs, hål, mål och avstånd till nästa grupp. Följ instruktionerna för boll och rörelse nedan.':`Sex par med en fotboll per par i separata rutor ${a===1?'10 × 10':'12 × 12'} m. Kontrollera underlag och säkerhetsavstånd. Anpassa bollfart och kraft till gräset.`;
    if(a<=1){
      Object.assign(warm,{title:'Egen boll: upptäck, bromsa och vänd',organisation:`Alla tolv har varsin ${sport==='football'?'fotboll':'futsalboll'} på cirka ${sport==='football'?'22 × 18':'18 × 15'} m. Inga köer. Tränaren står vid sidan.`,
        steps:['För bollen med små kontrollerade kontakter mot ledig yta. Lyft blicken mellan bollkontakterna.','Bromsa, vänd åt en fri sida och fortsätt. Prova båda fötterna, i eget tempo.','I nästa omgång får barnen välja en ny vändning eller större riktningsbyte. Undvik andra bollar; ingen tävling i fart.'],
        restart:'Tappad boll: hämta den och fortsätt med kontroll. Alla fortsätter samtidigt när det är säkert.',rotation:'Alla har egen boll hela arbetsperioden. Pauserna används till vila och en kort visning, inte till köer.',say:'Var finns plats för dig och bollen?',observe:'Blick, balans, bolltrygghet och att barnet hittar en egen väg.',easier:'Gångtempo och större yta.',harder:'Välj en annan riktning efter att ha tittat upp; öka inte fart före kontroll.',diagram:originals[0].blocks[0].diagram});
    }
    const main={duel,support,finish:finishing,width,build,transition}[theme](sport,a);
    const preparation=prep(sport,a,theme);
    // Three thematic learning blocks plus application and reflection; order is authored here.
    const reflection={...base.blocks[4],say:'Vad upptäckte du i en situation i dag?',
      steps:['Låt spelarna göra två minuter lugn bollrörelse innan gruppen samlas.',`Ta en konkret situation från dagens mål: ${goal} Låt spelaren beskriva vad hen såg och valde.`, 'Lyft ett försök och en användbar idé, inte en jämförelse eller tabell över mål. Anteckna vad gruppen behöver nästa gång.'],
      observe:'Om spelaren kan beskriva sitt val, känner sig trygg och är redo att avsluta.',easier:'Låt spelaren peka eller visa med bollen i stället för att prata.',harder:'Fråga om ett annat möjligt val i samma situation.'};
    return {id:`${sport}-${a}-${theme}-02`,sport,age:ages[a],status:'draft',version:1,title,goal,minutes:base.minutes,players:12,
      equipment:sport==='football'?'12 fotbollar anpassade till gruppen, koner, två färger västar (tre för trelagsspel), små mål eller konmål. För målvaktsdelen krävs säkert förankrade mål.':'12 futsalbollar anpassade till gruppen, koner, två färger västar (tre för trelagsspel), små mål eller konmål. För målvaktsdelen krävs säkert förankrade mål.',
      principle:base.principle,
      repeat:'Återkom till samma tema under 3–5 veckor. Välj en klubbplanerad följd, inte alla pass på en vecka. Öka en svårighet först när gruppen är trygg; följ återhämtning och individuell beredskap.',
      ballPriority:a<=1?'Boll i centrum för alla upp till 12 år: egen boll i starten, korta par/gruppuppgifter och smålagsspel utan utslagning. Ingen separat konditionslöpning. Barn som behöver mer tid får mindre press, inte mindre bolltid.':'Behåll mycket bolltid även här; fysisk belastning stödjer spelet och anpassas individuellt.',
      blocks:[warm,preparation,main,application(sport,a,theme),reflection]};
  });
}
