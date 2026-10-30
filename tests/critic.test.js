import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createLayer} from '../src/project.js';
import {auditProject,CRITIC_SEVERITIES} from '../src/design/critic.js';

function blank(){
 const p=createProject();
 p.scenes[0].layers=[];p.scenes[0].bg='#ffffff';
 return p;
}
const find=(report,rule)=>report.findings.filter(f=>f.rule===rule);

test('Design Critic produces a stable, non-mutating, versioned JSON audit',()=>{
 const p=createProject();const before=JSON.stringify(p);
 const a=auditProject(p),b=auditProject(p);
 assert.equal(a.schema,'LWG_DESIGN_CRITIC_V1');
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(p),before);
 assert.ok(a.findings.every(f=>CRITIC_SEVERITIES.includes(f.severity)));
 assert.equal(Object.values(a.counts).reduce((a,b)=>a+b,0),a.findings.length);
});
test('contrasting text passes, low contrast gets localized evidence and navigation IDs',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('text'),id:'hero-text',color:'#555555',content:'Readable? Not enough',fontSize:15,weight:400});
 const report=auditProject(p);
 const issue=find(report,'estimated-contrast')[0];
 assert.equal(issue.sceneId,s.id);
 assert.equal(issue.layerId,'hero-text');
 assert.ok(issue.evidence.ratio<4.5);
 assert.equal(issue.evidence.threshold,4.5);
 s.layers[0].color='#000000';
 assert.equal(find(auditProject(p),'estimated-contrast').length,0);
});
test('large readable headings use 3:1 reference-size threshold only',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('text'),id:'large',fontSize:60,color:'#777777',weight:700});
 assert.equal(find(auditProject(p),'estimated-contrast').length,0);
 s.layers[0].fontSize=16;
 assert.equal(find(auditProject(p),'estimated-contrast').length,1);
});
test('unknown backgrounds beneath text are not falsely certified as a known color',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('image'),id:'hero-image',x:0,y:0,w:100,h:100,src:'https://example.com/a.png'});
 s.layers.push({...createLayer('text'),id:'headline',x:10,y:10,w:50,h:20,color:'#ffffff'});
 assert.equal(find(auditProject(p),'estimated-contrast').length,0);
 assert.equal(find(auditProject(p),'remote-asset').length,1);
});
test('missing and invalid destinations are actionable but mailto and valid scenes are not',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('link'),id:'no-target',href:'#',content:'Click here'});
 s.layers.push({...createLayer('link'),id:'dead-anchor',href:'#missing',content:'Other'});
 s.layers.push({...createLayer('link'),id:'real-anchor',href:'#'+s.id,content:'Visit this scene'});
 s.layers.push({...createLayer('link'),id:'mail',href:'mailto:hello@example.com',content:'Email us'});
 const report=auditProject(p);
 assert.equal(find(report,'link-destination').length,1);
 assert.equal(find(report,'missing-scene-anchor').length,1);
 assert.equal(find(report,'link-label').length,1);
 assert.equal(find(report,'link-destination')[0].layerId,'no-target');
});
test('missing image descriptions and remote image dependency are separate checks',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('image'),id:'image1',src:'data:image/png;base64,AA==',alt:'Decorative image'});
 s.layers.push({...createLayer('image'),id:'image2',src:'',alt:'Useful descriptive alt'});
 s.layers.push({...createLayer('image'),id:'image3',src:'https://example.com/photo.png',alt:'Sunlight on a bridge'});
 const report=auditProject(p);
 assert.equal(find(report,'image-alt').length,1);
 assert.equal(find(report,'image-source').length,1);
 assert.equal(find(report,'remote-asset').length,1);
});
test('overflow, small text, small tap targets and motion density yield advisories',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('text'),id:'overflowing',x:90,w:30,y:-4,fontSize:12});
 s.layers.push({...createLayer('link'),id:'small-link',href:'https://example.com',content:'Explore',h:2});
 for(let i=0;i<12;i++)s.layers.push({...createLayer('shape'),id:'moving-'+i,motion:'spin'});
 const report=auditProject(p);
 assert.equal(find(report,'artboard-overflow').length,1);
 assert.equal(find(report,'small-type').length,1);
 assert.equal(find(report,'small-target').length,1);
 assert.equal(find(report,'motion-density').length,1);
 assert.ok(report.findings.every(f=>f.recommendation.length>10));
});
test('severity ordering and note-only results are consistent',()=>{
 const p=blank(),s=p.scenes[0];
 s.layers.push({...createLayer('image'),id:'empty'});
 s.layers.push({...createLayer('link'),id:'bad',href:'#none',content:'click here'});
 const report=auditProject(p);
 const sev=report.findings.map(f=>CRITIC_SEVERITIES.indexOf(f.severity));
 assert.deepEqual(sev,[...sev].sort((a,b)=>a-b));
 assert.equal(report.counts.warning,2);
 assert.ok(report.counts.info>=1);
});
