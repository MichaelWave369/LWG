import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createLayer,createScene,sanitizeProject,PROFILES} from '../src/project.js';
import {exportHtml} from '../src/export.js';
import {parseProjectJson} from '../src/source.js';
import {DESIGN_PROFILES,FONT_STACKS,applyDesign,sanitizeDesign,contrastRatio,cssDesign} from '../src/design/tokens.js';

test('six original design profiles have bounded offline-safe palettes and font stacks',()=>{
 assert.equal(Object.keys(DESIGN_PROFILES).length,6);
 for(const [key,profile] of Object.entries(PROFILES)){
  const project=createProject(key);
  assert.equal(project.profile,key);
  assert.equal(project.design.bg,profile.bg);
  assert.ok(Object.hasOwn(FONT_STACKS,project.design.font));
  assert.match(cssDesign(project.design),/--design-font:/);
  assert.ok(!cssDesign(project.design).includes('url('));
 }
});
test('design values survive v2 JSON roundtrip and v1 migrations',()=>{
 const project=createProject();
 project.design={bg:'#123456',ink:'#ffffff',accent:'#eebbaa',secondary:'#8899cc',font:'Georgia'};
 const read=parseProjectJson(JSON.stringify(project));
 assert.deepEqual(read.design,project.design);
 const legacy=sanitizeProject({version:1,title:'Legacy',profile:'signal',layers:[{kind:'text',content:'Keep this'}]});
 assert.equal(legacy.design.font,'monospace');
 assert.equal(legacy.scenes[0].layers[0].content,'Keep this');
});
test('imports reject unsupported fonts and injected colors without propagating executable CSS',()=>{
 const project=sanitizeProject({...createProject(),design:{bg:'red;--hack:1',ink:'#AABBCC',font:'url(https://bad.example/font)'}});
 assert.equal(project.design.bg,PROFILES.nocturne.bg);
 assert.equal(project.design.ink,'#aabbcc');
 assert.equal(project.design.font,'system-ui');
 const exported=exportHtml(project);
 assert.ok(!exported.includes('bad.example'));
 assert.match(exported,/--ink:#aabbcc/);
});
test('applying a palette recolors token-matching layers and leaves independent custom colors alone',()=>{
 const original=createProject();
 const oldAccent=original.design.accent;
 original.scenes[0].layers.push(createLayer('shape','nocturne'));
 original.scenes[0].layers[0].fill='#735d99';
 const edited=applyDesign(original,{...original.design,bg:'#123456',accent:'#00aaff',font:'Georgia'});
 assert.equal(edited.scenes[0].bg,'#123456');
 assert.equal(edited.scenes[0].layers[0].fill,'#735d99');
 assert.ok(edited.scenes[0].layers.some(l=>l.fill==='#00aaff'));
 assert.equal(edited.design.font,'Georgia');
 assert.equal(original.design.accent,oldAccent);
 assert.notEqual(original.scenes[0].bg,edited.scenes[0].bg);
});
test('newly created scenes and objects can inherit edited design without replacing existing content',()=>{
 const p=createProject('tide');
 p.design={...p.design,accent:'#112233',ink:'#eeeeee'};
 const scene=createScene(p.profile,2,p.design);
 const object=createLayer('link',p.profile,p.design);
 assert.equal(scene.layers.find(l=>l.kind==='link'),undefined);
 assert.ok(scene.layers.some(l=>l.color==='#eeeeee'));
 assert.equal(object.color,'#eeeeee');
});
test('export uses the applied design tokens and remains self-contained',()=>{
 const original=createProject('ember');
 const changed=applyDesign(original,{...original.design,ink:'#fefefe',font:'monospace'});
 const html=exportHtml(changed);
 assert.ok(html.includes('--ink:#fefefe'));
 assert.ok(html.includes('--design-font:'+FONT_STACKS.monospace));
 assert.ok(html.includes('font-family:var(--design-font)'));
 assert.ok(!html.includes('fonts.googleapis.com'));
 assert.ok(html.includes('MAKE SOMETHING ALIVE.'));
});
test('contrast advisory follows WCAG luminance arithmetic',()=>{
 assert.ok(Math.abs(contrastRatio('#000000','#ffffff')-21)<0.001);
 assert.equal(contrastRatio('#ffffff','#ffffff'),1);
 assert.equal(contrastRatio('red','#ffffff'),null);
 assert.ok(contrastRatio('#f0f1eb','#09101c')>4.5);
});
test('sanitizeDesign returns detached values and does not accept arrays as design objects',()=>{
 const normal=sanitizeDesign('print',[]);
 assert.equal(normal.bg,DESIGN_PROFILES.print.bg);
 assert.notStrictEqual(normal,DESIGN_PROFILES.print);
 const bad=sanitizeDesign('missing',{accent:'#ff00ff',font:'Monaco'});
 assert.equal(bad.accent,'#ff00ff');
 assert.equal(bad.font,'system-ui');
});
