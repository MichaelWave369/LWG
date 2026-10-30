import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createLayer,createScene,duplicateScene,currentScene,sanitizeProject,safeUrl,PROFILES,MAX_SCENES} from '../src/project.js';
import {exportHtml,esc} from '../src/export.js';
import {sampleLayer,trackRect} from '../src/timeline.js';

test('all presets render a full editable composition',()=>{
 for(const id of Object.keys(PROFILES)){
  const p=createProject(id);assert.equal(p.profile,id);assert.ok(p.scenes[0].layers.length>=5);
  assert.ok(currentScene(p).layers.some(l=>l.kind==='link'));
  const html=exportHtml(p);assert.match(html,/<html/);assert.match(html,/prefers-reduced-motion/);
 }
});
test('malicious href and image sources cannot inject executable URL schemes',()=>{
 assert.equal(safeUrl('javascript:alert(1)'), '');
 assert.equal(safeUrl('data:text/html,<script>alert(1)</script>',true),'');
 assert.equal(safeUrl('https://example.com/picture.jpg',true),'https://example.com/picture.jpg');
 const p=createProject();currentScene(p).layers.push({...createLayer('link'),content:'<script>hi</script>',href:'javascript:alert(1)'});
 const h=exportHtml(p);assert.ok(!h.includes('href="javascript:'));
 assert.match(h,/&lt;script&gt;hi&lt;\/script&gt;/);
});
test('imported schema is bounded, sanitized and id deduplicated',()=>{
 const p=sanitizeProject({profile:'bad',layers:[{id:'same',kind:'shape',x:999,fill:'red'},{id:'same',kind:'image',src:'javascript:boo'}]});
 assert.equal(p.profile,'nocturne');assert.equal(p.version,2);assert.equal(p.scenes[0].layers[0].x,100);
 assert.notEqual(p.scenes[0].layers[0].id,p.scenes[0].layers[1].id);
 assert.equal(p.scenes[0].layers[1].src,'');assert.equal(p.scenes[0].layers[0].fill,'#a0b3d2');
});
test('escape covers HTML metacharacters',()=>assert.equal(esc(`<>&"'`),'&lt;&gt;&amp;&quot;&#39;'));
test('legacy v1 imports migrate without losing the layers',()=>{
 const old={version:1,title:'Legacy',profile:'signal',layers:[{kind:'text',content:'KEEP ME',delay:1800}]};
 const migrated=sanitizeProject(old);
 assert.equal(migrated.version,2);assert.equal(migrated.scenes.length,1);
 assert.equal(migrated.scenes[0].layers[0].content,'KEEP ME');
 assert.equal(migrated.scenes[0].layers[0].delay,1800);
 const html=exportHtml(migrated);assert.match(html,/KEEP ME/);
});
test('scenes bound input, de-duplicate identifiers and deep-copy layer IDs',()=>{
 const p=createProject();const first=p.scenes[0],copy=duplicateScene(first);
 assert.notEqual(copy.id,first.id);assert.notEqual(copy.layers[0].id,first.layers[0].id);
 copy.layers[0].content='New';assert.notEqual(first.layers[0].content,'New');
 const tooMany=Array.from({length:MAX_SCENES+5},()=>({...createScene(),id:'same',duration:999999,transition:'evil'}));
 const imported=sanitizeProject({scenes:tooMany});
 assert.equal(imported.scenes.length,MAX_SCENES);assert.equal(new Set(imported.scenes.map(s=>s.id)).size,MAX_SCENES);
 assert.equal(imported.scenes[0].duration,30000);assert.equal(imported.scenes[0].transition,'fade');
});
test('export renders all scenes and safe navigation with timing',()=>{
 const p=createProject();p.scenes.push(createScene(p.profile,2));p.scenes[0].title='<Unsafe & title>';
 const h=exportHtml(p);assert.equal((h.match(/class="scene-shell"/g)||[]).length,2);
 assert.match(h,/class="scene-nav"/);assert.match(h,/Go to &lt;Unsafe &amp; title&gt;/);
 assert.match(h,/--duration:1300ms/);assert.match(h,/data-transition="rise"/);
 assert.ok(!h.includes('aria-label="Go to <Unsafe'));
});
test('motion timeline seeks to deterministic samples and bounds tracks',()=>{
 const reveal={opacity:85,rotate:12,delay:1000,duration:1000,motion:'reveal'};
 assert.equal(sampleLayer(reveal,0).opacity,0);
 assert.equal(sampleLayer(reveal,1000).opacity,0);
 assert.ok(sampleLayer(reveal,1500).opacity>0);
 assert.equal(sampleLayer(reveal,2000).opacity,.85);
 assert.match(sampleLayer({...reveal,motion:'spin'},1500).transform,/rotate\(192deg\)/);
 const rect=trackRect({delay:5500,duration:5000},{duration:6000});
 assert.ok(rect.left<100&&rect.width>0&&rect.left+rect.width<=101);
});
