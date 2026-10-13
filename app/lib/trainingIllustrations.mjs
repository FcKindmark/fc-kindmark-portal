// Illustrations encode a possible solution to each actual game problem.
// Paths start at the named player's position; runs end at labelled destination rings.
const P=(x,y,label,color='blue')=>[x,y,label,color];
const clip=(x,min,max)=>Math.max(min,Math.min(max,x));
export function trainingIllustration(theme,problem,phase,sport,ageIndex){
 const key=theme[0],name=theme[2],physical=theme[1]==='conditioning';
 const picture={players:[],paths:[],kinds:[],pathLabels:[],destinations:[],balls:[],actions:[],caption:'',sidePorts:false};
 function route(player,to,kind,explanation,curve=0){
  const [x,y,label]=player,[tx,ty]=to;
  const end=[clip(tx,28,392),clip(ty,32,288)];
  const dx=end[0]-x,dy=end[1]-y,len=Math.hypot(dx,dy)||1;
  const start=[x+dx/len*19,y+dy/len*19];
  const finish=[end[0]-dx/len*(kind==='pass'?20:2),end[1]-dy/len*(kind==='pass'?20:2)];
  picture.paths.push(curve?`M${start[0]} ${start[1]}Q${(x+end[0])/2+curve} ${(y+end[1])/2-curve} ${finish[0]} ${finish[1]}`:`M${start[0]} ${start[1]}L${finish[0]} ${finish[1]}`);
  picture.kinds.push(kind);
  const n=picture.paths.length;
  picture.pathLabels.push([clip((x+end[0])/2+curve*.3,35,385),clip((y+end[1])/2-curve*.3-9,35,280),String(n)]);
  picture.actions.push(`${n}. ${label}: ${explanation}`);
  if(kind==='run'||kind==='dribble')picture.destinations.push([end[0],end[1],label,kind]);
 }
 const pass=(from,to,text)=>route(from,to.slice(0,2),'pass',text);
 const run=(who,x,y,text,curve=0)=>route(who,[x,y],'run',text,curve);
 const dribble=(who,x,y,text,curve=0)=>route(who,[x,y],'dribble',text,curve);
 const ball=who=>picture.balls.push([clip(who[0]+22,30,390),clip(who[1]+15,35,288)]);
 if(phase===5){picture.players=[P(115,105,'1'),P(290,105,'2'),P(115,230,'3'),P(290,230,'4'),P(205,165,'T','gold')];picture.caption='Reflektion: inga löpvägar. Några spelare och tränaren visas, hela gruppen deltar.';return picture;}
 if(phase===0){
  const A=P(95,165,'A'),B=P(285,165,'B');picture.players=[A,B];ball(A);
  if(physical&&ageIndex===2){
   picture.gates=true;
   if(key==='acceleration'){run(B,345,75,'accelerera mot vald port efter signal',-15);pass(A,P(345,75,'B′'),'passa till B:s valda port efter signalen');}
   else if(key==='direction'){pass(A,B,'spela till mottagaren');dribble(B,350,80,'bromsa och välj port bort från det stängda hållet',20);run(A,150,245,'flytta lugnt till nytt understöd efter passningen');}
   else if(key==='coordination'){run(B,260,95,'sidsteg och stopp i balans');pass(A,P(260,95,'B′'),'passa först när B har kontroll');}
   else{pass(A,B,'passa och följ med i spelbar vinkel');run(A,170,235,'nytt stöd efter passning',-20);}
  }else if(['duel','hold','target'].includes(key)){picture.players[1]=P(150,165,'X','red');dribble(A,210,250,'skydda och vänd till fri sida; X skuggar i lugnt tempo',-35);run(picture.players[1],180,215,'följ utan kontakt i uppvärmningen');}
  else if(['cross','side','switch','width'].includes(key)){pass(A,B,'passa till B');run(A,140,245,'visa en ny bred vinkel',-15);run(B,320,90,'efter eget tillbakaspel, välj nästa stödplats');}
  else{pass(A,B,'passa med mottagaren synlig');run(A,150,245,'flytta ur den gamla passningslinjen',-20);}
  picture.caption=`Ett av sex par visas: ${name.toLowerCase()}. Nummer förklaras nedan; stanna och börja om innan nästa alternativ.`;return picture;
 }
 const applied=phase>=3;
 const layouts={
 '3v1':[P(75,165,'A'),P(240,70,'B'),P(255,250,'C'),P(225,155,'X','red')],
 '3v2+1':[P(70,165,'A'),P(155,65,'B'),P(170,255,'C'),P(265,110,'X','red'),P(265,215,'Y','red'),P(375,165,'M','gold')],
 '2v2+2':[P(95,105,'A'),P(150,230,'B'),P(275,110,'X','red'),P(280,235,'Y','red'),P(220,40,'N1','gold'),P(220,280,'N2','gold')],
 '3v3':[P(85,100,'A'),P(145,235,'B'),P(205,75,'C'),P(270,100,'X','red'),P(280,225,'Y','red'),P(330,170,'Z','red')],
 '4v4+4':[P(80,165,'A'),P(155,75,'B'),P(165,250,'C'),P(235,180,'D'),P(260,85,'X','red'),P(290,245,'Y','red'),P(315,165,'Z','red'),P(220,230,'W','red'),P(40,165,'N1','gold'),P(380,165,'M','gold'),P(220,40,'N2','gold'),P(220,280,'N3','gold')]
 };
 const format=applied?'3v3':problem.format;
 picture.players=layouts[format].map(p=>[...p]);
 // Reposition within the same organisation to expose the actual thematic problem.
 const blues=picture.players.filter(p=>p[3]==='blue'),reds=picture.players.filter(p=>p[3]==='red'),neutrals=picture.players.filter(p=>p[3]==='gold');
 const A=blues[0],B=blues[1],C=blues[2]||null,D=blues[3]||neutrals.at(-1)||B,X=reds[0];
 const v=['Öppen väg → stängd väg','Nära press → fri mottagare','Jämnt motstånd → stöd på ny sida','Överläge → matchlikt beslut'].indexOf(problem.name);
 const isDefensive=['press','defence','loss'].includes(key);
 picture.sidePorts=format!=='3v2+1';picture.targetZone=format==='3v2+1';
 if(['vertical','middle','depth','balance'].includes(key))picture.zones=3;
 const movementSide=v%2===0?250:70;
 if(phase===4){
  const targetSide=v%2===0?75:245;
  if(isDefensive){ball(X);run(A,135,170,'återgå när första pressen är passerad, skydda vägen mot eget vänstra mål');run(B,95,210,'täck djupet bakom A');if(C)run(C,100,100,'säkra bortre yta i stället för att jaga samma boll');}
  else if(key==='duel'||key==='finish'||key==='direction'){ball(A);run(B,290,targetSide,'ge ett alternativ när den direkta vägen är stängd');dribble(A,205,170,'för bollen till ny vinkel när passningen inte är öppen',-25);run(X,235,180,'skydda målytan; bollhållaren måste läsa detta');}
  else{ball(A);run(B,120,targetSide,'ge ett säkert nytt stöd i stället för att tvinga huvudlösningen');pass(A,P(120,targetSide,B[2]),'behåll boll när den önskade framåtvägen är stängd');run(A,165,220,'bli spelbar igen efter säkert pass');if(C)run(C,305,250,'behåll ett senare framåtalternativ');run(X,240,145,'stäng den första framåtlinjen, inte allt samtidigt');}
  picture.caption=`Fri spelomgång: ${name}. Ett annat möjligt val när huvudvägen är stängd. En av två 3 mot 3-planer visas; inga bonuskrav. Tom ring visar tänkt slutplats.`;
  return picture;
 }
 if(phase===2&&!isDefensive){X[0]=Math.max(190,A[0]+90);X[1]=A[1]-20;}
 if(key==='build'){
  B[0]=145;B[1]=55; if(C){C[0]=215;C[1]=245;}
  ball(A);run(X,A[0]+65,A[1]-10,'pressa bollhållaren och visa vilket utspel som öppnas');pass(A,B,'spela ur första pressen');run(A,125,215,'ge säkert stöd efter passningen');if(C)run(C,305,230,'visa nästa mottagning bakom första försvararen');
 }else if(key==='position'){
  ball(A);run(B,180,60,'bredda så passningslinjen öppnas');if(C)run(C,245,255,'ge stöd på annan höjd');pass(A,P(180,60,B[2]),'hitta B i den nya vinkeln');
 }else if(key==='vertical'){
  B[0]=245;B[1]=85;ball(A);run(B,330,70,'hitta djup när bollhållaren ser linjen');pass(A,P(330,70,B[2]),'spela framåt bara om X inte täcker linjen');if(C)run(C,180,245,'behåll ett kort alternativ om djuppasset stängs');
 }else if(key==='middle'){
  B[0]=170;B[1]=225;ball(A);run(B,210,150,'kliv ur skuggan in i central mottagningsyta');pass(A,P(210,150,B[2]),'spela B mellan motståndarna');if(C)run(C,285,70,'öppna nästa passningsvinkel före B:s mottagning');
 }else if(key==='side'||key==='cross'){
  B[0]=170;B[1]=85;ball(A);run(B,310,55,'löp ut i fri sidokorridor');pass(A,P(310,55,B[2]),'spela i kantspelarens rörelse');if(C)run(C,345,210,'kom sent till bortre eller cutback-yta');
  if(key==='cross'){route(P(310,55,B[2]),[345,210],'pass','exempel på lågt inspel när mottagaren är fri');}
 }else if(key==='second'){
  ball(A);pass(A,B,'passa B som visar sig');run(A,245,170,'löp förbi pressens sida för ett möjligt återspel',-28);route(B,[245,170],'pass','återspel i A:s nya yta om X inte stänger');
 }else if(key==='third'&&!C&&neutrals[0]){
  const N=neutrals[0];ball(A);pass(A,N,'använd sidoneutralen som mellanled');run(B,315,200,'tredje spelare skapar fri mottagningsyta');route(N,[315,200],'pass','mellanledet hittar B efter löpningen');
 }else if(key==='third'){
  ball(A);pass(A,B,'spela mellanled B');if(C){run(C,315,245,'starta när passningen går mot B');route(B,[315,245],'pass','spela tredje mottagaren C i rörelse om linjen är fri');}run(A,130,200,'ge återspel om tredje spelaren blir stängd');
 }else if(key==='hold'){
  A[0]=175;A[1]=165;X[0]=220;X[1]=165;ball(A);dribble(A,155,205,'skydda och ta ett kort steg bort från press');run(B,105,85,'visa sig framför bollhållarens fria axel');route(P(155,205,'A'),[105,85],'pass','lägg tillbaka när understödet syns');
 }else if(key==='target'){
  B[0]=295;B[1]=165;ball(A);run(B,245,155,'möt passningen framför X, inte bakom');pass(A,P(245,155,B[2]),'hitta främre mottagaren');if(C)run(C,315,245,'gå i djup när targetspelaren möter');run(A,170,205,'ge säkert understöd för tillbakaspel');
 }else if(key==='finish'){
  ball(A);pass(A,B,'hitta B i bättre vinkel');run(A,295,165,'gå i en ny avslutsyta efter passningen',-25);route(B,[295,165],'pass','passa löpande A om det är bättre än eget avslut');picture.shotTarget=[390,165];
 }else if(isDefensive){
  X[0]=295;X[1]=165;A[0]=180;A[1]=160;B[0]=120;B[1]=225;if(C){C[0]=80;C[1]=75;}ball(X);
  if(key==='press'){run(A,255,150,'båga mot X och styr mot sidan',22);run(B,190,215,'täck den centrala vägen bakom första press');if(C)run(C,145,95,'flytta in och skydda nästa farliga passning');}
  if(key==='defence'){run(A,230,165,'närma dig med balans och fördröj');run(B,165,180,'täck bakom A mot eget vänstra mål');if(C)run(C,120,105,'skydda bortre yta');}
  if(key==='loss'){run(A,255,160,'närmaste fördröjer X efter bollförlust');run(B,155,180,'säkra centrum i stället för att jaga samma boll');if(C)run(C,100,130,'återgå mot eget mål om återpressen saknar täckning');}
 }else if(key==='win'){
  A[0]=180;A[1]=165;ball(A);run(B,335,75,'gå framåt i fri yta efter bollvinst');pass(A,P(335,75,B[2]),'välj framåt om fördelen finns');if(C)run(C,120,250,'erbjud säker passning om kontringen stängs');
 }else if(key==='switch'){
  ball(A);B[0]=190;B[1]=85;pass(A,B,'hitta mellanledet för att flytta pressen');if(C){run(C,300,260,'håll bortre bredd tillgänglig');route(B,[300,260],'pass','vänd spelet till C:s nya breda yta');}run(A,140,210,'behåll understöd efter första passet');
 }else if(key==='depth'){
  ball(A);run(B,145,85,'möt kort för att dra med försvararen');if(C)run(C,335,245,'gå i motsatt djup när B kommer kort');if(C)pass(A,P(335,245,C[2]),'spela bakom om försvararen följer B');
 }else if(key==='balance'){
  A[0]=175;A[1]=165;ball(A);run(B,315,75,'ge främre attackalternativ');if(C)run(C,110,225,'stanna bakom bollen för stöd och centrumskydd');pass(A,P(315,75,B[2]),'attackera med balans bakom');
 }else if(key==='duel'||key==='direction'){
  A[0]=145;A[1]=165;X[0]=230;X[1]=150;ball(A);dribble(A,285,235,'byt fart/riktning mot fri sida, inte rakt in i X',-25);run(B,315,75,'ge stöd som alternativ om dribblingen stängs');
 }else if(key==='touch'){
  ball(A);pass(A,B,'passa till B som har tittat före mottagningen');dribble(B,275,75,'första touch bort från närmaste press');run(A,145,210,'bli nästa synliga stöd');
 }else if(key==='passing'){
  ball(A);pass(A,B,'anpassa passningens kraft till avståndet');run(A,175,175,'sök ny passningsvinkel efter passning');if(C)run(C,310,movementSide,'gör sig synlig som alternativ, utan låst ordning');
 }else if(key==='acceleration'){
  ball(A);run(B,330,70,'accelerera till vald öppen port, följ återhämtningen');pass(A,P(330,70,B[2]),'passa i B:s rörelse');
 }else if(key==='coordination'){
  ball(A);run(B,215,100,'kontrollerad förflyttning, stopp i balans');pass(A,P(215,100,B[2]),'möt en kontrollerad mottagare');run(A,130,230,'flytta lugnt till nästa stödplats');
 }else{ball(A);pass(A,B,'passa till stöd');run(A,185,205,'upprepa spelbar löpning med bibehållen kvalitet');if(C)run(C,300,75,'ge ett nytt alternativ i nästa aktion');}
 if(phase===1)picture.caption=`Grundproblem: ${name}. ${problem.action} `;
 else if(phase===2)picture.caption=`Aktivt motstånd: ${name}. ${problem.name}. `;
 else picture.caption=`${phase===3?'Tematisk spelomgång':'Fri spelomgång'}: ${name}. En av två 3 mot 3-planer visas. `;
 picture.caption+='Numren beskriver ett möjligt exempel nedan; öppna alternativ är inte en tvingad sekvens. Tom ring är spelarens tänkta slutplats.';
 if(phase===2&&!isDefensive)run(X,A[0]+45,A[1]+10,'aktiv press på bollhållaren; öppna alternativa passningsvägar',18);
 if(phase===2&&reds.length>1&&!isDefensive){const Y=reds[1];run(Y,Math.max(80,Y[0]-40),clip(Y[1]+(v%2?25:-25),45,270),'försvararen väljer att täcka nästa linje, anfallet läser valet');}
 return picture;
}
