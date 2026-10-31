import {test} from 'node:test';
import assert from 'node:assert/strict';
import {balance} from './balance.mjs';
test('zero and missing balances are distinct',()=>{assert.equal(balance({status:2,timeLeftSec:0}).remainingSeconds,0);assert.equal(balance({status:1}).remainingSeconds,null);});
test('client usage timing never reports a shared balance',()=>{const result=balance({status:1,timeLeftSec:120,timingByClientUsage:true});assert.equal(result.remainingSeconds,null);assert.equal(result.deviceSpecific,true);});
