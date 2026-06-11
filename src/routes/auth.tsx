import logoSrc from "../assets/logo.png";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — JobGenie" },
      { name: "description", content: "Sign in to JobGenie." },
    ],
  }),
  component: AuthPage,
});

const C = {
  bg: "#0A0A0A", bg2: "#111111", bg3: "#161616",
  accent: "#F59B00", accent2: "#D4840A",
  border: "#1E1E1E", border2: "#2A2A2A",
  text: "#FFFFFF", text2: "#999999", text3: "#666666",
};

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/jobs", replace: true });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      if (mode === "signup") {
        setStatusMsg("Creating account...");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (error) { setStatusMsg(error.message); toast.error(error.message); return; }
        if (data.session) {
          toast.success("Account created. Welcome!");
          navigate({ to: "/jobs", replace: true });
        } else {
          toast.success("Check your email for a confirmation link, then sign in.");
          setMode("signin");
          setStatusMsg("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        setStatusMsg("Signing in...");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setStatusMsg(error.message); toast.error(error.message); return; }
        if (data.session) {
          toast.success("Welcome back!");
          navigate({ to: "/jobs", replace: true });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/jobs" },
    });
    if (error) { toast.error("Google sign-in failed: " + error.message); setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: C.bg3, border: `1px solid ${C.border2}`,
    borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, color: C.text2,
    marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr",
      background: C.bg, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      {/* ── Left panel ── */}
      <div style={{
        background: C.bg2, borderRight: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 48px", position: "relative", overflow: "hidden",
      }}>
        {/* glow */}
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(245,155,0,0.10) 0%,transparent 70%)",
          top: "40%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", maxWidth: 400 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <img src={logoSrc} alt="JobGenie" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>JobGenie</span>
          </div>
          <div style={{
            fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
            color: C.accent, marginBottom: 20,
          }}>
            Your AI Career Agent
          </div>
          <h1 style={{
            fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 700,
            letterSpacing: "-0.03em", lineHeight: 1.1, color: C.text, marginBottom: 20,
          }}>
            Apply smarter.<br />
            Land <span style={{ color: C.accent }}>faster.</span>
          </h1>
          <p style={{ fontSize: 15, color: C.text2, lineHeight: 1.7, marginBottom: 36 }}>
            Auto-fill your profile from your resume. Get AI-scored job matches.
            Track every interview from one place.
          </p>
          {[
            "Resume → profile in seconds",
            "AI scoring + tailored pitches",
            "Notes, checklists, reminders",
          ].map((item) => (
            <div key={item} style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 12, fontSize: 14, color: C.text2,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
              {item}
            </div>
          ))}
          {/* mini score badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            border: `1px solid ${C.border2}`, background: C.bg3,
            padding: "10px 18px", borderRadius: 12, marginTop: 40,
          }}>
            <div>
              <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Match Score</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>92/100</div>
            </div>
            <div style={{ width: 1, height: 32, background: C.border2 }} />
            <div>
              <div style={{ fontSize: 12, color: C.text2 }}>Senior Frontend Engineer</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Linear · San Francisco</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 48px", background: C.bg,
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: "-0.02em" }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p style={{ fontSize: 14, color: C.text2, marginBottom: 28 }}>
            {mode === "signup" ? "Free to start. No credit card." : "Sign in to continue."}
          </p>

          {statusMsg && (
            <div style={{
              background: "rgba(245,155,0,0.08)", border: `1px solid rgba(245,155,0,0.25)`,
              borderRadius: 8, padding: "10px 14px", fontSize: 12,
              color: C.accent, marginBottom: 20, fontFamily: "monospace",
            }}>
              {statusMsg}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "11px 0", background: C.bg2,
              border: `1px solid ${C.border2}`, borderRadius: 8,
              fontSize: 14, fontWeight: 600, color: C.text,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 20,
              transition: "border-color .2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border2)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill={C.text2} d="M21.35 11.1h-9.17v2.95h5.3c-.23 1.5-1.7 4.4-5.3 4.4-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.83 0 3.05.78 3.75 1.45l2.55-2.47C16.8 3.95 14.7 3 12.18 3 6.85 3 2.5 7.35 2.5 12.55s4.35 9.55 9.68 9.55c5.6 0 9.3-3.93 9.3-9.46 0-.63-.07-1.1-.13-1.54z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.text3 }}>or</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Form */}
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required placeholder="Jane Smith"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px 0", background: C.accent,
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                color: "#000", cursor: "pointer", fontFamily: "inherit",
                marginTop: 4, transition: "background .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.accent2)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
            >
              {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p style={{ fontSize: 13, textAlign: "center", color: C.text2, marginTop: 20 }}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setStatusMsg(null); }}
              style={{
                background: "none", border: "none", color: C.accent,
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, padding: 0,
              }}
            >
              {mode === "signup" ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}