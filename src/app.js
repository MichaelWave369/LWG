import {PROFILES,MOTIONS,TRANSITIONS,MAX_SCENES,MAX_LAYERS,createProject,createScene,duplicateScene,currentScene,createLayer,sanitizeProject,sanitizeLayer,safeUrl} from './project.js';
import {esc,exportHtml,layerStyle} from './export.js';
import {sampleLayer,formatTime,trackRect} from './timeline.js';

const $=id=>document.getElementById(id);
const STORAGE='lwg-project-v2',LEGACY='lwg-project-v1';
let project;
try{project=sanitizeProject(JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem(LEGACY)||'null')||createProject());}
catch{project=createProject();}
let selectedId=currentScene(project).layers.at(-1)?.id||null;
let isPreview=false,modified=false,toastTimer,playhead=0,playing=false,lastFrame=0,rafId=0;
const scene=()=>currentScene(project);
const selected=()=>scene().layers.find(l=>l.id===selectedId);
const glyph={text:'T',image:'▧',shape:'◯',link:'↗'};
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function persist(){modified=true;try{localStorage.setItem(STORAGE,JSON.stringify(project));}catch{toast('Browser storage full. Save project JSON to preserve your work.');}}
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
 const stage=$('artboard'),s=scene();stage.style.background=s.bg;stage.replaceChildren();stage.classList.toggle('preview-mode',isPreview);
 for(const l of s.layers){
  const node=document.createElement(l.kind==='link'?'a':'div');
  node.className='object'+(l.id===selectedId&&!isPreview?' selected':'');
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
function render(){
 $('project-title').value=project.title;
 document.querySelectorAll('[data-profile]').forEach(b=>{const active=b.dataset.profile===project.profile;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 $('preview-toggle').setAttribute('aria-pressed',String(isPreview));$('preview-toggle').textContent=isPreview?'■ Stop timeline preview':'▶ Timeline preview';
 renderScenes();renderArtboard();renderLayers();renderInspector();renderTimeline();updatePlayButton();
}
function select(id){if(!scene().layers.some(l=>l.id===id))return;selectedId=id;renderArtboard();renderLayers();renderInspector();renderTimeline();}
function setScene(id,save=true){const next=project.scenes.find(s=>s.id===id);if(!next)return;stopPlay();project.activeSceneId=id;selectedId=next.layers.at(-1)?.id||null;playhead=0;if(save)persist();render();}
function makeUpdate(key,value){const l=selected();if(!l)return;Object.assign(l,sanitizeLayer({...l,[key]:value}));persist();renderArtboard();renderLayers();renderTimeline();}
function changeSceneProp(key,value){const s=scene();s[key]=value;const parsed=sanitizeProject(project);Object.assign(s,parsed.scenes.find(item=>item.id===s.id));playhead=Math.min(playhead,s.duration);persist();renderScenes();renderTimeline();renderArtboard();}
function tick(now){if(!playing)return;const elapsed=lastFrame?Math.min(100,now-lastFrame):0;lastFrame=now;playhead+=elapsed;
 if(playhead>=scene().duration){const i=project.scenes.findIndex(s=>s.id===project.activeSceneId);if(i<project.scenes.length-1){project.activeSceneId=project.scenes[i+1].id;selectedId=scene().layers.at(-1)?.id||null;playhead=0;persist();render();}else{playhead=scene().duration;stopPlay();}}
 applyTime();if(playing)rafId=requestAnimationFrame(tick);
}
$('project-title').addEventListener('input',e=>{project.title=e.target.value.slice(0,100);persist();});
$('profile-picker').addEventListener('click',e=>{const b=e.target.closest('[data-profile]');if(!b||b.dataset.profile===project.profile)return;
 if(modified&&!confirm('Replace all scenes with this style example? Save project JSON first to keep your work.'))return;
 stopPlay();project=createProject(b.dataset.profile);selectedId=scene().layers.at(-1)?.id;isPreview=false;playhead=0;persist();modified=false;render();toast('Loaded a new art direction.');
});
for(const b of document.querySelectorAll('[data-add]'))b.addEventListener('click',()=>{if(scene().layers.length>=MAX_LAYERS){toast(`Maximum ${MAX_LAYERS} layers in a scene.`);return;}
 const l=createLayer(b.dataset.add,project.profile);scene().layers.push(l);selectedId=l.id;persist();render();toast(`${l.kind.toUpperCase()} object added.`);
});
$('scene-list').addEventListener('click',e=>{
 const move=e.target.closest('[data-scene-move]');if(move){const i=project.scenes.findIndex(s=>s.id===move.dataset.sceneId),j=i+Number(move.dataset.sceneMove);if(i<0||j<0||j>=project.scenes.length)return;
 [project.scenes[i],project.scenes[j]]=[project.scenes[j],project.scenes[i]];persist();render();return;}
 const button=e.target.closest('[data-scene]');if(button)setScene(button.dataset.scene);
});
$('scene-add').addEventListener('click',()=>{if(project.scenes.length>=MAX_SCENES)return;const s=createScene(project.profile,project.scenes.length+1);project.scenes.push(s);project.activeSceneId=s.id;selectedId=s.layers.at(-1)?.id;stopPlay();playhead=0;persist();render();toast('Scene created. Compose a new world.');});
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
$('reset-template').addEventListener('click',()=>{if(modified&&!confirm('Replace ALL scenes with the original example?'))return;stopPlay();project=createProject(project.profile);selectedId=scene().layers.at(-1)?.id;playhead=0;isPreview=false;persist();modified=false;render();});
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
 try{const data=JSON.parse(await file.text());if(![1,2].includes(data.version)||!(Array.isArray(data.layers)||Array.isArray(data.scenes)))throw Error('Not an LWG v1/v2 project');stopPlay();project=sanitizeProject(data);selectedId=scene().layers.at(-1)?.id||null;isPreview=false;playhead=0;persist();modified=false;render();toast('Project imported. Legacy v1 files are migrated automatically.');}
 catch(err){toast(`Import failed: ${err.message}`);}
});
$('preview-page').addEventListener('click',()=>{const blob=new Blob([exportHtml(project)],{type:'text/html'}),url=URL.createObjectURL(blob);const win=window.open(url,'_blank','noopener,noreferrer');if(!win)toast('Allow pop-ups to open the page preview.');setTimeout(()=>URL.revokeObjectURL(url),60000);});
render();
