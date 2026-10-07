"use client";
import { useState } from "react";
import { Card, Empty, Button } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesView({ data, userEmail, onRefresh }) {
  const messages = data?.messages || [];
  const [loading, setLoading] = useState(false);

  async function deleteMessage(id) {
    if (!confirm("Är du säker på att du vill ta bort detta meddelande?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Meddelanden</h2>
      </div>

      {messages.length === 0 ? (
        <Empty message="Inga meddelanden än" />
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {messages.map((msg) => (
            <Card key={msg.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: "var(--text-dark)", margin: "0 0 8px 0" }}>{msg.subject}</h3>
                  {msg.team_name && (
                    <p style={{ color: "var(--text-light)", fontSize: "13px", fontWeight: "500", marginBottom: "8px" }}>
                      Lag: <strong>{msg.team_name}</strong>
                    </p>
                  )}
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
              <p style={{ color: "var(--text-gray)", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {msg.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}