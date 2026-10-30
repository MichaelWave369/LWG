import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/project.js';
import {exportHtml} from '../src/export.js';
import {readSource,parseProjectJson,validateCustomCss,MAX_CUSTOM_CSS} from '../src/source.js';

test('source JSON round trips into the canonical visual scene model',()=>{
 const p=createProject();const raw=JSON.parse(readSource(p,'json'));
 raw.title='Hand edited source';raw.scenes[0].layers[0].label='Edited layer';
 const updated=parseProjectJson(JSON.stringify(raw));
 assert.equal(updated.title,'Hand edited source');
 assert.equal(updated.scenes[0].layers[0].label,'Edited layer');
 assert.equal(updated.activeSceneId,p.activeSceneId);
});
test('custom CSS travels from editor into export without disrupting existing scenes',()=>{
 const p=createProject();p.customCss=validateCustomCss('.scene .object.text { letter-spacing: .15em; }');
 const imported=parseProjectJson(JSON.stringify(p));
 assert.equal(imported.customCss,p.customCss);
 const html=readSource(imported,'html');
 assert.ok(html.includes(p.customCss));
 assert.equal(html,exportHtml(imported));
 assert.ok(html.includes('MAKE SOMETHING ALIVE.'));
});
test('source rejects invalid project structure instead of silently discarding work',()=>{
 const p=createProject();p.scenes=[];
 assert.throws(()=>parseProjectJson(JSON.stringify(p)),/1–12/);
 const huge=createProject();huge.scenes[0].layers=Array.from({length:81},()=>({kind:'text'}));
 assert.throws(()=>parseProjectJson(JSON.stringify(huge)),/80 layers/);
 assert.throws(()=>parseProjectJson('{broken'),/Invalid JSON/);
 assert.throws(()=>parseProjectJson(JSON.stringify({version:5,scenes:[]})),/v1 or v2/);
});
test('custom CSS cannot fetch external resources or break out of style element',()=>{
 for(const bad of ['</style><script>bad()</script>', '@import "https://elsewhere.test/x.css";', 'div {background: url(https://elsewhere.test/t)}', '@font-face {font-family:x}', 'div {background: image-set("https://evil.test/x" 1x)}', 'div {behavior:expression(foo)}']) {
  assert.throws(()=>validateCustomCss(bad));
 }
 assert.throws(()=>validateCustomCss('x'.repeat(MAX_CUSTOM_CSS+1)),/32 KB/);
 assert.equal(validateCustomCss(''), '');
 assert.match(validateCustomCss('@media (max-width:720px){.scene{background:teal}}'),/@media/);
});
test('invalid CSS imported through project sanitizer is discarded, not exported',async()=>{
 const {sanitizeProject}=await import('../src/project.js');
 const imported=sanitizeProject({...createProject(),customCss:'</style><script>alert(1)</script>'});
 assert.equal(imported.customCss,'');
 assert.ok(!exportHtml(imported).includes('<script>alert(1)</script>'));
});
