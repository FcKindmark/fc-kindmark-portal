"use client";
import { useId, useState } from "react";
import { CURATED_WEEKLY_SESSIONS } from "../../lib/curatedWeeklySessions.mjs";
import { LARGE_TRAINING_BANK, TRAINING_CATEGORY_LABELS } from "../../lib/largeTrainingBank.mjs";
const ALL_SESSIONS = [...CURATED_WEEKLY_SESSIONS, ...LARGE_TRAINING_BANK];

const C={blue:"#21628b",red:"#b73242",gold:"#8a6618"};
function Illustration({part,sport}){
 const id=useId().replace(/:/g,"");
 const d=part.diagram;
 return <figure className="development-diagram" style={{margin:0}}>
  <svg viewBox="0 0 420 320" role="img" aria-labelledby={id+"-title"} style={{width:"100%",maxWidth:600}}>
   <title id={id+"-title"}>{d.caption}</title>
   <defs><marker id={id+"-arrow"} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#344e5e"/></marker></defs>
   <rect x="20" y="20" width="380" height="280" rx="8" fill={sport==="futsal"?"#e7f0f6":"#edf5e9"} stroke="#8fa9a0" strokeWidth="2"/>
   <path d="M210 20V300" stroke="#b4c9c3" strokeDasharray="5 5"/>
   {d.zones&&Array.from({length:d.zones-1},(_,i)=><path key={"zone"+i} d={`M${20+380*(i+1)/d.zones} 20V300`} stroke="#8fa9a0" strokeDasharray="5 5"/>)}
   {d.targetZone&&<rect x="360" y="20" width="40" height="280" fill="#d9ba54" opacity=".3"/>}
   {d.sidePorts&&[20,400].flatMap(x=>[65,225].map(y=><path key={x+"-"+y} d={`M${x} ${y}v40`} stroke="#a47a15" strokeWidth="6"/>))}
   {d.goals&&<path d="M400 125H415V195H400" fill="none" stroke="#344e5e" strokeWidth="3"/>}
   {d.paths.map((p,i)=><path key={i} d={p} fill="none" stroke="#344e5e" strokeWidth="2.5" strokeDasharray={d.kinds?.[i]==="run"?"7 6":d.kinds?.[i]==="dribble"?"2 5":undefined} markerEnd={`url(#${id}-arrow)`}/>)}
   {d.players.map(([x,y,label,color],i)=><g key={i}><circle cx={x} cy={y} r="17" fill={C[color]||C.gold}/><text x={x} y={y+5} textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{label}</text></g>)}
   {d.balls?.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke="#222" strokeWidth="2"/>)}
  </svg>
  <figcaption>{d.caption} Heldragen pil = passning, streckad = löpning, prickad = driva boll.</figcaption>
 </figure>;
}
export default function DevelopmentSessions(){
 const [sport,setSport]=useState("football");
 const [age,setAge]=useState("11–13");
 const [selectedId,setSelectedId]=useState(null);
 const [category,setCategory]=useState("");
 const [formation,setFormation]=useState("");
 const [query,setQuery]=useState("");
 const [page,setPage]=useState(0);
 const groupSessions=ALL_SESSIONS.filter(s=>s.sport===sport&&s.age===age);
 const formations=[...new Set(groupSessions.map(s=>s.formation).filter(Boolean))];
 const sessions=groupSessions.filter(s=>(!category||s.category===category)&&(!formation||s.formation===formation)&&[s.title,s.goal,s.formationNote||""].join(" ").toLocaleLowerCase("sv").includes(query.toLocaleLowerCase("sv")));
 const visibleSessions=sessions.slice(page*24,(page+1)*24);
 const selected=sessions.find(s=>s.id===selectedId);
 const chooseSport=v=>{setSport(v);setSelectedId(null);setFormation("");setPage(0);};
 const chooseAge=v=>{setAge(v);setSelectedId(null);setFormation("");setPage(0);};
 let elapsed=0;
 return <section className="development-program" aria-label="Kompletta träningspass">
  <div className="page-heading"><div><h1>FC Kindmark · Träningsbibliotek</h1><p>600 nya scenariovarianter · 100 per idrott och åldersgrupp · hela pass från start till slut.</p></div></div>
  <p className="development-draft" role="note"><strong>Tränargranskning:</strong> Passen och organisationsbilderna är utkast och ska kvalitetssäkras före användning.</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
   {["football","futsal"].map(v=><button key={v} type="button" aria-pressed={sport===v} onClick={()=>chooseSport(v)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #aaa",background:sport===v?"#8a6618":"transparent",color:sport===v?"white":"inherit"}}>{v==="football"?"Fotboll":"Futsal"}</button>)}
   {["8–10","11–13","14–16"].map(v=><button key={v} type="button" aria-pressed={age===v} onClick={()=>chooseAge(v)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #aaa",background:age===v?"#8a6618":"transparent",color:age===v?"white":"inherit"}}>{v} år</button>)}
  </div>
  {!selected&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
   <label>Sök tema<input aria-label="Sök träningspass" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Uppspel, tredje spelare, press…" style={{display:"block",padding:10}}/></label>
   <label>Kategori<select value={category} onChange={e=>{setCategory(e.target.value);setPage(0);}} style={{display:"block",padding:10}}><option value="">Alla kategorier</option>{Object.entries(TRAINING_CATEGORY_LABELS).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
   {formations.length>0&&<label>Formation som referens<select value={formation} onChange={e=>{setFormation(e.target.value);setPage(0);}} style={{display:"block",padding:10}}><option value="">Alla</option>{formations.map(v=><option key={v}>{v}</option>)}</select></label>}
  </div>}
  {!selected?<><h2>{sessions.length} kompletta 75-minuterspass · {groupSessions.length} i gruppen</h2><p>25 teman × 4 spelproblem ger 100 nya scenariovarianter per grupp. Tidigare 12 pass finns kvar. Ålder och sport är anpassningar; alla varianter behöver tränarens granskning före användning.</p><div className="development-catalog" role="group" aria-label="Välj träningspass">
   {visibleSessions.map(s=><button key={s.id} type="button" onClick={()=>setSelectedId(s.id)}><strong>{s.title}</strong><span>{s.category?TRAINING_CATEGORY_LABELS[s.category]:"Tidigare tema"} · 75 minuter · 6 delar · illustrationer →</span></button>)}
  </div>{!sessions.length&&<p>Inga pass matchar filtren. Ändra tema eller kategori.</p>}
   {sessions.length>24&&<nav aria-label="Bibliotekets sidor" style={{display:"flex",alignItems:"center",gap:12,marginTop:18}}><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Föregående</button><span>Sida {page+1} / {Math.ceil(sessions.length/24)}</span><button disabled={(page+1)*24>=sessions.length} onClick={()=>setPage(p=>p+1)}>Nästa →</button></nav>}
  </>:<>
   <button type="button" onClick={()=>setSelectedId(null)} style={{padding:"10px 16px",marginBottom:14}}>← Till alla teman</button>
   <article className="development-summary"><h2>{selected.title}</h2><p><strong>Ålder:</strong> {selected.age} år · <strong>Tid:</strong> 75 min · <strong>Riktmärke:</strong> {selected.players} spelare</p>
    <p><strong>Mål:</strong> {selected.goal}</p><p><strong>Utrustning:</strong> {selected.equipment}</p>
    <p><strong>Tränarens förberedelse:</strong> {selected.coachPreparation}</p><p><strong>Röd tråd:</strong> {selected.principle}</p>{selected.formationNote&&<p><strong>Formation:</strong> {selected.formationNote}</p>}{selected.repeat&&<p><strong>Progression:</strong> {selected.repeat}</p>}{selected.assessment&&<p><strong>Utvärdera:</strong> {selected.assessment}</p>}</article>
   <h2>Hela träningen · 0–75 minuter</h2>
   {selected.blocks.map((part,i)=>{const start=elapsed;elapsed+=part.minutes;return <article className="development-block" key={selected.id+"-"+i} style={{marginBottom:20,padding:16,border:"1px solid #c6c6c6",borderRadius:12}}>
    <header><p className="development-eyebrow">Del {i+1} av 6 · minut {start}–{elapsed} · {part.minutes} min</p><h3>{part.title}</h3></header>
    <div className="development-layout"><div><Illustration part={part} sport={selected.sport}/></div><div>
     <p><strong>Organisation:</strong> {part.organisation}</p><p><strong>Arbete och vila:</strong> {part.timing}</p>
     <ol>{part.steps.map((step,j)=><li key={j}>{step}</li>)}</ol>
     {part.variations?.length>0&&<><h4>Motståndarreaktioner · variationer</h4><ol>{part.variations.map((v,j)=><li key={j}><strong>{v.name}:</strong> {v.response}</li>)}</ol></>}
     <p><strong>Tränaren säger:</strong> {part.say}</p><p><strong>Observera:</strong> {part.observe}</p>
     <p><strong>Omstart:</strong> {part.restart}</p><p><strong>Rotation:</strong> {part.rotation}</p><p><strong>Enklare:</strong> {part.easier} <strong>Svårare:</strong> {part.harder}</p>
    </div></div>
   </article>;})}
   <p><strong>Avslut:</strong> Passet är klart efter minut 75. Anpassa belastning, yta och motstånd efter spelarnas förutsättningar.</p>
  </>}
 </section>;
}
