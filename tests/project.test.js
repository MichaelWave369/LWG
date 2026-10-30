import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createLayer,sanitizeProject,safeUrl,PROFILES} from '../src/project.js';
import {exportHtml,esc} from '../src/export.js';

test('all presets render a full editable composition',()=>{
 for (const id of Object.keys(PROFILES)) {
  const p=createProject(id);assert.equal(p.profile,id);assert.ok(p.layers.length>=5);
  assert.ok(p.layers.some(l=>l.kind==='link'));
  const html=exportHtml(p);assert.match(html,/<html/);assert.match(html,/prefers-reduced-motion/);
 }
});
test('malicious href and image sources cannot inject executable URL schemes',()=>{
 assert.equal(safeUrl('javascript:alert(1)'), '');
 assert.equal(safeUrl('data:text/html,<script>alert(1)</script>',true),'');
 assert.equal(safeUrl('https://example.com/picture.jpg',true),'https://example.com/picture.jpg');
 const p=createProject();p.layers.push({...createLayer('link'),'content':'<script>hi</script>','href':'javascript:alert(1)'});
 const h=exportHtml(p);assert.ok(!h.includes('href="javascript:'));
 assert.match(h,/&lt;script&gt;hi&lt;\/script&gt;/);
});
test('imported schema is bounded, sanitized and id deduplicated',()=>{
 const p=sanitizeProject({profile:'bad',layers:[{id:'same',kind:'shape',x:999,fill:'red'},{id:'same',kind:'image',src:'javascript:boo'}]});
 assert.equal(p.profile,'nocturne');assert.equal(p.layers[0].x,100);assert.notEqual(p.layers[0].id,p.layers[1].id);
 assert.equal(p.layers[1].src,'');assert.equal(p.layers[0].fill,'#a0b3d2');
});
test('escape covers HTML metacharacters',()=>assert.equal(esc(`<>&"'`),'&lt;&gt;&amp;&quot;&#39;'));
