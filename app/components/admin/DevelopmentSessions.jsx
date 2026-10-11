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

export default function DevelopmentSessions() {
  const [sport,setSport] = useState("futsal");
  const [age,setAge] = useState("8–10");
  const [selectedId,setSelectedId] = useState(null);
  const sessionHeading = useRef(null);
  const catalogHeading = useRef(null);
  const sessions = DEVELOPMENT_SESSIONS.filter(s=>s.sport===sport && s.age===age);
  const session = sessions.find(s=>s.id===selectedId);
  function chooseSport(value){setSport(value);setSelectedId(null);}
  function chooseAge(value){setAge(value);setSelectedId(null);}
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
    <div className="development-filters">
      <div role="group" aria-label="Idrott">{[["futsal","Futsal"],["football","Fotboll"]].map(([value,label])=><Button key={value} variant={sport===value?"primary":"secondary"} aria-pressed={sport===value} onClick={()=>chooseSport(value)}>{label}</Button>)}</div>
      <div role="group" aria-label="Åldersgrupp">{DEVELOPMENT_AGES.map(value=><Button key={value} variant={age===value?"primary":"secondary"} aria-pressed={age===value} onClick={()=>chooseAge(value)}>{value} år</Button>)}</div>
    </div>
    {!session ? <>
      <h2 ref={catalogHeading} tabIndex={-1}>{sport==='futsal'?'Futsal':'Fotboll'} · {age} år · {sessions.length} pass</h2>
      <p>Välj namnet på ett pass för att öppna hela sessionen med alla övningar och instruktioner.</p>
      <div className="development-catalog" role="group" aria-label="Välj ett komplett pass">{sessions.map((s,i)=><button type="button" key={s.id} onClick={()=>setSelectedId(s.id)}><strong>{s.title}</strong><span>Pass {i+1} · {s.minutes} min · {s.players} spelare · Öppna hela passet →</span></button>)}</div>
      {!sessions.length && <Card><p>Inga pass finns i den här gruppen ännu.</p></Card>}
    </> : <>
      <Button variant="secondary" onClick={backToSessions}>← Tillbaka till alla pass</Button>
      <Card className="development-summary">
        <p className="development-eyebrow">{session.sport==='futsal'?'Futsal':'Fotboll'} · {session.age} år · {session.minutes} min · {session.players} spelare · Utkast v{session.version}</p>
        <h2 ref={sessionHeading} tabIndex={-1}>{session.title}</h2><p><strong>Utvecklingsmål:</strong> {session.goal}</p>
        <p><strong>Förbered:</strong> {session.equipment}</p><p><strong>Tränarens fokus:</strong> {session.principle}</p>
        <p className="development-ball-focus"><strong>Bolltid:</strong> {session.ballPriority}</p>
        {session.repeat && <p><strong>Utveckling över tid:</strong> {session.repeat}</p>}
        <p>Åldern hjälper dig att hitta passet. Anpassa till barnens erfarenhet, trygghet och dagsform. Avbryt vid smärta eller osäker miljö. Kontrollera yta, mål och underlag före start.</p>
      </Card>
      <h2>Hela passet — följ ordningen nedan</h2>
      {session.blocks.map((part,index)=>{
        const elapsed=session.blocks.slice(0,index).reduce((sum,b)=>sum+b.minutes,0);
        return <Card className="development-block" key={`${session.id}-${index}`}>
        <header><p className="development-eyebrow">Del {index+1} av {session.blocks.length} · minut {elapsed}–{elapsed+part.minutes}</p><h2>{part.title}</h2><p>{part.timing}</p></header>
        <div className="development-layout">
          <div><h3>Ställ upp så här</h3><p>{part.organisation}</p><h3>Säg till spelarna</h3><blockquote>{part.say}</blockquote><h3>Titta efter</h3><p>{part.observe}</p></div>
          <div><h3>Gör i denna ordning</h3><ol className="development-steps">{part.steps.map(step=><li key={step}>{step}</li>)}</ol><h3>När bollen går ut / aktionen tar slut</h3><p>{part.restart}</p><h3>Byt roller så här</h3><p>{part.rotation}</p><h3>Anpassa svårigheten — behåll samma mål</h3><p><strong>Enklare:</strong> {part.easier}</p><p><strong>Svårare:</strong> {part.harder}</p></div>
        </div>
      </Card>;
      })}
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
