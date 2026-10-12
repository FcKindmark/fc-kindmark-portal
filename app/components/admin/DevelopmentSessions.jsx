"use client";
import { useId, useState } from "react";
import { CURATED_WEEKLY_SESSIONS } from "../../lib/curatedWeeklySessions.mjs";

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
 const sessions=CURATED_WEEKLY_SESSIONS.filter(s=>s.sport===sport&&s.age===age);
 const selected=sessions.find(s=>s.id===selectedId);
 const chooseSport=v=>{setSport(v);setSelectedId(null);};
 const chooseAge=v=>{setAge(v);setSelectedId(null);};
 let elapsed=0;
 return <section className="development-program" aria-label="Kompletta träningspass">
  <div className="page-heading"><div><h1>FC Kindmark · Veckans träning</h1><p>Välj en tema – öppna hela passet från start till slut.</p></div></div>
  <p className="development-draft" role="note"><strong>Tränargranskning:</strong> Passen och organisationsbilderna är utkast och ska kvalitetssäkras före användning.</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
   {["football","futsal"].map(v=><button key={v} type="button" aria-pressed={sport===v} onClick={()=>chooseSport(v)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #aaa",background:sport===v?"#8a6618":"transparent",color:sport===v?"white":"inherit"}}>{v==="football"?"Fotboll":"Futsal"}</button>)}
   {["8–10","11–13","14–16"].map(v=><button key={v} type="button" aria-pressed={age===v} onClick={()=>chooseAge(v)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #aaa",background:age===v?"#8a6618":"transparent",color:age===v?"white":"inherit"}}>{v} år</button>)}
  </div>
  {!selected?<><h2>Välj ett komplett 75-minuterspass</h2><div className="development-catalog" role="group" aria-label="Välj träningspass">
   {sessions.map(s=><button key={s.id} type="button" onClick={()=>setSelectedId(s.id)}><strong>{s.title}</strong><span>75 minuter · 6 sammanhängande delar · illustrationer · öppna hela passet →</span></button>)}
  </div></>:<>
   <button type="button" onClick={()=>setSelectedId(null)} style={{padding:"10px 16px",marginBottom:14}}>← Till alla teman</button>
   <article className="development-summary"><h2>{selected.title}</h2><p><strong>Ålder:</strong> {selected.age} år · <strong>Tid:</strong> 75 min · <strong>Riktmärke:</strong> {selected.players} spelare</p>
    <p><strong>Mål:</strong> {selected.goal}</p><p><strong>Utrustning:</strong> {selected.equipment}</p>
    <p><strong>Tränarens förberedelse:</strong> {selected.coachPreparation}</p><p><strong>Röd tråd:</strong> {selected.principle}</p></article>
   <h2>Hela träningen · 0–75 minuter</h2>
   {selected.blocks.map((part,i)=>{const start=elapsed;elapsed+=part.minutes;return <article className="development-block" key={selected.id+"-"+i} style={{marginBottom:20,padding:16,border:"1px solid #c6c6c6",borderRadius:12}}>
    <header><p className="development-eyebrow">Del {i+1} av 6 · minut {start}–{elapsed} · {part.minutes} min</p><h3>{part.title}</h3></header>
    <div className="development-layout"><div><Illustration part={part} sport={selected.sport}/></div><div>
     <p><strong>Organisation:</strong> {part.organisation}</p>
     <ol>{part.steps.map((step,j)=><li key={j}>{step}</li>)}</ol>
     {part.variations?.length>0&&<><h4>Motståndarreaktioner · variationer</h4><ol>{part.variations.map((v,j)=><li key={j}><strong>{v.name}:</strong> {v.response}</li>)}</ol></>}
     <p><strong>Tränaren säger:</strong> {part.say}</p><p><strong>Observera:</strong> {part.observe}</p>
     <p><strong>Rotation:</strong> {part.rotation}</p><p><strong>Enklare:</strong> {part.easier} <strong>Svårare:</strong> {part.harder}</p>
    </div></div>
   </article>;})}
   <p><strong>Avslut:</strong> Passet är klart efter minut 75. Anpassa belastning, yta och motstånd efter spelarnas förutsättningar.</p>
  </>}
 </section>;
}
