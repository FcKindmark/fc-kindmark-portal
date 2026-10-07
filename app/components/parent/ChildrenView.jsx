"use client";

import { Card, Empty, Badge } from "../UI";

export default function ChildrenView({ data, userEmail, linkedPlayerIds = [] }) {
  const players = data?.players || [];
  
  const myChildren = players.filter((p) => 
    linkedPlayerIds.includes(String(p.id)) || p.mother_email?.toLowerCase() === userEmail?.toLowerCase() || p.father_email?.toLowerCase() === userEmail?.toLowerCase()
  );

  return (
    <>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Mina barn</h2>
      </div>

      {myChildren.length === 0 ? (
        <Empty message="Inga barn registrerade" />
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {myChildren.map((child) => (
            <Card key={child.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3 style={{ color: "var(--text-dark)", marginBottom: "8px", fontSize: "20px", fontWeight: "600" }}>
                    {child.name}
                  </h3>
                  <p style={{ color: "var(--text-gray)", fontSize: "14px", marginBottom: "4px" }}>
                    Position: {child.position || "Ej vald"}
                  </p>
                  <p style={{ color: "var(--text-gray)", fontSize: "14px" }}>
                    Tröjnummer: #{child.number || "-"}
                  </p>
                </div>
                <Badge variant="blue">{child.position || "Ej vald"}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}