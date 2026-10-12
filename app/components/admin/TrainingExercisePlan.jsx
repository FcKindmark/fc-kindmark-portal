"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '../UI';
import {supabase} from '../../lib/supabaseClient';
import {EXERCISE_LIBRARY,EXERCISE_SOURCES,FRAMEWORK_REFERENCES,filterExercises} from '../../lib/exerciseLibrary.mjs';
import {ExerciseDiagram} from './ExerciseLibrary';

export default function TrainingExercisePlan({trainingId,canManage=false,addExerciseId=null,onAdded}){
 const [ids,setIds]=useState([]),[notes,setNotes]=useState(''),[version,setVersion]=useState(0),[publication,setPublication]=useState(null);
 const [states,setStates]=useState([]),[query,setQuery]=useState(''),[category,setCategory]=useState('all'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const heading=useRef(null);
 const [ready,setReady]=useState(false);
 const load=useCallback(async(silent=false)=>{
  if(!silent){setLoading(true);setReady(false);}setError('');
  try{
   const [published,draft,status]=await Promise.all([
    supabase.from('club_training_plan_publications').select('*').eq('training_id',trainingId).maybeSingle(),
    canManage?supabase.from('club_training_plan_drafts').select('*').eq('training_id',trainingId).maybeSingle():Promise.resolve({data:null}),
    canManage?supabase.from('club_exercise_state').select('exercise_id,archived_at'):Promise.resolve({data:[]})
   ]);
   for(const result of [published,draft,status])if(result.error)throw result.error;
   setPublication(published.data);
   if(canManage){
    setStates(status.data||[]);setIds(draft.data?.exercise_ids||[]);setNotes(draft.data?.notes||'');setVersion(draft.data?.version||0);
   }else{setIds(published.data?.exercise_ids||[]);setNotes(published.data?.notes||'');}
   setDirty(false);setReady(true);
  }catch(e){setError(`Planen kunde inte läsas: ${e.message}`);}finally{if(!silent)setLoading(false);}
 },[trainingId,canManage]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{
  if(!loading&&!error&&canManage&&addExerciseId){
   setIds(previous=>previous.includes(addExerciseId)?previous:[...previous,addExerciseId]);setDirty(true);
   setNotice('Övningen har lagts i ditt utkast. Spara eller publicera planen.');onAdded?.();heading.current?.focus();
  }
 },[loading,error,canManage,addExerciseId,onAdded]);
 // Coaches refresh published content without touching a draft or changing auth/session state.
 useEffect(()=>{if(canManage)return;const refresh=()=>load(true);window.addEventListener('focus',refresh);const timer=setInterval(refresh,30000);return()=>{window.removeEventListener('focus',refresh);clearInterval(timer);};},[canManage,load]);
 function toggle(id){setIds(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);setDirty(true);setNotice('');}
 function move(index,direction){setIds(previous=>{const next=[...previous],other=index+direction;[next[index],next[other]]=[next[other],next[index]];return next;});setDirty(true);}
 async function save(publish){
  setBusy(true);setError('');setNotice('');
  try{const result=await supabase.rpc('club_save_training_plan',{p_training:trainingId,p_exercises:ids,p_notes:notes,p_publish:publish,p_expected_version:version});if(result.error)throw result.error;
   await load();setNotice(publish?'Planen är publicerad för lagets tränare.':'Utkastet är sparat. En tidigare publicerad plan ändras först när du publicerar igen.');
  }catch(e){setError(`Planen sparades inte: ${e.message}`);}finally{setBusy(false);}
 }
 async function unpublish(){
  if(!window.confirm('Dölj planen för tränarna? Ditt sparade utkast finns kvar och kan publiceras igen.'))return;
  setBusy(true);setError('');setNotice('');
  try{const result=await supabase.rpc('club_unpublish_training_plan',{p_training:trainingId,p_expected_version:version});if(result.error)throw result.error;await load();setNotice('Publiceringen är återkallad. Utkastet finns kvar.');}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const selected=ids.map(id=>EXERCISE_LIBRARY.find(e=>e.id===id));
 const choices=filterExercises({states,query,category});
 return <section className="training-exercise-plan" aria-label="Träningsplan"><h4 tabIndex={-1} ref={heading}>Träningsplan · {ids.length} övningar</h4>
  {loading&&<p role="status">Läser plan…</p>}{error&&<p role="alert" className="error-banner">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!loading&&ready&&<>
   <p>{publication?`Publicerad ${new Date(publication.published_at).toLocaleString('sv-SE',{timeZone:'Europe/Stockholm'})}`:canManage?'Utkast · inte publicerat för tränarna':'Ingen träningsplan är publicerad ännu.'}{dirty?' · Osparade ändringar':''}</p>
   {canManage?<>
    <label>Planens instruktioner<textarea maxLength={4000} value={notes} disabled={busy} onChange={e=>{setNotes(e.target.value);setDirty(true);}} placeholder="Ordning, tid, anpassning till grupp och fokus för tränarna"/></label>
    <details><summary>Välj från biblioteket ({EXERCISE_LIBRARY.length} övningar)</summary>
     <div className="exercise-filters"><label>Sök övning<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Fokus<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Alla fokus</option>{[...new Set(EXERCISE_LIBRARY.map(e=>e.category))].map(c=><option key={c}>{c}</option>)}</select></label></div>
     <div className="plan-exercise-picker">{choices.map(e=><label key={e.id}><input type="checkbox" disabled={busy||(!ids.includes(e.id)&&ids.length>=50)} checked={ids.includes(e.id)} onChange={()=>toggle(e.id)}/><span>{e.id} · {e.title}<small>{e.category} · {FRAMEWORK_REFERENCES[e.framework].phase}</small></span></label>)}</div>
    </details>
    <div className="button-group"><Button disabled={busy||ids.length>50} onClick={()=>save(false)}>Spara utkast</Button><Button disabled={busy||!ids.length||ids.length>50} onClick={()=>save(true)}>{publication?'Publicera uppdaterad plan':'Publicera för tränarna'}</Button>{publication&&<Button variant="secondary" disabled={busy} onClick={unpublish}>Återkalla publicering</Button>}<Button variant="secondary" disabled={busy} onClick={()=>{if(!dirty||window.confirm('Kasta osparade planändringar och läsa om?'))load();}}>Läs om plan</Button></div>
    <p className="muted">Utkast syns bara för administratörer. Publicering syns bara för tränare som är kopplade till detta lag. Kallelser till spelare skickas separat.</p>
   </>:notes&&<p style={{whiteSpace:'pre-wrap'}}>{notes}</p>}
   {selected.map((e,index)=><details key={ids[index]} className="plan-exercise"><summary>{index+1}. {e?e.title:`Övning ${ids[index]} saknas i denna appversion`}</summary>
    {canManage&&<div className="button-group"><Button variant="secondary" disabled={busy||index===0} onClick={()=>move(index,-1)}>Flytta upp</Button><Button variant="secondary" disabled={busy||index===ids.length-1} onClick={()=>move(index,1)}>Flytta ner</Button><Button variant="danger" disabled={busy} onClick={()=>toggle(ids[index])}>Ta bort från planen</Button></div>}
    {e&&<><ExerciseDiagram exercise={e}/><h5>Organisation</h5><p>{e.organisation}</p><p>{e.equipment}</p><p>{e.timing}</p><ol>{e.steps.map(s=><li key={s}>{s}</li>)}</ol><p>{e.restart}</p><p>{e.rotation}</p><p><strong>Observera:</strong> {e.observe}</p><p>{e.question}</p><p><strong>Enklare:</strong> {e.easier}</p><p><strong>Svårare:</strong> {e.harder}</p><p>{FRAMEWORK_REFERENCES[e.framework].section}</p><a href={EXERCISE_SOURCES[e.source].url} target="_blank" rel="noreferrer">{EXERCISE_SOURCES[e.source].title}</a></>}
   </details>)}
  </>}
  {!loading&&error&&<Button variant="secondary" disabled={busy} onClick={load}>Försök läsa planen igen</Button>}
 </section>;
}
