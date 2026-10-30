import assert from 'node:assert/strict';
import {EXERCISE_LIBRARY} from '../app/lib/exerciseLibrary.mjs';
import {animationFrames,initialScene,interpolateScene} from '../app/lib/exerciseAnimation.mjs';
let actions=0;
for(const exercise of EXERCISE_LIBRARY){
 const before=JSON.stringify(exercise),frames=animationFrames(exercise);
 assert.ok(frames.length,exercise.id);
 assert.equal(frames.length,exercise.animation?.length||exercise.diagram.arrows.length);
 for(const f of frames){
  for(const progress of [0,.5,1]){
   const scene=interpolateScene(f.start,f.end,progress);
   assert.equal(scene.players.length,exercise.diagram.players.length);
   assert.equal(scene.ballPoints.length,initialScene(exercise.diagram).ballPoints.length);
   for(const p of [...scene.players,...scene.ballPoints])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=105&&p.y>=0&&p.y<=105,exercise.id);
  }
  assert.deepEqual(interpolateScene(f.start,f.end,0),f.start);
  assert.deepEqual(interpolateScene(f.start,f.end,1).players.map(p=>[Math.round(p.x*100),Math.round(p.y*100)]),f.end.players.map(p=>[Math.round(p.x*100),Math.round(p.y*100)]));
  if(f.arrow){
   const moving=f.end.players.filter((p,i)=>p.x!==f.start.players[i].x||p.y!==f.start.players[i].y);
   if(['pass','shot'].includes(f.arrow.kind))assert.equal(moving.length,0);
   if(['run','dribble'].includes(f.arrow.kind))assert.ok(moving.every(p=>p.id===f.arrow.from));
   if(f.arrow.kind==='run')assert.deepEqual(f.start.ballPoints,f.end.ballPoints);
  }
  actions++;
 }
 assert.equal(JSON.stringify(exercise),before,'animation must not mutate the exercise catalog');
}
const bobek=EXERCISE_LIBRARY.find(e=>e.title==='Bobek'),frames=animationFrames(bobek);
assert.equal(bobek.id,'fck-ex-201');assert.equal(frames.length,7);
for(let i=1;i<frames.length;i++)assert.deepEqual(frames[i].start,frames[i-1].end,'Bobek must be continuous');
assert.deepEqual(frames[5].end.players.find(p=>p.id==='4'),{id:'4',x:62,y:8,team:'blue'});
assert.deepEqual(frames[5].end.players.find(p=>p.id==='2'),{id:'2',x:50,y:84,team:'blue'});
assert.deepEqual(frames[5].end.ballPoints,[{x:16.6,y:14.5}]);
console.log(`PASS: ${EXERCISE_LIBRARY.length} exercises, ${actions} actions; finite geometry, balls preserved, immutable source, continuous Bobek combination.`);
