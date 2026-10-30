/** Deterministic motion sampling for the editor timeline. Time units are milliseconds. */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function sampleLayer(layer,timeMs){
  const delay=layer.delay||0,duration=Math.max(150,layer.duration||900);
  const age=Math.max(0,timeMs-delay),p=(age%duration)/duration,alpha=layer.opacity/100;
  const base={opacity:alpha,transform:`rotate(${layer.rotate}deg)`};
  if(layer.motion==='reveal'){
    const progress=clamp((timeMs-delay)/duration,0,1);
    const ease=1-(1-progress)**3;
    return {opacity:alpha*ease,transform:`translateY(${(1-ease)*32}px) rotate(${layer.rotate}deg)`};
  }
  if(timeMs<delay)return base;
  if(layer.motion==='float')return {...base,transform:`translateY(${-16*(1-Math.cos(p*2*Math.PI))/2}px) rotate(${layer.rotate}deg)`};
  if(layer.motion==='drift'||layer.motion==='marquee')return {...base,transform:`translateX(${18*Math.sin(p*2*Math.PI)}px) rotate(${layer.rotate}deg)`};
  if(layer.motion==='pulse')return {...base,transform:`scale(${1+0.065*(1-Math.cos(p*2*Math.PI))/2}) rotate(${layer.rotate}deg)`};
  if(layer.motion==='spin')return {...base,transform:`rotate(${layer.rotate+p*360}deg)`};
  return base;
}
export function formatTime(ms){return (Math.max(0,ms)/1000).toFixed(1)+'s';}
export function trackRect(layer,scene){
  const duration=Math.max(1,scene.duration),start=clamp(layer.delay,0,duration);
  const width=clamp(layer.duration,0,duration-start);
  return {left:100*start/duration,width:Math.max(.4,100*width/duration)};
}
