import assert from 'node:assert/strict';
import {EXERCISE_LIBRARY as library,EXERCISE_SOURCES,FRAMEWORK_REFERENCES,filterExercises} from '../app/lib/exerciseLibrary.mjs';
assert.equal(library.length,200);
assert.equal(new Set(library.map(e=>e.id)).size,200);
assert.equal(new Set(library.map(e=>e.title)).size,200);
assert.equal(new Set(library.map(e=>JSON.stringify(e.steps))).size,200);
assert.equal(new Set(library.map(e=>JSON.stringify({players:e.diagram.players,arrows:e.diagram.arrows,targets:e.diagram.targets}))).size,200);
for(const e of library){
  assert.ok(EXERCISE_SOURCES[e.source]);assert.ok(FRAMEWORK_REFERENCES[e.framework]);
  assert.ok(e.organisation.includes(' m'));assert.ok(e.steps.length>=3);assert.ok(e.diagram.arrows.length);
  const identities=e.diagram.players.map(p=>p.id);assert.equal(new Set(identities).size,identities.length);
  assert.ok(identities.includes(e.diagram.ball));
  for(const p of e.diagram.players)assert.ok(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);
  for(const arrow of e.diagram.arrows){
    assert.ok(['pass','run','dribble','shot'].includes(arrow.kind));
    for(const end of [arrow.from,arrow.to]){
      if(!identities.includes(end)){const coords=end.split(',').map(Number);assert.equal(coords.length,2);assert.ok(coords.every(n=>Number.isFinite(n)&&n>=0&&n<=100));}
    }
  }
  for(const target of e.diagram.targets){assert.ok(['cone','gate','zone','goal','line'].includes(target.type));assert.ok(target.x>=0&&target.y>=0&&target.x+target.w<=100&&target.y+target.h<=100);}
}
const counts=(n)=>{const e=library[n-1];return e.diagram.players.reduce((r,p)=>({...r,[p.team]:(r[p.team]||0)+1}),{});};
assert.deepEqual(counts(91),{gold:2,blue:6,red:6});assert.deepEqual(counts(84),{gold:2,blue:4,red:4});assert.deepEqual(counts(100),{gold:2,blue:6,red:5});
for(let n=1;n<=10;n++)assert.equal(library[n-1].diagram.balls.length,library[n-1].diagram.players.length);
const states=[{exercise_id:library[0].id,archived_at:'2026-10-12T12:00:00Z'}];
assert.equal(filterExercises({states}).length,199);assert.deepEqual(filterExercises({states,archived:true}).map(e=>e.id),[library[0].id]);
assert.equal(filterExercises({query:'fck-ex-100'}).length,1);
assert.ok(filterExercises({sport:'football'}).every(e=>['both','football'].includes(e.sport)));
assert.equal(filterExercises({phase:'foundation'}).length,40);
const extra=library.slice(100);
assert.equal(extra.length,100);
assert.equal(new Set(extra.map(e=>e.category)).size,10);
assert.deepEqual(new Set(extra.map(e=>EXERCISE_SOURCES[e.source].country)),new Set(['Spanien','Frankrike','Nederländerna','Italien','England']));
assert.ok(extra.every(e=>e.clubFocus&&e.collection&&e.source in EXERCISE_SOURCES));
assert.deepEqual(counts(191),{gold:1,blue:6,red:5});
assert.deepEqual(counts(200),{gold:2,blue:6,red:6});
console.log('PASS: 200 distinct practices, explicit geometry/roles/balls, references and filters.');
