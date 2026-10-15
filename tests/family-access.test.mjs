import assert from 'node:assert/strict';
import {hasFamilyAccess} from '../app/lib/familyAccess.mjs';
assert.equal(hasFamilyAccess([{player_id:'child'}],[],null),true);
assert.equal(hasFamilyAccess([],[{mother_email:' Parent@Example.test '}],'parent@example.test'),true);
assert.equal(hasFamilyAccess([],[{father_email:'parent@example.test'}],' PARENT@example.test '),true);
assert.equal(hasFamilyAccess([],[{mother_email:'someone@example.test'}],'parent@example.test'),false);
assert.equal(hasFamilyAccess([],[],''),false);
assert.equal(hasFamilyAccess([],[{mother_email:null,father_email:null}],null),false);
console.log('PASS: child links and guardian email retain family access independently of membership type.');
