import test from 'node:test';import assert from 'node:assert/strict';
import {SCHEMA,tokenColor,tokenDuration,tokenDimension,tokenBezier,tokensFromSamples} from '../src/dtcg.js';
test('DTCG 2025.10 serializes dimension and duration objects',()=>{
 assert.deepEqual(tokenDimension(120).$value,{value:120,unit:'px'});assert.deepEqual(tokenDuration(80).$value,{value:80,unit:'ms'});
 assert.deepEqual(tokenBezier([.16,1,.3,1]).$value,[.16,1,.3,1]);assert.deepEqual(tokenColor('#ff8000').$value.components,[1,0.501961,0]);
});
test('DTCG report structure has valid version and typed values',()=>{
 const t=tokensFromSamples({source:'site.test',colors:['#abcdef'],fontSizes:[22],durations:[300]});
 assert.equal(t.$schema,SCHEMA);assert.equal(t.color.sample1.$type,'color');assert.equal(t.fontSize.step1.$value.unit,'px');assert.equal(t.motion.sampleDuration1.$value.value,300);
});
