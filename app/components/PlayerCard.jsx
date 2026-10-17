"use client";
const positions={Forward:"ANF",Midfielder:"MIT",Defender:"FÖR",Goalkeeper:"MV"};
export default function PlayerCard({player}){
 return <div className="kindo-card-wrap"><article className="kindo-player-card" aria-label={`Spelarkort för ${player.name}`}>
 <div className="kindo-card-texture" aria-hidden="true"/>
 <header className="kindo-card-top"><div><span className="kindo-card-number">{player.number??"—"}</span><span className="kindo-card-position">{positions[player.position]||"SPELARE"}</span></div><img src="/logo.png" alt="FC Kindmark"/></header>
 <div className="kindo-card-mascot"><img src="/icons/mascot.png" alt="Kindo, FC Kindmarks maskot"/></div>
 <div className="kindo-card-identity"><span className="kindo-card-club">FC KINDMARK</span><h3>{player.name}</h3><div className="kindo-card-rule"/><p>{player.birth_year?`FÖDD ${player.birth_year}`:"SPELARKORT"}</p><span className="kindo-card-motto">VÅGA GÖRA MER</span></div>
 </article></div>;
}
