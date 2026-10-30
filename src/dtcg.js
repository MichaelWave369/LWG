/** Tiny standards-compatible DTCG 2025.10 token helpers (no runtime dependencies). */
export const SCHEMA='https://www.designtokens.org/schemas/2025.10/format.json';
export function tokenColor(hex){
 if(!/^#[0-9a-fA-F]{6}$/.test(hex))throw new Error(`Invalid #RRGGBB: ${hex}`);
 return {$type:'color',$value:{colorSpace:'srgb',components:[1,3,5].map(i=>Number((parseInt(hex.slice(i,i+2),16)/255).toFixed(6))),hex:hex.toLowerCase()}};
}
export function tokenDimension(n,unit='px'){if(!Number.isFinite(Number(n))||!['px','rem'].includes(unit))throw new Error('Invalid dimension');return {$type:'dimension',$value:{value:Number(n),unit}};}
export function tokenDuration(n,unit='ms'){if(!Number.isFinite(Number(n))||!['ms','s'].includes(unit))throw new Error('Invalid duration');return {$type:'duration',$value:{value:Number(n),unit}};}
export function tokenBezier(points){if(!Array.isArray(points)||points.length!==4||points.some(n=>!Number.isFinite(n))||points[0]<0||points[0]>1||points[2]<0||points[2]>1)throw new Error('Invalid cubic Bézier');return {$type:'cubicBezier',$value:points};}
export function tokensFromSamples({source='manual',colors=[],fontFamilies=[],fontSizes=[],spacings=[],radii=[],durations=[],ease=[.16,1,.3,1]}={}){
 const make=(values,prefix,build)=>Object.fromEntries([...new Set(values)].slice(0,8).map((x,i)=>[`${prefix}${i+1}`,build(x)]));
 return {$schema:SCHEMA,$description:`Design language extracted from ${source}; review for copyright and brand distinction before use.`,
  color:make(colors,'sample',tokenColor),font:make(fontFamilies,'family',value=>({$type:'fontFamily',$value:value})),
  fontSize:make(fontSizes,'step',n=>tokenDimension(n)),spacing:make(spacings,'space',n=>tokenDimension(n)),
  radius:make(radii,'corner',n=>tokenDimension(n)),
  motion:{reveal:tokenDuration(800),easing:tokenBezier(ease),...Object.fromEntries([...new Set(durations)].slice(0,5).map((n,i)=>[`sampleDuration${i+1}`,tokenDuration(n)]))}};
}
