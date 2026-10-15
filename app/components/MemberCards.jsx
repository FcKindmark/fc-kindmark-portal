"use client";
import PersonAvatar from "./PersonAvatar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Empty } from "./UI";
import {inviteAccount} from "../lib/invitations";
import InviteAccountForm from "./admin/InviteAccountForm";
import PlayerAccount from "./admin/PlayerAccount";
import AdminPlayerProfile from "./admin/AdminPlayerProfile";
import MemberParentAccess from "./admin/MemberParentAccess";
import {canHavePlayerAccount,memberProfileKind,memberMatchesProfileFilter} from "../lib/memberProfiles.mjs";
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
    <p className="member-card-name person-name"><PersonAvatar playerId={card.player_id} profileId={card.user_id} name={card.name}/>{card.name}</p>
    <div className="member-card-number"><span>MEDLEMSNUMMER</span><strong>{card.membership_no || "—"}</strong></div>
    <div className="member-card-number"><span>RABATTKOD</span><strong>{card.member_number}</strong></div>
    <div className="member-card-footer"><span>{card.status === "active" ? "Aktivt medlemskort" : "Inaktivt medlemskort"}</span><span>Våga göra mer.</span></div>
    {card.status === "active" && <Button variant="primary" onClick={copyCode}>{copied ? "Koden kopierad" : "Kopiera rabattkod"}</Button>}
    {copyError && <p role="status">{copyError}</p>}
  </article>;
}

export default function MemberCards({ admin = false, adminData, onAddPlayer, initialSelectedPlayerId, initialShowAdd = false, initialMembershipType = "supporter", onCloseAdd, onUpdate }) {
  const [selectedId,setSelectedId]=useState(null);

  const roster=adminData?.players||[];
  const [showAdd,setShowAdd]=useState(initialShowAdd);
  function closeAdd(){setPendingCard(null);setParentChild("");setShowAdd(false);onCloseAdd?.();}
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [memberFilter,setMemberFilter]=useState(initialShowAdd&&initialMembershipType==='supporter'?'supporter':'all');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [membershipType, setMembershipType] = useState(["new","full","supporter","player"].includes(initialMembershipType)?initialMembershipType:"supporter");
  const [email,setEmail]=useState("");
  const [birthYear,setBirthYear]=useState("");
  const [pendingPlayer,setPendingPlayer]=useState(null);
  const [parentChild,setParentChild]=useState("");
  const [pendingCard,setPendingCard]=useState(null);
  const [notice,setNotice]=useState("");
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
  useEffect(() => { load(); if (admin) supabase.from("profiles").select("id,email,full_name,role").order("email").then(r=>{if(r.error)setError(r.error.message);else setAccounts(r.data||[]);}); }, [admin]);
  useEffect(()=>{if(initialSelectedPlayerId){const card=cards.find(c=>c.player_id===initialSelectedPlayerId);if(card)setSelectedId(card.id);}},[initialSelectedPlayerId,cards]);
  async function addCard(event) {
    event.preventDefault();
    if (!name.trim()) return;
    if(membershipType!=="player"&&parentChild&&!email.trim()&&!accountId){setError("Ange förälderns e-post eller välj ett registrerat konto.");return;}
    setSaving(true);
    setError("");setNotice("");
    let cardId=pendingCard;
    try {
      if(membershipType==="player"){
        let playerId=pendingPlayer;
        if(!playerId){const result=await supabase.from("players").insert({name:name.trim(),birth_year:birthYear?Number(birthYear):null,email:email.trim()||null,team_id:null,membership_category:"new"}).select("id").single();if(result.error)throw result.error;playerId=result.data.id;setPendingPlayer(playerId);}
        await load();await onUpdate?.();setShowAdd(false);setSelectedId(null);setNotice("Spelaren är sparad. Öppna Hantera för personuppgifter och Bjud in. Lag och mätningar finns under Spelare.");setPendingPlayer(null);setName("");setEmail("");setBirthYear("");setSaving(false);onCloseAdd?.();return;
      }
      if(!cardId){
        const result=await supabase.from("club_member_cards").insert({name:name.trim(),membership_type:membershipType==='supporter'?'supporter':'member',fee_plan:membershipType==='full'?'full':'new',user_id:accountId||null}).select("id").single();
        if(result.error)throw result.error;
        cardId=result.data.id;setPendingCard(cardId);
      }
      if(email.trim()){
        const invited=await inviteAccount({email,kind:parentChild?"parent":"member",player_id:parentChild||undefined,card_id:cardId,name:name.trim(),resend:true});
        setNotice(invited.message);
      }
      if(parentChild&&accountId){const r=await supabase.rpc("club_link_parent_member",{target:accountId,child:parentChild,member_card_id:cardId});if(r.error)throw r.error;}
      setParentChild("");setPendingCard(null);setName("");setEmail("");setAccountId("");closeAdd();await load();if(onUpdate)await onUpdate();
    }catch(error){await load();setError(cardId?`Medlemskortet är sparat, men kontot kunde inte kopplas: ${error.message}`:error.message);}
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
  const selected=cards.find(card=>card.id===selectedId);
  const visible = cards.filter(c => (!admin || memberMatchesProfileFilter(c,memberFilter)) && `${c.name} ${c.membership_no || ""} ${c.member_number}`.toLocaleLowerCase("sv").includes(search.toLocaleLowerCase("sv")));
  return <section>
    <div className="page-heading"><h2>{admin ? "Medlemmar och medlemskort" : "Medlemskort"}</h2></div>
    {admin&&<><div className="button-group" role="group" aria-label="Visa medlemsprofil">{[['all','Alla medlemmar'],['player','Spelare'],['member','Medlem'],['supporter','Stödmedlemmar']].map(([value,label])=><Button key={value} variant={memberFilter===value?'primary':'secondary'} aria-pressed={memberFilter===value} onClick={()=>{setMemberFilter(value);setSelectedId(null);}}>{label} ({cards.filter(c=>memberMatchesProfileFilter(c,value)).length})</Button>)}</div><p className="muted">Spelare är också medlemmar. Spelarprofil och egen inloggning hanteras via spelarens medlemskort. Eget spelarkonto: född 2012 eller tidigare.</p><div className="button-group"><Button onClick={()=>{setMembershipType("new");setShowAdd(true);}}>+ Lägg till medlem</Button></div></>}
    {!admin && <p>Visa ditt aktiva medlemskort hos klubbens anslutna partners. Rabatt och användning följer respektive partners villkor. Ditt kort har ett kort medlemsnummer och en separat rabattkod.</p>}
    {admin && <><label htmlFor="member-card-search">Sök namn eller medlemsnummer</label><input id="member-card-search" value={search} onChange={e => setSearch(e.target.value)}/>{showAdd && <form onSubmit={addCard} className="member-card-add"><label htmlFor="new-member-name">Medlemmens namn</label><input id="new-member-name" disabled={Boolean(pendingCard)||saving} autoFocus required value={name} onChange={e => setName(e.target.value)}/><label htmlFor="new-member-email">E-post · för spelare används egen adress</label><input id="new-member-email" type="email" disabled={membershipType!=="player"&&Boolean(accountId)} value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="new-member-type">Medlemstyp</label><select id="new-member-type" disabled={Boolean(pendingCard)||saving} value={membershipType} onChange={e=>setMembershipType(e.target.value)}><option value="new">Medlem</option><option value="supporter">Stödmedlem · 150 SEK</option><option value="player">Spelare</option></select>{membershipType==="player"&&<label className="field">Födelseår<input type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={e=>setBirthYear(e.target.value)}/></label>}{membershipType!=="player"&&<><label htmlFor="new-member-account">Koppla till registrerat konto</label><select id="new-member-account" disabled={Boolean(email)||Boolean(pendingCard)} value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Koppla senare</option>{accounts.filter(a=>a.role!=="player").map(a=><option key={a.id} value={a.id}>{a.full_name || a.email} · {a.email}</option>)}</select><label className="field">Förälder till (valfritt)<select disabled={saving} value={parentChild} onChange={e=>setParentChild(e.target.value)}><option value="">Inget barn kopplat</option>{roster.map(p=><option key={p.id} value={p.id}>{p.name}{p.birth_year?` · ${p.birth_year}`:""}</option>)}</select></label></>}<Button type="submit" variant="primary" disabled={saving}>Spara medlem</Button><Button variant="secondary" disabled={saving} onClick={closeAdd}>Avbryt</Button></form>}<p>{visible.length} medlemskort</p><div className="match-actions"><Button disabled={loading} onClick={()=>downloadMemberCodes(cards,true)}>Exportera aktiva koder till LEGEA (CSV)</Button><Button variant="secondary" disabled={loading} onClick={()=>downloadMemberCodes(cards,false)}>Exportera alla kort (CSV)</Button></div><p className="muted">Exporten innehåller medlemsnummer, namn, medlemstyp och status. Den omfattar alla kort, oavsett sökfilter. Ange e-post när du lägger till en medlem för att skicka välkomstmejl och koppla kontot automatiskt.</p></>}
    {notice && <p role="status">{notice}</p>}
    {error && <p className="error-banner" role="alert">{error}<button onClick={load}>Försök igen</button></p>}
    {loading ? <p role="status">Läser medlemskort…</p> : visible.length ? admin ? <div className="member-admin-list">{visible.map(card=><article className="member-admin-row" key={card.id}>
      <div className="member-admin-identity"><strong className="person-name"><PersonAvatar playerId={card.player_id} profileId={card.user_id} name={card.name}/>{card.name}</strong><span className="muted">{memberProfileKind(card)==="player"?"Spelare · Medlem":memberProfileKind(card)==="supporter"?"Stödmedlem":"Medlem"} · {card.status==="active"?"Aktiv":"Inaktiv"}</span></div>
      <div className="member-admin-code"><span>Medlemsnummer</span><strong>{card.membership_no||"—"}</strong></div>
      <div className="member-admin-code"><span>Rabattkod</span><strong>{card.member_number}</strong></div>
      <Button variant="secondary" aria-label={`Hantera ${card.name}`} onClick={()=>setSelectedId(card.id)}>Hantera</Button>
    </article>)}</div> : <div className="member-cards-grid">{visible.map(card=><MemberCard key={card.id} card={card}/>)}</div> : <Empty message="Inga medlemskort att visa"/>}
    {admin&&selected&&(selected.player_id&&roster.find(p=>p.id===selected.player_id)?<AdminPlayerProfile key={selected.id} mode="membership" memberCard={selected} player={roster.find(p=>p.id===selected.player_id)} teams={adminData?.teams||[]} accounts={adminData?.profiles||accounts} onClose={()=>setSelectedId(null)} onUpdate={async()=>{await load();await onUpdate?.();}} memberActions={<div className="button-group"><Button variant="secondary" disabled={saving} onClick={()=>toggle(selected)}>{selected.status==="active"?"Inaktivera kort":"Aktivera kort"}</Button></div>}/>:<MemberDetails key={selected.id} card={selected} players={roster} accounts={adminData?.profiles||accounts} saving={saving} error={error} onClose={()=>setSelectedId(null)} onChange={changeCard} onToggle={toggle} onDelete={deleteCard} onReload={async()=>{await load();await onUpdate?.();}}/>)}

  </section>;
}

function MemberDetails({card,player,players,accounts,saving,error,onClose,onOpenPlayer,onChange,onToggle,onDelete,onReload}) {
  const dialog=useRef(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="member-details-dialog" onCancel={onClose} aria-labelledby="member-details-title">
    <div className="page-heading"><div><h2 id="member-details-title">{card.name}</h2><p className="muted">{card.member_number} · medlemsnummer {card.membership_no||"—"}</p></div><Button variant="secondary" disabled={saving} onClick={onClose}>Stäng</Button></div>
    {error&&<p role="alert" className="error-banner">{error}</p>}
    <div className="member-details-fields"><label className="field">Medlemstyp<select disabled={saving} value={card.membership_type||"member"} onChange={e=>onChange(card,{membership_type:e.target.value})}><option value="member">Medlem</option><option value="supporter">Stödmedlem</option></select></label>
    {!card.player_id&&<label className="field">Personligt medlemskonto<select disabled={saving} value={card.user_id||""} onChange={e=>onChange(card,{user_id:e.target.value||null})}><option value="">Ej kopplat</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.full_name||account.email} · {account.email}</option>)}</select></label>}</div>
    {card.player_id?<section><h3>Spelare · Medlemsprofil</h3>{player?<><p>{player.name} · Född {player.birth_year||"ej angivet"}</p><Button variant="secondary" onClick={onOpenPlayer}>Öppna spelarprofil</Button>{canHavePlayerAccount(player)?<PlayerAccount key={player.id} player={player} accounts={accounts} onClose={onClose} onUpdate={onReload}/>:<p>Spelaren har en spelarprofil. Eget spelarkonto gäller född 2012 eller tidigare; yngre spelare använder föräldraåtkomst via spelarprofilen.</p>}</>:<p>Spelarprofilen kunde inte läsas. Stäng och uppdatera medlemslistan innan konto kopplas.</p>}</section>:<details className="member-invite-details" open={!card.user_id}><summary>{card.user_id?"Bjud in eller byt medlemskonto":"Bjud in med e-post"}</summary><InviteAccountForm kind="member" cardId={card.id} name={card.name} onSaved={onReload}/></details>}
    {!card.player_id&&<MemberParentAccess card={card} players={players} accounts={accounts} onSaved={onReload}/>}
    <div className="button-group"><Button variant="secondary" disabled={saving} onClick={()=>onToggle(card)}>{card.status==="active"?"Inaktivera kort":"Aktivera kort"}</Button><Button variant="danger" disabled={saving} onClick={()=>onDelete(card)}>Ta bort kort</Button></div>
  </dialog>;
}

