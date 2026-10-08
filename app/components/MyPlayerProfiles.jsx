"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import PlayerProfile from "./PlayerProfile";
import {Button} from "./UI";
export default function MyPlayerProfiles({userId}){
 const [players,setPlayers]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;supabase.from('club_player_access').select('player_id,players(id,name,number,position)').eq('user_id',userId).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setPlayers((data||[]).map(r=>r.players).filter(Boolean));});return()=>{active=false;};},[userId]);
 if(!players.length&&!error)return null;
 return <section className="push-settings"><h3>Spelarprofiler</h3>{error&&<p role="alert">{error}</p>}<div className="button-group">{players.map(player=><Button key={player.id} variant="secondary" onClick={()=>setSelected(player)}>{player.name}</Button>)}</div>{selected&&<PlayerProfile key={selected.id} player={selected} onClose={()=>setSelected(null)}/>}</section>;
}
