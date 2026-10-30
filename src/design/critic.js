/** ΦDesign Critic: offline, read-only, deterministic checks on the current LWG project.
 * This is a static heuristic audit, not a WCAG certification or a rendered-browser test.
 */
import {contrastRatio} from './tokens.js';

export const CRITIC_SEVERITIES=Object.freeze(['error','warning','info']);
const priority={error:0,warning:1,info:2};
const visuallyIntersects=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const likelyText=layer=>layer.kind==='text'||layer.kind==='link';
const meaningful=(s)=>typeof s==='string'&&s.trim().length>0;
const genericAlt=/^(decorative image|your image|image|photo|picture|placeholder|img|untitled)$/i;
const weakLink=/^(click here|here|more|read more|learn more|link)$/i;
const continuous=new Set(['float','drift','pulse','spin','marquee']);

export function auditProject(project) {
  const findings=[];
  const scenes=Array.isArray(project?.scenes)?project.scenes:[];
  const ids=new Set(scenes.map(s=>s.id));
  function add(rule,severity,message,recommendation,scene=null,layer=null,evidence=null){
    findings.push({
      id:[rule,scene?.id||'project',layer?.id||'scene'].join(':'),
      rule,severity,message,recommendation,
      sceneId:scene?.id||null, sceneTitle:scene?.title||null,
      layerId:layer?.id||null, layerLabel:layer?.label||null,
      ...(evidence?{evidence}:{})
    });
  }
  for(const scene of scenes){
    const layers=Array.isArray(scene.layers)?scene.layers:[];
    let activeMotion=0;
    for(let i=0;i<layers.length;i++){
      const layer=layers[i];
      if(continuous.has(layer.motion))activeMotion++;
      const over=layer.x<0||layer.y<0||layer.x+layer.w>100||layer.y+layer.h>100;
      if(over)add('artboard-overflow','warning',
        'Layer bounds extend outside the artboard.',
        'Reposition or resize this layer if clipping is not intentional. Check mobile separately.',scene,layer,
        {x:layer.x,y:layer.y,w:layer.w,h:layer.h});
      if(layer.kind==='image'){
        if(!meaningful(layer.src))add('image-source','info','Image layer has no source.','Upload or link an image, or delete the placeholder.',scene,layer);
        else {
          if(!meaningful(layer.alt)||genericAlt.test(layer.alt.trim())){
            add('image-alt','warning','Image has missing or generic alternative text.',
              'Describe its meaning, or explicitly mark it decorative in a future semantic image mode.',scene,layer);
          }
          if(/^https?:\/\//i.test(layer.src))add('remote-asset','info',
            'This image depends on a network URL.',
            'Embed a locally owned image before publishing a fully offline page.',scene,layer);
        }
      }
      if(layer.kind==='link'){
        if(!meaningful(layer.href)||layer.href==='#'){
          add('link-destination','warning','Link has no meaningful destination.',
            'Choose a valid scene anchor or an HTTP(S) or mailto URL.',scene,layer);
        } else if(layer.href.startsWith('#')&&!ids.has(layer.href.slice(1))){
          add('missing-scene-anchor','warning','Link points to a scene anchor that is not in this project.',
            'Choose an existing scene in the link inspector or update the destination.',scene,layer);
        }
        if(!meaningful(layer.content)||weakLink.test(layer.content.trim())){
          add('link-label','warning','Link text does not identify its destination.',
            'Use a descriptive action label so people and screen readers can understand it.',scene,layer);
        }
        // 4% of 900px is 36px on the reference canvas, before responsive scaling.
        if(layer.h<4.9) add('small-target','info',
          'Link may have a small click/tap target.',
          'Check the real rendered size at mobile widths; aim for an accessible target area.',scene,layer);
      }
      if(likelyText(layer)&&meaningful(layer.content)){
        if(layer.fontSize<16)add('small-type','info','Text size may be difficult to read.',
          'Inspect the rendered size at phone widths; increase body text where appropriate.',scene,layer,
          {fontSize:layer.fontSize});
        // An opaque/plain scene backdrop can be estimated. Earlier image/shape objects
        // beneath text may change the apparent contrast, so avoid false certifications.
        const uncertain=layers.slice(0,i).some(other=>(
          (other.kind==='image'||other.kind==='shape') &&
          visuallyIntersects(other,layer)
        ));
        if(!uncertain&&typeof layer.color==='string'&&typeof scene.bg==='string'){
          const ratio=contrastRatio(layer.color,scene.bg);
          // Estimates are for reference-scale geometry; responsive font size may differ.
          const large=layer.fontSize>=24||(layer.fontSize>=19&&layer.weight>=700);
          const min=large?3:4.5;
          if(ratio!==null&&ratio<min) add('estimated-contrast','warning',
            `Estimated contrast is ${ratio.toFixed(2)}:1 against the scene background.`,
            `Increase contrast to at least ${min}:1 at the reference size, then verify against the actual rendered background on desktop and mobile.`,
            scene,layer,{ratio:Number(ratio.toFixed(2)),threshold:min,assumption:'plain scene background'});
        }
      }
    }
    if(activeMotion>=12)add('motion-density','info',
      `${activeMotion} continuously animated layers may increase visual and performance load.`,
      'Consider reducing simultaneous motion and verify actual device performance; reduced-motion support exists in the exporter.',scene);
  }
  findings.sort((a,b)=>priority[a.severity]-priority[b.severity]||String(a.sceneId||'').localeCompare(String(b.sceneId||''))||String(a.layerId||'').localeCompare(String(b.layerId||''))||a.rule.localeCompare(b.rule));
  const counts={error:0,warning:0,info:0};
  for(const finding of findings)counts[finding.severity]++;
  return {schema:'LWG_DESIGN_CRITIC_V1',scope:'static-project-heuristics',counts,findings,
    limitations:'Geometry and color estimates use the scene model, not pixels, compositing, mobile rendering, keyboard traversal or assistive-technology testing. Findings are advisory and no project content is modified.'};
}
