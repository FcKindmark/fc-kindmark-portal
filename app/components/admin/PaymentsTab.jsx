"use client";
import { useState } from "react";
import { Card, Input, Button, Empty, Badge } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function PaymentsTab({ data, onUpdate }) {
  const payments = data?.payments || [];
  const players = data?.players || [];
  const [showAdd, setShowAdd] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [swish, setSwish] = useState("1230830323");
  const [bankgiro, setBankgiro] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePlayerSelect(e) {
    const selectedPlayer = players.find((p) => p.id === e.target.value);
    setPlayerId(e.target.value);
    setPlayerName(selectedPlayer?.name || "");
  }

  function resetForm() {
    setPlayerId("");
    setPlayerName("");
    setAmount("");
    setDescription("");
    setSwish("1230830323");
    setBankgiro("");
    setShowAdd(false);
  }

  async function addPayment() {
    if (!playerId || !amount.trim()) {
      alert("Välj spelare och ange belopp");
      return;
    }
    setLoading(true);

    try {
      // Insert payment
      const { error: paymentError } = await supabase.from("payments").insert({
        player_name: playerName.trim(),
        player_id: playerId,
        amount: parseFloat(amount),
        description: description.trim(),
        swish: swish.trim() || null,
        bankgiro: bankgiro.trim() || null,
        status: "pending",
      });

      if (paymentError) throw paymentError;

      // Send message to parent(s)
      const player = players.find((p) => p.id === playerId);
      if (player) {
        const parentEmails = [];
        if (player.mother_email) parentEmails.push(player.mother_email);
        if (player.father_email) parentEmails.push(player.father_email);

        if (parentEmails.length > 0) {
          const messages = parentEmails.map((email) => ({
            recipient_email: email,
            subject: `Betalning: ${playerName} - ${description || "Medlemsavgift"}`,
            content: `Hej!\n\nEn ny betalning har registrerats för ${playerName}.\n\nBelopp: ${amount} SEK\nBeskrivning: ${description || "Medlemsavgift"}\n\n${swish ? `Swish: ${swish}\n` : ""}${bankgiro ? `Bankgiro: ${bankgiro}\n` : ""}\nVänligen utför betalningen via portalen.`,
            team_name: null,
            sender_email: "info@fckindmark.se",
            status: "sent",
          }));

          const { error: messageError } = await supabase.from("messages").insert(messages);
          if (messageError) throw messageError;
        }
      }

      resetForm();
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  async function updatePaymentStatus(id, status) {
    setLoading(true);
    const { error } = await supabase
      .from("payments")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Fel: " + error.message);
    } else {
      onUpdate();
    }
    setLoading(false);
  }

  return (
    <>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Betalningar</h2>
        <Button variant="primary" onClick={() => { resetForm(); setShowAdd(true); }}>+ Lägg till betalning</Button>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card style={{ maxWidth: "700px", width: "95%" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>Lägg till betalning</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Spelare</label>
                <select value={playerId} onChange={handlePlayerSelect} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", cursor: "pointer" }}>
                  <option value="">Välj spelare...</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Belopp (SEK)</label>
                <Input type="number" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Beskrivning</label>
                <Input placeholder="Medlemsavgift" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Swish</label>
                <Input placeholder="123 456 789" value={swish} onChange={(e) => setSwish(e.target.value)} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Bankgiro</label>
                <Input placeholder="123-4567" value={bankgiro} onChange={(e) => setBankgiro(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="primary" onClick={addPayment} disabled={loading} style={{ flex: 1 }}>{loading ? "Läggs till..." : "Lägg till"}</Button>
              <Button variant="secondary" onClick={resetForm} style={{ flex: 1 }}>Avbryt</Button>
            </div>
          </Card>
        </div>
      )}

      {payments.length === 0 ? (
        <Empty message="Inga betalningar än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {payments.map((p) => (
              <div key={p.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--royal-blue)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>{p.player_name}</h3>
                    <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "4px" }}>{p.description || "Betalning"}</p>
                  </div>
                  <Badge variant={p.status === "paid" ? "success" : "pending"}>{p.status === "paid" ? "Betald" : "Väntande"}</Badge>
                </div>
                
                <p style={{ color: "var(--text-dark)", fontWeight: "600", marginBottom: "8px", fontSize: "16px" }}>{p.amount} SEK</p>
                
                {(p.swish || p.bankgiro) && (
                  <div style={{ background: "rgba(212, 175, 55, 0.1)", padding: "10px", borderRadius: "6px", marginBottom: "12px", fontSize: "14px" }}>
                    {p.swish && <p style={{ color: "var(--text-dark)", marginBottom: "4px" }}>Swish: <strong>{p.swish}</strong></p>}
                    {p.bankgiro && <p style={{ color: "var(--text-dark)" }}>Bankgiro: <strong>{p.bankgiro}</strong></p>}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  {p.status === "pending" && (
                    <Button variant="primary" onClick={() => updatePaymentStatus(p.id, "paid")} disabled={loading} style={{ flex: 1, fontSize: "12px", padding: "8px" }}>
                      Markera betald
                    </Button>
                  )}
                  {p.status === "paid" && (
                    <Button variant="secondary" onClick={() => updatePaymentStatus(p.id, "pending")} disabled={loading} style={{ flex: 1, fontSize: "12px", padding: "8px" }}>
                      Markera väntande
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}