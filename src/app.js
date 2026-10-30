import {PROFILES,MOTIONS,TRANSITIONS,MAX_SCENES,MAX_LAYERS,createProject,createScene,duplicateScene,currentScene,createLayer,sanitizeProject,sanitizeLayer,safeUrl} from './project.js';
import {esc,exportHtml,layerStyle} from './export.js';
import {sampleLayer,formatTime,trackRect} from './timeline.js';
import {readSource,parseProjectJson,validateCustomCss} from './source.js';
import {FONT_STACKS,applyDesign,sanitizeDesign,contrastRatio} from './design/tokens.js';
import {auditProject} from './design/critic.js';

const $=id=>document.getElementById(id);
const STORAGE='lwg-project-v2',LEGACY='lwg-project-v1';
let project;
try{project=sanitizeProject(JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem(LEGACY)||'null')||createProject());}
catch{project=createProject();}
let selectedId=currentScene(project).layers.at(-1)?.id||null;
let isPreview=false,modified=false,toastTimer,playhead=0,playing=false,lastFrame=0,rafId=0;
let workspaceMode='design',sourceKind='css',sourceDirty=false;
let designDraft={...project.design},designDirty=false,designUndo=null;
const scene=()=>currentScene(project);
const selected=()=>scene().layers.find(l=>l.id===selectedId);
const glyph={text:'T',image:'▧',shape:'◯',link:'↗'};
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function persist(preserveDesignUndo=false){if(!preserveDesignUndo)designUndo=null;modified=true;try{localStorage.setItem(STORAGE,JSON.stringify(project));}catch{toast('Browser storage full. Save project JSON to preserve your work.');}renderCritic();}
function stopPlay(){playing=false;cancelAnimationFrame(rafId);rafId=0;lastFrame=0;updatePlayButton();}
function updatePlayButton(){
 $('timeline-play').textContent=playing?'Ⅱ Pause':'▶ Play scenes';$('timeline-play').setAttribute('aria-pressed',String(playing));
}
function applyTime(){
 $('timeline-scrub').value=String(Math.round(playhead));$('timeline-time').textContent=`${formatTime(playhead)} / ${formatTime(scene().duration)}`;
 $('timeline-viewport').style.setProperty('--playhead-ratio',String(playhead/scene().duration));
 if(!isPreview)return;
 for(const node of $('artboard').children){const l=scene().layers.find(item=>item.id===node.dataset.id);if(!l)continue;
  const v=sampleLayer(l,playhead);node.style.animation='none';node.style.opacity=String(v.opacity);node.style.transform=v.transform;
 }
}
function renderArtboard(){
 const stage=$('artboard'),s=scene();stage.classList.add('scene');stage.style.background=s.bg;stage.style.fontFamily=FONT_STACKS[project.design.font];stage.replaceChildren();stage.classList.toggle('preview-mode',isPreview);
 for(const l of s.layers){
  const node=document.createElement(l.kind==='link'?'a':'div');
  node.className='object '+l.kind+(l.id===selectedId&&!isPreview?' selected':'');
  node.dataset.id=l.id;node.dataset.kind=l.kind;node.dataset.motion=l.motion;node.style.cssText=layerStyle(l);
  node.setAttribute('aria-label',l.label);
  if(l.kind==='shape')node.setAttribute('aria-hidden','true');
  else if(l.kind==='image'){
   if(l.src){const img=document.createElement('img');img.src=l.src;img.alt=l.alt;img.loading='lazy';node.append(img);}
   else{const span=document.createElement('span');span.className='image-placeholder';span.textContent='▧  ADD YOUR IMAGE';node.append(span);}
  }else{node.textContent=l.content;if(l.kind==='link'){node.href=safeUrl(l.href)||'#';node.addEventListener('click',e=>e.preventDefault());}}
  stage.append(node);
 }
 $('object-count').textContent=`${s.layers.length} OBJECTS`;
 if(isPreview)applyTime();
}
function renderScenes(){
 const strip=$('scene-list');strip.replaceChildren();
 for(let i=0;i<project.scenes.length;i++){
  const s=project.scenes[i],row=document.createElement('div');row.className='scene-item'+(s.id===project.activeSceneId?' active':'');
  const btn=document.createElement('button');btn.type='button';btn.className='scene-select';btn.dataset.scene=s.id;
  btn.textContent=`${String(i+1).padStart(2,'0')} · ${s.title}`;btn.title=s.title;
  btn.setAttribute('aria-pressed',String(s.id===project.activeSceneId));
  const left=document.createElement('button'),right=document.createElement('button');
  for(const [b,dir,t] of [[left,-1,'Move scene left'],[right,1,'Move scene right']]){
   b.type='button';b.dataset.sceneMove=String(dir);b.dataset.sceneId=s.id;b.title=t;b.setAttribute('aria-label',`${t}: ${s.title}`);
   b.textContent=dir<0?'‹':'›';b.disabled=(dir<0?i===0:i===project.scenes.length-1);
  }
  row.append(btn,left,right);strip.append(row);
 }
 $('scene-count').textContent=`${project.scenes.length} / ${MAX_SCENES} SCENES`;
 $('scene-add').disabled=project.scenes.length>=MAX_SCENES;
 $('scene-duplicate').disabled=project.scenes.length>=MAX_SCENES;
 $('scene-delete').disabled=project.scenes.length<=1;
 const s=scene();$('scene-name').value=s.title;$('scene-bg').value=s.bg;
 $('scene-duration').value=s.duration/1000;$('scene-transition').value=s.transition;
}
function renderLayers(){
 $('layer-count').textContent=`${scene().layers.length} LAYERS`;
 const list=$('layer-list');list.replaceChildren();
 for(let i=scene().layers.length-1;i>=0;i--){
  const l=scene().layers[i],button=document.createElement('button');button.type='button';button.className='layer-row'+(selectedId===l.id?' selected':'');button.dataset.select=l.id;
  const glyphSpan=document.createElement('span');glyphSpan.className='layer-glyph';glyphSpan.textContent=glyph[l.kind];
  const name=document.createElement('span');name.className='layer-name';name.textContent=l.label;
  const motion=document.createElement('span');motion.className='layer-badge';motion.textContent=l.motion==='none'?'':'◈';motion.title=l.motion;
  const ordering=document.createElement('span');ordering.className='layer-order';
  const up=document.createElement('button');up.type='button';up.dataset.order='up';up.dataset.layer=l.id;up.textContent='▲';up.disabled=i===scene().layers.length-1;up.title='Bring forward';up.setAttribute('aria-label',`Bring ${l.label} forward`);
  const down=document.createElement('button');down.type='button';down.dataset.order='down';down.dataset.layer=l.id;down.textContent='▼';down.disabled=i===0;down.title='Send backward';down.setAttribute('aria-label',`Send ${l.label} backward`);
  ordering.append(up,down);
  const row=document.createElement('div');row.className='layer-line';row.append(button,ordering);button.append(glyphSpan,name,motion);list.append(row);
 }
}
const field=(label,key,value,type='text',extra='')=>`<div><label for="field-${key}">${label}</label><input id="field-${key}" type="${type}" data-field="${key}" value="${esc(value)}" ${extra}></div>`;
function renderInspector(){
 const area=$('inspector'),l=selected();
 if(!l){area.innerHTML='<p class="empty-note">Select an object to edit its content, geometry, and motion track.</p>';return;}
 const textInput=l.kind==='text'||l.kind==='link';
 const jumpOptions=project.scenes.map(s=>`<option value="#${esc(s.id)}" ${l.href==='#'+s.id?'selected':''}>${esc(s.title)}</option>`).join('');
 area.innerHTML=`<div class="inspector">
  ${field('LAYER NAME','label',l.label,'text','maxlength="80"')}
  ${textInput?`<div><label for="field-content">TEXT / LINK LABEL</label><textarea id="field-content" data-field="content" maxlength="500">${esc(l.content)}</textarea></div>`:''}
  ${l.kind==='image'?`${field('IMAGE URL','src',l.src,'text','placeholder="https://..."')}<button class="upload-btn" data-action="upload" type="button">↥ Upload image from computer</button>${field('ALT TEXT','alt',l.alt,'text')}`:''}
  ${l.kind==='link'?`${field('DESTINATION LINK','href',l.href,'text','placeholder="https://... or #scene"')}<div><label for="scene-jump">QUICK LINK TO SCENE</label><select id="scene-jump" data-jump><option value="">Choose destination…</option>${jumpOptions}</select></div>`:''}
  <div class="two-col">${field('LEFT %','x',l.x,'number','step="0.5"')}${field('TOP %','y',l.y,'number','step="0.5"')}${field('WIDTH %','w',l.w,'number','step="0.5" min="2"')}${field('HEIGHT %','h',l.h,'number','step="0.5" min="2"')}</div>
  <div class="two-col">${field('ROTATION °','rotate',l.rotate,'number','step="5"')}${field('OPACITY %','opacity',l.opacity,'number','min="0" max="100"')}</div>
  ${textInput?`<div class="two-col">${field('FONT SIZE','fontSize',l.fontSize,'number','min="9" max="250"')}${field('TEXT COLOR','color',l.color,'color')}</div>`:''}
  ${l.kind==='shape'?`<div class="two-col">${field('FILL COLOR','fill',l.fill,'color')}${field('ROUNDNESS %','radius',l.radius,'number','min="0" max="100"')}</div>`:''}
  ${l.kind==='image'?field('CORNER RADIUS %','radius',l.radius,'number','min="0" max="100"'):''}
  <div><label for="field-motion">MOTION BEHAVIOR</label><select id="field-motion" data-field="motion">${MOTIONS.map(m=>`<option value="${m}"${l.motion===m?' selected':''}>${m.replace('-',' ')}</option>`).join('')}</select></div>
  <div class="two-col">${field('START AT / MS','delay',l.delay,'number','min="0" max="30000" step="50"')}${field('MOTION LENGTH / MS','duration',l.duration,'number','min="150" max="30000" step="50"')}</div>
  <div class="actions"><button data-action="duplicate" type="button">⧉ Duplicate</button><button class="delete" data-action="delete" type="button">✕ Delete</button></div>
  <p class="field-note">Timeline start and duration are exported. Drag the object or use arrow keys to adjust position.</p>
 </div>`;
}
function renderTimeline(){
 const s=scene(),tracks=$('timeline-tracks');tracks.replaceChildren();
 $('timeline-scrub').max=String(s.duration);
 for(const l of s.layers){const row=document.createElement('button');row.type='button';row.className='timeline-row'+(l.id===selectedId?' selected':'');row.dataset.track=l.id;
  const name=document.createElement('span');name.className='timeline-label';name.textContent=l.label;name.title=l.label;
  const rail=document.createElement('span');rail.className='timeline-rail';const bar=document.createElement('span');bar.className='timeline-bar';bar.dataset.motion=l.motion;
  const rect=trackRect(l,s);bar.style.left=rect.left+'%';bar.style.width=rect.width+'%';bar.title=`${l.motion} • ${formatTime(l.delay)} start • ${formatTime(l.duration)} length`;
  rail.append(bar);row.append(name,rail);tracks.append(row);
 }
 applyTime();
}
function renderDesign(){
 const picker=$('profile-picker');picker.replaceChildren();
 for(const [id,p] of Object.entries(PROFILES)){
  const btn=document.createElement('button');btn.type='button';btn.dataset.profile=id;
  btn.className='profile-btn'+(id===project.profile?' selected':'');btn.setAttribute('aria-pressed',String(id===project.profile));
  const swatch=document.createElement('span');swatch.className='mini-swatch';
  swatch.style.background='linear-gradient(135deg,'+p.bg+' 0%,'+p.bg+' 45%,'+p.accent+' 46%,'+p.accent+' 71%,'+p.secondary+' 72%)';
  const caption=document.createElement('span');caption.textContent=p.name;
  const detail=document.createElement('small');detail.textContent=p.description;caption.append(detail);
  btn.append(swatch,caption);picker.append(btn);
 }
 const current=designDirty?sanitizeDesign(project.profile,designDraft):project.design;
 for(const input of document.querySelectorAll('[data-design]')){
  if(input.dataset.design!=='font')input.value=current[input.dataset.design];
 }
 const select=$('design-font');select.replaceChildren();
 for(const font of Object.keys(FONT_STACKS)){
  const option=document.createElement('option');option.value=font;option.textContent=font;
  option.selected=current.font===font;select.append(option);
 }
 const contrast=contrastRatio(current.ink,current.bg);
 $('design-contrast').textContent='Text / background: '+contrast.toFixed(2)+':1 '+(contrast>=4.5?'· AA normal text':'· below AA normal text');
 $('design-contrast').classList.toggle('dna-warning',contrast<4.5);
 $('design-apply').disabled=!designDirty;
 $('design-preview').disabled=!designDirty;
 $('design-undo').disabled=!designUndo;
}
function renderCritic(){
 const report=auditProject(project),filter=$('critic-filter').value;
 const summary=$('critic-summary');
 summary.textContent=`${report.counts.error} errors · ${report.counts.warning} warnings · ${report.counts.info} notes`;
 const list=$('critic-list');list.replaceChildren();
 const visible=report.findings.filter(f=>filter==='all'||f.severity===filter);
 for(const finding of visible.slice(0,60)){
  const tag=document.createElement(finding.layerId?'button':'div');
  if(finding.layerId){tag.type='button';tag.dataset.criticScene=finding.sceneId;tag.dataset.criticLayer=finding.layerId;}
  tag.className='critic-item critic-'+finding.severity;
  const heading=document.createElement('strong');
  heading.textContent=`${finding.severity.toUpperCase()} · ${finding.rule.replaceAll('-',' ')}`;
  const location=document.createElement('small');
  location.textContent=[finding.sceneTitle,finding.layerLabel].filter(Boolean).join(' / ');
  const message=document.createElement('span');message.textContent=finding.message;
  const fix=document.createElement('em');fix.textContent=finding.recommendation;
  tag.append(heading,location,message,fix);list.append(tag);
 }
 if(visible.length>60){
  const extra=document.createElement('p');extra.className='critic-limit';
  extra.textContent=`Showing 60 of ${visible.length} findings. Export JSON for the complete report.`;
  list.append(extra);
 }
 if(!visible.length){
  const empty=document.createElement('p');empty.className='critic-empty';
  empty.textContent=report.findings.length?'No findings in this filter.':'No static issues found. Still verify the rendered website.';
  list.append(empty);
 }
}
function render(){
 $('project-title').value=project.title;
 renderDesign();
 document.querySelectorAll('[data-profile]').forEach(b=>{const active=b.dataset.profile===project.profile;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 $('preview-toggle').setAttribute('aria-pressed',String(isPreview));$('preview-toggle').textContent=isPreview?'■ Stop timeline preview':'▶ Timeline preview';
 renderScenes();renderArtboard();renderLayers();renderInspector();renderTimeline();updatePlayButton();renderSiteFiles();refreshStudio();renderCritic();
}
function select(id){if(!scene().layers.some(l=>l.id===id))return;selectedId=id;renderArtboard();renderLayers();renderInspector();renderTimeline();}
function setScene(id,save=true){const next=project.scenes.find(s=>s.id===id);if(!next)return;stopPlay();project.activeSceneId=id;selectedId=next.layers.at(-1)?.id||null;playhead=0;if(save)persist();render();}
function makeUpdate(key,value){const l=selected();if(!l)return;Object.assign(l,sanitizeLayer({...l,[key]:value}));persist();renderArtboard();renderLayers();renderTimeline();}
function changeSceneProp(key,value){const s=scene();s[key]=value;const parsed=sanitizeProject(project);Object.assign(s,parsed.scenes.find(item=>item.id===s.id));playhead=Math.min(playhead,s.duration);persist();renderScenes();renderTimeline();renderArtboard();}
function tick(now){if(!playing)return;const elapsed=lastFrame?Math.min(100,now-lastFrame):0;lastFrame=now;playhead+=elapsed;
 if(playhead>=scene().duration){const i=project.scenes.findIndex(s=>s.id===project.activeSceneId);if(i<project.scenes.length-1){project.activeSceneId=project.scenes[i+1].id;selectedId=scene().layers.at(-1)?.id||null;playhead=0;persist();render();}else{playhead=scene().duration;stopPlay();}}
 applyTime();if(playing)rafId=requestAnimationFrame(tick);
}
$('design-font').addEventListener('change',e=>{
 designDraft={...designDraft,font:e.target.value};designDirty=true;renderDesign();
});
document.querySelector('.dna-colors').addEventListener('change',e=>{
 const key=e.target.dataset.design;if(!key)return;
 designDraft={...designDraft,[key]:e.target.value};designDirty=true;renderDesign();
});
$('design-preview').addEventListener('click',()=>{
 if(!designDirty)return;
 const candidate=applyDesign(project,designDraft);
 enterMode('live');
 $('live-frame').srcdoc=exportHtml(candidate);
 toast('Preview only. Your saved project has not changed.');
});
$('design-apply').addEventListener('click',()=>{
 if(!designDirty)return;
 designUndo=structuredClone(project);
 project=applyDesign(project,designDraft);designDraft={...project.design};designDirty=false;
 persist(true);render();toast('Design DNA applied. Undo is available until your next edit.');
});
$('design-undo').addEventListener('click',()=>{
 if(!designUndo)return;
 project=designUndo;designUndo=null;designDraft={...project.design};designDirty=false;
 persist();render();toast('Previous palette restored.');
});
$('critic-refresh').addEventListener('click',()=>{renderCritic();toast('Design Critic scanned the current project.');});
$('critic-filter').addEventListener('change',renderCritic);
$('critic-list').addEventListener('click',e=>{
 const button=e.target.closest('button[data-critic-layer]');if(!button)return;
 if(!project.scenes.some(s=>s.id===button.dataset.criticScene&&s.layers.some(l=>l.id===button.dataset.criticLayer)))return;
 setScene(button.dataset.criticScene,false);select(button.dataset.criticLayer);
 $('inspector').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('critic-export').addEventListener('click',()=>{
 download(JSON.stringify(auditProject(project),null,2),'lwg-design-critic.json','application/json');
 toast('Audit report exported as JSON.');
});
$('project-title').addEventListener('input',e=>{project.title=e.target.value.slice(0,100);persist();});
$('profile-picker').addEventListener('click',e=>{const b=e.target.closest('[data-profile]');if(!b||b.dataset.profile===project.profile)return;
 if(modified&&!confirm('Replace all scenes with this style example? Save project JSON first to keep your work.'))return;
 stopPlay();project=createProject(b.dataset.profile);designDraft={...project.design};designDirty=false;selectedId=scene().layers.at(-1)?.id;isPreview=false;playhead=0;persist();modified=false;render();toast('Loaded a new art direction.');
});
for(const b of document.querySelectorAll('[data-add]'))b.addEventListener('click',()=>{if(scene().layers.length>=MAX_LAYERS){toast(`Maximum ${MAX_LAYERS} layers in a scene.`);return;}
 const l=createLayer(b.dataset.add,project.profile,project.design);scene().layers.push(l);selectedId=l.id;persist();render();toast(`${l.kind.toUpperCase()} object added.`);
});
$('scene-list').addEventListener('click',e=>{
 const move=e.target.closest('[data-scene-move]');if(move){const i=project.scenes.findIndex(s=>s.id===move.dataset.sceneId),j=i+Number(move.dataset.sceneMove);if(i<0||j<0||j>=project.scenes.length)return;
 [project.scenes[i],project.scenes[j]]=[project.scenes[j],project.scenes[i]];persist();render();return;}
 const button=e.target.closest('[data-scene]');if(button)setScene(button.dataset.scene);
});
$('scene-add').addEventListener('click',()=>{if(project.scenes.length>=MAX_SCENES)return;const s=createScene(project.profile,project.scenes.length+1,project.design);project.scenes.push(s);project.activeSceneId=s.id;selectedId=s.layers.at(-1)?.id;stopPlay();playhead=0;persist();render();toast('Scene created. Compose a new world.');});
$('scene-duplicate').addEventListener('click',()=>{if(project.scenes.length>=MAX_SCENES)return;const s=duplicateScene(scene()),i=project.scenes.findIndex(item=>item.id===project.activeSceneId);project.scenes.splice(i+1,0,s);project.activeSceneId=s.id;selectedId=s.layers.at(-1)?.id;stopPlay();playhead=0;persist();render();toast('Scene duplicated.');});
$('scene-delete').addEventListener('click',()=>{if(project.scenes.length<=1)return;if(!confirm(`Delete ${scene().title} and its layers?`))return;const i=project.scenes.findIndex(s=>s.id===project.activeSceneId);project.scenes.splice(i,1);project.activeSceneId=project.scenes[Math.max(0,i-1)].id;selectedId=scene().layers.at(-1)?.id||null;stopPlay();playhead=0;persist();render();});
$('scene-name').addEventListener('change',e=>changeSceneProp('title',e.target.value));
$('scene-bg').addEventListener('input',e=>changeSceneProp('bg',e.target.value));
$('scene-duration').addEventListener('change',e=>changeSceneProp('duration',Number(e.target.value)*1000));
$('scene-transition').addEventListener('change',e=>changeSceneProp('transition',e.target.value));
$('preview-toggle').addEventListener('click',()=>{isPreview=!isPreview;if(!isPreview)stopPlay();render();});
$('timeline-play').addEventListener('click',()=>{if(playing){stopPlay();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){toast('Motion playback is off because reduced motion is enabled. You can still scrub manually.');return;}
 isPreview=true;if(playhead>=scene().duration)playhead=0;playing=true;lastFrame=0;render();rafId=requestAnimationFrame(tick);
});
$('timeline-scrub').addEventListener('input',e=>{if(playing)stopPlay();playhead=Math.max(0,Math.min(scene().duration,Number(e.target.value)));isPreview=true;
 $('preview-toggle').setAttribute('aria-pressed','true');$('preview-toggle').textContent='■ Stop timeline preview';renderArtboard();applyTime();
});
$('timeline-tracks').addEventListener('click',e=>{const row=e.target.closest('[data-track]');if(!row)return;const rail=e.target.closest('.timeline-rail');select(row.dataset.track);
 if(rail){if(playing)stopPlay();const rect=rail.getBoundingClientRect();playhead=Math.min(scene().duration,Math.max(0,(e.clientX-rect.left)/rect.width*scene().duration));isPreview=true;renderArtboard();applyTime();}
});
$('reset-template').addEventListener('click',()=>{if(modified&&!confirm('Replace ALL scenes with the original example?'))return;stopPlay();project=createProject(project.profile);designDraft={...project.design};designDirty=false;selectedId=scene().layers.at(-1)?.id;playhead=0;isPreview=false;persist();modified=false;render();});
$('layer-list').addEventListener('click',e=>{const order=e.target.closest('button[data-order]');if(order){const layers=scene().layers,index=layers.findIndex(l=>l.id===order.dataset.layer),target=index+(order.dataset.order==='up'?1:-1);
 if(index<0||target<0||target>=layers.length)return;[layers[index],layers[target]]=[layers[target],layers[index]];selectedId=order.dataset.layer;persist();render();return;}
 const item=e.target.closest('[data-select]');if(item)select(item.dataset.select);
});
$('inspector').addEventListener('input',e=>{const key=e.target.dataset.field;if(!key)return;if((key==='src'||key==='href')&&e.target.value.trim()&&!safeUrl(e.target.value,key==='src'))return;makeUpdate(key,e.target.value);});
$('inspector').addEventListener('change',e=>{if(e.target.hasAttribute('data-jump')){if(e.target.value){makeUpdate('href',e.target.value);renderInspector();}return;}
 if(e.target.dataset.field==='src'||e.target.dataset.field==='href'){const key=e.target.dataset.field,v=e.target.value;if(v.trim()&&!safeUrl(v,key==='src')){toast('Use an https:// URL, an internal #anchor, or a supported image.');e.target.value=selected()?.[key]||'';}}
});
$('inspector').addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(!target)return;const action=target.dataset.action,l=selected();if(!l)return;
 if(action==='upload'){$('image-input').click();return;}
 if(action==='duplicate'){if(scene().layers.length>=MAX_LAYERS){toast('Scene layer limit reached.');return;}const copy=sanitizeLayer({...l,id:`copy-${Date.now()}-${Math.random().toString(36).slice(2)}`,label:l.label+' COPY',x:l.x+4,y:l.y+4});scene().layers.push(copy);selectedId=copy.id;persist();render();}
 if(action==='delete'){scene().layers=scene().layers.filter(item=>item.id!==l.id);selectedId=scene().layers.at(-1)?.id||null;persist();render();}
});
$('image-input').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!/^image\/(png|jpeg|gif|webp)$/.test(file.type)){toast('Use PNG, JPEG, GIF or WebP images.');return;}
 if(file.size>2_000_000){toast('Image too large. Use a file below 2 MB for single-file export.');return;}
 const sceneId=scene().id,layerId=selectedId;const reader=new FileReader();reader.onload=()=>{const s=project.scenes.find(x=>x.id===sceneId),l=s?.layers.find(x=>x.id===layerId);if(l?.kind==='image'){
  const sanitized=sanitizeLayer({...l,src:reader.result});l.src=sanitized.src;persist();renderArtboard();renderInspector();toast('Image embedded in editable project and export.');
 }};reader.readAsDataURL(file);
});
let drag=null;
$('artboard').addEventListener('pointerdown',e=>{if(isPreview)return;const target=e.target.closest('[data-id]');if(!target)return;
 select(target.dataset.id);const l=selected(),box=$('artboard').getBoundingClientRect();drag={id:l.id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:l.x,y:l.y,width:box.width,height:box.height};
 $('artboard').setPointerCapture(e.pointerId);e.preventDefault();
});
$('artboard').addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const l=scene().layers.find(x=>x.id===drag.id);if(!l)return;
 l.x=Math.round(Math.min(100,Math.max(-20,drag.x+(e.clientX-drag.startX)/drag.width*100))*10)/10;
 l.y=Math.round(Math.min(100,Math.max(-20,drag.y+(e.clientY-drag.startY)/drag.height*100))*10)/10;
 const node=[...$('artboard').children].find(n=>n.dataset.id===l.id);if(node){node.style.left=l.x+'%';node.style.top=l.y+'%';}
});
function finishDrag(){if(!drag)return;drag=null;persist();renderInspector();}
$('artboard').addEventListener('pointerup',finishDrag);$('artboard').addEventListener('pointercancel',finishDrag);
window.addEventListener('keydown',e=>{if(isPreview||!selected()||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;
 const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(dir){e.preventDefault();const l=selected(),n=e.shiftKey?2:.25;l.x=Math.min(100,Math.max(-20,l.x+dir[0]*n));l.y=Math.min(100,Math.max(-20,l.y+dir[1]*n));persist();renderArtboard();renderInspector();}
});
function download(content,filename,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('export-html').addEventListener('click',()=>{download(exportHtml(project),'lwg-living-world.html','text/html;charset=utf-8');toast('Multi-scene standalone HTML exported.');});
$('save-json').addEventListener('click',()=>{download(JSON.stringify(project,null,2),'lwg-project-v2.json','application/json');toast('Editable project saved.');});
$('import-json').addEventListener('click',()=>$('json-input').click());
$('json-input').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>4_000_000){toast('Project file exceeds the 4 MB import limit.');return;}
 try{const data=JSON.parse(await file.text());project=parseProjectJson(JSON.stringify(data));stopPlay();designDraft={...project.design};designDirty=false;selectedId=scene().layers.at(-1)?.id||null;isPreview=false;playhead=0;persist();modified=false;render();toast('Project imported. Legacy v1 files are migrated automatically.');}
 catch(err){toast(`Import failed: ${err.message}`);}
});
/* Rung 3: Design / Split / Code / Live. Canonical JSON is truly bidirectional; generated HTML is read-only. */
const sourceHelp={
 css:'Edit styles/custom.css. CSS applies to both the artboard and published HTML. Remote imports, url() and HTML are blocked.',
 json:'Edit the canonical LWG project source. Apply parses and validates the complete project, then re-renders the visual editor.',
 html:'Generated index.html is a read-only preview of the actual export. Edit project JSON or CSS to change it.'
};
function renderSiteFiles(){
 const list=$('site-files');list.replaceChildren();
 const head=document.createElement('div');head.className='file-header';head.textContent='SITE ROOT · LOCAL';list.append(head);
 const addFile=(label,meta,action,value,thumb)=>{
  const b=document.createElement('button');b.type='button';b.dataset[action]=value;
  if(thumb){const img=document.createElement('img');img.className='file-asset-thumb';img.src=thumb;img.alt='';b.append(img);}
  b.append(document.createTextNode(label));const small=document.createElement('small');small.textContent=meta;b.append(small);list.append(b);
 };
 addFile('index.html','generated','fileCode','html');addFile('styles/custom.css','editable','fileCode','css');addFile('lwg-project.json','editable','fileCode','json');
 for(let i=0;i<project.scenes.length;i++)addFile(`${String(i+1).padStart(2,'0')} · ${project.scenes[i].title}`,'scene','fileScene',project.scenes[i].id);
 const assets=project.scenes.flatMap(s=>s.layers.filter(l=>l.kind==='image'&&l.src).map(l=>({scene:s.id,layer:l})));
 if(assets.length){const a=document.createElement('div');a.className='file-header';a.textContent=`IMAGES · ${assets.length} PLACEMENTS`;list.append(a);
  for(const {scene:sid,layer:l} of assets.slice(0,24))addFile(l.label,'image','fileAsset',`${sid}|${l.id}`,l.src);
 }
}
function refreshSource(force=false){
 const editor=$('source-editor');$('source-kind').value=sourceKind;editor.readOnly=sourceKind==='html';
 $('source-apply').disabled=sourceKind==='html'||!sourceDirty;
 $('source-revert').disabled=!sourceDirty;
 $('source-help').textContent=sourceHelp[sourceKind];
 if(!sourceDirty||force){editor.value=readSource(project,sourceKind);sourceDirty=false;}
 $('source-status').textContent=sourceDirty?'Unsaved source changes':'Source in sync';
}
function refreshStudio(){
 $('lwg-custom-style').textContent=project.customCss||'';
 $('editor-layout').dataset.mode=workspaceMode;
 $('design-surface').hidden=workspaceMode==='code'||workspaceMode==='live';
 $('source-pane').hidden=workspaceMode==='design'||workspaceMode==='live';
 $('live-pane').hidden=workspaceMode!=='live';
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===workspaceMode)));
 refreshSource();
 if(workspaceMode==='live')$('live-frame').srcdoc=exportHtml(project);
}
function enterMode(mode){
 if(!['design','split','code','live'].includes(mode))return;
 if((mode==='split'||mode==='code')&&workspaceMode!==mode)refreshSource();
 workspaceMode=mode;stopPlay();refreshStudio();
}
function setSourceKind(kind){
 if(!['css','json','html'].includes(kind))return;
 if(sourceDirty&&!confirm('Discard unapplied source changes?')){$('source-kind').value=sourceKind;return;}
 sourceDirty=false;sourceKind=kind;refreshSource(true);
}
function applySourceDraft(){
 if(!sourceDirty||sourceKind==='html')return;
 try{
  if(sourceKind==='css')project.customCss=validateCustomCss($('source-editor').value);
  else if(sourceKind==='json'){
   const next=parseProjectJson($('source-editor').value);stopPlay();project=next;designDraft={...project.design};designDirty=false;
   selectedId=scene().layers.at(-1)?.id||null;isPreview=false;playhead=0;
  }
  sourceDirty=false;persist();render();toast('Source applied. Canvas and export are in sync.');
 }catch(err){$('source-status').textContent=err.message;toast(err.message);}
}
document.querySelector('.studio-modebar').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)enterMode(b.dataset.mode);});
$('source-kind').addEventListener('change',e=>setSourceKind(e.target.value));
$('source-editor').addEventListener('input',()=>{if(sourceKind==='html')return;sourceDirty=true;$('source-status').textContent='Unsaved source changes';$('source-apply').disabled=false;$('source-revert').disabled=false;});
$('source-editor').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();applySourceDraft();}});
$('source-apply').addEventListener('click',applySourceDraft);
$('source-revert').addEventListener('click',()=>{sourceDirty=false;refreshSource(true);});
$('site-files').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.fileCode){enterMode('code');setSourceKind(b.dataset.fileCode);return;}
 if(b.dataset.fileScene){setScene(b.dataset.fileScene);enterMode('design');return;}
 if(b.dataset.fileAsset){const [sid,lid]=b.dataset.fileAsset.split('|');setScene(sid);select(lid);enterMode('design');}
});
document.querySelector('.device-switch').addEventListener('click',e=>{
 const b=e.target.closest('[data-device]');if(!b)return;
 const device=b.dataset.device;if(!['mobile','tablet','desktop'].includes(device))return;
 document.querySelector('.preview-shell').dataset.device=device;
 document.querySelectorAll('[data-device]').forEach(n=>{if(n.tagName==='BUTTON')n.setAttribute('aria-pressed',String(n.dataset.device===device));});
});
window.addEventListener('beforeunload',e=>{if(sourceDirty){e.preventDefault();e.returnValue='';}});

$('preview-page').addEventListener('click',()=>{const blob=new Blob([exportHtml(project)],{type:'text/html'}),url=URL.createObjectURL(blob);const win=window.open(url,'_blank','noopener,noreferrer');if(!win)toast('Allow pop-ups to open the page preview.');setTimeout(()=>URL.revokeObjectURL(url),60000);});
render();
