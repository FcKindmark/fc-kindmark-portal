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
const themeReactions=[
 [['Boll på vänster kant','Flytta blocket mot bollsidan utan att öppna mitten'],['Boll på höger kant','Bortre spelare kliver in och skyddar bortre stolpen'],['Motståndaren spelar in centralt','Närmaste kliver, andra täcker passningen bakom'],['Motståndaren byter sida','Flytta i bollens färd, behåll avstånd mellan lagdelar'],['Motståndaren spelar bakom','Backlinjen faller medan närmaste fördröjer']],
 [['Boll tappas i centrum','Närmaste sätter press direkt, andra skyddar djupled'],['Boll tappas vid sidlinjen','Stäng inåtpass och styr bollhållaren utåt'],['Motståndaren hittar fri spelare','Avbryt ensam jakt, samla laget bakom boll'],['Motståndaren spelar bakåt','Kliv gemensamt och återta yta'],['Första pressen misslyckas','Falla snabbt till kompakt försvarsblock']],
 [['Bollvinst centralt','Första blicken framåt och två löpningar i olika korridorer'],['Försvarare blockerar bollhållaren','Passa till fri löpare innan kontakten'],['Två backar skyddar djup','Bär boll och bind en försvarare före pass'],['Motståndaren hinner hem','Bromsa och etablera positionsspel'],['Pass bryts i kontringen','Direkt återpress eller säkra central balans']],
 [['Motståndaren får dålig touch','Närmaste pressar på första felkontroll'],['Pass spelas tillbaka','Främre spelare accelererar och styr åt en sida'],['Mottagaren står felvänd','Press i ryggen, andra täcker avlägg'],['Pass går mot sidlinjen','Lås inåtpass, använd linjen som extra försvarare'],['Pressen spelas förbi','Återhämta formation, inte individuell jakt']],
 [['Första anfallaren stänger mittback','Använd målvakt för att skapa ny passningsvinkel'],['Ytter pressar ytterback','Spela via central understödsspelare bakom press'],['Motståndaren stänger sexan','Locka press på ena sidan och byt till motsatt back'],['Två pressar samma spelare','Använd fri tredje spelare bakom presslinjen'],['Lång boll tvingas fram','Säkra första och andra boll med förberedda understöd']],
 [['Försvararen stannar mellan två','Bollhållaren driver tills försvararen måste välja'],['Försvararen kliver mot boll','Spela tidigt till fri medspelare'],['Försvararen skär passningen','Utnyttja ytan med egen drivning'],['Undertal och press bakifrån','Skydda boll och spela till säker stödspelare'],['Bollen tappas i överläge','Balansspelare skyddar omställning']],
 [['Motståndaren överbelastar vänster','Locka en extra pressare och hitta fri högerkant'],['Central passningsväg stängs','Använd bakåtpass och ny diagonal vinkel'],['Bortre ytter står brett','Vänd tidigt innan motståndaren hinner flytta'],['Bortre ytter blir markerad','Spela in i halvyta istället för längs linjen'],['Lång diagonal bryts','Bortre back säkrar och mittfältet faller']],
 [['Försvararen blockerar kort hörna','Spela mot förutbestämd andra yta'],['Försvararen skyddar första stolpen','Lägg boll bakom första försvarslinjen'],['Motståndaren går man-man','Skapa separation med korsande löpningar'],['Motståndaren försvarar zon','Attackera gränsen mellan två zonförsvarare'],['Bollen rensas utanför box','Balansspelare tar andra boll och förhindrar kontring']],
 [['Ytterback stänger utsidan','Kombinera via halvyta och spela snett bakåt'],['Mittback attackerar första stolpen','Sök sen löpning mot straffpunkten'],['Bortre back tappar markering','Attackera bortre stolpen'],['Cutback-vägen blockeras','Ta nytt stödpass och byt angreppsvinkel'],['Inlägget rensas','Vinn andraboll med spelare på boxkanten']],
 [['Backen ger skottutrymme','Avsluta med första möjliga balanserade touch'],['Backen rusar mot skytten','Finta avslut och passa till fri medspelare'],['Målvakten täcker närmsta hörn','Avsluta mot bortre hörn när vinkeln tillåter'],['Skottet blockeras','Reagera på retur utan att tappa balans'],['Första avslutet missas','Direkt återstart med ny boll och ny vinkel']],
 [['Vi leder och motståndaren pressar högt','Håll spelbara stödvinklar och undvik risk i centrum'],['Vi ligger under och de backar','Höj tempo men behåll minst en balansspelare'],['Motståndaren maskar tid','Organisera snabb laglig återstart'],['Vi spelar med en mindre','Stäng mitten, välj pressögonblick tillsammans'],['Sista anfallet misslyckas','Samla laget för nästa fas istället för chanspress']],
 [['Pivot markeras i ryggen','Pivot lägger av på ett tillslag till tredje spelare'],['Motståndaren pressar kick-in','Använd kort avlägg eller diagonal till fri korridor'],['Vi spelar fem mot fyra','Flytta bollen snabbt, sök fri bortre stolpe'],['Vi försvarar fyra mot fem','Skydda mitten, flytta kompakt och blockera avslut'],['Målvakten räddar','Första pass mot fri kant, andra spelare säkrar mitten']]
];
const coachingChecks=[
 'Är avståndet mellan närmaste försvarare och täckande spelare korrekt?',
 'Har laget en pressare, en täckare och en spelare som skyddar djupet?',
 'Finns första pass framåt och en löpning som öppnar andra alternativet?',
 'Startar hela laget på samma pressignal?',
 'Har bollhållaren två vinklar, en bakom och en bakom pressen?',
 'Binder bollhållaren en motståndare innan passet slås?',
 'Börjar bortre spelaren röra sig innan spelvändningen?',
 'Vem tar returen och vem skyddar mot kontring?',
 'Hur många spelare attackerar första, centrala och bortre ytan?',
 'Är skottvalet rätt för vinkel, press och målvaktens position?',
 'Väljer spelarna risk efter matchläge och återstående tid?',
 'Vem skyddar centrum när pivot eller flygande målvakt används?'
];
function drawing(theme,drill,sport){
 const isDef=[0,1,3,10].includes(theme),isAttack=[2,8,9].includes(theme);
 const x=isDef?110:isAttack?245:175;
 const y=48+drill*45,cap=(v,a,b)=>Math.max(a,Math.min(b,v));
 const a=[x,cap(y,30,285)],b=[cap(x+50,30,380),cap(y-28,30,285)],c=[cap(x+92,30,380),cap(y+20,30,285)];
 return {players:[[...a,'1','blue'],[...b,'2','blue'],[...c,'3','blue'],[cap(x+27,30,380),cap(y-16,30,285),'X','red'],[cap(x+75,30,380),cap(y+5,30,285),'Y','red']],
 balls:[[cap(x+17,30,395),cap(y,30,285)]],goals:true,
 paths:['M'+a[0]+' '+a[1]+'L'+b[0]+' '+b[1],'M'+b[0]+' '+b[1]+'L'+c[0]+' '+c[1]],kinds:['pass','run'],
 caption:themes[theme][0]+' · '+themes[theme][drill+1]+' · schematisk organisationsbild; verifiera placering på planen.'};
}
export const FOCUSED_TACTICAL_SESSIONS=['football','futsal'].flatMap(sport=>themes.map((topic,t)=>{
 if(sport==='football'&&t===11)return [];
 return [{
 id:sport+'-focused-'+t,sport,age:'14–16',status:'draft',version:2,
 title:topic[0]+' · 75 min · 5 övningar',minutes:75,players:sport==='futsal'?10:14,
 goal:'Lär laget '+topic[0].toLowerCase()+' genom fem matchproblem, fem försvarsreaktioner i varje övning.',
 equipment:'Bollar (minst 8), västar i två färger, 12 koner, två mål och klocka.',
 principle:'Följ övning 1–5. Varje övning: 3 min organisation, 2 min grundmönster, 5 min reaktionsspel (en reaktion per minut), 5 min aktivt spel.',
 ballPriority:'Kort instruktion, inga långa köer; boll sätts omedelbart i spel.',
 blocks:topic.slice(1).map((name,i)=>({
 title:(i+1)+'. '+name,minutes:15,timing:'0–3 min organisera · 3–5 min grundmönster · 5–10 min fem reaktioner · 10–15 min aktivt spel',
 organisation:sport==='futsal'?'4v4 + två målvakter, hela eller halva hallen efter tema; markera startzonen.':'6v6 + två målvakter på anpassad yta, markera startzon och målzon.',
 steps:[
  'START: '+name+'. Tränaren visar vem som har boll, vilka som ger stöd och vem som täcker djupet.',
  '0–3 min: sätt ut spelarna och förklara målet. 3–5 min: kör grundrörelsen med passivt motstånd.',
  ...themeReactions[t].map((r,j)=>'Variation '+(j+1)+' (minut '+(5+j)+'–'+(6+j)+'): '+r[0]+'. Lagets uppgift: '+r[1]+'.'),
  '10–15 min: aktivt spel mot mål. Starta om från samma situation efter avslut eller brytning.',
  'COACHING: '+coachingChecks[t],
  'Bollförlust: närmaste fördröjer; övriga skyddar centrum och djup. Byt roller efter 2–3 omgångar.'
 ],
 variations:themeReactions[t].map((r,j)=>({name:'Variation '+(j+1)+': '+r[0],opponent:r[0],response:r[1]})),
 diagram:drawing(t,i,sport),say:'Vad förändrade motståndaren? Vad öppnades då?',
 observe:coachingChecks[t],restart:'Tränaren spelar in ny boll i samma startzon.',
 rotation:'Byt anfall och försvar var 2–3 omgångar.',
 easier:'Större yta och styrd press.',harder:'Mindre yta, aktiv press och tidsgräns.'
 }))
}]}).flat());
