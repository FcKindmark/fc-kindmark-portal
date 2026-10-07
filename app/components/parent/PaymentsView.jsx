"use client";
import { Card, Empty, Badge } from "../UI";

export default function PaymentsView({ data, userEmail, linkedPlayerIds = [] }) {
  const players = data?.players || [];
  const payments = data?.payments || [];

  // Get user's children
  const myChildren = players.filter((p) => 
    linkedPlayerIds.includes(String(p.id)) || p.mother_email?.toLowerCase() === userEmail?.toLowerCase() || p.father_email?.toLowerCase() === userEmail?.toLowerCase()
  );

  // Filter payments for user's children
  const myPayments = payments.filter((p) => 
    myChildren.some((child) => String(child.id) === String(p.player_id))
  );

  return (
    <>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Betalningar</h2>
      </div>

      {myPayments.length === 0 ? (
        <Empty message="Inga betalningar för dina barn" />
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {myPayments.map((payment) => (
            <Card key={payment.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>{payment.player_name}</h3>
                  <p style={{ color: "var(--text-light)", fontSize: "14px" }}>{payment.description || "Betalning"}</p>
                </div>
                <Badge variant={payment.status === "paid" ? "success" : "pending"}>
                  {payment.status === "paid" ? "✓ Betald" : "⏳ Väntande"}
                </Badge>
              </div>

              <p style={{ color: "var(--text-dark)", fontWeight: "700", fontSize: "20px", marginBottom: "16px" }}>
                {payment.amount} SEK
              </p>

              {(payment.swish || payment.bankgiro) && (
                <div style={{ background: "var(--beige-light)", padding: "16px", borderRadius: "8px", border: "2px solid var(--gold)" }}>
                  <h4 style={{ color: "var(--text-dark)", fontWeight: "600", marginBottom: "12px" }}>Betala här:</h4>
                  
                  {payment.swish && (
                    <div style={{ marginBottom: "12px", padding: "12px", background: "var(--white)", borderRadius: "6px", textAlign: "center" }}>
                      <p style={{ color: "var(--text-light)", fontSize: "12px", marginBottom: "4px" }}>Swish</p>
                      <p style={{ color: "var(--text-dark)", fontWeight: "700", fontSize: "18px", letterSpacing: "2px" }}>
                        {payment.swish}
                      </p>
                    </div>
                  )}

                  {payment.bankgiro && (
                    <div style={{ padding: "12px", background: "var(--white)", borderRadius: "6px", textAlign: "center" }}>
                      <p style={{ color: "var(--text-light)", fontSize: "12px", marginBottom: "4px" }}>Bankgiro</p>
                      <p style={{ color: "var(--text-dark)", fontWeight: "700", fontSize: "18px", letterSpacing: "2px" }}>
                        {payment.bankgiro}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}