/** Local-first, dependency-free design language. No third-party component code. */
export const FONT_STACKS = Object.freeze({
  'system-ui': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'Georgia': 'Georgia, "Times New Roman", serif',
  'monospace': 'ui-monospace, SFMono-Regular, Consolas, monospace',
  'Trebuchet MS': '"Trebuchet MS", Verdana, sans-serif',
  'Arial': 'Arial, Helvetica, sans-serif'
});
export const DESIGN_PROFILES = Object.freeze({
  nocturne: {name:'After Dark', description:'cinematic / celestial', bg:'#09101c', ink:'#f0f1eb', accent:'#edaf72', secondary:'#b1bce7', font:'system-ui'},
  solstice: {name:'Soft Matter', description:'editorial / organic', bg:'#eee9dd', ink:'#18261f', accent:'#aa4e35', secondary:'#829d75', font:'Georgia'},
  signal: {name:'Signal / 90', description:'retro / electronic', bg:'#101014', ink:'#f9e8d2', accent:'#f66a5b', secondary:'#a1f5be', font:'monospace'},
  ember: {name:'Ember Library', description:'warm / literary', bg:'#231a17', ink:'#fff2df', accent:'#e1a56b', secondary:'#b9c7a8', font:'Georgia'},
  tide: {name:'Tidal Glass', description:'calm / luminous', bg:'#082b34', ink:'#e4fcf9', accent:'#8ae7ce', secondary:'#c5c6ff', font:'Trebuchet MS'},
  print: {name:'Modern Print', description:'bold / typographic', bg:'#f4f0e6', ink:'#21212a', accent:'#a33a35', secondary:'#31596b', font:'Arial'}
});
export const DESIGN_COLORS = Object.freeze(['bg','ink','accent','secondary']);
const validColor = value => typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value);
export function sanitizeDesign(profile='nocturne', input) {
  const base=DESIGN_PROFILES[profile] || DESIGN_PROFILES.nocturne;
  const source=input && typeof input==='object' && !Array.isArray(input) ? input : {};
  const output={};
  for(const key of DESIGN_COLORS) output[key]=validColor(source[key])?source[key].toLowerCase():base[key];
  output.font=Object.hasOwn(FONT_STACKS,source.font) ? source.font : base.font;
  return output;
}
export function cssDesign(design) {
  const d=sanitizeDesign('nocturne',design);
  return `--bg:${d.bg};--ink:${d.ink};--accent:${d.accent};--secondary:${d.secondary};--design-font:${FONT_STACKS[d.font]};`;
}
const same = (a,b) => String(a).toLowerCase()===String(b).toLowerCase();
/** Recolor only surfaces still tracking old tokens; custom-colored layers stay untouched. */
export function applyDesign(project, requested) {
  const next=structuredClone(project);
  const old=sanitizeDesign(next.profile,next.design);
  const current=sanitizeDesign(next.profile,requested);
  next.design=current;
  const update = value => {
    for (const key of DESIGN_COLORS) if(same(value,old[key])) return current[key];
    return value;
  };
  for(const scene of next.scenes||[]) {
    scene.bg=update(scene.bg);
    for(const layer of scene.layers||[]) {
      layer.color=update(layer.color);
      layer.fill=update(layer.fill);
    }
  }
  return next;
}
/** WCAG relative luminance, for advisory text/background pairing. */
export function contrastRatio(foreground,background) {
  if(!validColor(foreground)||!validColor(background)) return null;
  function lum(color){
    const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255)
      .map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  }
  const a=lum(foreground),b=lum(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
