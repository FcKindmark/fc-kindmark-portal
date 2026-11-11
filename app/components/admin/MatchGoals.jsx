"use client";
import { useState, useEffect, useCallback } from "react";
import { Button, Select } from "../UI";
import { supabase } from "../../lib/supabaseClient";

/* Goals and assists for a finished match. Saved in public.match_goals and shown on fckindmark.se
   through the read-only function public_match_center() (player names only). */
export default function MatchGoals({ match, squad = [], players = [] }) {
  const [goals, setGoals] = useState([]);
  const [scorer, setScorer] = useState("");
  const [assist, setAssist] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hasResult = match.club_score !== null && match.club_score !== undefined;

  const load = useCallback(async () => {
    const result = await supabase.from("match_goals").select("id, scorer_id, assist_id, created_at").eq("match_id", match.id).order("created_at");
    if (result.error) { setError(result.error.message); return; }
    setGoals(result.data || []);
  }, [match.id]);

  useEffect(() => { if (hasResult) load(); }, [hasResult, load]);

  if (!hasResult) return null;

  const nameOf = (id) => (players.find(p => p.id === id) || squad.find(p => p.id === id) || {}).name || "Okänd spelare";
  const sorted = [...squad].sort((a, b) => (a.name || "").localeCompare(b.name || "", "sv"));
  const full = goals.length >= match.club_score;

  async function add(event) {
    event.preventDefault();
    if (!scorer) { setError("Välj målskytt."); return; }
    if (assist && assist === scorer) { setError("Målskytt och assist kan inte vara samma spelare."); return; }
    setBusy(true); setError("");
    const result = await supabase.from("match_goals").insert({ match_id: match.id, scorer_id: scorer, assist_id: assist || null }).select("id");
    if (result.error) setError(result.error.message);
    else { setScorer(""); setAssist(""); await load(); }
    setBusy(false);
  }

  async function remove(id) {
    if (!confirm("Ta bort detta mål?")) return;
    setBusy(true); setError("");
    const result = await supabase.from("match_goals").delete().eq("id", id).select("id");
    if (result.error) setError(result.error.message);
    else await load();
    setBusy(false);
  }

  return <form onSubmit={add} className="match-result-form match-goals-form">
    <h4>Mål och assist ({goals.length}/{match.club_score})</h4>
    {goals.length > 0 && <ol className="match-goals-list" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 20 }}>
      {goals.map((g, i) => <li key={g.id}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <strong>{nameOf(g.scorer_id)}</strong>
          {g.assist_id && <span className="muted">assist: {nameOf(g.assist_id)}</span>}
          <Button variant="secondary" onClick={() => remove(g.id)} disabled={busy} aria-label={`Ta bort mål ${i + 1}`}>Ta bort</Button>
        </span>
      </li>)}
    </ol>}
    {full
      ? <p className="muted">Alla mål är registrerade. De visas automatiskt på fckindmark.se.</p>
      : <>
        <label htmlFor={`goal-scorer-${match.id}`}>Målskytt</label>
        <Select id={`goal-scorer-${match.id}`} value={scorer} onChange={e => setScorer(e.target.value)}>
          <option value="">Välj spelare</option>
          {sorted.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <label htmlFor={`goal-assist-${match.id}`}>Assist (valfritt)</label>
        <Select id={`goal-assist-${match.id}`} value={assist} onChange={e => setAssist(e.target.value)}>
          <option value="">Ingen assist</option>
          {sorted.filter(p => p.id !== scorer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Button type="submit" disabled={busy || !scorer}>Lägg till mål</Button>
      </>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
