"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Empty } from "./UI";

export function MemberCard({ card }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(card.member_number);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Markera och kopiera medlemsnumret nedan.");
    }
  }
  return <article className="member-card">
    <div className="member-card-brand"><img src="/logo.png" alt="FC Kindmark" width="54" height="64"/><div><strong>FC KINDMARK</strong><span>PERSONLIGT MEDLEMSKORT</span></div></div>
    <p className="member-card-name">{card.name}</p>
    <div className="member-card-number"><span>MEDLEMSNUMMER / RABATTKOD</span><strong>{card.member_number}</strong></div>
    <div className="member-card-footer"><span>{card.status === "active" ? "Aktivt medlemskort" : "Inaktivt medlemskort"}</span><span>Våga göra mer.</span></div>
    {card.status === "active" && <Button variant="primary" onClick={copyCode}>{copied ? "Koden kopierad" : "Kopiera rabattkod"}</Button>}
    {copyError && <p role="status">{copyError}</p>}
  </article>;
}

export default function MemberCards({ admin = false }) {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() {
    setLoading(true);
    const result = await supabase.from("club_member_cards").select("*").order("name");
    setError(result.error?.message || "");
    setCards(result.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  async function addCard(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const result = await supabase.from("club_member_cards").insert({name:name.trim()});
    setError(result.error?.message || "");
    if (!result.error) { setName(""); await load(); }
    setSaving(false);
  }
  async function toggle(card) {
    setSaving(true);
    const result = await supabase.from("club_member_cards").update({status:card.status === "active" ? "inactive" : "active"}).eq("id",card.id);
    setError(result.error?.message || "");
    if (!result.error) await load();
    setSaving(false);
  }
  const visible = cards.filter(c => `${c.name} ${c.member_number}`.toLocaleLowerCase("sv").includes(search.toLocaleLowerCase("sv")));
  return <section>
    <h2>Medlemskort</h2>
    <p>Visa ditt aktiva medlemskort hos klubbens anslutna partners. Rabatt och användning följer respektive partners villkor. Koden är ditt personliga medlemsnummer.</p>
    {admin && <><label htmlFor="member-card-search">Sök namn eller medlemsnummer</label><input id="member-card-search" value={search} onChange={e => setSearch(e.target.value)}/><form onSubmit={addCard} className="member-card-add"><label htmlFor="new-member-name">Ny medlem / stödmedlem</label><input id="new-member-name" required value={name} onChange={e => setName(e.target.value)}/><Button type="submit" variant="primary" disabled={saving}>Skapa medlemskort</Button></form><p>{visible.length} medlemskort</p></>}
    {error && <p className="error-banner" role="alert">{error}<button onClick={load}>Försök igen</button></p>}
    {loading ? <p role="status">Läser medlemskort…</p> : visible.length ? <div className="member-cards-grid">{visible.map(card => <div key={card.id}><MemberCard card={card}/>{admin && <Button variant="secondary" disabled={saving} onClick={() => toggle(card)}>{card.status === "active" ? "Inaktivera kort" : "Aktivera kort"}</Button>}</div>)}</div> : <Empty message="Inga medlemskort att visa"/>}
  </section>;
}
