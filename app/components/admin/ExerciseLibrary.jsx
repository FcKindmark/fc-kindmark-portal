"use client";
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {Button,Card} from '../UI';
import {supabase} from '../../lib/supabaseClient';
import {EXERCISE_LIBRARY,EXERCISE_SOURCES,FRAMEWORK_REFERENCES,filterExercises} from '../../lib/exerciseLibrary.mjs';

export function ExerciseDiagram({exercise}){
  const id=useId().replace(/:/g,'');
  const {players,arrows,targets,ball,balls=[ball],caption}=exercise.diagram;
  const point=value=>{const p=players.find(p=>p.id===value);return p?[p.x+10,p.y+10]:value.split(',').map(n=>+n+10);};
  const color={blue:'#21628b',red:'#b73242',gold:'#806015'};
  return <figure className="exercise-diagram"><svg viewBox="0 0 120 120" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{`${exercise.id} · ${exercise.title}`}</title><desc id={`${id}-desc`}>{caption}</desc>
    <defs>{['pass','run','dribble','shot'].map(k=><marker key={k} id={`${id}-${k}`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M0 0L4 2L0 4Z" fill={k==='shot'?'#a02035':'#344e5e'}/></marker>)}</defs>
    <rect x="10" y="10" width="100" height="100" fill={exercise.sport==='futsal'?'#e7f0f6':'#edf5e9'} stroke="#73978a"/>
    {targets.map((t,i)=>{const x=t.x+10,y=t.y+10;return <g key={i}>{t.type==='zone'?<rect x={x} y={y} width={t.w} height={t.h} fill="#dfbd55" opacity=".22" stroke="#8a6618" strokeDasharray="2 2"/>:t.type==='cone'?<path d={`M${x-1.3} ${y+1.4}L${x} ${y-1.8}L${x+1.3} ${y+1.4}Z`} fill="#aa7011"/>:t.type==='goal'?<rect x={x===10?x-3:x} y={y} width="3" height={t.h} fill="none" stroke="#344e5e" strokeWidth="1"/>:<line x1={x} y1={y} x2={x+t.w} y2={y+t.h} stroke={t.type==='gate'?'#94680d':'#82988e'} strokeWidth={t.type==='gate'?1.4:.6} strokeDasharray={t.type==='line'?'2 2':undefined}/>} {t.label&&<text x={Math.min(103,x+2)} y={Math.max(7,y-2)} fontSize="3" fill="#5e4a16">{t.label.replaceAll('-',' ')}</text>}</g>;})}
    {arrows.map((a,i)=>{const [x,y]=point(a.from),[tx,ty]=point(a.to);return <g key={i}><line x1={x} y1={y} x2={tx} y2={ty} stroke={a.kind==='shot'?'#a02035':'#344e5e'} strokeWidth={a.kind==='shot'?1:.7} strokeDasharray={a.kind==='run'?'3 2':a.kind==='dribble'?'.8 1.5':undefined} markerEnd={`url(#${id}-${a.kind})`}/><text x={(x+tx)/2+1} y={(y+ty)/2-1} fontSize="3" fill="#263d49">{i+1}</text></g>;})}
    {players.map(p=><g key={p.id}><circle cx={p.x+10} cy={p.y+10} r="3.7" fill={color[p.team]} stroke="white" strokeWidth=".5"/><text x={p.x+10} y={p.y+11.2} textAnchor="middle" fontSize={p.id.length>2?2.5:3.2} fontWeight="700" fill="white">{p.id}</text>{balls.includes(p.id)&&<circle cx={p.x+14.6} cy={p.y+12.5} r="1.5" fill="white" stroke="#243745" strokeWidth=".6"/>}</g>)}
  </svg><figcaption>{caption}<span>Hel pil: pass · streckad: löpning · prickad: driva · röd: skott. Numren hjälper dig följa exemplet. Måtten står i organisationen; bilden är schematisk.</span></figcaption></figure>;
}

export default function ExerciseLibrary({canManage=false,trainings=[],teams=[],onAddToTraining}){
  const [targetTraining,setTargetTraining]=useState('');
  const [sport,setSport]=useState('all'),[phase,setPhase]=useState('all'),[category,setCategory]=useState('all'),[query,setQuery]=useState('');
  const [states,setStates]=useState([]),[archived,setArchived]=useState(false),[selected,setSelected]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(null);
  const dialog=useRef(null),heading=useRef(null),trigger=useRef(null);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{const result=await supabase.from('club_exercise_state').select('exercise_id,archived_at,version');if(result.error)throw result.error;setStates(result.data||[]);}catch(e){setError(`Bibliotekets sparade status kunde inte läsas: ${e.message}. Försök igen innan du ändrar något.`);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(pending)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[pending]);
  useEffect(()=>{if(selected)heading.current?.focus();},[selected]);
  const filtered=filterExercises({sport,phase,category,query,archived,states});
  const exercise=filtered.find(e=>e.id===selected);
  const removed=states.filter(s=>s.archived_at).length;
  async function save(){
    if(!pending||busy)return;
    setBusy(true);setError('');
    try{
      const {error:failure}=await supabase.rpc('club_set_exercise_archived',{p_id:pending.exercise.id,p_archived:pending.archive,p_expected_version:pending.version});
      if(failure)throw failure;
      setNotice(`${pending.exercise.title} ${pending.archive?'har tagits bort från biblioteket. Du kan återställa den under Borttagna.':'har återställts.'}`);
      setSelected(null);setPending(null);await load();
    }catch(e){setError(`Ändringen sparades inte: ${e.message}`);}finally{setBusy(false);}
  }
  function requestChange(e,event){trigger.current=event.currentTarget;const state=states.find(s=>s.exercise_id===e.id);if(!state){setError('Status saknas för övningen. Läs om biblioteket.');return;}setPending({exercise:e,archive:!state.archived_at,version:state.version});}
  function close(){if(busy)return;setPending(null);requestAnimationFrame(()=>trigger.current?.focus());}
  return <section className="exercise-library" aria-label="Övningsbibliotek">
    <div className="page-heading"><div><h2>Övningsbibliotek · {EXERCISE_LIBRARY.length} övningar</h2><p>Fotboll och futsal · FC Kindmarks Development Framework</p></div></div>
    <p>Originalförslag med övningsspecifika skisser. Källorna ger metodstöd; detta är inte federationernas officiella pass. Anpassa efter utvecklingsberedskap, inte enbart ålder. En tränare behöver bedöma grupp, underlag och belastning före användning.</p>
    <div className="exercise-filters"><label>Idrott<select value={sport} onChange={e=>{setSport(e.target.value);setSelected(null);}}><option value="all">Alla</option><option value="football">Fotboll (inkl. gemensamma)</option><option value="futsal">Futsal (inkl. gemensamma)</option></select></label><label>Utvecklingsfas<select value={phase} onChange={e=>{setPhase(e.target.value);setSelected(null);}}><option value="all">Alla faser</option>{Object.entries(FRAMEWORK_REFERENCES).map(([key,f])=><option key={key} value={key}>{f.phase}</option>)}</select></label><label>Fokus<select value={category} onChange={e=>{setCategory(e.target.value);setSelected(null);}}><option value="all">Alla fokus</option>{[...new Set(EXERCISE_LIBRARY.map(e=>e.category))].map(c=><option key={c}>{c}</option>)}</select></label><label>Sök övning<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}} placeholder="Namn, nummer eller träningsmål"/></label></div>
    <div className="button-group" role="group" aria-label="Biblioteksstatus"><Button variant={!archived?'primary':'secondary'} aria-pressed={!archived} onClick={()=>{setArchived(false);setSelected(null);}}>Aktiva ({EXERCISE_LIBRARY.length-removed})</Button>{canManage&&<Button variant={archived?'primary':'secondary'} aria-pressed={archived} onClick={()=>{setArchived(true);setSelected(null);}}>Borttagna ({removed})</Button>}<Button variant="secondary" disabled={loading||busy} onClick={load}>Läs om</Button></div>
    {loading&&<p role="status">Läser sparad biblioteksstatus…</p>}{error&&<p role="alert" className="error-banner">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {!loading&&!error&&(!exercise?<><p>{filtered.length} övningar i urvalet.</p><div className="development-catalog">{filtered.map(e=><button type="button" key={e.id} onClick={()=>setSelected(e.id)}><strong>{e.title}</strong><span>{e.id} · {FRAMEWORK_REFERENCES[e.framework].phase} · {e.category}</span></button>)}</div>{!filtered.length&&<p>Inga övningar matchar. Ändra filtren eller sökningen.</p>}</>:<>
      <Button variant="secondary" onClick={()=>setSelected(null)}>← Tillbaka till övningarna</Button>
      <Card className="development-block"><h3 ref={heading} tabIndex={-1}>{exercise.title}</h3><p>{exercise.id} · {exercise.sport==='both'?'Fotboll och futsal':exercise.sport==='futsal'?'Futsal':'Fotboll'} · {FRAMEWORK_REFERENCES[exercise.framework].phase}</p>
      <div className="development-layout"><div><ExerciseDiagram exercise={exercise}/><h4>Organisation</h4><p>{exercise.organisation}</p><h4>Utrustning</h4><p>{exercise.equipment}</p><h4>Tid</h4><p>{exercise.timing}</p></div><div><h4>Genomförande</h4><ol>{exercise.steps.map(s=><li key={s}>{s}</li>)}</ol><h4>Återstart</h4><p>{exercise.restart}</p><h4>Rotation</h4><p>{exercise.rotation}</p><h4>Observera och fråga</h4><p>{exercise.observe}</p><p>{exercise.question}</p><h4>Anpassning</h4><p><strong>Enklare:</strong> {exercise.easier}</p><p><strong>Svårare:</strong> {exercise.harder}</p></div></div>
      <details open><summary>Koppling till klubbens framework och källor</summary><p><strong>FC Kindmark Development Framework:</strong> {FRAMEWORK_REFERENCES[exercise.framework].section}</p><p>{FRAMEWORK_REFERENCES[exercise.framework].alignment}</p><p>{FRAMEWORK_REFERENCES[exercise.framework].adaptation}</p><p><a href={EXERCISE_SOURCES[exercise.source].url} target="_blank" rel="noreferrer">{EXERCISE_SOURCES[exercise.source].title}</a> · {EXERCISE_SOURCES[exercise.source].supports} Kontrollerad 12 oktober 2026. Uppställning och text är FC Kindmark-förslag, inte kopior av källans övning.</p></details>
      {canManage&&!archived&&onAddToTraining&&<div className="library-training-transfer"><h4>Lägg till i en bokad träning</h4>{trainings.length?<><label>Välj träning<select value={targetTraining} onChange={event=>setTargetTraining(event.target.value)}><option value="">Välj…</option>{[...trainings].sort((a,b)=>b.date.localeCompare(a.date)).map(t=><option key={t.id} value={t.id}>{t.date} · {t.time?.slice(0,5)} · {teams.find(team=>team.id===t.team_id)?.name||'Lag'} · {t.location}</option>)}</select></label><Button disabled={!targetTraining||busy} onClick={()=>onAddToTraining({trainingId:targetTraining,exerciseId:exercise.id})}>Lägg till i träningsplan</Button></>:<p>Skapa först en bokad träning under Träningar.</p>}</div>}
      {canManage&&<Button variant={archived?'secondary':'danger'} disabled={busy} onClick={event=>requestChange(exercise,event)}>{archived?'Återställ övning':'Ta bort övning'}</Button>}</Card>
    </>)}
    <dialog ref={dialog} className="exercise-confirm" aria-labelledby="exercise-confirm-title" onCancel={e=>{e.preventDefault();close();}}>{pending&&<><h3 id="exercise-confirm-title">{pending.archive?'Ta bort övningen?':'Återställ övningen?'}</h3><p><strong>{pending.exercise.title}</strong> · {pending.exercise.id}</p><p>{pending.archive?'Övningen döljs i biblioteket för alla administratörer. Den kan återställas. Befintliga kompletta pass och bokade träningar bevaras.':'Övningen blir synlig i biblioteket igen.'}</p><div className="button-group"><Button variant="secondary" disabled={busy} onClick={close} autoFocus>Avbryt</Button><Button variant={pending.archive?'danger':'primary'} disabled={busy} onClick={save}>{busy?'Sparar…':pending.archive?'Bekräfta borttagning':'Bekräfta återställning'}</Button></div>{error&&<p role="alert">{error}</p>}</>}</dialog>
  </section>;
}
