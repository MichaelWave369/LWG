/** LWG project schema v2: scenes, per-layer motion tracks, optional custom CSS, v1 migration. */
export const PROFILES = Object.freeze({
  nocturne: { name: 'After Dark', bg: '#09101c', ink: '#f0f1eb', accent: '#edaf72', secondary: '#b1bce7', font: 'system-ui' },
  solstice: { name: 'Soft Matter', bg: '#eee9dd', ink: '#18261f', accent: '#aa4e35', secondary: '#829d75', font: 'Georgia' },
  signal: { name: 'Signal / 90', bg: '#101014', ink: '#f9e8d2', accent: '#f66a5b', secondary: '#a1f5be', font: 'monospace' }
});
export const MOTIONS = ['none','float','drift','pulse','spin','reveal','hover-lift','magnetic','marquee'];
export const TRANSITIONS = ['none','fade','rise','zoom'];
export const KINDS = ['text','image','shape','link'];
export const MAX_SCENES = 12;
export const MAX_LAYERS = 80;
const num = (x, fallback, min, max) => { const n=Number(x); return Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : fallback; };
const goodColor = (x, fallback) => typeof x === 'string' && /^#[a-fA-F0-9]{6}$/.test(x) ? x : fallback;
const text = (v, fallback='', length=240) => typeof v === 'string' ? v.slice(0,length) : fallback;
const newId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

// URLs from imports are never allowed to become executable protocols or script sources.
export function safeUrl(value, image=false) {
  if (typeof value !== 'string' || value.length > 4_500_000) return '';
  const v=value.trim();
  if (/^https?:\/\/[^\s<>"']+$/i.test(v)) return v;
  if (image && /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(v)) return v;
  if (image && /^\.\/?[a-z0-9_./-]+$/i.test(v) && !v.includes('..')) return v;
  if (!image && /^#[a-z0-9_-]+$/i.test(v)) return v;
  if (!image && /^mailto:[^\s<>"']+@[^\s<>"']+$/i.test(v)) return v;
  return '';
}
export function sanitizeLayer(raw={}) {
  const kind=KINDS.includes(raw.kind)?raw.kind:'text';
  return {
    id:text(raw.id,newId('layer'),80).replace(/[^\w-]/g,'') || newId('layer'),
    kind,label:text(raw.label,kind.toUpperCase(),80),
    x:num(raw.x,20,-20,100),y:num(raw.y,20,-20,100),
    w:num(raw.w,40,2,150),h:num(raw.h,18,2,150),
    rotate:num(raw.rotate,0,-360,360),opacity:num(raw.opacity,100,0,100),
    color:goodColor(raw.color,'#f0f1eb'),fill:goodColor(raw.fill,'#a0b3d2'),
    fontSize:num(raw.fontSize,64,9,250),
    weight:[300,400,500,600,700,800,900].includes(Number(raw.weight))?Number(raw.weight):700,
    radius:num(raw.radius,0,0,100),
    content:text(raw.content,'New idea',500),alt:text(raw.alt,'Decorative image',180),
    src:safeUrl(raw.src,true),href:safeUrl(raw.href),
    motion:MOTIONS.includes(raw.motion)?raw.motion:'none',
    delay:num(raw.delay,0,0,30000),duration:num(raw.duration,900,150,30000),
  };
}
export function sanitizeScene(raw={},fallbackBg='#09101c') {
  const layers=Array.isArray(raw.layers)?raw.layers.slice(0,MAX_LAYERS).map(sanitizeLayer):[];
  const ids=new Set();
  for(const l of layers){if(ids.has(l.id))l.id=newId('layer');ids.add(l.id);}
  return {id:text(raw.id,newId('scene'),80).replace(/[^\w-]/g,'')||newId('scene'),
    title:text(raw.title,'Untitled scene',80),bg:goodColor(raw.bg,fallbackBg),
    duration:num(raw.duration,8000,2000,30000),
    transition:TRANSITIONS.includes(raw.transition)?raw.transition:'fade',layers};
}
export function sanitizeProject(raw={}) {
  const profile=Object.hasOwn(PROFILES,raw.profile)?raw.profile:'nocturne';
  const bg=PROFILES[profile].bg;
  const inputScenes=Array.isArray(raw.scenes)&&raw.scenes.length?raw.scenes.slice(0,MAX_SCENES):[
    {title:raw.title||'Opening scene',layers:Array.isArray(raw.layers)?raw.layers:[]} // v1 projects
  ];
  const scenes=inputScenes.map(s=>sanitizeScene(s,bg));
  const ids=new Set();for(const s of scenes){if(ids.has(s.id))s.id=newId('scene');ids.add(s.id);}
  const activeSceneId=scenes.some(s=>s.id===raw.activeSceneId)?raw.activeSceneId:scenes[0].id;
  return {version:2,title:text(raw.title,'Untitled Living Page',100),profile,activeSceneId,scenes,customCss:typeof raw.customCss==='string'&&raw.customCss.length<=32000&&!/<|>|@import\b|@font-face\b|@namespace\b|@charset\b|url\s*\(|image-set\s*\(|cross-fade\s*\(|https?:\/\/|data\s*:|src\s*:|\\|expression\s*\(|-moz-binding\b|behavior\s*:|[\u0000-\u0008\u000b\u000e-\u001f]/i.test(raw.customCss)?raw.customCss:''};
}
const layer=(kind,label,x,y,w,h,opts={})=>sanitizeLayer({id:newId('layer'),kind,label,x,y,w,h,...opts});
export function createLayer(kind,profile='nocturne') {
  const p=PROFILES[profile]||PROFILES.nocturne,cfg={color:p.ink,fill:p.accent};
  if(kind==='image')return layer('image','IMAGE',34,25,35,42,{...cfg,src:'',radius:8,alt:'Your image'});
  if(kind==='shape')return layer('shape','SHAPE',40,22,25,36,{...cfg,opacity:75,radius:100,motion:'float',duration:6000});
  if(kind==='link')return layer('link','MOVING LINK',30,75,22,9,{...cfg,content:'Explore ↗',href:'#',fontSize:25,motion:'magnetic'});
  return layer('text','TEXT',20,32,48,20,{...cfg,content:'Type something extraordinary.',fontSize:74});
}
export function createScene(profile='nocturne',number=2) {
  const p=PROFILES[profile]||PROFILES.nocturne;
  return sanitizeScene({title:`Scene ${number}`,bg:p.bg,transition:'rise',duration:7000,layers:[
    layer('shape','ATMOSPHERE',60,13,28,53,{fill:p.accent,opacity:65,radius:100,motion:'float',duration:6000}),
    layer('text','HEADING',9,30,73,30,{color:p.ink,content:`A NEW WORLD / ${String(number).padStart(2,'0')}`,fontSize:82,motion:'reveal',delay:250,duration:1200}),
    layer('text','SUBTEXT',9,72,65,13,{color:p.secondary,content:'Every scene is a new place to explore.',fontSize:25,weight:400,motion:'reveal',delay:950,duration:1000})
  ]},p.bg);
}
export function duplicateScene(scene) {
  return sanitizeScene({...structuredClone(scene),id:newId('scene'),title:`${scene.title} copy`,layers:scene.layers.map(l=>({...l,id:newId('layer')}))});
}
export function currentScene(project){return project.scenes.find(s=>s.id===project.activeSceneId)||project.scenes[0];}
export function createProject(profile='nocturne') {
  if(!Object.hasOwn(PROFILES,profile))profile='nocturne';
  const p=PROFILES[profile];let title,items;
  if(profile==='solstice') {title='Soft Matter';items=[
    layer('text','EYEBROW',8,12,47,7,{color:p.accent,content:'AN EXPERIMENT IN ALIVENESS — 001',fontSize:17,weight:600}),
    layer('text','HEADLINE',8,25,63,31,{color:p.ink,content:'Give the web its wonder back.',fontSize:87,weight:700,motion:'reveal',duration:1200}),
    layer('shape','SUN DISC',68,14,28,50,{fill:'#c5d3af',radius:100,motion:'float',duration:6000}),
    layer('shape','ORBIT',75,36,19,31,{fill:p.accent,radius:100,opacity:90,motion:'drift',duration:7000}),
    layer('text','SUBLINE',9,69,45,12,{color:p.ink,content:'Arrange images, motion and meaning into a world worth exploring.',fontSize:24,weight:400}),
    layer('link','EXPLORE',9,84,24,9,{color:p.accent,content:'ENTER THE FIELD ↗',href:'#',fontSize:21,motion:'magnetic'})
  ];}
  else if(profile==='signal'){title='Signal / 90';items=[
    layer('shape','RED SUN',57,12,36,60,{fill:p.accent,radius:100,motion:'pulse',duration:4400}),
    layer('shape','ECHO',67,29,24,43,{fill:'#652a79',radius:100,opacity:78,motion:'drift',duration:7000}),
    layer('text','INDEX',8,11,52,9,{color:p.secondary,content:'TRANSMISSION // 369',fontSize:24,weight:400}),
    layer('text','HEADLINE',8,28,80,40,{color:p.ink,content:'THE INTERNET IS NOT A TEMPLATE.',fontSize:92,weight:900,motion:'reveal',duration:1400}),
    layer('link','BEGIN',9,82,36,10,{color:p.secondary,content:'INITIATE EXPERIENCE →',href:'#',fontSize:24,motion:'hover-lift'})
  ];}
  else{title='A Living Website';items=[
    layer('shape','HALO',55,9,40,72,{fill:'#263d64',radius:100,opacity:100,motion:'float',duration:6000}),
    layer('shape','CORONA',65,19,26,46,{fill:p.accent,radius:100,opacity:88,motion:'drift',duration:9000}),
    layer('shape','ECLIPSE',70,25,23,40,{fill:'#161e34',radius:100,opacity:100,motion:'float',duration:7200}),
    layer('text','KICKER',9,13,52,7,{color:p.accent,content:'LWG / THE LIVING WEB EXPERIMENT',fontSize:19,weight:500}),
    layer('text','TITLE',9,30,74,31,{color:p.ink,content:'MAKE SOMETHING ALIVE.',fontSize:98,weight:800,motion:'reveal',duration:1300}),
    layer('text','INTRO',9,72,43,11,{color:p.secondary,content:'A canvas for the web beyond predictable boxes.',fontSize:26,weight:400}),
    layer('link','DISCOVER',9,86,30,9,{color:p.accent,content:'EXPLORE THE IMPOSSIBLE ↗',href:'#',fontSize:23,weight:600,motion:'magnetic'})
  ];}
  return sanitizeProject({profile,title,scenes:[{title:'Opening scene',bg:p.bg,duration:8000,transition:'fade',layers:items}]});
}
