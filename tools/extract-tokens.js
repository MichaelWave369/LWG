#!/usr/bin/env node
/** LWG reference extractor: samples CSS, never saves copied source markup or media. */
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tokensFromSamples} from '../src/dtcg.js';
const argv=process.argv.slice(2);const source=argv[0];const value=(flag,def)=>{const i=argv.indexOf(flag);return i===-1?def:argv[i+1];};
if(!source){console.error('Usage: node tools/extract-tokens.js <https://reference-site> --out profiles/reference [--limit 350]');process.exit(1)}
let url;try{url=new URL(source);if(!['http:','https:'].includes(url.protocol))throw Error('unsupported protocol');}catch{console.error('Provide an http(s) URL.');process.exit(1)}
const count=Math.min(1000,Math.max(40,Number(value('--limit','350'))||350));const output=resolve(value('--out','profiles/extracted'));
let chromium;try{({chromium}=await import('playwright'));}catch{console.error('Playwright is needed for extraction. Run: npm install && npx playwright install chromium');process.exit(1)}
const browser=await chromium.launch({headless:true});let samples=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(1250);
 samples=await page.evaluate(limit=>{
  const output=[];
  for(const el of document.querySelectorAll('body *')){
   if(output.length>=limit)break;
   const rect=el.getBoundingClientRect();if(rect.width<2||rect.height<2)continue;
   const style=getComputedStyle(el);
   output.push({tag:el.tagName.toLowerCase(),color:style.color,bg:style.backgroundColor,
    font:style.fontFamily.split(',')[0].replace(/["']/g,'').trim(),size:parseFloat(style.fontSize),
    padding:parseFloat(style.paddingTop),radius:parseFloat(style.borderTopLeftRadius),duration:parseFloat(style.transitionDuration)*1000,
    interactive:el.matches('a, button, [role="button"]'),heading:el.matches('h1,h2,h3,h4,h5,h6'),area:rect.width*rect.height});
  }
  return output;
 },count);
}finally{await browser.close()}
const rgbToHex=str=>{
 const m=/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:[, /]+\s*([\d.]+))?\s*\)$/.exec(str||'');
 if(!m||m[4]==='0')return null;
 return '#'+m.slice(1,4).map(n=>Math.min(255,Number(n)).toString(16).padStart(2,'0')).join('');
};
const popular=(values,max=6)=>{const freq=new Map();for(const v of values){if(v!=null&&v!==''&&Number.isFinite(Number(v))||typeof v==='string'&&v.length>0){freq.set(v,(freq.get(v)||0)+1)}}return [...freq].sort((a,b)=>b[1]-a[1]).slice(0,max).map(x=>x[0])};
const colors=popular(samples.flatMap(s=>[rgbToHex(s.bg),rgbToHex(s.color)]).filter(Boolean));
const fonts=popular(samples.map(s=>s.font).filter(Boolean),4);
const fontSizes=popular(samples.map(s=>Math.round(s.size/2)*2).filter(v=>v>=10&&v<=180));
const spacings=popular(samples.map(s=>Math.round(s.padding/4)*4).filter(v=>v>0&&v<=200));
const radii=popular(samples.map(s=>Math.round(s.radius)).filter(v=>v>=0&&v<=100));
const durations=popular(samples.map(s=>Math.round(s.duration)).filter(v=>v>0&&v<=5000),5);
const tokens=tokensFromSamples({source:url.hostname,colors,fontFamilies:fonts,fontSizes,spacings,radii,durations});
const draft=`# Design profile: ${url.hostname} (DRAFT)\n\nReference: ${url.href}\nSamples: ${samples.length}\n\n## Extracted palette\n${colors.map(x=>'- '+x).join('\n')}\n\n## Fonts\n${fonts.map(x=>'- '+x).join('\n')}\n\n## Design direction (human review required)\n- What is the emotional identity?\n- What is the layout rhythm and negative-space strategy?\n- Which motion triggers, durations, and interactions are distinctive?\n- Forbidden defaults (e.g. generic gradient CTAs, three-card sections):\n- What should be deliberately different from the reference to avoid copying?\n\n## Notes\nComputed CSS samples are approximate. Screenshot, video, licensing, and responsive behavior require separate review.\n`;
await mkdir(output,{recursive:true});await writeFile(join(output,'tokens.json'),JSON.stringify(tokens,null,2)+'\n');await writeFile(join(output,'style-profile.md'),draft);
console.log(`Wrote ${output}/tokens.json and style-profile.md from ${samples.length} visible elements.`);
