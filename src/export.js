import {PROFILES,sanitizeProject,safeUrl} from './project.js';
export const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=`
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif}
.page{width:100%;overflow:clip}.scene-shell{min-height:100svh;display:grid;place-items:center;overflow:clip;background:var(--scene-bg)}
.scene{position:relative;overflow:hidden;width:100%;aspect-ratio:1440/900;min-height:540px;background:var(--scene-bg);container-type:inline-size}
.object{position:absolute;display:block;white-space:pre-wrap;overflow-wrap:anywhere;transform:rotate(var(--rot));opacity:var(--alpha);color:var(--color);font-weight:var(--weight);font-size:clamp(9px,calc(var(--fs) * .069444cqw),calc(var(--fs) * 1px));line-height:1.03;letter-spacing:-.035em}
.object.text,.object.link{display:flex;align-items:center}.object.link{text-decoration:none;max-width:var(--width);cursor:pointer;transition:filter .3s ease}.object.link:hover{filter:brightness(1.2)}.object.link:focus-visible,.scene-nav a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.object.shape{background:radial-gradient(circle at 28% 24%,color-mix(in srgb,var(--fill) 65%,white),var(--fill) 64%,color-mix(in srgb,var(--fill) 55%,black));border-radius:var(--radius)}
.object.image{overflow:hidden;border-radius:var(--radius)}.object.image img{width:100%;height:100%;object-fit:cover;display:block}
.scene.in-view .object[data-motion=float]{animation:lw-float var(--duration) ease-in-out var(--delay) infinite}
.scene.in-view .object[data-motion=drift],.scene.in-view .object[data-motion=marquee]{animation:lw-drift var(--duration) ease-in-out var(--delay) infinite}
.scene.in-view .object[data-motion=pulse]{animation:lw-pulse var(--duration) ease-in-out var(--delay) infinite}
.scene.in-view .object[data-motion=spin]{animation:lw-spin var(--duration) linear var(--delay) infinite}
.object[data-motion=hover-lift]{transition:transform .35s cubic-bezier(.16,1,.3,1)}.object[data-motion=hover-lift]:hover{transform:translateY(-12px) rotate(var(--rot))}
.scene.js-active .object[data-motion=reveal]{opacity:0;transform:translateY(32px) rotate(var(--rot))}
.scene.js-active.in-view .object[data-motion=reveal]{animation:lw-reveal var(--duration) cubic-bezier(.16,1,.3,1) var(--delay) both}
.scene-shell.js-active{opacity:1}.scene-shell.js-active.in-view[data-transition=fade]{animation:lw-scene-fade .8s both}.scene-shell.js-active.in-view[data-transition=rise]{animation:lw-scene-rise .8s both}.scene-shell.js-active.in-view[data-transition=zoom]{animation:lw-scene-zoom .8s both}
@keyframes lw-float{50%{transform:translateY(-16px) rotate(var(--rot))}}@keyframes lw-drift{50%{transform:translateX(18px) rotate(var(--rot))}}@keyframes lw-pulse{50%{transform:scale(1.065) rotate(var(--rot))}}@keyframes lw-spin{to{transform:rotate(calc(var(--rot) + 360deg))}}@keyframes lw-reveal{from{opacity:0;transform:translateY(32px) rotate(var(--rot))}to{opacity:var(--alpha);transform:rotate(var(--rot))}}
@keyframes lw-scene-fade{from{opacity:.25}to{opacity:1}}@keyframes lw-scene-rise{from{opacity:.25;transform:translateY(35px)}to{opacity:1;transform:translateY(0)}}@keyframes lw-scene-zoom{from{opacity:.35;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
.scene-nav{position:fixed;bottom:20px;right:20px;z-index:10;display:flex;gap:7px;background:#0e111bdc;padding:9px;border:1px solid #ffffff30;border-radius:20px;backdrop-filter:blur(9px)}
.scene-nav a{min-width:30px;height:30px;display:grid;place-items:center;color:#fff;text-decoration:none;border-radius:99px;border:1px solid #ffffff40;font:600 12px system-ui}.scene-nav a:hover{background:var(--accent);color:#15171d}
@media(max-width:720px){.scene{aspect-ratio:3/4;min-height:0}.object{font-size:clamp(11px,calc(var(--fs) * .069444cqw),calc(var(--fs) * .8px))}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}.scene.js-active .object[data-motion=reveal]{opacity:var(--alpha);transform:rotate(var(--rot))}}
`;
export function layerStyle(l){return `left:${l.x}%;top:${l.y}%;width:${l.w}%;height:${l.h}%;--width:${l.w}%;--rot:${l.rotate}deg;--alpha:${l.opacity/100};--color:${l.color};--fill:${l.fill};--fs:${l.fontSize};--weight:${l.weight};--radius:${l.radius}%;--delay:${l.delay}ms;--duration:${l.duration}ms;`;}
export function layerHtml(l){
  const props=`class="object ${l.kind}" data-motion="${l.motion}" style="${layerStyle(l)}"`;
  if(l.kind==='image')return `<div ${props}>${l.src?`<img src="${esc(safeUrl(l.src,true))}" alt="${esc(l.alt)}" loading="lazy">`:'<span>Image placeholder</span>'}</div>`;
  if(l.kind==='shape')return `<div ${props} aria-hidden="true"></div>`;
  if(l.kind==='link')return `<a ${props} href="${esc(safeUrl(l.href)||'#')}">${esc(l.content)}</a>`;
  return `<div ${props}>${esc(l.content)}</div>`;
}
const script=`(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)return;const shells=[...document.querySelectorAll('.scene-shell')];for(const shell of shells){shell.classList.add('js-active');shell.querySelector('.scene').classList.add('js-active')}if(!('IntersectionObserver'in window)){for(const shell of shells){shell.classList.add('in-view');shell.querySelector('.scene').classList.add('in-view')}return}const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('in-view');entry.target.querySelector('.scene').classList.add('in-view');observer.unobserve(entry.target)}}},{threshold:.12});shells.forEach(s=>observer.observe(s));document.querySelectorAll('[data-motion=magnetic]').forEach(el=>{el.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=el.getBoundingClientRect();el.style.transform='translate('+((e.clientX-r.left-r.width/2)*.16)+'px,'+((e.clientY-r.top-r.height/2)*.16)+'px) rotate(var(--rot))'});el.addEventListener('pointerleave',()=>{el.style.transform=''})})})();`;
export function exportHtml(raw){
  const project=sanitizeProject(raw),p=PROFILES[project.profile];
  const scenes=project.scenes.map((scene,i)=>`<section class="scene-shell" id="${scene.id}" data-transition="${scene.transition}" style="--scene-bg:${scene.bg}" aria-label="${esc(scene.title)}"><div class="scene">${scene.layers.map(layerHtml).join('\n')}</div></section>`).join('\n');
  const nav=project.scenes.length>1?`<nav class="scene-nav" aria-label="Scene navigation">${project.scenes.map((s,i)=>`<a href="#${s.id}" aria-label="Go to ${esc(s.title)}" title="${esc(s.title)}">${i+1}</a>`).join('')}</nav>`:'';
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${p.bg}"><title>${esc(project.title)}</title>\n<style>:root{--bg:${p.bg};--ink:${p.ink};--accent:${p.accent}}${css}</style></head>\n<body><main class="page">${scenes}</main>${nav}\n<script>${script}</script></body></html>`;
}
