// Formation-based training: coach-review drafts, not fixed match instructions.
// Football formations are interpreted as ten outfield players plus goalkeeper.
const formations=[
 {sport:'futsal',shape:'2-2',age:'14–16',lines:[2,2],focus:'parvis understöd och diagonalspel'},
 {sport:'futsal',shape:'3-1',age:'14–16',lines:[3,1],focus:'pivotspel, tredje spelare och press mot pivot'},
 {sport:'futsal',shape:'1-2-1',age:'14–16',lines:[1,2,1],focus:'diamantens passningsvinklar och rotationer'},
 {sport:'futsal',shape:'2-1-1',age:'14–16',lines:[2,1,1],focus:'stödspel bakom pivot och centralt överläge'},
 {sport:'football',shape:'3-4-3',age:'14–16',lines:[3,4,3],focus:'bredd med wingbacks och press i fronttrea'},
 {sport:'football',shape:'3-2-3-2',age:'14–16',lines:[3,2,3,2],focus:'centrala trianglar och samarbete mellan två forwards'},
 {sport:'football',shape:'4-1-2-2-1',age:'14–16',lines:[4,1,2,2,1],focus:'sexans balans, halvrum och press från anfallare'}
];
const topics=[
 {name:'Positionsspel och avstånd',detail:'Behåll grundformationen medan bollen flyttas. Närmaste spelare ger kort alternativ, bortre spelare ger djup.',movement:'support'},
 {name:'Spela förbi första press',detail:'Lura press åt ena sidan och hitta fri spelare bakom första försvarslinjen. Vänd om framåtvägen är stängd.',movement:'break'},
 {name:'Rotation och tredje spelare',detail:'Passa, flytta och skapa ny passningsvinkel. Tredje spelare tajmar löpning i ledig korridor.',movement:'rotate'},
 {name:'Press och understöd',detail:'Närmaste spelare pressar på signal. Nästa spelare täcker centralt, övriga skyddar bortre ytan.',movement:'press'},
 {name:'Omställning efter bollvinst',detail:'Vid bollvinst sök första säkra framåtpassningen. En spelare ger djup, en säkrar bakom bollen.',movement:'transition'},
 {name:'Speluppbyggnad under hög press',detail:'Locka första presspelaren, skapa stödvinkel bakom och hitta fri spelare i nästa linje. Spela tillbaka om centralt alternativ är stängt.',movement:'build'},
 {name:'Motpress efter bollförlust',detail:'Närmaste spelare bromsar bollhållaren. Två medspelare stänger passningsvägar och resten skyddar ytan bakom.',movement:'counterpress'},
 {name:'Överläge och fri spelare',detail:'Skapa 2 mot 1 på bollsidan och hitta tredje spelare när försvararen väljer. Spelarna avgör om de ska driva eller passa.',movement:'overload'},
 {name:'Spelintelligens och fria beslut',detail:'Tränaren ändrar en regel eller flyttar en port mitt i spelet. Laget måste upptäcka förändringen och anpassa sina positioner.',movement:'intelligence'}
];

// Real match triggers: each exercise asks a concrete WHAT IF question, with two viable choices.
// Original coach-designed scenarios aligned with Kindmark's staged learning framework.
const scenarios=[
 ['Motståndaren låser kanten','Vad gör vi när bollhållaren pressas mot sidlinjen?','Skapa bakåtstöd och diagonal utväg; om motståndaren överflyttar, vänd till bortre sida.'],
 ['Pivot blir punktmarkerad','Vad gör vi när pivoten inte kan ta emot?','Pivot drar bort markören och tredje spelare attackerar frigjord yta; alternativt spela via motsatt kant.'],
 ['Vi tappar bollen centralt','Vad gör vi de första sekunderna efter ett centralt bolltapp?','Närmaste spelare fördröjer, understöd täcker passningslinjen och sista linjen skyddar djupet.'],
 ['Motståndaren försvarar lågt','Hur skapar vi ett avslut när mitten är stängd?','Locka över försvar till ena sidan, byt tempo och använd diagonal löpning bakom sista försvararen.'],
 ['Övertalighet i omställning','Vad gör vi i tre mot två efter bollvinst?','Bollhållaren binder en försvarare, medspelarna ger bredd och djup; välj pass eller avslut efter försvararens beslut.'],
 ['Undertalighet efter förlorad duell','Hur fördröjer vi två mot tre tills hjälp kommer?','Skydda centralt och mål, styr bollhållaren utåt, vänta på återhämtande spelare utan att kasta sig.'],
 ['Hög press mot vår uppbyggnad','Hur tar vi oss förbi två aggressiva presspelare?','Målvakt eller bakre spelare skapar extra passningsvinkel; hitta tredje man eller spela över pressen när det är öppet.'],
 ['Spelvändning efter överflyttning','Vad gör vi när fyra försvarare flyttar mot bollen?','Spela tillbaka och byt sida med fart; mottagare orienterar sig före passning och attackerar ytan.'],
 ['Motståndaren byter markering','Vad gör vi när två försvarare byter vem de markerar?','Finta korslöpning, identifiera kommunikationsluckan och välj löpning bakom eller mötande stöd.'],
 ['Vi leder med ett mål','Hur behåller vi initiativet utan att ta onödiga risker?','Skapa säkra trianglar, undvik centrala chanspassningar och pressa samlat när bollen förloras.'],
 ['Vi ligger under sent','Hur ökar vi trycket utan att öppna hela planen?','Högre utgångsposition, snabb återerövring och en tydlig balansspelare bakom anfallet.'],
 ['Inspark eller inkast under press','Hur startar vi om när första alternativet är stängt?','Två korta alternativ och en djup löpning; välj beroende på motståndarens pressvinkel.']
];
const points=lines=>{
 const out=[];
 lines.forEach((count,line)=>{
   const x=65+line*(290/Math.max(1,lines.length-1));
   for(let i=0;i<count;i++)out.push([Math.round(x),Math.round(35+(i+1)*250/(count+1)),String(out.length+1),'blue']);
 });
 return out;
};
function tacticalDiagram(lines,phase,shape){
 const players=points(lines);
 const a=players[0],b=players[Math.min(lines[0],players.length-1)],c=players[Math.min(lines[0]+lines[1]||2,players.length-1)];
 const paths={
  support:[`M${a[0]+12} ${a[1]}L${b[0]-12} ${b[1]}`,`M${b[0]} ${b[1]+10}Q${b[0]+30} ${b[1]+35} ${b[0]+50} ${b[1]+45}`],
  break:[`M${a[0]+12} ${a[1]}L${b[0]-12} ${b[1]}`,`M${b[0]+12} ${b[1]}L${c[0]-12} ${c[1]}`],
  rotate:[`M${a[0]+10} ${a[1]}L${b[0]-10} ${b[1]}`,`M${b[0]} ${b[1]+15}Q${b[0]+20} ${b[1]+35} ${b[0]+45} ${b[1]+20}`],
  press:[`M${b[0]} ${b[1]}L${Math.min(385,b[0]+50)} ${b[1]-25}`,`M${a[0]} ${a[1]}L${Math.min(385,a[0]+50)} ${a[1]+15}`],
  transition:[`M${a[0]+12} ${a[1]}L${b[0]-12} ${b[1]}`,`M${b[0]+12} ${b[1]}L${c[0]-12} ${c[1]}`],
  build:[`M${a[0]+12} ${a[1]}L${b[0]-12} ${b[1]}`,`M${b[0]+12} ${b[1]}L${c[0]-12} ${c[1]}`],
  counterpress:[`M${a[0]} ${a[1]}L${Math.min(380,a[0]+65)} ${a[1]-25}`,`M${b[0]} ${b[1]}L${Math.min(380,b[0]+45)} ${b[1]+20}`],
  overload:[`M${a[0]+12} ${a[1]}L${b[0]-12} ${b[1]}`,`M${b[0]+12} ${b[1]}L${c[0]-12} ${c[1]}`],
  intelligence:[`M${a[0]+12} ${a[1]}L${b[0]-12} ${b[1]}`,`M${b[0]} ${b[1]+12}Q${b[0]+35} ${b[1]+45} ${b[0]+65} ${b[1]+25}`]
 };
 if(phase==='press'||phase==='counterpress'||phase==='overload'||phase==='build')players.push([385,130,'X','red']);
 return {players,paths:paths[phase],kinds:['press','counterpress'].includes(phase)?['run','run']:['rotate','intelligence'].includes(phase)?['pass','run']:['pass','pass'],caption:`${shape}: ${topics.find(t=>t.movement===phase).name}. Blå = laget i formation, röd = motståndare.`};
}
const minutes=[12,15,15,15,18,15,15,15,15];
// Full formation instruction belongs to the development phase, not the foundation phase.
export const FORMATION_TACTICAL_SESSIONS=formations.map((f,i)=>({
 id:`${f.sport}-formation-${f.shape.replaceAll('-','')}-kindmark`,
 sport:f.sport,age:f.age,status:'draft',version:1,
 title:`Taktik ${f.shape} · ${f.focus}`,
 minutes:minutes.reduce((a,b)=>a+b,0),players:f.sport==='futsal'?12:16,
 goal:`Förstå ${f.shape} genom aktiva spelövningar: ${f.focus}.`,
 equipment:'Bollar, koner, västar i två färger, småmål och markerade korridorer.',
 principle:'Förenkla först till del av formationen; behåll spelets riktning, med- och motspelare och val.',
 ballPriority:'Många bollkontakter och korta byten; anpassa spelarnas belastning.',
 blocks:topics.map((t,j)=>({
  title:`${f.shape} · ${t.name}`,minutes:minutes[j],timing:`${minutes[j]} minuter: 2 min instruktion, 3–4 omgångar med korta byten.`,
  organisation:`Visa först ${f.shape} i helhet. Träna sedan med ${f.sport==='futsal'?'4 mot 4 på 24 × 16 m':'6 mot 6 på 40 × 30 m'} och använd extra spelare som avbytare. Positionsmarkeringarna i bilden visar lagets ursprungsstruktur, inte exakt spelarantal i varje smålagsspel.`,
  steps:[`Visa startpositionerna för ${f.shape}; fråga var närmaste och bortre passningsalternativ finns.`,t.detail,'Spela i 60–90 sekunders omgångar. Stoppa bara vid en tydlig lärsituation.','Låt spelarna återstarta och hitta lösningen utan förutbestämt passningsmönster.'],
  diagram:tacticalDiagram(f.lines,t.movement,f.shape),
  say:`Visa ${f.shape} med rörelse, inte bara positioner. ${t.detail}`,
  observe:'Avstånd, timing, orientering och beslut under verklig press.',
  restart:'Ny boll från tränaren vid sidlinjen, med samma anfallsriktning.',
  rotation:'Rotera roller mellan omgångarna så att flera spelare provar olika positioner.',
  easier:'Låt laget ha en extra neutral spelare och större yta.',
  harder:'Minska ytan, lägg till pressignal eller begränsa tid på bollen.'
 }))
}));


// Distinct phase illustrations for each situation and training stage.
// Coordinates are authored deterministically for each trigger, not repeated templates.
function situationDiagram(lines,shape,scenario,stage){
 const d=tacticalDiagram(lines,['support','break','press','transition'][stage],shape);
 const offset=(scenario%6)*9-22;
 d.players=d.players.map(([x,y,n,color],i)=>[
  Math.max(42,Math.min(378,x+offset+(stage%2?i%3*5:0))),
  Math.max(42,Math.min(278,y+((scenario+i+stage)%4-1.5)*11)),n,color
 ]);
 const first=d.players[(scenario+stage)%d.players.length];
 const second=d.players[(scenario+stage+2)%d.players.length];
 d.paths=[
  'M'+first[0]+' '+first[1]+'L'+second[0]+' '+second[1],
  'M'+second[0]+' '+second[1]+'Q'+Math.min(380,second[0]+30)+' '+Math.max(40,second[1]-30)+' '+Math.min(385,second[0]+55)+' '+Math.max(40,second[1]-8)
 ];
 d.kinds=['pass','run'];
 d.balls=[[Math.min(390,first[0]+19),first[1]]];
 d.goals=true;
 d.players.push([Math.min(382,second[0]+26),Math.min(275,second[1]+22),'X','red']);
 d.caption=shape+' · situation '+(scenario+1)+' · del '+(stage+1)+'. Blå anfallare, röd försvarare, heldragen passning, streckad löpning. Schematisk tränarskiss.';
 return d;
}
export const SITUATIONAL_TACTICAL_SESSIONS=formations.flatMap((f,fi)=>
 scenarios.map(([trigger,question,solution],si)=>{
  const movement=topics[(si+fi)%topics.length].movement;
  const isFutsal=f.sport==='futsal';
  const opponentVariations=[
   ['Motståndaren stänger första passningen','Flytta stödet, använd tredje spelare och sök motsatt korridor.'],
   ['Motståndaren kliver aggressivt på bollhållaren','Spela bakom pressen eller skydda bollen tills understöd finns.'],
   ['Motståndaren backar och skyddar mitten','Växla spelriktning, locka ut en försvarare och attackera öppningen.'],
   ['Motståndaren bryter passningen och kontrar','Närmaste bromsar, andra täcker mitten och sista spelaren säkrar djupet.']
  ];
  const block=(name,mins,detail,phase,stage,blockIndex)=>({
    title:name,minutes:mins,timing:`${mins} min · ${stage}`,
    organisation:isFutsal?'Halv futsalplan, 4v4 plus målvakter; byt roller ofta.':'Halv plan eller 45×35 m, 6v6 plus målvakter; formationen visas i helhet före delspel.',
    steps:[`Matchhändelse: ${trigger}. ${question}`,detail,'Dagens planerade motståndarreaktion: '+opponentVariations[(si+blockIndex)%4].join(' → '),'Byt roller. Spelaren måste upptäcka motståndarens reaktion innan valet görs.'],
    diagram:situationDiagram(f.lines,f.shape,si,blockIndex),
    say:question,observe:'Identifierar spelaren press, fri yta och medspelare före beslut? Kan laget återhämta sig när första lösningen misslyckas?',
    restart:'Tränaren sätter in ny boll direkt i den utpekade matchsituationen.',
    rotation:'Byt anfall, försvar och position varannan omgång.',
    easier:'Börja utan motstånd i 60 sekunder, sedan passiv försvarare och extra tid på bollen.',
    harder:'Full aktiv press, kortare beslutstid och en andra oväntad motståndarreaktion.'
  });
  return {
    id:`${f.sport}-situation-${f.shape.replaceAll('-','')}-${String(si+1).padStart(2,'0')}`,
    sport:f.sport,age:'14–16',status:'draft',version:1,
    title:`${f.shape} · Situation ${si+1}: ${trigger}`,
    minutes:75,players:isFutsal?10:14,
    goal:`${question} ${solution}`,
    equipment:'Bollar, västar, koner, två mål och målvakter om tillgängliga.',
    principle:'Visa mönstret först, introducera motstånd, ge sedan spelaren flera möjliga beslut. Inget förutbestämt facit.',
    ballPriority:'Kort instruktion, omedelbar återstart och många repetitioner med boll.',
    blocks:[
      block('1. Lär rörelsen',15,`Visa två möjliga lösningar: ${solution} Repetera rörelsen med låg press.`,movement,'utan aktiv press',0),
      block('2. Känn igen signalen',15,`Försvararen växlar mellan att stänga första och andra alternativet. Spelaren måste upptäcka vilken väg som öppnas.`,'intelligence','passiv till halvaktiv press',1),
      block('3. Välj under press',20,`Spela ut ${trigger.toLowerCase()} i riktad matchsekvens. Lösningen är inte bestämd: spelaren väljer efter motståndarens reaktion.`,'overload','aktivt motstånd',2),
      block('4. Anpassa i fritt spel',25,`Spela med mål och poäng. Tränaren startar om samma situation från nya ytor; laget får byta lösning och måste skydda sig vid bollförlust.`,'transition','fritt spel',3)
    ]
  };
 }));
