"use client";
import {useEffect,useState} from 'react';
export default function InstallApp() {
  const [prompt,setPrompt]=useState(null),[installed,setInstalled]=useState(true),[open,setOpen]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    const standalone=window.matchMedia('(display-mode: standalone)');
    const update=()=>setInstalled(standalone.matches || Boolean(navigator.standalone));
    update();standalone.addEventListener('change',update);
    const available=e=>{e.preventDefault();setPrompt(e);};
    const done=()=>{setInstalled(true);setPrompt(null);setOpen(false);};
    window.addEventListener('beforeinstallprompt',available);
    window.addEventListener('appinstalled',done);
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
    return()=>{standalone.removeEventListener('change',update);window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',done);};
  },[]);
  async function install() {
    if(!prompt){setOpen(true);return;}
    try {
      await prompt.prompt();
      const result=await prompt.userChoice;
      setPrompt(null);
      if(result.outcome!=='accepted'){setMessage('Du kan installera senare via webbläsarens meny.');setOpen(true);}
    } catch {setPrompt(null);setOpen(true);}
  }
  if(installed) return null;
  return <><button className="install-app-button club-button secondary" onClick={install} aria-label="Installera FC Kindmark som app">＋ Installera app</button>{open&&<div className="club-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={()=>setOpen(false)}><section className="club-card" onClick={e=>e.stopPropagation()}><h2 id="install-title">FC Kindmark på din hemskärm</h2>{message&&<p role="status">{message}</p>}<p><strong>Windows / Chrome / Edge:</strong> Öppna webbläsarens meny och välj Installera FC Kindmark eller Appar → Installera den här webbplatsen som en app.</p><p><strong>iPhone / iPad:</strong> Öppna i Safari → Dela → Lägg till på hemskärmen.</p><p><strong>Mac / Safari:</strong> Arkiv → Lägg till i Dock.</p><p>Appen använder samma konto och uppgifter som portalen. Internet behövs för att läsa och spara klubbens uppgifter.</p><button autoFocus className="club-button primary" onClick={()=>setOpen(false)}>Stäng</button></section></div>}</>;
}
