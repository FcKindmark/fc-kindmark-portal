"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {Button} from "./UI";
export default function PlayerTeam(){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState("");
 async function load(){setBusy(true);setError("");try{const r=await supabase.rpc("club_my_team_roster");if(r.error)throw r.error;setRows(r.data||[]);}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 const positions={Forward:"Anfallare",Midfielder:"Mittfältare",Defender:"Försvarare",Goalkeeper:"Målvakt"};
 return <section><div className="page-heading"><h2>Mitt lag</h2><Button variant="secondary" disabled={busy} onClick={load}>Uppdatera</Button></div><p>Här ser du dina lagkamrater. Personliga kontaktuppgifter och mätningar visas bara i den egna profilen.</p>{error&&<p role="alert" className="error-banner">{error}</p>}{busy?<p role="status">Läser laget…</p>:!rows.length?<p>Du är inte lagfördelad ännu.</p>:<div className="member-admin-list">{rows.map((p,index)=><article className="member-admin-row" key={`${p.team_name}-${index}`}><strong>{p.name}</strong><span>{p.team_name}</span><span>{p.number==null?"Inget tröjnummer":`#${p.number}`}</span><span>{positions[p.position]||p.position||"Position ej angiven"}</span></article>)}</div>}</section>;
}
