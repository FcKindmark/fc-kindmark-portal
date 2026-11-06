"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Input, Card } from "./UI";



export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [signupType, setSignupType] = useState(null);
  const [fullName, setFullName] = useState("");
  const [password2, setPassword2] = useState("");
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
        if(!email.includes("@"))throw new Error("Spelarkonto utan e-post: be tränaren eller administratören sätta ett nytt lösenord.");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {redirectTo: `${window.location.origin}/?recovery=1`});
        if (error) throw error;
        setMessage("Om adressen har ett konto får du ett mejl med en återställningslänk. Kontrollera även skräpposten.");
      } else if (isSignup) {
        if (!fullName.trim()) throw new Error("Skriv ditt namn.");
        if (password !== password2) throw new Error("Lösenorden matchar inte.");
        const { data, error: signupError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
        if (signupError) throw signupError;
        if (data?.user) setMessage("Kontrollera din e-post för att bekräfta registreringen. Klubben kopplar sedan ditt konto till ditt barn.");
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().includes("@")?email.trim():email.trim().toLowerCase()+"@players.login.fckindmark.se", password });
        if (loginError) throw loginError;
        if (data?.user) onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const shell = (children) => (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--beige) 0%, var(--beige-light) 100%)", padding: "20px" }}>
      <Card style={{ maxWidth: "500px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img src="/logo.png" alt="FC Kindmark" style={{ width: "72px", height: "72px", objectFit: "contain", margin: "0 auto 14px" }} />
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-dark)", marginBottom: "6px" }}>FC KINDMARK</h1>
        </div>
        {children}
      </Card>
    </div>
  );
  const backToLogin = () => { setIsSignup(false); setSignupType(null); setError(""); setMessage(""); };
  const choiceStyle = { display: "block", width: "100%", textAlign: "left", padding: "16px 18px", border: "1px solid var(--border-color)", borderRadius: "12px", background: "#fff", cursor: "pointer", marginBottom: "12px" };

  if (isSignup && !isRecovery && !signupType) {
    return shell(<>
      <h2 style={{ textAlign: "center", fontSize: "20px", fontWeight: "600", marginBottom: "6px" }}>Skapa konto</h2>
      <p style={{ textAlign: "center", color: "var(--text-light)", fontSize: "15px", marginBottom: "22px" }}>Vem registrerar du dig som?</p>
      <button type="button" style={choiceStyle} onClick={() => setSignupType("parent")}>
        <strong style={{ display: "block", fontSize: "16px", fontWeight: "600", color: "var(--text-dark)" }}>Förälder</strong>
        <span style={{ fontSize: "14px", color: "var(--text-light)" }}>Se dina barns träningar, matcher, medlemskort och betalningar.</span>
      </button>
      <button type="button" style={choiceStyle} onClick={() => setSignupType("player")}>
        <strong style={{ display: "block", fontSize: "16px", fontWeight: "600", color: "var(--text-dark)" }}>Spelare</strong>
        <span style={{ fontSize: "14px", color: "var(--text-light)" }}>Spelare får sitt konto av tränaren eller klubben.</span>
      </button>
      <div style={{ textAlign: "center", marginTop: "18px" }}>
        <span style={{ color: "var(--text-gray)", fontSize: "14px" }}>Har du redan ett konto? </span>
        <button type="button" className="text-link" onClick={backToLogin}>Logga in</button>
      </div>
    </>);
  }

  if (isSignup && !isRecovery && signupType === "player") {
    return shell(<>
      <h2 style={{ textAlign: "center", fontSize: "20px", fontWeight: "600", marginBottom: "14px" }}>Spelare</h2>
      <p style={{ fontSize: "15px", color: "var(--text-dark)", marginBottom: "10px" }}>Spelarkonton skapas av din tränare eller av klubben. Du får ett användarnamn och ett lösenord, och loggar sedan in här.</p>
      <p style={{ fontSize: "14px", color: "var(--text-light)", marginBottom: "22px" }}>Är du ny och vill börja spela i FC Kindmark? Skicka en intresseanmälan så hör klubben av sig.</p>
      <a href="/anmalan" className="club-button primary" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "12px 18px", borderRadius: "8px", marginBottom: "12px" }}>Anmäl intresse</a>
      <Button type="button" variant="secondary" style={{ width: "100%", marginBottom: "10px" }} onClick={backToLogin}>Jag har redan ett användarnamn – logga in</Button>
      <div style={{ textAlign: "center" }}><button type="button" className="text-link" onClick={() => setSignupType(null)}>Tillbaka</button></div>
    </>);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--beige) 0%, var(--beige-light) 100%)", padding: "20px" }}>
      <Card style={{ maxWidth: "500px", width: "100%" }}><form onSubmit={handleAuth}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ marginBottom: "20px" }}>
            <img src="/logo.png" alt="FC Kindmark" style={{ width: "80px", height: "80px", objectFit: "contain", margin: "0 auto" }} />
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-dark)", marginBottom: "8px", letterSpacing: "-0.5px" }}>FC KINDMARK</h1>
          <p style={{ color: "var(--text-light)", fontSize: "15px", marginTop: "8px" }}>{isRecovery ? "Återställ ditt lösenord" : isSignup ? "Registrera dig som förälder" : "Välkommen tillbaka"}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
          {isSignup && <div>
            <label htmlFor="signup-name" style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "var(--text-dark)", fontSize: "14px" }}>Ditt namn</label>
            <Input id="signup-name" required autoComplete="name" type="text" placeholder="För- och efternamn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>}
          <div>
            <label htmlFor="login-email" style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "var(--text-dark)", fontSize: "14px" }}>{isSignup||isRecovery?"E-postadress":"E-post eller användarnamn"}</label>
            <Input id="login-email" required autoComplete={isSignup||isRecovery?"email":"username"} autoCapitalize="none" autoCorrect="off" type={isSignup||isRecovery?"email":"text"} placeholder={isSignup||isRecovery?"din@email.com":"E-post eller användarnamn"} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {!isRecovery && <div>
            <label htmlFor="login-password" style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "var(--text-dark)", fontSize: "14px" }}>Lösenord</label>
            <Input id="login-password" required autoComplete={isSignup ? "new-password" : "current-password"} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>}
          {isSignup && !isRecovery && <div>
            <label htmlFor="signup-password2" style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "var(--text-dark)", fontSize: "14px" }}>Upprepa lösenordet</label>
            <Input id="signup-password2" required autoComplete="new-password" type="password" placeholder="••••••••" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </div>}
        </div>

        {error && <div style={{ padding: "14px 16px", background: "#fff5f5", color: "#c62828", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", border: "1px solid #ffcccc", fontWeight: "500" }}>{error}</div>}

        {message && <p className="success-banner" role="status">{message}</p>}
        <Button type="submit" variant="primary" disabled={loading || !email || (!isRecovery && !password) || (isSignup && (!fullName.trim() || !password2))} style={{ width: "100%" }}>
          {loading ? "Läser in..." : isRecovery ? "Skicka återställningslänk" : isSignup ? "Skapa konto" : "Logga in"}
        </Button>

        {!isSignup && <div style={{textAlign:"center",marginTop:"16px"}}><button className="text-link" type="button" disabled={loading} onClick={()=>{setIsRecovery(!isRecovery);setError("");setMessage("");}}>{isRecovery ? "Tillbaka till inloggning" : "Glömt lösenordet?"}</button></div>}
        {!isRecovery && <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #eee" }}>
          <span style={{ color: "var(--text-gray)", fontSize: "14px" }}>{isSignup ? "Har du redan ett konto? " : "Inget konto än? "}</span>
          <button type="button" disabled={loading} onClick={() => {setIsSignup(!isSignup);setSignupType(null);setError("");setMessage("");}} style={{ background: "none", border: "none", color: "var(--gold)", fontWeight: "600", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold-dark)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gold)"; }}>
            {isSignup ? "Logga in" : "Registrera dig"}
          </button>
        </div>}
      </form></Card>
    </div>
  );
}