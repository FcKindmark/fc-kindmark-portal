import assert from 'node:assert/strict';
import {parseResult,resultLabel,replyLabel} from '../app/lib/matches.js';
assert.deepEqual(parseResult('0','0'),{club_score:0,opponent_score:0});
assert.deepEqual(parseResult('',''),{club_score:null,opponent_score:null});
for(const values of [['','2'],['1',''],['-1','2'],['1.5','2'],['32768','0']]) assert.throws(()=>parseResult(...values));
assert.equal(resultLabel({club_score:0,opponent_score:0,opponent:'Example'}),'FC Kindmark 0–0 Example');
assert.equal(replyLabel(undefined),'Svar väntas');
assert.equal(replyLabel(false),'Kan inte komma');
console.log('PASS: score validation, score clearing, 0–0 and unanswered invitations.');
