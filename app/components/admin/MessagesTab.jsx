"use client";
import { useState, useEffect } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesTab({ data, onUpdate }) {
  const messages = data?.messages || [];
  const teams = data?.teams || [];

  const [showAdd, setShowAdd] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [sendEmail,setSendEmail]=useState(false);
  const [sendTelegram,setSendTelegram]=useState(true);
  const [preview,setPreview]=useState(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [requestId,setRequestId]=useState(null);
  const [mailUser,setMailUser]=useState("portal@fckindmark.se");
  const [mailPassword,setMailPassword]=useState("");
  const [setupBusy,setSetupBusy]=useState(false);
  const [emailStatuses,setEmailStatuses]=useState({});
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(()=>{let active=true;supabase.rpc("club_broadcast_preview",{target:teamId||null}).then(({data,error})=>{if(active){setPreview(data);if(error)setError(error.message);}});return()=>{active=false;};},[teamId,showAdd]);
  useEffect(()=>{supabase.from("club_email_outbox").select("message_id,sent_at,attempts,last_status").then(({data})=>{setEmailStatuses(Object.fromEntries((data||[]).map(row=>[row.message_id,row])));});},[data]);
  async function setupMail(){setSetupBusy(true);setError("");try{const {data,error}=await supabase.functions.invoke("club-mail",{body:{action:"setup",user:mailUser,password:mailPassword}});if(error||data?.error)throw new Error(data?.error||"E-postanslutningen misslyckades.");setMailPassword("");setPreview(old=>({...old,email_ready:true}));setSendEmail(true);setNotice("E-postanslutningen är aktiverad.");}catch(e){setError(e.message);}finally{setSetupBusy(false);}}
  async function sendMessage() {
    if(!subject.trim()||!content.trim()){setError("Ange ämne och meddelande.");return;}
    setLoading(true);setError("");setNotice("");
    const id=requestId||crypto.randomUUID();setRequestId(id);
    try{
      const {data:result,error}=await supabase.rpc("club_send_broadcast",{request_id:id,target:teamId||null,title:subject.trim(),body:content.trim(),email_channel:sendEmail,telegram_channel:sendTelegram});
      if(error)throw error;
      setNotice(`Sparat i portalen för ${result.recipients} mottagare. E-post: ${result.email} i kö. Telegram: ${result.telegram} i kö.`);
      setTeamId("");setSubject("");setContent("");setRequestId(null);setShowAdd(false);await onUpdate();
    }catch(e){setError(e.message);}finally{setLoading(false);}
  }

  async function deleteMessage(id) {
    if (!confirm("Är du säker på att du vill ta bort detta meddelande?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Meddelanden</h2>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ Skicka meddelande</Button>
      </div>

      {notice&&<p className="success-banner" role="status">{notice}</p>}
      {error&&!showAdd&&<p className="error-banner" role="alert">{error}</p>}
      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <Card style={{ maxWidth: "600px", width: "95%",maxHeight:"90vh",overflowY:"auto" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>Skicka meddelande</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Mottagare</label>
                <select value={teamId} onChange={(e)=>{setTeamId(e.target.value);setRequestId(null);}} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", cursor: "pointer" }}>
                  <option value="">Alla i föreningen</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name} ({team.age_group})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Ämne</label>
                <Input placeholder="Meddelandeämne" maxLength={140} value={subject} onChange={(e) => {setSubject(e.target.value);setRequestId(null);}} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Meddelande</label>
                <textarea placeholder="Ditt meddelande..." maxLength={2800} value={content} onChange={(e) => {setContent(e.target.value);setRequestId(null);}} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", fontFamily: "inherit", minHeight: "120px", resize: "vertical" }} />
              </div>
              {preview&&<p className="muted">{preview.recipients} mottagare · {preview.telegram} har anslutit Telegram. Föräldrar, spelarkonton och tränare ingår i laget. Alla omfattar även föreningens medlemmar.</p>}
              <fieldset style={{border:0,padding:0,display:"grid",gap:12}} disabled={loading}>
                <legend style={{fontWeight:600,marginBottom:10}}>Skicka även via</legend>
                <label><input type="checkbox" checked={sendTelegram} onChange={e=>{setSendTelegram(e.target.checked);setRequestId(null);}}/> Telegram</label>
                <label><input type="checkbox" checked={sendEmail} disabled={!preview?.email_ready} onChange={e=>{setSendEmail(e.target.checked);setRequestId(null);}}/> E-post</label>
                <p className="muted">Meddelandet sparas alltid i portalen. Varje adress får bara ett utskick.</p>
              </fieldset>
              {!preview?.email_ready&&<details><summary>Aktivera e-postutskick</summary><p className="muted">Anslut klubbens e-postkonto på one.com. Använd lösenordet för e-postkontot.</p><label>E-postadress<Input type="email" value={mailUser} onChange={e=>setMailUser(e.target.value)}/></label><label>Lösenord<Input type="password" autoComplete="new-password" value={mailPassword} onChange={e=>setMailPassword(e.target.value)}/></label><Button disabled={setupBusy||!mailPassword} onClick={setupMail}>{setupBusy?"Kontrollerar...":"Aktivera e-post"}</Button></details>}
              {error&&<p className="error-banner" role="alert">{error}</p>}
              <div style={{ display: "flex", gap: "10px" }}>
                <Button variant="primary" onClick={sendMessage} disabled={loading||!preview?.recipients} style={{ flex: 1 }}>{loading ? "Skickas..." : "Skicka"}</Button>
                <Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Avbryt</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {messages.length === 0 ? (
        <Empty message="Inga meddelanden än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--royal-blue)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <div>
                    <h3 style={{ color: "var(--text-dark)", margin: "0 0 4px 0" }}>{msg.subject}</h3>
                    {msg.team_name && <p style={{ color: "var(--text-light)", fontSize: "12px", marginBottom: "4px" }}>Lag: {msg.team_name}</p>}
                    <p style={{ color: "var(--text-light)", fontSize: "12px", marginBottom: "8px" }}>Till: {msg.recipient_email}</p>
                  </div>
                  <Button 
                    variant="danger" 
                    onClick={() => deleteMessage(msg.id)} 
                    disabled={loading}
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                  >
                    Ta bort
                  </Button>
                </div>
                <p style={{ color: "var(--text-gray)", fontSize: "13px", lineHeight: "1.5" }}>{msg.content}</p>
                {msg.send_email&&<p className="muted">E-post: {emailStatuses[msg.id]?.sent_at?"Accepterad av e-postservern":emailStatuses[msg.id]?.attempts>=8?"Misslyckades – kontrollera e-postanslutningen":"I kö"}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}