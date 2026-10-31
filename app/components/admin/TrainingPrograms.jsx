"use client";
import {useState} from "react";
import dynamic from "next/dynamic";
import {Button} from "../UI";

const DevelopmentSessions=dynamic(()=>import("./DevelopmentSessions"),{loading:()=> <p role="status">Läser kompletta träningspass…</p>});
const ExerciseLibrary=dynamic(()=>import("./ExerciseLibrary"),{loading:()=> <p role="status">Läser övningsbiblioteket…</p>});

export default function TrainingPrograms({data={},onAddToTraining}){
 const [view,setView]=useState("sessions");
 return <section aria-label="Träningsprogram">
  <div className="button-group" role="group" aria-label="Välj träningsinnehåll" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
   <Button variant={view==="sessions"?"primary":"secondary"} aria-pressed={view==="sessions"} onClick={()=>setView("sessions")}>Kompletta träningspass</Button>
   <Button variant={view==="exercises"?"primary":"secondary"} aria-pressed={view==="exercises"} onClick={()=>setView("exercises")}>Övningsbibliotek · Bobek Library</Button>
  </div>
  {view==="sessions"?<DevelopmentSessions/>:<ExerciseLibrary canManage trainings={data.trainings||[]} teams={data.teams||[]} onAddToTraining={onAddToTraining}/>}
 </section>;
}
