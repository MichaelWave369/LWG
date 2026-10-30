import {PROFILES,sanitizeProject,safeUrl} from './project.js';
export const esc = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css = `
*{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif}
.page{min-height:100svh;display:grid;place-items:center;overflow:hidden}.scene{position:relative;overflow:hidden;width:100%;aspect-ratio:1440/900;min-height:540px;background:var(--bg);container-type:inline-size}
.object{position:absolute;display:block;white-space:pre-wrap;overflow-wrap:anywhere;transform:rotate(var(--rot));opacity:var(--alpha);color:var(--color);font-weight:var(--weight);font-size:clamp(9px,calc(var(--fs) * .069444cqw),calc(var(--fs) * 1px));line-height:1.03;letter-spacing:-.035em}
.object.text,.object.link{display:flex;align-items:center}.object.link{text-decoration:none;width:fit-content;max-width:var(--width);cursor:pointer;transition:filter .3s ease}.object.link:hover{filter:brightness(1.2)}.object.shape{background:var(--fill);border-radius:var(--radius)}.object.image{overflow:hidden;border-radius:var(--radius)}.object.image img{width:100%;height:100%;object-fit:cover;display:block}
.object[data-motion=float]{animation:lw-float 6s ease-in-out infinite}.object[data-motion=drift]{animation:lw-drift 9s ease-in-out infinite alternate}.object[data-motion=pulse]{animation:lw-pulse 4s ease-in-out infinite}.object[data-motion=spin]{animation:lw-spin 28s linear infinite}.object[data-motion=marquee]{animation:lw-drift 12s linear infinite alternate}.object[data-motion=hover-lift]{transition:transform .35s cubic-bezier(.16,1,.3,1)}.object[data-motion=hover-lift]:hover{transform:translateY(-12px) rotate(var(--rot))}
.scene.js-active .object[data-motion=reveal]{opacity:0;transform:translateY(32px) rotate(var(--rot));transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1);transition-delay:var(--delay)}.scene.js-active .object[data-motion=reveal].visible{opacity:var(--alpha);transform:rotate(var(--rot))}
@keyframes lw-float{0%,100%{transform:translateY(0) rotate(var(--rot))}50%{transform:translateY(-16px) rotate(var(--rot))}}@keyframes lw-drift{from{transform:translateX(-10px) rotate(var(--rot))}to{transform:translateX(18px) rotate(var(--rot))}}@keyframes lw-pulse{50%{transform:scale(1.065) rotate(var(--rot))}}@keyframes lw-spin{to{transform:rotate(calc(var(--rot) + 360deg))}}
@media(max-width:720px){.scene{aspect-ratio:3/4;min-height:0}.object{font-size:clamp(11px,calc(var(--fs) * .069444cqw),calc(var(--fs) * .8px))}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}.scene.js-active .object[data-motion=reveal]{opacity:var(--alpha);transform:rotate(var(--rot))}}
`;
export function layerStyle(l) {
  return `left:${l.x}%;top:${l.y}%;width:${l.w}%;height:${l.h}%;--width:${l.w}%;--rot:${l.rotate}deg;--alpha:${l.opacity/100};--color:${l.color};--fill:${l.fill};--fs:${l.fontSize};--weight:${l.weight};--radius:${l.radius}%;--delay:${l.delay}ms;`;
}
export function layerHtml(l) {
  const props=`class="object ${l.kind}" data-motion="${l.motion}" style="${layerStyle(l)}"`;
  if(l.kind==='image') return `<div ${props}>${l.src?`<img src="${esc(safeUrl(l.src,true))}" alt="${esc(l.alt)}" loading="lazy">`:'<span>Image placeholder</span>'}</div>`;
  if(l.kind==='shape') return `<div ${props} aria-hidden="true"></div>`;
  if(l.kind==='link') return `<a ${props} href="${esc(safeUrl(l.href)||'#')}" rel="noopener noreferrer">${esc(l.content)}</a>`;
  return `<div ${props}>${esc(l.content)}</div>`;
}
export function exportHtml(raw) {
  const project=sanitizeProject(raw), p=PROFILES[project.profile];
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${p.bg}"><title>${esc(project.title)}</title>\n<style>:root{--bg:${p.bg};--ink:${p.ink};--accent:${p.accent}}${css}</style></head>\n<body><main class="page"><section class="scene" aria-label="${esc(project.title)}">${project.layers.map(layerHtml).join('\n')}</section></main>\n<script>\n(()=>{const scene=document.querySelector('.scene');if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver'in window){scene.classList.add('js-active');const obs=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('visible');obs.unobserve(entry.target)}}},{threshold:.05});scene.querySelectorAll('[data-motion=reveal]').forEach(el=>obs.observe(el));}if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('[data-motion=magnetic]').forEach(el=>{el.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=el.getBoundingClientRect();el.style.transform='translate('+((e.clientX-r.left-r.width/2)*.16)+'px,'+((e.clientY-r.top-r.height/2)*.16)+'px) rotate(var(--rot))'});el.addEventListener('pointerleave',()=>{el.style.transform=''})})}})();\n</script></body></html>`;
}
