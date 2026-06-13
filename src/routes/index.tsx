import logoSrc from "../assets/logo.png";
import jg1 from "../assets/jg-1.png";
import jg2 from "../assets/jg-2.png";
import jg3 from "../assets/jg-3.png";
import jg4 from "../assets/jg-4.png";
import jg5 from "../assets/jg-5.png";
import jg6 from "../assets/jg-6.png";
import jg7 from "../assets/jg-7.png";
import jg8 from "../assets/jg-8.png";
import jg9 from "../assets/jg-9.png";
import jg10 from "../assets/jg-10.png";
import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobGenie — Your AI Career Agent" },
      {
        name: "description",
        content:
          "JobGenie auto-fills your profile from your resume, AI-scores every job, and manages your entire pipeline from first save to signed offer.",
      },
    ],
  }),
  component: Landing,
});

const C = {
  bg: "#0A0A0A",
  bg2: "#111111",
  bg3: "#161616",
  accent: "#F59B00",
  accent2: "#D4840A",
  border: "#1E1E1E",
  border2: "#2A2A2A",
  text: "#FFFFFF",
  text2: "#999999",
  text3: "#666666",
  green: "#22C55E",
  red: "#EF4444",
};

type TagVariant = "match" | "review" | "skip" | "old" | "stale";

function useHover() {
  const [hovered, setHovered] = React.useState(false);
  return { hovered, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) };
}

function Icon({ size = 18, color = C.accent, strokeWidth = 1.8, fill = "none", viewBox = "0 0 24 24", children }: { size?: number; color?: string; strokeWidth?: number; fill?: string; viewBox?: string; children?: React.ReactNode }) {
  return <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const IcoUpload = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></Icon>;
const IcoSearch = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></Icon>;
const IcoTarget = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>;
const IcoPencil = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></Icon>;
const IcoCalendar = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>;
const IcoRocket = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></Icon>;
const IcoFiles = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /><line x1="9" y1="11" x2="15" y2="11" /></Icon>;
const IcoClock = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>;
const IcoRefresh = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" /></Icon>;
const IcoLock = ({ size = 14, color = C.accent }) => <Icon size={size} color={color}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></Icon>;
const IcoDoc = ({ size = 14, color = C.accent }) => <Icon size={size} color={color}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" /></Icon>;
const IcoMail = ({ size = 14, color = C.accent }) => <Icon size={size} color={color}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Icon>;
const IcoBuilding = ({ size = 14, color = C.text3 }) => <Icon size={size} color={color}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>;
const IcoMoon = ({ size = 16, color = C.accent }) => <Icon size={size} color={color}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></Icon>;
const IcoStar = ({ size = 13, color = C.text3 }) => <Icon size={size} color={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Icon>;
const IcoSend = ({ size = 13, color = C.text3 }) => <Icon size={size} color={color}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>;
const IcoCheck = ({ size = 16, color = C.green, strokeWidth = 2.5 }) => <Icon size={size} color={color} strokeWidth={strokeWidth}><polyline points="20 6 9 17 4 12" /></Icon>;
const IcoDot = ({ color, size = 8 }: { color: string; size?: number }) => <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />;
const IcoZap = ({ size = 18, color = C.accent }) => <Icon size={size} color={color}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>;

function Tag({ variant, children }: { variant: TagVariant; children: React.ReactNode }) {
  const styles: Record<TagVariant, React.CSSProperties> = {
    match: { background: "rgba(34,197,94,0.15)", color: C.green },
    review: { background: "rgba(245,155,0,0.15)", color: C.accent },
    skip: { background: "rgba(255,255,255,0.05)", color: C.text3 },
    old: { background: "rgba(239,68,68,0.15)", color: C.red },
    stale: { background: "rgba(245,155,0,0.15)", color: C.accent },
  };
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, whiteSpace: "nowrap", ...styles[variant] }}>{children}</span>;
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{ width: 36, height: 20, background: on ? C.accent : C.border2, borderRadius: 10, position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", width: 14, height: 14, background: "white", borderRadius: "50%", top: 3, left: on ? 19 : 3, transition: "left .2s" }} />
    </div>
  );
}

function BtnPrimary({ children, size = "md", style, onClick }: { children: React.ReactNode; size?: "sm" | "md" | "lg"; style?: React.CSSProperties; onClick?: () => void }) {
  const pad = size === "lg" ? "13px 28px" : size === "sm" ? "7px 16px" : "8px 18px";
  const fs = size === "lg" ? 15 : 13;
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ background: hovered ? C.accent2 : C.accent, border: "none", color: "#000", padding: pad, borderRadius: size === "lg" ? 10 : 8, fontSize: fs, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, transition: "background .15s, transform .15s, box-shadow .15s", transform: hovered ? "translateY(-1px)" : "none", boxShadow: hovered ? `0 6px 20px rgba(245,155,0,0.35)` : "none", ...style }}>
      {children}
    </button>
  );
}

function BtnGhost({ children, size = "md", style, href }: { children: React.ReactNode; size?: "sm" | "md" | "lg"; style?: React.CSSProperties; href?: string }) {
  const pad = size === "lg" ? "13px 28px" : size === "sm" ? "7px 16px" : "8px 18px";
  const fs = size === "lg" ? 15 : 13;
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  const base: React.CSSProperties = { background: hovered ? "rgba(255,255,255,0.04)" : "none", border: `1px solid ${hovered ? C.text3 : C.border2}`, color: hovered ? C.text : C.text2, padding: pad, borderRadius: size === "lg" ? 10 : 8, fontSize: fs, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", transition: "all .15s", transform: hovered ? "translateY(-1px)" : "none", ...style };
  if (href) return <a href={href} style={base} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</a>;
  return <button style={base} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{children}</button>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 16 }}>{children}</div>;
}

function SectionTitle({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16, textAlign: center ? "center" : undefined }}>{children}</h2>;
}

function LogoMark({ size = 40 }: { size?: number }) {
  return <img src={logoSrc} alt="JobGenie" style={{ width: size, height: size, objectFit: "contain", borderRadius: 7, flexShrink: 0, transition: "transform .2s" }} />;
}

function AppLogo({ domain, name, size = 32 }: { domain: string | null; name: string; size?: number }) {
  if (!domain) return <div style={{ width: size, height: size, borderRadius: 8, background: C.bg3, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.text3 }}>+</div>;
  return <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt={name} width={size} height={size} style={{ borderRadius: 6, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />;
}

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid rgba(245,155,0,0.2)`, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#0d0d0d", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", display: "block" }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e", display: "block" }} />
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", display: "block" }} />
        <span style={{ marginLeft: 8, flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: C.text3 }}>{url}</span>
      </div>
      {children}
    </div>
  );
}

// ── Cursor Glow ───────────────────────────────────────────────────────────────
function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    let rafId: number;
    let px = 0, py = 0;
    const move = (e: MouseEvent) => {
      px = e.clientX;
      py = e.clientY;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.transform = `translate(${px - 200}px, ${py - 200}px)`;
        el.style.opacity = "1";
      });
    };
    const stop = () => { el.style.opacity = "0"; };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseleave", stop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", stop);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return (
    <div ref={glowRef} style={{
      position: "fixed", pointerEvents: "none", zIndex: 9999,
      width: 400, height: 400, borderRadius: "50%",
background: "radial-gradient(circle, rgba(245,155,0,0.04) 0%, transparent 70%)",      willChange: "transform, opacity",
      // No left/top — transform drives position from (0,0) origin
    }} />
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function NavLink({ label, href }: { label: string; href: string }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <a href={href} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ color: hovered ? C.text : C.text2, textDecoration: "none", fontSize: 14, transition: "color .15s", position: "relative" }}>
      {label}
      <span style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 1, background: C.accent, transform: hovered ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: "transform .2s", display: "block" }} />
    </a>
  );
}

function Nav() {
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15, color: C.text, textDecoration: "none" }}>
          <LogoMark />
          JobGenie
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {(["How it works", "Features", "Integrations", "Compare", "Pricing"] as const).map((label) => (
            <NavLink key={label} label={label} href={`#${label.toLowerCase().replace(/ /g, "-")}`} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/auth"><BtnGhost size="sm">Sign in</BtnGhost></Link>
          <Link to="/auth"><BtnPrimary size="sm">Get started →</BtnPrimary></Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero Screenshot Slider ────────────────────────────────────────────────────
function HeroScreenshots() {
  const [active, setActive] = useState(0);
  const slides = [
    { img: jg1, label: "Discover", url: "app.jobgenie.ai/jobs", desc: "AI-ranked jobs for you, with match scores" },
    { img: jg2, label: "Pipeline", url: "app.jobgenie.ai/applications", desc: "Track every application in one kanban board" },
    { img: jg3, label: "Opportunities", url: "app.jobgenie.ai/opportunities", desc: "Curated roles you haven't explored yet" },
  ];
  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (                        // ← make sure this line exists with the paren
    <div style={{ position: "relative" }}>
      <BrowserFrame url={slides[active].url}>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "52%" }}>
            {slides.map((slide, i) => (
              <img
                key={slide.label}
                src={slide.img}
                alt={slide.label}
                style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "top",
                  display: "block",
                  opacity: i === active ? 1 : 0,
                  transition: "opacity 0.6s ease",
                }}
              />
            ))}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(10,10,10,0.95), transparent)", padding: "24px 20px 16px", zIndex: 2 }}>
              <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.15em", color: C.accent, textTransform: "uppercase", margin: 0 }}>{slides[active].label}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "3px 0 0" }}>{slides[active].desc}</p>
            </div>
          </div>
        </div>
      </BrowserFrame>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ height: 8, width: i === active ? 24 : 8, borderRadius: 4, background: i === active ? C.accent : "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", padding: 0, transition: "all .3s" }} />
        ))}
      </div>
    </div>
  );                              // ← closing paren + semicolon
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 2rem 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,155,0,0.12) 0%,transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-60%)", pointerEvents: "none" }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid rgba(245,155,0,0.3)`, background: "rgba(245,155,0,0.08)", color: C.accent, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 28 }}>
        <div style={{ width: 6, height: 6, background: C.accent, borderRadius: "50%", animation: "pulse 2s infinite" }} />
        AI Career Agent
      </div>

      <h1 style={{ fontSize: "clamp(2rem,4.5vw,3.8rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, maxWidth: 760, color: C.text }}>
        Your career agent that works<br />while you <span style={{ color: C.accent }}>sleep.</span>
      </h1>

      <p style={{ fontSize: "1rem", color: C.text2, maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.7 }}>
        Paste your resume once. JobGenie discovers jobs, scores every role for fit, auto-applies to the right ones, and manages your entire pipeline — from first save to signed offer.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
        <BtnGhost size="lg" href="#how-it-works">See how it works</BtnGhost>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, border: `1px solid ${C.border2}`, background: C.bg2, padding: "10px 18px", borderRadius: 12, cursor: "default" }}>
          <div>
            <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Match Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, lineHeight: 1 }}>92/100</div>
          </div>
          <div style={{ width: 1, height: 32, background: C.border2 }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, color: C.text2 }}>Senior Frontend Engineer</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Linear · San Francisco</div>
          </div>
        </div>
        <Link to="/auth"><BtnPrimary size="lg">Start free →</BtnPrimary></Link>
      </div>

      <p style={{ fontSize: 12, color: C.text3, marginTop: 14 }}>Free to start · Google sign-in · No credit card required</p>

      <div style={{ width: "100%", maxWidth: 1100, marginTop: 24 }}>
        <HeroScreenshots />
      </div>
    </section>
  );
}

// ── Problem ───────────────────────────────────────────────────────────────────
const problemCards = [
  { icon: <IcoFiles size={20} />, rows: [{ label: "LinkedIn Easy Apply", tag: "No tracking", v: "old" as TagVariant }, { label: "Naukri application", tag: "No tracking", v: "old" as TagVariant }, { label: "Email follow-up?", tag: "Forgotten", v: "stale" as TagVariant }], title: "No single source of truth.", desc: "Applications scattered across platforms, spreadsheets, and memory. Nothing connected." },
  { icon: <IcoClock size={20} />, rows: [{ label: "team-standup.md", tag: "5D AGO", v: "stale" as TagVariant }, { label: "product-roadmap.md", tag: "2W AGO", v: "old" as TagVariant }, { label: "offer-tracker.md", tag: "5W AGO", v: "old" as TagVariant }], title: "Your pipeline goes cold.", desc: "Interviews pass, follow-ups are missed, and offers expire. Without a system, opportunities vanish." },
  { icon: <IcoRefresh size={20} />, rows: [{ label: "Resume v1.docx", tag: "Generic", v: "old" as TagVariant }, { label: "Resume v2_final.docx", tag: "Outdated", v: "stale" as TagVariant }, { label: "Cover letter...?", tag: "None", v: "old" as TagVariant }], title: "Same resume, every role.", desc: "One-size-fits-all applications mean low interview probability. You never know why you got rejected." },
];

function HoverRow({ label, tag, variant }: { label: string; tag: string; variant: TagVariant }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: hovered ? C.bg3 : C.bg2, borderRadius: 6, border: `1px solid ${hovered ? C.border2 : C.border}`, transition: "all .15s", cursor: "default" }}><span style={{ fontSize: 12, color: C.text2 }}>{label}</span><Tag variant={variant}>{tag}</Tag></div>;
}

function ProblemCard({ card }: { card: typeof problemCards[0] }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ background: hovered ? "#131313" : C.bg2, padding: "36px 28px", display: "flex", flexDirection: "column", gap: 16, transition: "background .2s", cursor: "default" }}>
      <div style={{ width: 44, height: 44, background: hovered ? "rgba(245,155,0,0.08)" : C.bg3, border: `1px solid ${hovered ? "rgba(245,155,0,0.25)" : C.border2}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>{card.icon}</div>
      <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>{card.rows.map((row) => <HoverRow key={row.label} label={row.label} tag={row.tag} variant={row.v} />)}</div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{card.title}</h3>
      <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7 }}>{card.desc}</p>
    </div>
  );
}

function Problem() {
  return (
    <section style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>Problem</Eyebrow>
          <SectionTitle center>Job hunting is <span style={{ color: C.accent }}>broken by design.</span></SectionTitle>
          <p style={{ fontSize: "1rem", color: C.text2, maxWidth: 520, lineHeight: 1.7, margin: "0 auto 0" }}>You're applying to 50+ roles, tracking nothing, and getting ghosted — because every tool stops at the posting.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {problemCards.map((card) => <ProblemCard key={card.title} card={card} />)}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
const steps = [
  { n: "01", title: "Upload Once", icon: <IcoUpload />, desc: "Sign up, drop your resume. AI extracts your skills, experience, gaps and strengths — your profile is ready." },
  { n: "02", title: "Discover Jobs", icon: <IcoSearch />, desc: "Pulls from LinkedIn, Indeed, Naukri, Wellfound, and more. AI-matches openings to your goals and preferences." },
  { n: "03", title: "AI Scoring", icon: <IcoTarget />, desc: "Every role scored 0–100. Interview probability calculated. Only the best matches get auto-applied." },
  { n: "04", title: "Smart Apply", icon: <IcoPencil />, desc: "Tailors your resume and cover letter per role. Submits applications overnight on your behalf, within your approval rules." },
  { n: "05", title: "Track & Remind", icon: <IcoCalendar />, desc: "Syncs interviews to Google Calendar. Sends follow-up reminders. Manages every deadline automatically." },
  { n: "06", title: "Get Hired", icon: <IcoRocket />, desc: "Interview prep, company research summaries, negotiation tips. Supported until you accept an offer." },
];

function StepCard({ s }: { s: typeof steps[0] }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ background: hovered ? "#131313" : C.bg2, padding: "32px 24px", position: "relative", transition: "background .2s", cursor: "default" }}>
      <span style={{ fontSize: 11, color: hovered ? C.border2 : C.border, position: "absolute", top: 20, right: 20, letterSpacing: "0.1em", transition: "color .2s" }}>{s.n}</span>
      <div style={{ width: 40, height: 40, background: hovered ? "rgba(245,155,0,0.18)" : "rgba(245,155,0,0.1)", border: `1px solid ${hovered ? "rgba(245,155,0,0.4)" : "rgba(245,155,0,0.2)"}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, transition: "all .2s", transform: hovered ? "scale(1.08)" : "scale(1)" }}>{s.icon}</div>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>{s.title}</h3>
      <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.7 }}>{s.desc}</p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle center>From resume to offer,<br /><span style={{ color: C.accent }}>fully on autopilot.</span></SectionTitle>
          <p style={{ fontSize: "1rem", color: C.text2, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>A few clicks. Then JobGenie runs the entire process — finding, filtering, applying, and tracking — without you lifting a finger.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {steps.map((s) => <StepCard key={s.n} s={s} />)}
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: C.text3, marginTop: 28, fontStyle: "italic" }}>And forget. From now on, every relevant job is scored, applied to, and tracked — automatically.</p>
      </div>
    </section>
  );
}

// ── Feature Tabs ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    tab: "Jobs",
    img: jg1,
    url: "app.jobgenie.ai/jobs",
    heading: "Every relevant job, scored for you",
    body: "JobGenie pulls live listings from LinkedIn, Naukri, Indeed, Wellfound, and more — then scores each one against your profile. Filter by role type, seniority, remote, and salary. No more endless scrolling.",
    bullets: ["100+ live listings refreshed daily", "Full-time, remote, and senior filters", "One-click apply or save to pipeline", "Salary range filter with match scores"],
  },
  {
    tab: "Pipeline",
    img: jg2,
    url: "app.jobgenie.ai/applications",
    heading: "Your entire job search, one board",
    body: "Every application you've saved, applied to, interviewed for, or received an offer from — in a single kanban board. AI scores every card. See exactly where you stand across 46 applications at a glance.",
    bullets: ["Saved → Applied → Interviewing → Offer stages", "AI score on every application card", "Interview prep and offer actions inline", "Active rate and conversion stats at top"],
  },
  {
    tab: "Opportunities",
    img: jg3,
    url: "app.jobgenie.ai/opportunities",
    heading: "Roles you should have found already",
    body: "Genie surfaces high-match roles you haven't looked at yet — ranked by fit, freshness, and your career trajectory. Each card explains exactly why it was picked for you.",
    bullets: ["Why Genie picked this — per card", "99%, 98%, 97% match breakdowns", "Posted today + High Match badges", "Ask Genie for instant role analysis"],
  },
  {
    tab: "Genie Chat",
    img: jg4,
    url: "app.jobgenie.ai/opportunities",
    heading: "Your AI career agent, always on",
    body: "Genie knows your applications, interviews, offers, and job matches. Ask it anything — what to do today, which jobs to prioritize, whether to accept an offer, or how to prep for tomorrow's interview.",
    bullets: ["Context-aware across your full pipeline", "Quick prompts: prioritize, prep, review", "Should I accept my offer? — just ask", "Proactive morning briefings"],
  },
  {
    tab: "Agent",
    img: jg5,
    url: "app.jobgenie.ai/agent",
    heading: "Auto-apply with full explainability",
    body: "Set your match threshold. Hit Run Agent. JobGenie scans every open role, scores each one, and queues the best matches. Every score comes with a full AI breakdown — skill by skill, point by point.",
    bullets: ["Match threshold slider (e.g. 92%)", "Apply all queued jobs in one click", "AI Hiring Explainability per card", "Skill-level breakdown: Java +25, Kafka +20..."],
  },
  {
    tab: "Career Gap",
    img: jg6,
    url: "app.jobgenie.ai/career-gap",
    heading: "Know exactly what's holding you back",
    body: "Pick any role type — Data Analyst, Product Manager, Backend Engineer. Genie shows your current match %, missing skills, hiring probability, and a full learning roadmap with salary impact.",
    bullets: ["Skill breakdown with % coverage bars", "Missing skills clearly called out", "Hiring probability before and after roadmap", "Salary impact: current vs. after roadmap"],
  },
  {
    tab: "Profile",
    img: jg7,
    url: "app.jobgenie.ai/profile",
    heading: "Your resume, scored and fixed",
    body: "Parse your resume to auto-fill your profile. Then Enhance it — Genie scores every section, identifies weak spots, and gives you specific fixes. Summary, Skills, Experience, Education, Formatting, Projects.",
    bullets: ["Resume score out of 100 with summary", "Top Strengths and Quick Wins panels", "Section-by-section: issue + fix per section", "Parse fills profile · Enhance gives fix list"],
  },
  {
    tab: "Interview Prep",
    img: jg8,
    url: "app.jobgenie.ai/interview-prep",
    heading: "Company research + mock questions",
    body: "For every company you're interviewing with, Genie generates a full company overview, culture brief, and mock interview questions — split by Technical, Behavioural, and Role-Specific categories.",
    bullets: ["Company overview and culture brief", "Technical, Behavioural, Role-Specific tabs", "Questions tailored to the exact JD", "Expandable answers for each question"],
  },
  {
    tab: "Session Debrief",
    img: jg9,
    url: "app.jobgenie.ai/interview-prep/debrief",
    heading: "Know how you'd perform before you walk in",
    body: "After a mock session, get a full debrief — hire readiness score, confidence, technical, and communication breakdown.",
    bullets: ["Hire readiness % with verdict", "Confidence / Technical / Communication scores", "Top Strength and Critical Gap cards", "Answer-by-answer breakdown with scores"],
  },
  {
    tab: "Sign Up",
    img: jg10,
    url: "app.jobgenie.ai/auth",
    heading: "Up and running in under 60 seconds",
    body: "Sign up with Google or email. No credit card. No sales call. Drop your resume and Genie fills your profile instantly. From signup to your first AI-scored job match in under a minute.",
    bullets: ["Google OAuth or email/password", "Resume → profile in seconds", "AI scoring + tailored pitches immediately", "Notes, checklists, reminders from day one"],
  },
];

function FeatureTabs() {
  const [active, setActive] = useState(0);
  const f = FEATURES[active];
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32, justifyContent: "center" }}>
        {FEATURES.map((feat, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", ...(i === active ? { background: C.accent, color: "#000", border: "none" } : { background: "rgba(255,255,255,0.05)", color: C.text2, border: `1px solid ${C.border}` }) }}>
            {feat.tab}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
        <BrowserFrame url={f.url}>
          <img src={f.img} alt={f.tab} style={{ width: "100%", maxHeight: 560, objectFit: "cover", objectPosition: "top", display: "block" }} />
        </BrowserFrame>

        <div>
          <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.15em", color: C.accent, textTransform: "uppercase", background: "rgba(245,155,0,0.08)", border: `1px solid rgba(245,155,0,0.2)`, padding: "3px 10px", borderRadius: 4 }}>{f.tab}</span>
          <h3 style={{ fontSize: "clamp(1.4rem,2.5vw,2rem)", fontWeight: 700, color: C.text, marginTop: 16, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{f.heading}</h3>
          <p style={{ fontSize: 14, color: C.text2, marginTop: 12, lineHeight: 1.75 }}>{f.body}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {f.bullets.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                <IcoCheck size={14} color={C.accent} strokeWidth={2.5} />
                {b}
              </li>
            ))}
          </ul>
          <Link to="/auth" style={{ display: "inline-block", marginTop: 28, textDecoration: "none" }}>
            <BtnPrimary size="md">Try {f.tab} →</BtnPrimary>
          </Link>
        </div>
      </div>
    </div>
  );
}
function Features() {
  return (
    <section id="features" style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow>Features</Eyebrow>
          <SectionTitle center>Everything your job search needs</SectionTitle>
          <p style={{ fontSize: "1rem", color: C.text2, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Every module with real screenshots from the live JobGenie platform.</p>
        </div>
        <FeatureTabs />
      </div>
    </section>
  );
}

// ── ROI Calculator ────────────────────────────────────────────────────────────
function ROICalculator() {
  const [jobsPerWeek, setJobsPerWeek] = useState(15);
  const [minsPerApp, setMinsPerApp] = useState(25);
  const [weeklySearch, setWeeklySearch] = useState(5);

  const totalMinsManual = jobsPerWeek * minsPerApp + weeklySearch * 60;
  const totalMinsWithGenie = jobsPerWeek * 2 + weeklySearch * 10;
  const hoursSaved = Math.round((totalMinsManual - totalMinsWithGenie) / 60);
  const weeksSaved = Math.round(hoursSaved * 52 / 40);
  const extraApps = Math.round(jobsPerWeek * 2.5);
  const interviewBoost = Math.round(extraApps * 0.12);

  const StatBox = ({ value, label, color = C.accent }: { value: string; label: string; color?: string }) => (
    <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid rgba(245,155,0,0.15)`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.text3, marginTop: 6, lineHeight: 1.4 }}>{label}</div>
    </div>
  );

  return (
    <section style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ borderRadius: 24, overflow: "hidden", border: `1px solid rgba(245,155,0,0.15)`, background: "rgba(245,155,0,0.03)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ padding: "48px 52px", borderRight: `1px solid rgba(255,255,255,0.06)` }}>
              <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 12 }}>ROI Calculator</p>
              <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 8, color: C.text }}>See how many hours<br />you get back.</h2>
              <p style={{ fontSize: 13, color: C.text3, marginBottom: 40, lineHeight: 1.7 }}>Drag to match your current job-search habits.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {[
                  { label: "Jobs applied per week", val: jobsPerWeek, set: setJobsPerWeek, min: 1, max: 50, display: `${jobsPerWeek}` },
                  { label: "Minutes per application", val: minsPerApp, set: setMinsPerApp, min: 5, max: 90, display: `${minsPerApp}m` },
                  { label: "Hours/week searching for jobs", val: weeklySearch, set: setWeeklySearch, min: 1, max: 20, display: `${weeklySearch}h` },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <label style={{ fontSize: 13, color: C.text2 }}>{s.label}</label>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{s.display}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} value={s.val} onChange={(e) => s.set(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32, padding: "14px 18px", borderRadius: 10, background: C.bg3, border: `1px solid ${C.border2}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 11, color: C.text3, margin: 0 }}>Currently spending</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "2px 0 0" }}>{Math.round(totalMinsManual / 60)}h <span style={{ fontSize: 12, color: C.text3, fontWeight: 400 }}>/ week</span></p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: C.text3, margin: 0 }}>With JobGenie</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: C.green, margin: "2px 0 0" }}>{Math.round(totalMinsWithGenie / 60)}h <span style={{ fontSize: 12, color: C.text3, fontWeight: 400 }}>/ week</span></p>
                </div>
              </div>
            </div>
            <div style={{ padding: "48px 52px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontSize: 12, color: C.text3, marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your estimated savings</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <StatBox value={`${hoursSaved}h`} label="saved every week" />
                <StatBox value={`${weeksSaved}w`} label="saved per year" color={C.green} />
                <StatBox value={`+${extraApps}`} label="extra apps/month" color="#a78bfa" />
                <StatBox value={`+${interviewBoost}`} label="more interviews/month" color="#60a5fa" />
              </div>
              <div style={{ background: C.bg3, border: `1px solid rgba(245,155,0,0.15)`, borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IcoZap size={14} color={C.accent} />
                  <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>Time breakdown</span>
                </div>
                {[
                  { label: "Per-role research", saved: `${Math.round(minsPerApp * 0.4)}m saved/app`, pct: 40 },
                  { label: "Resume tailoring", saved: `${Math.round(minsPerApp * 0.35)}m saved/app`, pct: 35 },
                  { label: "Job discovery", saved: `${Math.round(weeklySearch * 0.7 * 60)}m saved/week`, pct: 70 },
                ].map((item) => (
                  <div key={item.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: C.text3 }}>{item.label}</span>
                      <span style={{ fontSize: 11, color: C.accent }}>{item.saved}</span>
                    </div>
                    <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${item.pct}%`, height: "100%", background: C.accent, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/auth"><BtnPrimary size="lg" style={{ width: "100%", justifyContent: "center" }}>Start saving time today →</BtnPrimary></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Integrations ──────────────────────────────────────────────────────────────
const integrationApps = [
  { name: "LinkedIn", domain: "linkedin.com" }, { name: "Naukri", domain: "naukri.com" }, { name: "Indeed", domain: "indeed.com" }, { name: "Wellfound", domain: "wellfound.com" }, { name: "Internshala", domain: "internshala.com" }, { name: "Glassdoor", domain: "glassdoor.com" },
  { name: "Google Cal", domain: "calendar.google.com" }, { name: "Gmail", domain: "gmail.com" }, { name: "Outlook", domain: "outlook.com" }, { name: "Google Drive", domain: "drive.google.com" }, { name: "Slack", domain: "slack.com" }, { name: "GitHub", domain: "github.com" },
  { name: "Docs", domain: "docs.google.com" }, { name: "Lever", domain: "lever.co" }, { name: "Greenhouse", domain: "greenhouse.io" }, { name: "Workday", domain: "workday.com" }, { name: "Supabase", domain: "supabase.com" }, { name: "+ more", domain: null },
];

function IntegrationTile({ app }: { app: typeof integrationApps[0] }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ background: hovered ? C.bg3 : app.domain ? C.bg2 : C.bg3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 12px", gap: 10, cursor: "default", transition: "background .15s" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: app.domain ? (hovered ? "rgba(245,155,0,0.08)" : "rgba(255,255,255,0.04)") : "transparent", border: app.domain ? `1px solid ${hovered ? "rgba(245,155,0,0.3)" : C.border2}` : "none", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "all .15s", transform: hovered ? "scale(1.1)" : "scale(1)" }}>
        <AppLogo domain={app.domain} name={app.name} size={28} />
      </div>
      <div style={{ fontSize: 11, color: C.text2, textAlign: "center" }}>{app.name}</div>
    </div>
  );
}

function Integrations() {
  return (
    <section id="integrations" style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>Integrations</Eyebrow>
          <SectionTitle center>Connects everywhere<br /><span style={{ color: C.accent }}>you already work.</span></SectionTitle>
          <p style={{ fontSize: "1rem", color: C.text2, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>JobGenie pulls jobs and context from all the platforms you use, and pushes updates to your calendar and email automatically.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: C.border, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {integrationApps.map((app) => <IntegrationTile key={app.name} app={app} />)}
        </div>
      </div>
    </section>
  );
}

// ── Engine ────────────────────────────────────────────────────────────────────
function MatchScoringRow({ dot, label, tag, variant }: { dot: string; label: string; tag: string; variant: TagVariant }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "flex", alignItems: "center", gap: 8, background: hovered ? "#1c1c1c" : C.bg3, border: `1px solid ${hovered ? C.border2 : C.border}`, borderRadius: 8, padding: "8px 12px", transition: "all .15s", cursor: "default" }}><IcoDot color={dot} /><span style={{ fontSize: 12, color: C.text2, flex: 1 }}>{label}</span><Tag variant={variant}>{tag}</Tag></div>;
}

function MatchScoringVisual() {
  const rows = [{ dot: C.green, label: "Senior Frontend · Linear", tag: "92 match", v: "match" as TagVariant }, { dot: C.green, label: "Staff Engineer · Vercel", tag: "88 match", v: "match" as TagVariant }, { dot: C.accent, label: "Frontend Lead · Stripe", tag: "71 match", v: "review" as TagVariant }, { dot: C.border2, label: "React Developer · Unknown", tag: "43 skip", v: "skip" as TagVariant }];
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{rows.map((r) => <MatchScoringRow key={r.label} dot={r.dot} label={r.label} tag={r.tag} variant={r.v} />)}</div>
      <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 12, color: C.text2 }}>Interview probability</span><span style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>78%</span></div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginBottom: 4 }}><div style={{ width: "78%", height: "100%", background: C.accent, borderRadius: 2 }} /></div>
        <div style={{ fontSize: 11, color: C.text3 }}>Based on your profile vs. 2,400 similar applications</div>
      </div>
    </>
  );
}

function CalendarRow({ color, label, time }: { color: string; label: string; time: string }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", borderRadius: 6, background: hovered ? "rgba(255,255,255,0.03)" : "transparent", transition: "background .15s", cursor: "default" }}><IcoDot color={color} /><span style={{ flex: 1, color: C.text2, fontSize: 12 }}>{label}</span><span style={{ color: C.text3, fontSize: 12 }}>{time}</span></div>;
}

function CalendarVisual() {
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><IcoCalendar size={14} color={C.accent} /><span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>This week</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[{ color: "#3B82F6", label: "Linear — Technical Screen", time: "Tue 10am" }, { color: C.accent, label: "Vercel — Follow-up due", time: "Wed EOD" }, { color: C.green, label: "Stripe — Offer received", time: "Thu" }, { color: "#3B82F6", label: "Notion — Final round", time: "Fri 2pm" }].map((r) => <CalendarRow key={r.label} {...r} />)}
      </div>
    </div>
  );
}

function PermissionsVisual() {
  const perms = [{ icon: <IcoLock />, label: "Auto-apply to 90+ matches", on: true }, { icon: <IcoDoc />, label: "Tailor resume per role", on: true }, { icon: <IcoMail />, label: "Send follow-up emails", on: true }, { icon: <IcoBuilding />, label: "Apply to startups only", on: false }];
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      {perms.map((p) => {
        const { hovered, onMouseEnter, onMouseLeave } = useHover();
        return <div key={p.label} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: hovered ? C.bg3 : C.bg2, border: `1px solid ${hovered ? C.border2 : C.border}`, borderRadius: 8, transition: "all .15s", cursor: "default" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}>{p.icon}<span style={{ fontSize: 13, color: C.text2 }}>{p.label}</span></div><Toggle on={p.on} /></div>;
      })}
    </div>
  );
}

function OvernightVisual() {
  const stats = [{ icon: <IcoSearch size={13} color={C.text3} />, label: "Jobs scanned", value: "1,247", color: C.text }, { icon: <IcoStar size={13} color={C.text3} />, label: "High-match found", value: "18", color: C.green }, { icon: <IcoSend size={13} color={C.text3} />, label: "Applications sent", value: "7", color: C.accent }, { icon: <IcoDoc size={13} color={C.text3} />, label: "Resumes tailored", value: "7", color: C.accent }];
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><IcoMoon size={16} color={C.accent} /><span style={{ fontWeight: 500, color: C.text }}>Overnight run complete</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {stats.map((s) => {
          const { hovered, onMouseEnter, onMouseLeave } = useHover();
          return <div key={s.label} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: hovered ? C.bg3 : C.bg2, borderRadius: 6, border: `1px solid ${hovered ? C.border2 : C.border}`, transition: "all .15s", cursor: "default" }}><div style={{ display: "flex", alignItems: "center", gap: 7 }}>{s.icon}<span style={{ color: C.text2, fontSize: 12 }}>{s.label}</span></div><span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.value}</span></div>;
        })}
      </div>
    </div>
  );
}

function EngineCard({ visual, title, desc }: { visual: React.ReactNode; title: string; desc: string }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ background: hovered ? "#131313" : C.bg2, padding: "36px 32px", display: "flex", gap: 28, alignItems: "flex-start", transition: "background .2s", cursor: "default" }}><div style={{ flex: 1, minWidth: 0 }}>{visual}</div><div style={{ flex: 1 }}><h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: C.text }}>{title}</h3><p style={{ fontSize: 14, color: C.text2, lineHeight: 1.75 }}>{desc}</p></div></div>;
}

function Engine() {
  return (
    <section style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Eyebrow>Engine</Eyebrow>
        <SectionTitle>State-of-the-art<br /><span style={{ color: C.accent }}>career intelligence.</span></SectionTitle>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 1, background: C.border, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <EngineCard visual={<MatchScoringVisual />} title="AI Match Scoring" desc="Every job scored 0–100 against your profile. Interview probability calculated — not just application count. JobGenie only auto-applies to roles where you genuinely have a strong shot." />
          <EngineCard visual={<CalendarVisual />} title="Full Pipeline Management" desc="Deadlines, interviews, follow-ups, assessments, and offer reminders — all in one dashboard. Auto-synced to Google Calendar so you never miss a beat." />
          <EngineCard visual={<PermissionsVisual />} title="You stay in control" desc="Set your rules once. JobGenie respects them on every application. Toggle what it can and can't do — granular control without micromanagement." />
          <EngineCard visual={<OvernightVisual />} title="Works while you sleep" desc="Every night: finds jobs → filters by your criteria → tailors resume → applies to best matches → schedules reminders. Wake up to interview invites." />
        </div>
      </div>
    </section>
  );
}

// ── Compare ───────────────────────────────────────────────────────────────────
const compareRows = [
  { label: "AI Resume Analysis", li: false, loop: false },
  { label: "Interview Probability Score", li: false, loop: false },
  { label: "Auto-Apply (Rule-Based)", li: false, loop: true },
  { label: "Per-Role Resume Tailoring", li: false, loop: false },
  { label: "Remembers Preferences", li: "Partial", loop: false },
  { label: "Calendar & Reminder Sync", li: false, loop: false },
  { label: "Interview Prep & Negotiation", li: false, loop: false },
  { label: "Full Pipeline Dashboard", li: false, loop: "Partial" },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span style={{ color: C.green, fontSize: 18 }}>✓</span>;
  if (value === false) return <span style={{ color: C.border2, fontSize: 18 }}>✕</span>;
  return <span style={{ fontSize: 12, color: C.text3 }}>{value}</span>;
}

function CompareRow({ row, isLast }: { row: typeof compareRows[0]; isLast: boolean }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr", padding: "14px 24px", borderBottom: isLast ? "none" : `1px solid ${C.border}`, alignItems: "center", fontSize: 14, background: hovered ? C.bg3 : "transparent", transition: "background .15s", cursor: "default" }}><div style={{ color: C.text, fontWeight: 500 }}>{row.label}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Cell value={row.li} /></div><div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Cell value={row.loop} /></div><div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: C.accent, fontWeight: 600, fontSize: 18 }}>✓</span></div></div>;
}

function Compare() {
  return (
    <section id="compare" style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}><Eyebrow>Compare</Eyebrow><SectionTitle center>JobGenie <span style={{ color: C.accent }}>vs the rest.</span></SectionTitle></div>
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr", padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: C.bg3, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.text3 }}>
            <span>Capability</span><span style={{ textAlign: "center" }}>LinkedIn / Naukri</span><span style={{ textAlign: "center" }}>LoopCV</span><span style={{ textAlign: "center", color: C.accent, fontWeight: 700 }}>JobGenie</span>
          </div>
          {compareRows.map((row, i) => <CompareRow key={row.label} row={row} isLast={i === compareRows.length - 1} />)}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const pricingItems = ["Every feature, no tiers", "Every integration included", "No credit card on signup", "No sales call, no catch", "Pay-as-you-go after free tier", "Cancel anytime, keep your data"];

function PricingItem({ item }: { item: string }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "flex", alignItems: "center", gap: 12, background: hovered ? C.bg2 : C.bg3, border: `1px solid ${hovered ? "rgba(245,155,0,0.25)" : C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: hovered ? C.text : C.text2, transition: "all .15s", cursor: "default" }}><IcoCheck />{item}</div>;
}

function Pricing() {
  return (
    <section id="pricing" style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}><Eyebrow>Pricing</Eyebrow></div>
        <div style={{ border: `1px solid rgba(245,155,0,0.25)`, background: C.bg2, borderRadius: 20, padding: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 16, color: C.text }}>Start free.<br />Pay only when<br />you're ready.</h2>
            <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.7, marginBottom: 32 }}>Every feature. Every integration. Free to start — no credit card, no sales call. When you need more, connect a card and pay as you go.</p>
            <Link to="/auth"><BtnPrimary size="lg">Try JobGenie →</BtnPrimary></Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{pricingItems.map((item) => <PricingItem key={item} item={item} />)}</div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding: "100px 2rem", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ border: `1px solid rgba(245,155,0,0.3)`, background: "linear-gradient(135deg,rgba(245,155,0,0.05) 0%,transparent 60%)", borderRadius: 20, padding: "80px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 400, height: 200, background: "radial-gradient(ellipse,rgba(245,155,0,0.1) 0%,transparent 70%)", top: 0, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 16, color: C.text }}>Go to bed.<br />Wake up with <span style={{ color: C.accent }}>interviews.</span></h2>
          <p style={{ fontSize: "1rem", color: C.text2, marginBottom: 40 }}>Let JobGenie run your job hunt while you focus on what matters.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/auth"><BtnPrimary size="lg">Get early access →</BtnPrimary></Link>
            <BtnGhost size="lg">Watch demo</BtnGhost>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function FooterLink({ link }: { link: string }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return <a href="#" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ display: "block", fontSize: 13, color: hovered ? C.text : C.text2, textDecoration: "none", marginBottom: 10, transition: "color .15s", transform: hovered ? "translateX(3px)" : "none" }}>{link}</a>;
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return <div><h4 style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: 16 }}>{title}</h4>{links.map((link) => <FooterLink key={link} link={link} />)}</div>;
}

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "48px 2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, marginBottom: 12, color: C.text }}><LogoMark size={24} />JobGenie</div>
          <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.7, maxWidth: 260, marginBottom: 24 }}>The universal career agent. Your data. Your rules. You decide what gets applied to. Structured once. Works forever.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, background: C.green, borderRadius: "50%" }} /><span style={{ fontSize: 12, color: C.text3 }}>All services online</span></div>
        </div>
        <FooterCol title="Product" links={["Try now", "Sign in", "Changelog", "Blog"]} />
        <FooterCol title="Company" links={["About", "Privacy Policy", "Terms", "GitHub ↗"]} />
      </div>
      <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.text3 }}>
        <span>© 2026 JobGenie. Jarvis for your career.</span>
        <span>Built for ApplyAI Hackathon</span>
      </div>
    </footer>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 16, lineHeight: 1.6, overflowX: "hidden" }}>
      <CursorGlow />
      <Nav />
      <Hero />
      <ROICalculator />
      <Problem />
      <HowItWorks />
      <Features />
      <Integrations />
      <Engine />
      <Compare />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}