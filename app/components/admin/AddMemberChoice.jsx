"use client";
import { useEffect, useRef } from "react";
import { Button } from "../UI";

const choices = [
  ["player", "Spelare", "Välj Ny medlem eller Medlem i spelarens formulär."],
  ["new", "Medlem", "Lägg till medlem utan spelarprofil och välj medlemskategori."],
  ["supporter", "Stödmedlem", "Medlemskort och medlemsavgift på 150 SEK."],
  ["coach", "Tränare", "Koppla ett registrerat konto till lag. Stödmedlemskap ingår."],
];

export default function AddMemberChoice({ onChoose, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="add-member-dialog" aria-labelledby="add-member-title" onCancel={onClose}>
    <div className="section-heading"><h2 id="add-member-title">Lägg till medlem</h2><Button variant="secondary" onClick={onClose}>Stäng</Button></div>
    <p>Välj vad du vill lägga till.</p>
    <div className="add-member-choices">{choices.map(([kind, label, description]) => <button type="button" key={kind} onClick={() => onChoose(kind)}><strong>{label}</strong><span>{description}</span></button>)}</div>
  </dialog>;
}
