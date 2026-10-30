/** Dreamweaver-inspired, lossless-on-valid-input source gateway.
 * The canonical editable source is project JSON; exported HTML is a generated artifact.
 */
import {sanitizeProject,MAX_LAYERS,MAX_SCENES} from './project.js';
import {exportHtml} from './export.js';
export const MAX_CUSTOM_CSS = 32_000;
export const SOURCE_FORMATS = Object.freeze(['css','json','html']);

export function validateCustomCss(input){
 if(typeof input!=='string')throw Error('Custom CSS must be text.');
 if(input.length>MAX_CUSTOM_CSS)throw Error('Custom CSS is limited to 32 KB.');
 // CSS cannot fetch external content or escape the exported <style> context.
 if(/<|>|@import\b|@font-face\b|@namespace\b|@charset\b|url\s*\(|image-set\s*\(|cross-fade\s*\(|https?:\/\/|data\s*:|src\s*:|\\|expression\s*\(|-moz-binding\b|behavior\s*:|[\u0000-\u0008\u000b\u000e-\u001f]/i.test(input))
  throw Error('CSS cannot contain HTML, external resource URLs, imports, font-face, or legacy executable declarations.');
 return input;
}
export function parseProjectJson(value){
 if(typeof value!=='string'||value.length>5_000_000)throw Error('Project source exceeds the 5 MB editor limit.');
 let raw;
 try{raw=JSON.parse(value);}catch(e){throw Error(`Invalid JSON: ${e.message}`);}
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![1,2].includes(raw.version))throw Error('Expected an LWG v1 or v2 project object.');
 if(raw.version===2){
  if(!Array.isArray(raw.scenes)||raw.scenes.length<1||raw.scenes.length>MAX_SCENES)throw Error(`Project must contain 1–${MAX_SCENES} scenes.`);
  for(const s of raw.scenes){if(!s||typeof s!=='object'||!Array.isArray(s.layers)||s.layers.length>MAX_LAYERS)throw Error(`Each scene must have up to ${MAX_LAYERS} layers.`);}
 }else if(!Array.isArray(raw.layers)||raw.layers.length>MAX_LAYERS)throw Error('Invalid legacy layers.');
 validateCustomCss(raw.customCss??'');
 return sanitizeProject(raw);
}
export function readSource(project,format){
 if(format==='css')return project.customCss||'';
 if(format==='json')return JSON.stringify(project,null,2);
 if(format==='html')return exportHtml(project);
 throw Error('Unknown source format.');
}
