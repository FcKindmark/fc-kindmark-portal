import assert from 'node:assert/strict';
import {LARGE_TRAINING_BANK as bank} from '../app/lib/largeTrainingBank.mjs';
assert.equal(bank.length,600);assert.equal(new Set(bank.map(s=>s.id)).size,600);
for(const sport of ['football','futsal'])for(const age of ['8–10','11–13','14–16']){
 const group=bank.filter(s=>s.sport===sport&&s.age===age);assert.equal(group.length,100);
 assert.equal(new Set(group.map(s=>s.title)).size,100);
 assert.equal(group.filter(s=>s.category==='tactical').length,72);
 assert.equal(group.filter(s=>s.category==='conditioning').length,16);
 assert.equal(group.filter(s=>s.category==='regular').length,12);
 assert.equal(new Set(group.map(s=>s.theme)).size,25);
 for(const t of new Set(group.map(s=>s.theme)))assert.equal(new Set(group.filter(s=>s.theme===t).map(s=>s.blocks[2].organisation+s.blocks[2].steps.join(''))).size,4);
}
for(const s of bank){
 assert.equal(s.minutes,75);assert.equal(s.blocks.length,6);assert.equal(s.blocks.reduce((n,b)=>n+b.minutes,0),75);
 if(s.age!=='14–16')assert.equal(s.formation,null);
 for(const b of s.blocks){
  for(const key of ['title','organisation','timing','restart','rotation','say','observe','easier','harder'])assert.ok(b[key]?.length>0);
  assert.ok(b.steps.length>=2);assert.ok(b.diagram.caption);assert.equal(b.diagram.paths.length,b.diagram.kinds?.length||0);
  for(const [x,y] of b.diagram.players){assert.ok(x>=20&&x<=400);assert.ok(y>=20&&y<=300);}
 }
}
console.log('PASS: 600 full 75-minute sessions; 100 per group; categories, 4 different scenarios per theme, age limits, all 3600 diagrams and time blocks.');
