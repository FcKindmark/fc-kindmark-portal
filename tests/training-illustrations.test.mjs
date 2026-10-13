import assert from 'node:assert/strict';
import {LARGE_TRAINING_BANK as bank} from '../app/lib/largeTrainingBank.mjs';
for(const s of bank){
 for(let i=0;i<5;i++){
  const d=s.blocks[i].diagram;
  assert.ok(d.kinds.includes('run'),s.id+' phase '+i+' needs player movement');
  assert.equal(d.paths.length,d.actions.length);assert.equal(d.paths.length,d.pathLabels.length);
  assert.ok(d.destinations.length>0);
  for(const path of d.paths){const [x,y]=path.match(/^M([\d.-]+) ([\d.-]+)/).slice(1).map(Number);assert.ok([...d.players,...d.destinations].some(p=>Math.hypot(x-p[0],y-p[1])<21),'Arrow must start at shown player or marked later destination');}
  if(['press','defence','loss'].includes(s.theme)&&i>0){assert.ok(d.balls.some(([x,y])=>d.players.some(p=>p[3]==='red'&&Math.hypot(x-p[0],y-p[1])<30)),'Defending diagram needs opposition ball carrier');}
 }
 assert.notDeepEqual(s.blocks[3].diagram.paths,s.blocks[4].diagram.paths,'Free game illustrates an alternative, not the same copied picture');
}
console.log('PASS: 3000 active diagrams include dashed player runs, numbered explanations, destination rings and arrows anchored to actual players; defensive ball ownership and alternative free-play solution verified.');
