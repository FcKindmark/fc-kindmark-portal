import assert from 'node:assert/strict';
import {EXERCISE_LIBRARY} from '../app/lib/exerciseLibrary.mjs';
import {EXERCISE_SEQUENCES} from '../app/lib/exerciseSequences.mjs';
import {animationFrames,initialScene,interpolateScene} from '../app/lib/exerciseAnimation.mjs';
let actions=0;
for(const exercise of EXERCISE_LIBRARY){
 const before=JSON.stringify(exercise),frames=animationFrames(exercise);
 assert.ok(frames.length,exercise.id);
 assert.equal(frames.length,exercise.animation?.length||(EXERCISE_SEQUENCES[Number(exercise.id.split('-').at(-1))].length+1));
 for(let i=1;i<frames.length;i++)assert.deepEqual(frames[i].start,frames[i-1].end,`${exercise.id}: no reset between actions`);
 for(const f of frames){
  for(const progress of [0,.5,1]){
   const scene=interpolateScene(f.start,f.end,progress);
   assert.equal(scene.players.length,exercise.diagram.players.length);
   assert.equal(scene.ballPoints.length,initialScene(exercise.diagram).ballPoints.length);
   for(const p of [...scene.players,...scene.ballPoints])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=105&&p.y>=0&&p.y<=105,exercise.id);
  }
  assert.deepEqual(interpolateScene(f.start,f.end,0),f.start);
  assert.deepEqual(interpolateScene(f.start,f.end,1).players.map(p=>[Math.round(p.x*100),Math.round(p.y*100)]),f.end.players.map(p=>[Math.round(p.x*100),Math.round(p.y*100)]));
  for(const action of f.actions||[]){
   if(action.kind==='run')continue;
   const ball=f.ownersBefore.indexOf(action.from);
   assert.ok(ball>=0,`${exercise.id}: cannot pass, shoot or dribble without a ball`);
   const actor=f.start.players.find(p=>p.id===action.from);
   assert.deepEqual(f.start.ballPoints[ball],{x:actor.x+4.6,y:actor.y+2.5},`${exercise.id}: action starts at the actual ball`);
  }
  for(const [ball,owner] of (f.ownersAfter||[]).entries()){
   if(owner===null)continue;
   const p=f.end.players.find(p=>p.id===owner);
   assert.deepEqual(f.end.ballPoints[ball],{x:p.x+4.6,y:p.y+2.5},`${exercise.id}: ball follows its owner`);
  }
  actions++;
 }
 assert.equal(JSON.stringify(exercise),before,'animation must not mutate the exercise catalog');
}
const bobek=EXERCISE_LIBRARY.find(e=>e.id==='fck-ex-201'),frames=animationFrames(bobek);
assert.equal(bobek.id,'fck-ex-201');assert.equal(frames.length,7);
for(let i=1;i<frames.length;i++)assert.deepEqual(frames[i].start,frames[i-1].end,'Bobek must be continuous');
assert.deepEqual(frames[5].end.players.find(p=>p.id==='4'),{id:'4',x:62,y:8,team:'blue'});
assert.deepEqual(frames[5].end.players.find(p=>p.id==='2'),{id:'2',x:50,y:84,team:'blue'});
assert.deepEqual(frames[5].end.ballPoints,[{x:16.6,y:14.5}]);
console.log(`PASS: ${EXERCISE_LIBRARY.length} exercises, ${actions} actions; finite geometry, balls preserved, immutable source, continuous sequences for all drills.`);


const second=EXERCISE_LIBRARY.find(e=>e.id==='fck-ex-202'),secondFrames=animationFrames(second);
assert.equal(second.collection,'Bobek Library');
assert.equal(secondFrames.length,15);
assert.equal(second.diagram.players.length,10);
for(let i=1;i<secondFrames.length;i++)assert.deepEqual(secondFrames[i].start,secondFrames[i-1].end);
assert.deepEqual(secondFrames[0].end.ballPoints,[{x:54.6,y:16.5}]);
assert.deepEqual(secondFrames[11].end.ballPoints,[{x:63.4,y:72.5}]);
assert.equal(secondFrames[12].end.players.find(p=>p.id==='D5').x,32);
assert.deepEqual(secondFrames[14].end.ballPoints,[{x:43,y:100}]);
console.log('PASS: second Bobek combination, 15 continuous steps, defenders and shot.');


assert.equal(Object.keys(EXERCISE_SEQUENCES).length,200);
const framesFor=n=>animationFrames(EXERCISE_LIBRARY[n-1]);
assert.equal(framesFor(5)[1].end.players.find(p=>p.id==='A').x,40,'coordinate continuation belongs to A');
assert.deepEqual(framesFor(9)[2].ownersAfter,['A','B'],'both players collect their original loose balls');
assert.deepEqual(framesFor(15)[0].end.ballPoints,[{x:54.6,y:44.5}],'pass meets the moving receiver');
assert.equal(framesFor(38)[2].ownersAfter[0],'A','wall pass returns to the relocated player');
assert.equal(framesFor(88)[0].ownersAfter[0],'GK1','keeper catches before distributing');
assert.equal(framesFor(133)[1].ownersAfter[0],'B','rebound is received before follow-up shot');
assert.equal(framesFor(166).filter(f=>f.actions.some(a=>a.from==='D'&&a.kind==='pass')).length,1,'choose one attacking option, not two passes with the same ball');
console.log('PASS: 200 authored sequences, moving receivers, loose-ball collection, saves, rebounds and alternative branches.');
