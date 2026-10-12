"use client";
import dynamic from "next/dynamic";
const DevelopmentSessions=dynamic(()=>import("./DevelopmentSessions"),{loading:()=> <p role="status">Läser kompletta träningspass…</p>});
export default function TrainingPrograms(){
 return <DevelopmentSessions/>;
}
