import {PROFILES,MOTIONS,createProject,createLayer,sanitizeProject,sanitizeLayer,safeUrl} from './project.js';
import {esc,exportHtml,layerStyle} from './export.js';

const $ = id => document.getElementById(id);
const STORAGE = 'lwg-project-v1';
let project;
try { project=sanitizeProject(JSON.parse(localStorage.getItem(STORAGE)||'null')||createProject()); }
catch { project=createProject(); }
let selectedId=project.layers.at(-1)?.id || null;
let isPreview=false, modified=false, toastTimer;
const selected=()=>project.layers.find(l=>l.id===selectedId);
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
function persist(){modified=true;try{localStorage.setItem(STORAGE,JSON.stringify(project));}catch{toast('Browser storage full. Save your project JSON to preserve your work.');}}
const glyph={text:'T',image:'▧',shape:'◯',link:'↗'};

function renderArtboard(){
 const stage=$('artboard'),p=PROFILES[project.profile];
 stage.style.background=p.bg;stage.replaceChildren();stage.classList.toggle('preview-mode',isPreview);
 for(const l of project.layers){
  const node=document.createElement(l.kind==='link'?'a':'div');
  node.className='object'+(l.id===selectedId&&!isPreview?' selected':'');node.dataset.id=l.id;node.dataset.kind=l.kind;node.dataset.motion=l.motion;
  node.style.cssText=layerStyle(l);node.setAttribute('aria-label',l.label);
  if(l.kind==='shape') node.setAttribute('aria-hidden','true');
  else if(l.kind==='image'){
   if(l.src){const img=document.createElement('img');img.src=l.src;img.alt=l.alt;img.loading='lazy';node.append(img);}else{const s=document.createElement('span');s.className='image-placeholder';s.textContent='▧  ADD YOUR IMAGE';node.append(s);}
  }else{node.textContent=l.content;if(l.kind==='link'){node.href=safeUrl(l.href)||'#';node.addEventListener('click',e=>e.preventDefault());}}
  stage.append(node);
 }
 $('object-count').textContent=`${project.layers.length} OBJECTS`;
}
function renderLayers(){
 $('layer-count').textContent=`${project.layers.length} LAYERS`;
 const list=$('layer-list');list.replaceChildren();
 for(let i=project.layers.length-1;i>=0;i--){
  const l=project.layers[i],button=document.createElement('button');button.type='button';button.className='layer-row'+(selectedId===l.id?' selected':'');button.dataset.select=l.id;
  const glyphSpan=document.createElement('span');glyphSpan.className='layer-glyph';glyphSpan.textContent=glyph[l.kind];
  const name=document.createElement('span');name.className='layer-name';name.textContent=l.label;
  const motion=document.createElement('span');motion.className='layer-badge';motion.textContent=l.motion==='none'?'': '◈';motion.title=l.motion;
  const ordering=document.createElement('span');ordering.className='layer-order';
  const up=document.createElement('button');up.type='button';up.dataset.order='up';up.dataset.layer=l.id;up.textContent='▲';up.disabled=i===project.layers.length-1;up.title='Bring forward';up.setAttribute('aria-label',`Bring ${l.label} forward`);
  const down=document.createElement('button');down.type='button';down.dataset.order='down';down.dataset.layer=l.id;down.textContent='▼';down.disabled=i===0;down.title='Send backward';down.setAttribute('aria-label',`Send ${l.label} backward`);
  // Layers are one semantic row, with ordering controls as siblings (no nested buttons).
  ordering.append(up,down);
  const row=document.createElement('div');row.className='layer-line';row.append(button,ordering);button.append(glyphSpan,name,motion);list.append(row);
 }
}
const field=(label,key,value,type='text',extra='')=>`<div><label for="field-${key}">${label}</label><input id="field-${key}" type="${type}" data-field="${key}" value="${esc(value)}" ${extra}></div>`;
function renderInspector(){
 const area=$('inspector'), l=selected();
 if(!l){area.innerHTML='<p class="empty-note">Select an object on the canvas to edit its content, geometry, and motion.</p>';return;}
 const textInput=l.kind==='text'||l.kind==='link';
 area.innerHTML=`<div class="inspector">
  ${field('LAYER NAME','label',l.label,'text','maxlength="80"')}
  ${textInput?`<div><label for="field-content">TEXT / LINK LABEL</label><textarea id="field-content" data-field="content" maxlength="500">${esc(l.content)}</textarea></div>`:''}
  ${l.kind==='image'?`${field('IMAGE URL','src',l.src,'text','placeholder="https://..."')}<button class="upload-btn" data-action="upload" type="button">↥ Upload image from computer</button>${field('ALT TEXT','alt',l.alt,'text')}`:''}
  ${l.kind==='link'?field('DESTINATION LINK','href',l.href,'text','placeholder="https://... or #section"'):''}
  <div class="two-col">${field('LEFT %','x',l.x,'number','step="0.5"')}${field('TOP %','y',l.y,'number','step="0.5"')}${field('WIDTH %','w',l.w,'number','step="0.5" min="2"')}${field('HEIGHT %','h',l.h,'number','step="0.5" min="2"')}</div>
  <div class="two-col">${field('ROTATION °','rotate',l.rotate,'number','step="5"')}${field('OPACITY %','opacity',l.opacity,'number','min="0" max="100"')}</div>
  ${textInput?`<div class="two-col">${field('FONT SIZE','fontSize',l.fontSize,'number','min="9" max="250"')}${field('TEXT COLOR','color',l.color,'color')}</div>`:''}
  ${l.kind==='shape'?`<div class="two-col">${field('FILL COLOR','fill',l.fill,'color')}${field('ROUNDNESS %','radius',l.radius,'number','min="0" max="100"')}</div>`:''}
  ${l.kind==='image'?field('CORNER RADIUS %','radius',l.radius,'number','min="0" max="100"'):''}
  <div><label for="field-motion">MOTION BEHAVIOR</label><select id="field-motion" data-field="motion">${MOTIONS.map(m=>`<option value="${m}"${l.motion===m?' selected':''}>${m.replace('-',' ')}</option>`).join('')}</select></div>
  ${field('START DELAY / MS','delay',l.delay,'number','min="0" max="3000" step="50"')}
  <div class="actions"><button data-action="duplicate" type="button">⧉ Duplicate</button><button class="delete" data-action="delete" type="button">✕ Delete</button></div>
  <p class="field-note">Tip: drag this object directly on the canvas, or use arrow keys to nudge it.</p>
 </div>`;
}
function render(){
 $('project-title').value=project.title;
 document.querySelectorAll('[data-profile]').forEach(b=>{const active=b.dataset.profile===project.profile;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 $('preview-toggle').setAttribute('aria-pressed',String(isPreview));$('preview-toggle').textContent=isPreview?'■ Stop preview':'▶ Preview motion';
 renderArtboard();renderLayers();renderInspector();
}
function select(id){if(!project.layers.some(l=>l.id===id)) return;selectedId=id;renderArtboard();renderLayers();renderInspector();}
function makeUpdate(key,value){
 const l=selected();if(!l)return;
 const next=sanitizeLayer({...l,[key]:value});Object.assign(l,next);
 renderArtboard();renderLayers();persist();
}
$('project-title').addEventListener('input',e=>{project.title=e.target.value.slice(0,100);persist();});
$('profile-picker').addEventListener('click',e=>{
 const b=e.target.closest('[data-profile]');if(!b||b.dataset.profile===project.profile)return;
 if(modified&&!confirm('Load this style’s example scene? Your current canvas will be replaced. Save project JSON first if you want to keep it.'))return;
 project=createProject(b.dataset.profile);selectedId=project.layers.at(-1)?.id;modified=false;persist();modified=false;render();toast('Loaded a new art direction.');
});
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{const l=createLayer(b.dataset.add,project.profile);project.layers.push(l);selectedId=l.id;isPreview=false;persist();render();toast(`${l.kind.toUpperCase()} object added.`);}));
$('preview-toggle').addEventListener('click',()=>{isPreview=!isPreview;render();});
$('reset-template').addEventListener('click',()=>{if(modified&&!confirm('Replace the current canvas with the original example?'))return;project=createProject(project.profile);selectedId=project.layers.at(-1)?.id;persist();modified=false;isPreview=false;render();});
$('layer-list').addEventListener('click',e=>{
 const order=e.target.closest('button[data-order]');
 if(order){const index=project.layers.findIndex(l=>l.id===order.dataset.layer),target=index+(order.dataset.order==='up'?1:-1);if(index<0||target<0||target>=project.layers.length)return;[project.layers[index],project.layers[target]]=[project.layers[target],project.layers[index]];selectedId=order.dataset.layer;persist();render();return;}
 const item=e.target.closest('[data-select]');if(item)select(item.dataset.select);
});
$('inspector').addEventListener('input',e=>{
 const key=e.target.dataset.field;if(!key)return;
 if(key==='src'||key==='href') { const v=e.target.value;if(!safeUrl(v,key==='src')&&v.trim())return; }
 makeUpdate(key,e.target.value);
});
$('inspector').addEventListener('change',e=>{if(e.target.dataset.field==='src'||e.target.dataset.field==='href'){const key=e.target.dataset.field,v=e.target.value;if(v.trim()&&!safeUrl(v,key==='src')){toast('Use an https:// URL, an internal #anchor, or a supported image.');e.target.value=selected()?.[key]||'';}}});
$('inspector').addEventListener('click',e=>{
 const target=e.target.closest('[data-action]');if(!target)return;
 const action=target.dataset.action,l=selected();if(!l)return;
 if(action==='upload')$('image-input').click();
 if(action==='duplicate'){const copy=sanitizeLayer({...l,id:`copy-${Date.now()}-${Math.random().toString(36).slice(2)}`,label:l.label+' COPY',x:l.x+4,y:l.y+4});project.layers.push(copy);selectedId=copy.id;persist();render();}
 if(action==='delete'){project.layers=project.layers.filter(item=>item.id!==l.id);selectedId=project.layers.at(-1)?.id||null;persist();render();}
});
$('image-input').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!/^image\/(png|jpeg|gif|webp)$/.test(file.type)){toast('Use PNG, JPEG, GIF or WebP images.');return;}
 if(file.size>2_000_000){toast('Image too large. Use a file below 2 MB for single-file export.');return;}
 const reader=new FileReader();reader.onload=()=>{if(selected()?.kind==='image'){makeUpdate('src',reader.result);renderInspector();toast('Image embedded. It will travel with the exported HTML.');}};reader.readAsDataURL(file);
});
let drag=null;
$('artboard').addEventListener('pointerdown',e=>{
 if(isPreview)return;
 const target=e.target.closest('[data-id]');if(!target)return;
 const id=target.dataset.id;select(id);
 const l=selected();const box=$('artboard').getBoundingClientRect();
 drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:l.x,y:l.y,width:box.width,height:box.height};
 $('artboard').setPointerCapture(e.pointerId);e.preventDefault();
});
$('artboard').addEventListener('pointermove',e=>{
 if(!drag||drag.pointer!==e.pointerId)return;
 const l=project.layers.find(x=>x.id===drag.id);if(!l)return;
 l.x=Math.round(Math.min(100,Math.max(-20,drag.x+(e.clientX-drag.startX)/drag.width*100))*10)/10;
 l.y=Math.round(Math.min(100,Math.max(-20,drag.y+(e.clientY-drag.startY)/drag.height*100))*10)/10;
 const node=[...$('artboard').children].find(n=>n.dataset.id===l.id);
 if(node){node.style.left=l.x+'%';node.style.top=l.y+'%';}
});
function finishDrag(){if(!drag)return;drag=null;persist();renderInspector();}
$('artboard').addEventListener('pointerup',finishDrag);$('artboard').addEventListener('pointercancel',finishDrag);
window.addEventListener('keydown',e=>{
 if(isPreview||!selected()||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;
 const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(dir){e.preventDefault();const l=selected(),n=e.shiftKey?2:0.25;l.x=Math.min(100,Math.max(-20,l.x+dir[0]*n));l.y=Math.min(100,Math.max(-20,l.y+dir[1]*n));persist();renderArtboard();renderInspector();}
});
function download(content,filename,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('export-html').addEventListener('click',()=>{download(exportHtml(project),'lwg-living-page.html','text/html;charset=utf-8');toast('Standalone HTML exported. No builder needed.');});
$('save-json').addEventListener('click',()=>{download(JSON.stringify(project,null,2),'lwg-project.json','application/json');toast('Editable project saved.');});
$('import-json').addEventListener('click',()=>$('json-input').click());
$('json-input').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>4_000_000){toast('Project file exceeds the 4 MB import limit.');return;}try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.layers))throw Error('Not an LWG v1 project');project=sanitizeProject(data);selectedId=project.layers.at(-1)?.id;isPreview=false;persist();modified=false;render();toast('Editable project imported.');}catch(err){toast(`Import failed: ${err.message}`);}});
$('preview-page').addEventListener('click',()=>{const blob=new Blob([exportHtml(project)],{type:'text/html'}),url=URL.createObjectURL(blob);const win=window.open(url,'_blank','noopener,noreferrer');if(!win)toast('Allow pop-ups to open the page preview.');setTimeout(()=>URL.revokeObjectURL(url),60000);});
render();
