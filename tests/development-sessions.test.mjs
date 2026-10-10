import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEVELOPMENT_AGES, DEVELOPMENT_SESSIONS } from '../app/lib/developmentSessions.mjs';

assert.deepEqual(DEVELOPMENT_AGES,['8–10','11–13','14–16']);
assert.equal(DEVELOPMENT_SESSIONS.length,3);
assert.equal(new Set(DEVELOPMENT_SESSIONS.map(s=>s.id)).size,3);
assert.deepEqual(DEVELOPMENT_SESSIONS.map(s=>s.age),DEVELOPMENT_AGES);
assert.deepEqual(DEVELOPMENT_SESSIONS.map(s=>s.minutes),[55,60,75]);
for(const session of DEVELOPMENT_SESSIONS){
  assert.equal(session.sport,'futsal');
  assert.equal(session.status,'draft');
  assert.equal(session.players,12);
  assert.equal(session.blocks.length,5);
  assert.equal(session.blocks.reduce((sum,b)=>sum+b.minutes,0),session.minutes);
  for(const b of session.blocks){
    for(const field of ['title','organisation','timing','restart','rotation','say','observe','easier','harder']) assert.ok(b[field]?.length>0,field);
    assert.ok(b.steps.length>=2);
    assert.ok(b.diagram.caption.length>0);
    for(const [x,y] of b.diagram.players){assert.ok(x>=20&&x<=400);assert.ok(y>=20&&y<=300);}
    assert.ok(!b.diagram.kinds || b.diagram.kinds.length===b.diagram.paths.length);
  }
}
const dashboard=readFileSync(new URL('../app/components/admin/AdminDashboard.jsx',import.meta.url),'utf8');
assert.match(dashboard,/activeTab === "programs" && profile\?\.role === "admin"/);
const coachFilter=dashboard.match(/tabs\.filter\(t => (\[[^\]]+\])/)[1];
assert.ok(!coachFilter.includes('programs'));
assert.equal(DEVELOPMENT_SESSIONS[0].blocks[2].diagram.gates,true);
console.log('Development sessions: age groups, timing, diagrams and draft visibility passed.');
