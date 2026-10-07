"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Input, Card } from "./UI";



export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAuth(event) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (isRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {redirectTo: `${window.location.origin}/?recovery=1`});
        if (error) throw error;
        setMessage("Om adressen har ett konto får du ett mejl med en återställningslänk. Kontrollera även skräpposten.");
      } else if (isSignup) {
        const { data, error: signupError } = await supabase.auth.signUp({ email, password });
        if (signupError) throw signupError;
        if (data?.user) setMessage("Kontrollera din e-post för att bekräfta registreringen");
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        if (data?.user) onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--beige) 0%, var(--beige-light) 100%)", padding: "20px" }}>
      <Card style={{ maxWidth: "500px", width: "100%" }}><form onSubmit={handleAuth}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ marginBottom: "20px" }}>
            <img src="/logo.png" alt="FC Kindmark" style={{ width: "80px", height: "80px", objectFit: "contain", margin: "0 auto" }} />
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-dark)", marginBottom: "8px", letterSpacing: "-0.5px" }}>FC KINDMARK</h1>
          <p style={{ color: "var(--text-light)", fontSize: "15px", marginTop: "8px" }}>{isRecovery ? "Återställ ditt lösenord" : isSignup ? "Gå med i laget" : "Välkommen tillbaka"}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
          <div>
            <label htmlFor="login-email" style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "var(--text-dark)", fontSize: "14px" }}>E-postadress</label>
            <Input id="login-email" required autoComplete="email" type="email" placeholder="din@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {!isRecovery && <div>
            <label htmlFor="login-password" style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "var(--text-dark)", fontSize: "14px" }}>Lösenord</label>
            <Input id="login-password" required autoComplete={isSignup ? "new-password" : "current-password"} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>}
        </div>

        {error && <div style={{ padding: "14px 16px", background: "#fff5f5", color: "#c62828", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", border: "1px solid #ffcccc", fontWeight: "500" }}>{error}</div>}

        {message && <p className="success-banner" role="status">{message}</p>}
        <Button type="submit" variant="primary" disabled={loading || !email || (!isRecovery && !password)} style={{ width: "100%" }}>
          {loading ? "Läser in..." : isRecovery ? "Skicka återställningslänk" : isSignup ? "Skapa konto" : "Logga in"}
        </Button>

        {!isSignup && <div style={{textAlign:"center",marginTop:"16px"}}><button className="text-link" type="button" disabled={loading} onClick={()=>{setIsRecovery(!isRecovery);setError("");setMessage("");}}>{isRecovery ? "Tillbaka till inloggning" : "Glömt lösenordet?"}</button></div>}
        {!isRecovery && <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #eee" }}>
          <span style={{ color: "var(--text-gray)", fontSize: "14px" }}>{isSignup ? "Har du redan ett konto? " : "Inget konto än? "}</span>
          <button type="button" disabled={loading} onClick={() => {setIsSignup(!isSignup);setError("");setMessage("");}} style={{ background: "none", border: "none", color: "var(--gold)", fontWeight: "600", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold-dark)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gold)"; }}>
            {isSignup ? "Logga in" : "Registrera dig"}
          </button>
        </div>}
      </form></Card>
    </div>
  );
}