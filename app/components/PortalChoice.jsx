"use client";
import {Card,Button} from "./UI";
export default function PortalChoice({onSelect,onLogout}) {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}><Card style={{width:"100%",maxWidth:620}}>
    <img src="/logo.png" width="64" height="76" alt="FC Kindmark"/>
    <p className="eyebrow">FC KINDMARK · MEDLEMSPORTAL</p><h1>Välj portal</h1>
    <p>Ditt konto har tränarbehörighet och stödmedlemskap. Välj hur du vill använda portalen.</p>
    <div className="form-grid">
      <section><h2>Tränare</h2><p>Hantera de lag som administratören har tilldelat dig.</p><Button onClick={()=>onSelect("coach")}>Öppna tränarportalen</Button></section>
      <section><h2>Förälder</h2><p>Se dina kopplade barn, aktiviteter, medlemskort och din stödmedlemsavgift på 150 SEK.</p><Button onClick={()=>onSelect("parent")}>Öppna föräldraportalen</Button></section>
    </div><Button variant="secondary" onClick={onLogout}>Logga ut</Button>
  </Card></main>;
}
