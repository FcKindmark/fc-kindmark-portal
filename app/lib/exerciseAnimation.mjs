import {EXERCISE_SEQUENCES,SEQUENCE_BALLS,SEQUENCE_NOTES} from './exerciseSequences.mjs';
const copy = s => ({players:s.players.map(p=>({...p})),ballPoints:s.ballPoints.map(p=>({...p}))});
export function initialScene(d){return {players:d.players.map(p=>({...p})),ballPoints:(d.balls||[d.ball]).filter(Boolean).map(id=>{const p=d.players.find(p=>p.id===id);return {x:p.x+4.6,y:p.y+2.5};})};}
const point=(ref,players)=>{const p=players.find(p=>p.id===ref);if(p)return {x:p.x,y:p.y};const [x,y]=ref.split(',').map(Number);return {x,y};};
export function animationFrames(exercise){
 let scene=initialScene(exercise.diagram);
 if(exercise.animation)return exercise.animation.map(step=>{const start=copy(scene),end=copy(scene);for(const [id,x,y] of step.moves||[]){const p=end.players.find(p=>p.id===id);p.x=x;p.y=y;}if(step.ball)end.ballPoints=[{x:step.ball[0],y:step.ball[1]}];scene=end;return {start,end,title:step.title,text:step.text};});
 return sequenceFrames(exercise);

}
export function interpolateScene(start,end,t){const k=Math.max(0,Math.min(1,t));return {players:start.players.map((p,i)=>({...p,x:p.x+(end.players[i].x-p.x)*k,y:p.y+(end.players[i].y-p.y)*k})),ballPoints:start.ballPoints.map((p,i)=>({x:p.x+(end.ballPoints[i].x-p.x)*k,y:p.y+(end.ballPoints[i].y-p.y)*k}))};}


const atFoot = p => ({x:p.x+4.6,y:p.y+2.5});
const samePoint = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)<.01;
const opponent = (a,b) => a && b && a.team!==b.team && a.team!=='gold' && b.team!=='gold';
function sequenceFrames(exercise){
 const number=Number(exercise.id.split('-').at(-1));
 const beats=EXERCISE_SEQUENCES[number];
 if(!beats)throw new Error(`Missing authored sequence: ${exercise.id}`);
 const owners=[...(SEQUENCE_BALLS[number]||exercise.diagram.balls||[exercise.diagram.ball])];
 let scene=initialScene({...exercise.diagram,balls:owners});
 const fail=message=>{throw new Error(`${exercise.id}: ${message}`);};
 const frames=beats.map((actions,index)=>{
  const start=copy(scene),end=copy(scene),beforeOwners=[...owners],used=new Set(),moving=new Set();
  const player=(id,where)=>where.players.find(p=>p.id===id)||fail(`Unknown player ${id}`);
  for(const action of actions){
   player(action.from,start);
   if(['run','dribble'].includes(action.kind)){
    if(moving.has(action.from))fail(`Two movements for ${action.from}`);
    moving.add(action.from);
    const to=point(action.to,start.players),p=player(action.from,end);
    p.x=to.x;p.y=to.y;
   }
  }
  const descriptions=[],arrows=[];
  for(const action of actions){
   const from=player(action.from,start),to=point(action.to,end.players);
   if(!Number.isFinite(to.x)||!Number.isFinite(to.y))fail(`Invalid target ${action.to}`);
   const receiver=end.players.find(p=>p.id===action.to);
   arrows.push({from:`${from.x},${from.y}`,to:`${to.x},${to.y}`,kind:action.kind==='rebound'?'pass':action.kind});
   if(action.kind==='run'){
    const slot=beforeOwners.indexOf(action.from);
    if(slot>=0&&!actions.some(a=>a.from===action.from&&['pass','shot'].includes(a.kind)))fail(`Ball carrier ${action.from} cannot run without the ball`);
    // A run can collect a previously released ball; no ball is created or moved.
    if(slot<0){const loose=end.ballPoints.findIndex((b,j)=>owners[j]===null&&samePoint(b,atFoot(to)));if(loose>=0)owners[loose]=action.from;}
    descriptions.push(`${action.from} löper utan boll till en ny position.`);
    continue;
   }
   const slot=beforeOwners.indexOf(action.from);
   if(slot<0)fail(`${action.from} does not possess a ball in beat ${index+1}`);
   if(used.has(slot))fail('A ball has two actions in one beat');
   used.add(slot);
   end.ballPoints[slot]=atFoot(to);
   owners[slot]=action.kind==='dribble'?action.from:(receiver?.id||null);
   if(action.kind==='dribble')descriptions.push(`${action.from} driver sin boll till den visade ytan.`);
   else if(action.kind==='rebound')descriptions.push(`${action.from} parerar ut returen mot ${receiver?.id||'den fria ytan'}. Samma boll fortsätter i spel.`);
   else if(action.kind==='shot')descriptions.push(receiver&&beats[index+1]?.some(a=>a.kind==='rebound'&&a.from===receiver.id)?`${action.from} skjuter lågt. ${receiver.id} parerar; returen följer i nästa steg.`:receiver?`${action.from} avslutar. ${receiver.id} räddar och fångar bollen i detta exempel.`:`${action.from} avslutar mot mål. Bollen visas fram till mållinjen.`);
   else if(opponent(from,receiver))descriptions.push(`${receiver.id} bryter ${action.from}:s boll. Possessionen går över till det andra laget.`);
   else descriptions.push(`${action.from} passar ${receiver?receiver.id:'bollen framför sig'}.${receiver?' Mottagaren tar emot innan nästa aktion.':''}`);
  }
  scene=end;
  const title=actions.some(a=>a.kind==='shot')?'Avslut':actions.some(a=>a.kind==='pass'&&opponent(player(a.from,start),end.players.find(p=>p.id===a.to)))?'Bollvinst och omställning':actions.some(a=>a.kind==='pass')?'Passning och spelbarhet':actions.some(a=>a.kind==='dribble')?'Bollkontroll och förflyttning':'Rörelse utan boll';
  return {start,end,title,text:descriptions.join(' '),arrows,actions,ownersBefore:beforeOwners,ownersAfter:[...owners]};
 });
 const note=SEQUENCE_NOTES[number]||'Detta är ett möjligt förlopp. Spelarna får välja andra lösningar i den fria övningen.';
 frames.push({start:copy(scene),end:copy(scene),title:'Fortsätt, byt roller och börja om',text:`${note} ${exercise.observe} ${exercise.rotation||''} ${exercise.restart||''}`,arrows:[],actions:[],ownersBefore:[...owners],ownersAfter:[...owners]});
 return frames;
}
