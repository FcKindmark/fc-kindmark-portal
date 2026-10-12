import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEVELOPMENT_AGES, DEVELOPMENT_SESSIONS as ALL_SESSIONS } from '../app/lib/developmentSessions.mjs';
// Two existing Kindmark sessions were added after this suite's original 27-pass matrix.
assert.equal(ALL_SESSIONS.length,29);
assert.equal(new Set(ALL_SESSIONS.map(s=>s.id)).size,29);
const DEVELOPMENT_SESSIONS=ALL_SESSIONS.filter(s=>!s.id.endsWith('-03'));
for(const s of ALL_SESSIONS.filter(s=>s.id.endsWith('-03'))){
  assert.equal(s.blocks.reduce((n,b)=>n+b.minutes,0),s.minutes);
  assert.equal(s.blocks.length,5);
}

assert.deepEqual(DEVELOPMENT_AGES,['8–10','11–13','14–16']);
assert.equal(DEVELOPMENT_SESSIONS.length,27);
assert.equal(new Set(DEVELOPMENT_SESSIONS.map(s=>s.id)).size,27);
for(const age of DEVELOPMENT_AGES){
  assert.equal(DEVELOPMENT_SESSIONS.filter(s=>s.age===age&&s.sport==='futsal').length,5);
  assert.equal(DEVELOPMENT_SESSIONS.filter(s=>s.age===age&&s.sport==='football').length,4);
}
assert.equal(new Set(DEVELOPMENT_SESSIONS.map(s=>s.title)).size,27);
for(const session of DEVELOPMENT_SESSIONS){
  assert.ok(['futsal','football'].includes(session.sport));
  assert.equal(session.status,'draft');
  assert.equal(session.players,12);
  assert.equal(session.blocks.length,5);
  assert.equal(session.minutes,[55,60,75][DEVELOPMENT_AGES.indexOf(session.age)]);
  assert.equal(session.blocks.reduce((sum,b)=>sum+b.minutes,0),session.minutes);
  for(const b of session.blocks){
    for(const field of ['title','organisation','timing','restart','rotation','say','observe','easier','harder']) assert.ok(b[field]?.length>0,field);
    assert.ok(b.steps.length>=2);
    assert.ok(b.diagram.caption.length>0);
    for(const [x,y] of b.diagram.players){assert.ok(x>=20&&x<=400);assert.ok(y>=20&&y<=300);}
    assert.ok(!b.diagram.kinds || b.diagram.kinds.length===b.diagram.paths.length);
  }
  assert.ok(session.ballPriority.length>0);
  if(session.age!=='14–16')assert.match(session.blocks[0].organisation,/egen|varsin/);
  if(session.sport==='football')assert.match(session.equipment,/fotbollar/);
}
const dashboard=readFileSync(new URL('../app/components/admin/AdminDashboard.jsx',import.meta.url),'utf8');
assert.match(dashboard,/activeTab === "programs" && profile\?\.role === "admin"/);
const coachFilter=dashboard.match(/tabs\.filter\(t => (\[[^\]]+\])/)[1];
assert.ok(!coachFilter.includes('programs'));
assert.equal(DEVELOPMENT_SESSIONS[0].blocks[2].diagram.gates,true);
const ui=readFileSync(new URL('../app/components/admin/DevelopmentSessions.jsx',import.meta.url),'utf8');
assert.match(ui,/sessions\.find\(s=>s.id===selectedId\)/);
assert.match(ui,/onClick=\{\(\)=>setSelectedId\(s.id\)\}/);
assert.match(ui,/setSelectedId\(null\)/);
assert.ok(!ui.includes('|| sessions[0]'),'No session opens automatically');
assert.match(ui,/session.blocks.map\(\(part,index\)=>/,'Whole session is rendered');
assert.ok(!ui.includes('setIndex'),'No separate exercise selection');
assert.match(ui,/Tillbaka till alla pass/);
const youthTransition=DEVELOPMENT_SESSIONS.find(s=>s.age==='11–13'&&s.sport==='futsal'&&s.id.includes('transition'));
assert.match(youthTransition.blocks[2].organisation,/Alla tolv är aktiva/);
for(const s of DEVELOPMENT_SESSIONS.filter(s=>s.id.includes('finish-02')))assert.match(s.blocks[2].organisation,/Sex par/);
for(const s of DEVELOPMENT_SESSIONS.filter(s=>s.id.includes('build-02')))assert.equal(s.blocks[2].diagram.goalSide,'left');
console.log('Development sessions: age groups, timing, diagrams and draft visibility passed.');
const additions=DEVELOPMENT_SESSIONS.filter(s=>s.id.endsWith('-02'));
for(const s of additions){
  if(s.age!=='14–16')assert.equal(s.blocks[0].diagram.players.length,12);
  assert.equal(s.blocks[4].diagram.players.length,13);
  assert.equal(s.blocks[3].diagram.players.length,6);
}
assert.equal(new Set(additions.map(s=>JSON.stringify(s.blocks[3].diagram))).size,7);
for(const s of additions.filter(s=>s.id.includes('escape'))){
  assert.equal(s.blocks[2].diagram.players.length,4);
  assert.equal(s.blocks[2].diagram.sidePorts,true);
}
