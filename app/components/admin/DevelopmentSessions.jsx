"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Card } from "../UI";
import { DEVELOPMENT_AGES, DEVELOPMENT_SESSIONS } from "../../lib/developmentSessions.mjs";

const colors = { blue: "#21628b", red: "#b73242", gold: "#8a6618" };

function SessionDiagram({ diagram, title, sport, organisation }) {
  const id = useId().replace(/:/g, "");
  const size=organisation.match(/\d+\s*×\s*\d+\s*m/)?.[0];
  return <figure className="development-diagram">
    <svg viewBox="0 0 420 320" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{diagram.caption}</desc>
      <defs><marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#344e5e"/></marker></defs>
      <rect x="20" y="20" width="380" height="280" rx="8" fill={sport==='futsal'?'#e7f0f6':'#edf5e9'} stroke="#8fa9a0" strokeWidth="2"/>
      <text x="210" y="15" textAnchor="middle" fontSize="11" fill="#344e5e">{sport==='futsal'?'HALL':'GRÄS'}{size?` · ${size}`:''}</text>
      {diagram.targetZone && <><rect x="360" y="20" width="40" height="280" fill="#f2d878" opacity=".45"/><path d="M360 20V300" stroke="#8a6618" strokeDasharray="5 5"/></>}
      {diagram.goals && <><path d={diagram.goalSide==='left'?"M20 125H5V195H20":diagram.goalSide==='right'?"M400 125H415V195H400":"M20 125H5V195H20M400 125H415V195H400"} fill="none" stroke="#344e5e" strokeWidth="3"/>{!diagram.goalSide && <path d="M210 20V300" stroke="#b2c6bd"/>}</>}
      {diagram.sidePorts && [20,300].flatMap(y=>[80,280].map(x=><g key={`${x}-${y}`}><path d={`M${x} ${y}H${x+50}`} stroke="#c09422" strokeWidth="5"/>{[x,x+50].map(c=><circle key={c} cx={c} cy={y} r="5" fill="#c09422"/>)}</g>))}
      {diagram.gates && [80,240].map(y=><g key={y}><path d={`M330 ${y-28}V${y+28}`} stroke="#8a6618" strokeDasharray="4 5"/>{[y-28,y+28].map(c=><path key={c} d={`M324 ${c+6}L330 ${c-7}L336 ${c+6}Z`} fill="#d7a331"/>)}</g>)}
      {diagram.paths.map((d,i)=><path key={d} d={d} fill="none" stroke="#344e5e" strokeWidth="2.5" strokeDasharray={diagram.kinds?.[i]==="run"?"7 6":diagram.kinds?.[i]==="dribble"?"2 4":undefined} markerEnd={`url(#${id}-arrow)`}/>)}
      {diagram.players.map(([x,y,label,color],i)=><g key={i}><circle cx={x} cy={y} r="18" fill={colors[color]}/><text x={x} y={y+5} textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{label}</text></g>)}
      {diagram.balls?.map(([x,y],i)=><g key={`ball-${i}`}><circle cx={x} cy={y} r="6" fill="white" stroke="#243745" strokeWidth="1.5"/><circle cx={x} cy={y} r="2" fill="#243745"/></g>)}
    </svg>
    <figcaption>{diagram.caption}<span>Hel pil: passning · Streckad: löpning · Prickad: driva boll. Bilden är schematisk; måtten står i organisationen.</span></figcaption>
  </figure>;
}


// Diagrams reused by multiple exercises are deliberately not displayed.
// A tactical illustration must be unique to its actual exercise.
const diagramCounts = new Map();
for (const session of DEVELOPMENT_SESSIONS) {
  for (const part of session.blocks) {
    const diagram = part.diagram;
    if (!diagram) continue;
    const signature = JSON.stringify({
      players: diagram.players, paths: diagram.paths, kinds: diagram.kinds,
      goals: diagram.goals, gates: diagram.gates, sidePorts: diagram.sidePorts,
      targetZone: diagram.targetZone, goalSide: diagram.goalSide
    });
    diagramCounts.set(signature, (diagramCounts.get(signature) || 0) + 1);
  }
}
function uniqueDiagram(part) {
  if (!part.diagram) return false;
  const d = part.diagram;
  const signature = JSON.stringify({
    players:d.players,paths:d.paths,kinds:d.kinds,goals:d.goals,gates:d.gates,
    sidePorts:d.sidePorts,targetZone:d.targetZone,goalSide:d.goalSide
  });
  return diagramCounts.get(signature) === 1;
}

export default function DevelopmentSessions() {
  const [sport,setSport] = useState("futsal");
  const [age,setAge] = useState("8–10");
  const [selectedId,setSelectedId] = useState(null);
  const [library,setLibrary] = useState("development");
  const [activePart,setActivePart] = useState(0);
  const sessionHeading = useRef(null);
  const catalogHeading = useRef(null);
  const sessions = DEVELOPMENT_SESSIONS.filter(s=>s.sport===sport && (library==="tactics" ? (s.id.includes("-formation-") || s.id.includes("-situation-") || s.id.includes("-zone-") || s.id.includes("-role-problem-") || s.id.includes("-phase-") || s.id.includes("-advanced-") || s.id.includes("-focused-")) : s.age===age && !s.id.includes("-formation-") && !s.id.includes("-situation-") && !s.id.includes("-zone-") && !s.id.includes("-role-problem-") && !s.id.includes("-phase-") && !s.id.includes("-advanced-") && !s.id.includes("-focused-")));
  const session = sessions.find(s=>s.id===selectedId);
  function chooseSport(value){setSport(value);setSelectedId(null);setActivePart(0);}
  function chooseAge(value){setAge(value);setSelectedId(null);setActivePart(0);}
  useEffect(()=>{
    if(selectedId) sessionHeading.current?.focus();
  },[selectedId]);
  function backToSessions(){
    setSelectedId(null);
    requestAnimationFrame(()=>catalogHeading.current?.focus());
  }

  return <section className="development-program" aria-label="Träningsprogram">
    <div className="page-heading"><div><h1>Träningsprogram</h1><p>FC Kindmark · kompletta utvecklingspass</p></div></div>
    <p className="development-draft" role="note"><strong>Adminförhandsvisning · {DEVELOPMENT_SESSIONS.length} kompletta pass</strong> Utkast för granskning, inte publicerade för tränarna och inte bokade träningar. Innehållet måste godkännas av klubben innan användning. Välj ett helt pass; övningarna blandas inte fritt.</p>
    <div className="development-filters"><div role="group" aria-label="Bibliotek"><Button variant={library==="development"?"primary":"secondary"} aria-pressed={library==="development"} onClick={()=>{setLibrary("development");setSelectedId(null);}}>Utvecklingspass</Button><Button variant={library==="tactics"?"primary":"secondary"} aria-pressed={library==="tactics"} onClick={()=>{setLibrary("tactics");setSelectedId(null);}}>Taktikbibliotek · formationer</Button></div>
      <div role="group" aria-label="Idrott">{[["futsal","Futsal"],["football","Fotboll"]].map(([value,label])=><Button key={value} variant={sport===value?"primary":"secondary"} aria-pressed={sport===value} onClick={()=>chooseSport(value)}>{label}</Button>)}</div>
      {library==="development" && <div role="group" aria-label="Åldersgrupp">{DEVELOPMENT_AGES.map(value=><Button key={value} variant={age===value?"primary":"secondary"} aria-pressed={age===value} onClick={()=>chooseAge(value)}>{value} år</Button>)}</div>}
    </div>
    {!session ? <>
      <h2 ref={catalogHeading} tabIndex={-1}>{sport==='futsal'?'Futsal':'Fotboll'} · {library==="tactics"?"Taktikbibliotek":`${age} år`} · {sessions.length} pass</h2>
      {library==="tactics" && <p><strong>FC Kindmark-metoden:</strong> Formationer är lärmiljöer, inte mönster att memorera. Träna scanning, egna beslut, rörelse utan boll, press och omställning med varierade motståndare. Systemträning är avsedd för utvecklingsfasen från 13 år; yngre barn prioriterar boll, rörelse och enkla val. Bilderna är schematiska utkast för tränargranskning.</p>}<p>Välj namnet på ett pass för att öppna hela sessionen med alla övningar och instruktioner.</p>
      <div className="development-catalog" role="group" aria-label="Välj ett komplett pass">{sessions.map((s,i)=><button type="button" key={s.id} onClick={()=>{setSelectedId(s.id);setActivePart(0);}}><strong>{s.title}</strong><span>Pass {i+1} · {s.minutes} min · {s.players} spelare · Öppna hela passet →</span></button>)}</div>
      {!sessions.length && <Card><p>Inga pass finns i den här gruppen ännu.</p></Card>}
    </> : <>
      <Button variant="secondary" onClick={backToSessions}>← Tillbaka till alla pass</Button>
      <Card className="development-summary">
        <p className="development-eyebrow">{session.sport==='futsal'?'Futsal':'Fotboll'} · {session.age} år · {session.minutes} min · {session.players} spelare · Utkast v{session.version}</p>
        <h2 ref={sessionHeading} tabIndex={-1}>{session.title}</h2><p><strong>Utvecklingsmål:</strong> {session.goal}</p>
        <p><strong>Förbered:</strong> {session.equipment}</p>
        {session.id.includes("-focused-") && <div className="development-weekly-prep" role="note" style={{padding:"12px",border:"1px solid #c9b77c",borderRadius:"10px",margin:"12px 0"}}>
          <strong>Veckans tränarförberedelse · 75 minuter</strong>
          <p>Före träningen: läs alla fem övningar i ordning, kontrollera antal spelare och målvakter, markera startytan och förbered bollar/västar/mål. Gå igenom de fem motståndarreaktionerna i varje övning. Varje övning tar 15 minuter: 3 min organisation, 2 min grundmönster, 5 min reaktioner och 5 min aktivt spel.</p>
          <p>Under passet: observera först, skapa ett problem, låt spelarna lösa det och anpassa svårigheten. Ritningarna är schematiska och måste granskas före användning.</p>
        </div>}<p><strong>Tränarens fokus:</strong> {session.principle}</p>
        <p className="development-ball-focus"><strong>Bolltid:</strong> {session.ballPriority}</p>
        {session.repeat && <p><strong>Utveckling över tid:</strong> {session.repeat}</p>}
        <p>Åldern hjälper dig att hitta passet. Anpassa till barnens erfarenhet, trygghet och dagsform. Avbryt vid smärta eller osäker miljö. Kontrollera yta, mål och underlag före start.</p>
      </Card>
      <h2>Hela passet — följ ordningen nedan</h2>
      {library==="tactics" && <nav aria-label="Övningar i passet" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{session.blocks.map((part,i)=><Button key={i} variant={activePart===i?"primary":"secondary"} aria-pressed={activePart===i} onClick={()=>setActivePart(i)}>Övning {i+1} · {part.minutes} min</Button>)}</nav>}
      {session.blocks.map((part,index)=>{
        if(library==="tactics" && index!==activePart)return null;
        const elapsed=session.blocks.slice(0,index).reduce((sum,b)=>sum+b.minutes,0);
        return <Card className="development-block" key={`${session.id}-${index}`}>
        <header><p className="development-eyebrow">Del {index+1} av {session.blocks.length} · minut {elapsed}–{elapsed+part.minutes}</p><h2>{part.title}</h2><p>{part.timing}</p></header>
        <div className="development-layout">
          <div>{session.id === "futsal-8-10-space-01" && index === 0 && <svg viewBox="0 0 420 260" role="img" aria-label="Tolv spelare med varsin boll utspridda på träningsytan" style={{width:"100%",maxWidth:560,background:"#e8f3ee",borderRadius:12}}><rect x="15" y="15" width="390" height="230" fill="none" stroke="#376957" strokeWidth="3"/>{Array.from({length:12},(_,i)=>{const x=65+(i%4)*95,y=55+Math.floor(i/4)*72;return <g key={i}><circle cx={x} cy={y} r="14" fill="#21628b" stroke="#fff" strokeWidth="2"/><text x={x} y={y+4} fill="#fff" fontSize="11" textAnchor="middle">{i+1}</text><circle cx={x+20} cy={y+12} r="6" fill="#fff" stroke="#222" strokeWidth="2"/></g>})}</svg>}{session.id === "futsal-8-10-space-01" && index === 1 && <svg viewBox="0 0 420 260" role="img" aria-label="Ett av sex par: A passar till B och flyttar sedan åt sidan" style={{width:"100%",maxWidth:560,background:"#e8f3ee",borderRadius:12}}><rect x="15" y="15" width="390" height="230" fill="none" stroke="#376957" strokeWidth="3"/><path d="M110 125L295 125" stroke="#1e3444" strokeWidth="3"/><path d="M285 117L298 125L285 133" fill="none" stroke="#1e3444" strokeWidth="3"/><path d="M95 146L95 205" stroke="#1e3444" strokeDasharray="7 5" strokeWidth="3"/>{[[95,125,"A"],[315,125,"B"]].map(([x,y,n])=><g key={n}><circle cx={x} cy={y} r="17" fill="#21628b"/><text x={x} y={y+5} textAnchor="middle" fill="#fff" fontSize="15">{n}</text></g>)}<circle cx="120" cy="125" r="7" fill="#fff" stroke="#222" strokeWidth="2"/><text x="210" y="225" textAnchor="middle" fontSize="13" fill="#172f3b">1 av 6 par · hel linje pass · streckad löpning</text></svg>}{session.id === "futsal-8-10-space-01" && index === 2 && <SessionDiagram diagram={part.diagram} title={part.title} sport={session.sport} organisation={part.organisation}/>} {session.id === "futsal-8-10-space-01" && index === 3 && <SessionDiagram diagram={part.diagram} title={part.title} sport={session.sport} organisation={part.organisation}/>} {(session.id.includes("-situation-") || session.id.includes("-zone-") || session.id.includes("-role-problem-") || session.id.includes("-phase-") || session.id.includes("-advanced-") || session.id.includes("-focused-") || uniqueDiagram(part)) && !(session.id === "futsal-8-10-space-01" && index < 4) && <SessionDiagram diagram={part.diagram} title={part.title} sport={session.sport} organisation={part.organisation}/>} {!(session.id === "futsal-8-10-space-01" && index < 4) && !session.id.includes("-situation-") && !session.id.includes("-zone-") && !session.id.includes("-role-problem-") && !session.id.includes("-phase-") && !session.id.includes("-advanced-") && !session.id.includes("-focused-") && !uniqueDiagram(part) && <p className="development-source">Ingen unik och granskad taktikbild finns ännu för denna övning. Följ organisationen och instruktionerna; återanvända skisser visas inte.</p>}<h3>Ställ upp så här</h3><p>{part.organisation}</p><h3>Säg till spelarna</h3><blockquote>{part.say}</blockquote><h3>Titta efter</h3><p>{part.observe}</p></div>
          <div><h3>Gör i denna ordning</h3><ol className="development-steps">{part.steps.map(step=><li key={step}>{step}</li>)}</ol><h3>När bollen går ut / aktionen tar slut</h3><p>{part.restart}</p><h3>Byt roller så här</h3><p>{part.rotation}</p><h3>Anpassa svårigheten — behåll samma mål</h3><p><strong>Enklare:</strong> {part.easier}</p><p><strong>Svårare:</strong> {part.harder}</p></div>
        </div>
      </Card>;
      })}
      {library==="tactics" && <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:16,marginBottom:16}}><Button variant="secondary" disabled={activePart===0} onClick={()=>setActivePart(p=>Math.max(0,p-1))}>← Föregående övning</Button><Button variant="primary" disabled={activePart===session.blocks.length-1} onClick={()=>setActivePart(p=>Math.min(session.blocks.length-1,p+1))}>Nästa övning →</Button></div>}
      <Button variant="secondary" onClick={backToSessions}>← Tillbaka till alla pass</Button>
      <p className="development-source">Originalförslag för FC Kindmark, utifrån klubbens Development Framework. Inte officiella pass från någon federation. Fast ordning: öppna delarna för att läsa, inte för att byta eller blanda övningar.</p>
      <details className="development-source"><summary>Metodstöd och källor</summary><p>Klubbens ramverk styr innehållet. Dessa primärkällor används som metodstöd för spelbaserat lärande, åldersanpassning och tränarkommunikation — inte som påstående att våra pass är deras officiella program.</p><ul>
        <li><a href="https://www.fifatrainingcentre.com/en/environment/interviews/coaching-perspectives/david-gordo-on-spains-playing-style.php" target="_blank" rel="noreferrer">Spanien: David Gordo · FIFA Training Centre</a></li>
        <li><a href="https://www.knvb.nl/assist-trainers/ontwikkel-je-vereniging/jeugdvoetbalbeleidsplan/de-inhoud-voetballen/het-geven-van-training" target="_blank" rel="noreferrer">Nederländerna: KNVB · träningens innehåll</a></li>
        <li><a href="https://www.fff.fr/5-les-entraineurs-et-entraineures/index.html" target="_blank" rel="noreferrer">Frankrike: FFF · GIFE för barnfotboll</a></li>
        <li><a href="https://www.figc.it/it/giovani/sviluppo-evolution-programme/evolution-programme/evolution-programme/SGS-library" target="_blank" rel="noreferrer">Italien: FIGC · Evolution Programme</a></li>
        <li><a href="https://www.fifatrainingcentre.com/en/practice/futsal.php" target="_blank" rel="noreferrer">FIFA · futsalutbildning</a></li>
      </ul></details>
    </>}
  </section>;
}
