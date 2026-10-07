"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Empty } from "./UI";
import { downloadMemberCodes } from "../lib/memberExport";

export function MemberCard({ card }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(card.member_number);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Markera och kopiera rabattkoden nedan.");
    }
  }
  return <article className="member-card">
    <div className="member-card-brand"><img src="/logo.png" alt="FC Kindmark" width="54" height="64"/><div><strong>FC KINDMARK</strong><span>PERSONLIGT MEDLEMSKORT</span></div></div>
    <p className="member-card-name">{card.name}</p>
    <div className="member-card-number"><span>MEDLEMSNUMMER</span><strong>{card.membership_no || "—"}</strong></div>
    <div className="member-card-number"><span>RABATTKOD</span><strong>{card.member_number}</strong></div>
    <div className="member-card-footer"><span>{card.status === "active" ? "Aktivt medlemskort" : "Inaktivt medlemskort"}</span><span>Våga göra mer.</span></div>
    {card.status === "active" && <Button variant="primary" onClick={copyCode}>{copied ? "Koden kopierad" : "Kopiera rabattkod"}</Button>}
    {copyError && <p role="status">{copyError}</p>}
  </article>;
}

export default function MemberCards({ admin = false, initialShowAdd = false, initialMembershipType = "supporter", onAddMember, onCloseAdd, onUpdate }) {
  const [showAdd,setShowAdd]=useState(initialShowAdd);
  function closeAdd(){setShowAdd(false);onCloseAdd?.();}
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [membershipType, setMembershipType] = useState(["new","full","supporter"].includes(initialMembershipType)?initialMembershipType:"supporter");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  async function load() {
    setLoading(true);
    const result = await supabase.from("club_member_cards").select("*").order("name");
    setError(result.error?.message || "");
    setCards(result.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); if (admin) supabase.from("profiles").select("id,email,full_name").order("email").then(r=>{if(r.error)setError(r.error.message);else setAccounts(r.data||[]);}); }, [admin]);
  async function addCard(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const result = await supabase.from("club_member_cards").insert({name:name.trim(),membership_type:membershipType==='supporter'?'supporter':'member',fee_plan:membershipType==='full'?'full':'new',user_id:accountId||null});
    setError(result.error?.message || "");
    if (!result.error) { setName(""); setAccountId(""); closeAdd(); await load(); if(onUpdate)await onUpdate(); }
    setSaving(false);
  }
  async function toggle(card) {
    setSaving(true);
    const result = await supabase.from("club_member_cards").update({status:card.status === "active" ? "inactive" : "active"}).eq("id",card.id);
    setError(result.error?.message || "");
    if (!result.error) await load();
    setSaving(false);
  }
  async function deleteCard(card){
    if(!confirm(`Ta bort medlemskortet för ${card.name} permanent? Rabattkoden och medlemskopplingen försvinner.`))return;
    setSaving(true);setError("");
    const result=await supabase.from("club_member_cards").delete().eq("id",card.id).select("id");
    if(result.error || !result.data?.length)setError(result.error?.message || "Kortet kunde inte tas bort.");else await load();
    setSaving(false);
  }
  async function changeCard(card, values) {
    setSaving(true);
    const result = await supabase.from("club_member_cards").update(values).eq("id",card.id).select("id");
    if (result.error || !result.data?.length) setError(result.error?.message || "Kortet kunde inte uppdateras.");
    else await load();
    setSaving(false);
  }
  const visible = cards.filter(c => `${c.name} ${c.membership_no || ""} ${c.member_number}`.toLocaleLowerCase("sv").includes(search.toLocaleLowerCase("sv")));
  return <section>
    <div className="page-heading"><h2>{admin ? "Medlemmar och medlemskort" : "Medlemskort"}</h2>{admin && <Button onClick={()=>onAddMember?onAddMember():setShowAdd(true)}>+ Lägg till medlem</Button>}</div>
    <p>Visa ditt aktiva medlemskort hos klubbens anslutna partners. Rabatt och användning följer respektive partners villkor. Ditt kort har ett kort medlemsnummer och en separat rabattkod.</p>
    {admin && <><label htmlFor="member-card-search">Sök namn eller medlemsnummer</label><input id="member-card-search" value={search} onChange={e => setSearch(e.target.value)}/>{showAdd && <form onSubmit={addCard} className="member-card-add"><label htmlFor="new-member-name">Medlemmens namn</label><input id="new-member-name" autoFocus required value={name} onChange={e => setName(e.target.value)}/><label htmlFor="new-member-type">Medlemstyp</label><select id="new-member-type" value={membershipType} onChange={e=>setMembershipType(e.target.value)}><option value="new">Ny medlem</option><option value="full">Full medlem</option><option value="supporter">Stödmedlem · 150 SEK</option></select><label htmlFor="new-member-account">Koppla till registrerat konto</label><select id="new-member-account" value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Koppla senare</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.full_name || a.email} · {a.email}</option>)}</select><Button type="submit" variant="primary" disabled={saving}>Spara medlem</Button><Button variant="secondary" disabled={saving} onClick={closeAdd}>Avbryt</Button></form>}<p>{visible.length} medlemskort</p><div className="match-actions"><Button disabled={loading} onClick={()=>downloadMemberCodes(cards,true)}>Exportera aktiva koder till LEGEA (CSV)</Button><Button variant="secondary" disabled={loading} onClick={()=>downloadMemberCodes(cards,false)}>Exportera alla kort (CSV)</Button></div><p className="muted">Exporten innehåller medlemsnummer, namn, medlemstyp och status. Den omfattar alla kort, oavsett sökfilter. Stödmedlemmen registrerar ett konto först; koppla sedan rätt konto till kortet för personlig portalåtkomst.</p></>}
    {error && <p className="error-banner" role="alert">{error}<button onClick={load}>Försök igen</button></p>}
    {loading ? <p role="status">Läser medlemskort…</p> : visible.length ? <div className="member-cards-grid">{visible.map(card => <div key={card.id}><MemberCard card={card}/>{admin && <div className="match-edit-form"><label htmlFor={`card-type-${card.id}`}>Medlemstyp</label><select id={`card-type-${card.id}`} disabled={saving} value={card.membership_type||"member"} onChange={e=>changeCard(card,{membership_type:e.target.value})}><option value="member">Medlem</option><option value="supporter">Stödmedlem</option></select><label htmlFor={`card-user-${card.id}`}>Personligt konto</label><select id={`card-user-${card.id}`} disabled={saving} value={card.user_id||""} onChange={e=>changeCard(card,{user_id:e.target.value||null})}><option value="">Ej kopplat</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.full_name || a.email} · {a.email}</option>)}</select><Button variant="secondary" disabled={saving} onClick={() => toggle(card)}>{card.status === "active" ? "Inaktivera kort" : "Aktivera kort"}</Button><Button variant="danger" disabled={saving} onClick={()=>deleteCard(card)}>Ta bort kort</Button></div>}</div>)}</div> : <Empty message="Inga medlemskort att visa"/>}
  </section>;
}
