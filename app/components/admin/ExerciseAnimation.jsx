"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '../UI';
import {animationFrames,initialScene,interpolateScene} from '../../lib/exerciseAnimation.mjs';
export default function ExerciseAnimation({exercise,renderDiagram}){
 const frames=useMemo(()=>animationFrames(exercise),[exercise]);
 const [index,setIndex]=useState(-1),[playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[speed,setSpeed]=useState(1);
 const progressRef=useRef(0);
 useEffect(()=>{setIndex(-1);setProgress(0);progressRef.current=0;setPlaying(false);},[exercise.id]);
 useEffect(()=>{
  if(!playing||index<0)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=1800/speed,hold=2600/speed;let raf,timer,previous;
  function finish(){timer=setTimeout(()=>{if(index===frames.length-1)setPlaying(false);else{progressRef.current=0;setProgress(0);setIndex(i=>i+1);}},hold);}
  function tick(now){if(previous!==undefined)progressRef.current=Math.min(1,progressRef.current+(now-previous)/duration);previous=now;if(reduced)progressRef.current=1;setProgress(progressRef.current);if(progressRef.current<1)raf=requestAnimationFrame(tick);else finish();}
  raf=requestAnimationFrame(tick);return ()=>{cancelAnimationFrame(raf);clearTimeout(timer);};
 },[playing,index,speed,frames.length]);
 function select(i){setPlaying(false);setIndex(i);progressRef.current=1;setProgress(1);}
 function reset(){setPlaying(false);setIndex(-1);progressRef.current=0;setProgress(0);}
 function play(){if(playing){setPlaying(false);return;}if(index<0||(index===frames.length-1&&progress>=1)){setIndex(0);progressRef.current=0;setProgress(0);}setPlaying(true);}
 const frame=frames[index],scene=frame?interpolateScene(frame.start,frame.end,progress):initialScene(exercise.diagram);
 const diagram={...exercise.diagram,...scene,arrows:frame?.arrow?[frame.arrow]:[],caption:frame?.text||exercise.diagram.caption};
 return <div className="exercise-animation"><p>{exercise.animation?(exercise.animationLabel||'Sammanhängande kombination · anfall uppåt'):'Animerade exempel från skissen · varje pil visas från sin startposition'}</p>{renderDiagram(diagram)}
  <div className="button-group" aria-label="Animationskontroller" style={{display:'flex',flexWrap:'wrap',gap:8}}>
   <Button onClick={play} disabled={!frames.length} aria-pressed={playing}>{playing?'Pausa':'Spela'}</Button>
   <Button variant="secondary" onClick={()=>select(index-1)} disabled={index<0}>← Föregående</Button><Button variant="secondary" onClick={()=>select(index+1)} disabled={index>=frames.length-1}>Nästa →</Button><Button variant="secondary" onClick={reset}>Börja om</Button>
   <label>Hastighet <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option><option value={1.5}>1,5×</option></select></label>
  </div><div aria-live="polite" style={{minHeight:100,marginTop:12}}><strong>{frame?`${index+1}/${frames.length} · ${frame.title}`:'Startposition'}</strong><p>{frame?.text||exercise.diagram.caption}</p></div>
 </div>;
}

