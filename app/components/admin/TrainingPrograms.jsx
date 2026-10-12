"use client";
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {Button} from '../UI';
const ExerciseLibrary=dynamic(()=>import('./ExerciseLibrary'),{loading:()=> <p role="status">Läser bibliotek…</p>});
const DevelopmentSessions=dynamic(()=>import('./DevelopmentSessions'),{loading:()=> <p role="status">Läser pass…</p>});
export default function TrainingPrograms({data,onAddToTraining}){
 const [view,setView]=useState('exercises');
 return <><h2>Träningsprogram</h2><div className="training-period-tabs" role="group" aria-label="Träningsprogram"><Button aria-pressed={view==='exercises'} variant={view==='exercises'?'primary':'secondary'} onClick={()=>setView('exercises')}>Övningsbibliotek · 200</Button><Button aria-pressed={view==='sessions'} variant={view==='sessions'?'primary':'secondary'} onClick={()=>setView('sessions')}>Kompletta pass</Button></div>{view==='exercises'?<ExerciseLibrary canManage trainings={data?.trainings||[]} teams={data?.teams||[]} onAddToTraining={onAddToTraining}/>:<DevelopmentSessions/>}</>;
}
