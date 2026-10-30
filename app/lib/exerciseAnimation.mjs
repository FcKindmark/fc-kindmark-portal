const copy = s => ({players:s.players.map(p=>({...p})),ballPoints:s.ballPoints.map(p=>({...p}))});
export function initialScene(d){return {players:d.players.map(p=>({...p})),ballPoints:(d.balls||[d.ball]).filter(Boolean).map(id=>{const p=d.players.find(p=>p.id===id);return {x:p.x+4.6,y:p.y+2.5};})};}
const point=(ref,players)=>{const p=players.find(p=>p.id===ref);if(p)return {x:p.x,y:p.y};const [x,y]=ref.split(',').map(Number);return {x,y};};
export function animationFrames(exercise){
 let scene=initialScene(exercise.diagram);
 if(exercise.animation)return exercise.animation.map(step=>{const start=copy(scene),end=copy(scene);for(const [id,x,y] of step.moves||[]){const p=end.players.find(p=>p.id===id);p.x=x;p.y=y;}if(step.ball)end.ballPoints=[{x:step.ball[0],y:step.ball[1]}];scene=end;return {start,end,title:step.title,text:step.text};});
 // Arrows are independent examples, not a fabricated match sequence.
 return exercise.diagram.arrows.map((arrow,i)=>{
  const start=initialScene(exercise.diagram),end=copy(start),from=point(arrow.from,start.players),to=point(arrow.to,start.players);
  const label={run:'Löpning',pass:'Passning',dribble:'Driva boll',shot:'Avslut'}[arrow.kind];
  if(arrow.kind==='run'||arrow.kind==='dribble'){const p=end.players.find(p=>p.id===arrow.from);if(p){p.x=to.x;p.y=to.y;}}
  if(arrow.kind!=='run'){
   const balls=start.ballPoints;
   const nearest=balls.reduce((best,p,j)=>Math.hypot(p.x-from.x,p.y-from.y)<Math.hypot(balls[best].x-from.x,balls[best].y-from.y)?j:best,0);
   if(!balls.length){balls.push({...from});end.ballPoints.push({...from});}
   start.ballPoints[nearest]={x:from.x+4.6,y:from.y+2.5};end.ballPoints[nearest]={x:to.x+4.6,y:to.y+2.5};
  }
  return {start,end,title:`${i+1}. ${label}`,text:`${arrow.from} ${arrow.kind==='run'?'löper':arrow.kind==='dribble'?'driver bollen':arrow.kind==='shot'?'avslutar':'passar'} mot ${exercise.diagram.players.some(p=>p.id===arrow.to)?arrow.to:'den markerade ytan'}. ${exercise.observe}`,arrow};
 });
}
export function interpolateScene(start,end,t){const k=Math.max(0,Math.min(1,t));return {players:start.players.map((p,i)=>({...p,x:p.x+(end.players[i].x-p.x)*k,y:p.y+(end.players[i].y-p.y)*k})),ballPoints:start.ballPoints.map((p,i)=>({x:p.x+(end.ballPoints[i].x-p.x)*k,y:p.y+(end.ballPoints[i].y-p.y)*k}))};}
