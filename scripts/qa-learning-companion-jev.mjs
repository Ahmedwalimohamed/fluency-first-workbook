import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const lc=require('../learning-companion-v1.js');
const jev=require('../learning-companion-jev.js');

assert.match(jev.VERSION,/learning-companion-jev-v1/);
assert.equal(jev.evidence({confidence:.9,probabilities:{HINT_1:.8}},'HINT_1'),.8);
assert.equal(jev.evidence({confidence:.7},'x'),.7);
assert.equal(jev.evidence({},'x'),0);
assert.equal(lc.validateJevDecision({action:'HINT_1',confidence:.8}).valid,true);
assert.equal(lc.validateJevDecision({action:'INVENTED',confidence:.9}).valid,false);

console.log('Learning Companion Jev contract QA: PASS');
