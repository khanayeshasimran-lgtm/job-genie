import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApplications, upsertApplication } from "@/lib/jobgenie.functions";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/applications")({
  component: AppsPage,
});

const C = {
  bg:     "#0A0A0A",
  bg2:    "#111111",
  bg3:    "#161616",
  bg4:    "#1A1A1A",
  accent: "#F59B00",
  accent2:"#D4840A",
  border: "#1E1E1E",
  border2:"#252525",
  text:   "#FFFFFF",
  text2:  "#999999",
  text3:  "#555555",
  green:  "#22C55E",
  red:    "#EF4444",
  blue:   "#3B82F6",
  purple: "#A855F7",
};

const STAGES = ["saved","applied","interviewing","offer","rejected","accepted","declined"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<Stage, { label: string; color: string; emoji: string; bg: string }> = {
  saved:        { label: "Saved",        color: C.text3,   emoji: "📌", bg: "rgba(255,255,255,0.04)" },
  applied:      { label: "Applied",      color: C.accent,  emoji: "📤", bg: "rgba(245,155,0,0.08)"   },
  interviewing: { label: "Interviewing", color: C.blue,    emoji: "🎙️", bg: "rgba(59,130,246,0.08)"  },
  offer:        { label: "Offer",        color: C.green,   emoji: "🎁", bg: "rgba(34,197,94,0.08)"   },
  rejected:     { label: "Rejected",     color: C.red,     emoji: "❌", bg: "rgba(239,68,68,0.06)"   },
  accepted:     { label: "Accepted",     color: C.green,   emoji: "🎊", bg: "rgba(34,197,94,0.08)"   },
  declined:     { label: "Declined",     color: C.text3,   emoji: "🚫", bg: "rgba(255,255,255,0.04)" },
};

// ── Modals ────────────────────────────────────────────────────────────────────
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 100,
    }} />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text2 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 8,
  color: C.text, fontSize: 13, padding: "9px 12px", fontFamily: "inherit",
  outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color .15s",
};

const modalBox: React.CSSProperties = {
  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
  zIndex: 101, background: C.bg2, border: `1px solid ${C.border2}`,
  borderRadius: 16, padding: 28, width: "min(440px, calc(100vw - 32px))",
  boxSizing: "border-box", boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
};

interface InterviewFields { date: string; time: string; type: "online"|"onsite"|"phone"; link: string; }

function InterviewModal({ job, onConfirm, onClose }: {
  job: { title?: string; company?: string };
  onConfirm: (f: InterviewFields) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<InterviewFields>({ date: "", time: "", type: "online", link: "" });
  const set = (k: keyof InterviewFields) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));
  const valid = !!(f.date && f.time);

  const calUrl = () => {
    const start = `${f.date.replace(/-/g,"")}T${f.time.replace(":","")  }00`;
    const [h,m] = f.time.split(":").map(Number);
    const end = `${f.date.replace(/-/g,"")}T${String(h+1).padStart(2,"0")}${String(m).padStart(2,"0")}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interview – ${job.title} @ ${job.company}`)}&dates=${start}/${end}&details=${encodeURIComponent(f.link?`Link: ${f.link}`:`Type: ${f.type}`)}`;
  };

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={modalBox}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.blue, marginBottom: 6 }}>Interview Scheduled</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{job.title}</div>
          <div style={{ fontSize: 13, color: C.text2 }}>{job.company}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Date"><input type="date" value={f.date} onChange={set("date")} style={inputStyle} /></Field>
            <Field label="Time"><input type="time" value={f.time} onChange={set("time")} style={inputStyle} /></Field>
          </div>
          <Field label="Type">
            <select value={f.type} onChange={set("type") as any} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="online">Online / Video call</option>
              <option value="phone">Phone screen</option>
              <option value="onsite">Onsite</option>
            </select>
          </Field>
          {f.type !== "onsite" && (
            <Field label="Meeting Link (optional)">
              <input type="url" placeholder="https://meet.google.com/…" value={f.link} onChange={set("link")} style={inputStyle} />
            </Field>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:`1px solid ${C.border2}`, color:C.text2, fontSize:12, fontWeight:600, padding:"10px 0", borderRadius:8, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={() => { if(!valid) return; onConfirm(f); window.open(calUrl(),"_blank","noopener"); }} disabled={!valid}
            style={{ flex:2, background: valid ? C.blue : C.border2, border:"none", color: valid ? "#fff" : C.text3, fontSize:12, fontWeight:700, padding:"10px 0", borderRadius:8, cursor: valid?"pointer":"not-allowed", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Save &amp; Add to Calendar
          </button>
        </div>
        <p style={{ fontSize:11, color:C.text3, textAlign:"center", marginTop:10, marginBottom:0 }}>Opens Google Calendar in a new tab</p>
      </div>
    </>
  );
}

function OfferAcceptModal({ job, onConfirm, onClose }: {
  job: { title?: string; company?: string };
  onConfirm: (joiningDate?: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const calUrl = () => {
    const d = date.replace(/-/g,"");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🎊 First Day – ${job.company}`)}&dates=${d}/${d}&details=${encodeURIComponent(`Starting ${job.title} at ${job.company}`)}`;
  };
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ ...modalBox, width:"min(400px,calc(100vw - 32px))" }}>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ fontSize:38, marginBottom:10 }}>🎊</div>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:4 }}>Congratulations!</div>
          <div style={{ fontSize:13, color:C.text2 }}>You accepted <strong style={{ color:C.text }}>{job.title}</strong> at <strong style={{ color:C.text }}>{job.company}</strong></div>
        </div>
        <Field label="Joining Date (optional)">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:`1px solid ${C.border2}`, color:C.text2, fontSize:12, fontWeight:600, padding:"10px 0", borderRadius:8, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={() => { onConfirm(date||undefined); if(date) window.open(calUrl(),"_blank","noopener"); }}
            style={{ flex:2, background:C.green, border:"none", color:"#fff", fontSize:12, fontWeight:700, padding:"10px 0", borderRadius:8, cursor:"pointer", fontFamily:"inherit" }}>
            {date ? "Accept & Add to Calendar" : "Accept Offer ✓"}
          </button>
        </div>
      </div>
    </>
  );
}

function OfferExpiryModal({ job, onClose }: { job: { title?: string; company?: string }; onClose: () => void; }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const valid = !!date;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ ...modalBox, width:"min(400px,calc(100vw - 32px))" }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:C.accent, marginBottom:6 }}>Offer Deadline</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Set an expiry reminder</div>
          <div style={{ fontSize:13, color:C.text2 }}>{job.title} · {job.company}</div>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Expiry Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/></Field>
          <Field label="Time"><input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inputStyle}/></Field>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:22 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:`1px solid ${C.border2}`, color:C.text2, fontSize:12, fontWeight:600, padding:"10px 0", borderRadius:8, cursor:"pointer", fontFamily:"inherit" }}>Skip</button>
          <button disabled={!valid} onClick={() => {
            const d=date.replace(/-/g,""), t=time.replace(":","");
            window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`⏰ Offer Expiry – ${job.company}`)}&dates=${d}T${t}00/${d}T${t}00&details=${encodeURIComponent(`Offer for ${job.title} at ${job.company} expires today`)}`, "_blank","noopener");
            onClose();
          }} style={{ flex:2, background: valid?C.accent:C.border2, border:"none", color: valid?"#000":C.text3, fontSize:12, fontWeight:700, padding:"10px 0", borderRadius:8, cursor: valid?"pointer":"not-allowed", fontFamily:"inherit" }}>
            Add to Google Calendar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, color, onClick, full }: { label: string; color: string; onClick: () => void; full?: boolean }) {
  return (
    <button type="button"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{
        flex: full ? "none" : 1, width: full ? "100%" : undefined,
        background: "transparent", border: `1px solid ${color}40`,
        color, fontSize: 11, fontWeight: 600, padding: "6px 4px",
        borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
        letterSpacing: "0.03em", transition: "background .15s, border-color .15s",
        whiteSpace: "nowrap", position: "relative", zIndex: 2,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}18`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}70`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}40`; }}
    >
      {label}
    </button>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({ a, stage, onModal }: {
  a: any; stage: Stage;
  onModal: (type: string, job_id: string, job: any) => void;
}) {
  const scoreColor = !a.ai_score ? C.text3 : a.ai_score >= 95 ? C.green : a.ai_score >= 85 ? C.accent : C.blue;

  return (
    <div style={{
      background: C.bg4, border: `1px solid ${C.border2}`,
      borderRadius: 10, overflow: "hidden", position: "relative",
      transition: "border-color .15s, box-shadow .15s",
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "rgba(245,155,0,0.22)"; el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = C.border2; el.style.boxShadow = "none"; }}
    >
      {/* Score accent line */}
      {a.ai_score && (
        <div style={{ height: 2, background: `linear-gradient(90deg, ${scoreColor} 0%, transparent ${a.ai_score}%)` }} />
      )}

      {/* Card body */}
      <Link to="/jobs/$id" params={{ id: a.job_id }}
        style={{ display: "block", padding: "11px 12px 9px", textDecoration: "none", color: "inherit" }}
        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.02)")}
        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
      >
        <div style={{ fontSize: 13, fontWeight: 650, color: C.text, lineHeight: 1.35, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {a.job?.title}
        </div>
        <div style={{ fontSize: 11, color: C.text2, marginBottom: a.ai_score ? 8 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.job?.company}
        </div>
        {a.ai_score && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill={scoreColor}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{a.ai_score}/100</span>
            <span style={{ fontSize: 10, color: C.text3, marginLeft: 2 }}>AI score</span>
          </div>
        )}
      </Link>

      {/* Action zone */}
      <div style={{ padding: "0 10px 10px" }}>
        {stage === "saved" && (
          <ActionBtn label="Mark Applied →" color={C.accent} full onClick={() => onModal("move-applied", a.job_id, a.job)} />
        )}
        {stage === "applied" && (
          <div style={{ display: "flex", gap: 6 }}>
            <ActionBtn label="🎙 Interview" color={C.blue} onClick={() => onModal("interview", a.job_id, a.job)} />
            <ActionBtn label="Rejected" color={C.red} onClick={() => onModal("move-rejected", a.job_id, a.job)} />
          </div>
        )}
        {stage === "interviewing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href={`/prep/${a.job_id}`} onClick={e => e.stopPropagation()}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, fontSize:11, fontWeight:700, color:C.bg, background:`linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`, borderRadius:7, padding:"6px 0", textDecoration:"none", boxShadow:"0 2px 8px rgba(245,155,0,0.25)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
              </svg>
              Interview Prep
            </a>
            <div style={{ display:"flex", gap:6 }}>
              <ActionBtn label="Got Offer 🎉" color={C.green} onClick={() => onModal("move-offer", a.job_id, a.job)} />
              <ActionBtn label="Rejected" color={C.red} onClick={() => onModal("move-rejected", a.job_id, a.job)} />
            </div>
          </div>
        )}
        {stage === "offer" && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <ActionBtn label="⏰ Set Expiry Reminder" color={C.accent} full onClick={() => onModal("offer-expiry", a.job_id, a.job)} />
            <div style={{ display:"flex", gap:6 }}>
              <ActionBtn label="Accept ✓" color={C.green} onClick={() => onModal("offer-accept", a.job_id, a.job)} />
              <ActionBtn label="Decline" color={C.red} onClick={() => onModal("move-declined", a.job_id, a.job)} />
            </div>
          </div>
        )}
        {stage === "accepted" && (
          <div style={{ textAlign:"center", fontSize:12, fontWeight:700, color:C.green, padding:"2px 0" }}>🎊 Offer Accepted</div>
        )}
        {stage === "declined" && (
          <div style={{ textAlign:"center", fontSize:12, fontWeight:600, color:C.text3, padding:"2px 0" }}>Offer Declined</div>
        )}
        {stage === "rejected" && (
          <div style={{ textAlign:"center", fontSize:12, fontWeight:600, color:C.red, padding:"2px 0", opacity: 0.7 }}>No action needed</div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ModalState =
  | { type: "interview" | "offer-accept" | "offer-expiry"; job_id: string; job: any }
  | null;

function AppsPage() {
  const qc = useQueryClient();
  const listFn   = useServerFn(listApplications);
  const upsertFn = useServerFn(upsertApplication);
  const [modal, setModal] = useState<ModalState>(null);

  const { data: apps } = useQuery({
    queryKey: ["applications"],
    queryFn: () => listFn(),
  });

  const moveMut = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const moveCard = (job_id: string, status: string, msg?: string) => {
    moveMut.mutate({ job_id, status }, {
      onSuccess: () => { if (msg) toast.success(msg, { duration: 5000 }); },
    });
  };

  // Handle simple "move-*" modal types inline
  const handleModal = (type: string, job_id: string, job: any) => {
    if (type === "move-applied")  { moveCard(job_id, "applied"); return; }
    if (type === "move-rejected") { moveCard(job_id, "rejected"); return; }
    if (type === "move-offer")    { moveCard(job_id, "offer", "Offer received 🎉"); return; }
    if (type === "move-declined") { moveCard(job_id, "declined"); return; }
    setModal({ type: type as any, job_id, job });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Stats
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    (apps ?? []).forEach(a => { map[a.status] = (map[a.status] ?? 0) + 1; });
    return map;
  }, [apps]);

  const total = apps?.length ?? 0;
  const activeRate = total ? Math.round(((counts.interviewing ?? 0) + (counts.offer ?? 0)) / total * 100) : 0;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .apps-board::-webkit-scrollbar { height: 5px; }
        .apps-board::-webkit-scrollbar-track { background: transparent; }
        .apps-board::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        .apps-board::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
      `}</style>

      <div style={{ padding: "28px 24px 16px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 6, fontWeight: 700 }}>
              Pipeline
            </div>
            <h1 style={{ fontSize: "clamp(1.3rem,2.2vw,1.7rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Your Applications
            </h1>
          </div>

          {/* Pipeline health stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { val: total,                         label: "total",        color: C.text   },
              { val: counts.applied ?? 0,           label: "applied",      color: C.accent },
              { val: (counts.interviewing ?? 0),    label: "interviewing", color: C.blue   },
              { val: (counts.offer ?? 0),           label: "offers",       color: C.green  },
              { val: `${activeRate}%`,              label: "active rate",  color: C.purple },
            ].map(({ val, label, color }) => (
              <div key={label} style={{
                background: C.bg2, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "8px 14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stage progress strip ── */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 20,
          background: C.bg2, border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: "hidden", height: 36,
        }}>
          {STAGES.filter(s => s !== "declined" && s !== "rejected").map((s, i, arr) => {
            const meta = STAGE_META[s];
            const cnt  = counts[s] ?? 0;
            return (
              <div key={s} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 5, fontSize: 11, fontWeight: cnt > 0 ? 700 : 400,
                color: cnt > 0 ? meta.color : C.text3,
                background: cnt > 0 ? meta.bg : "transparent",
                borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                transition: "background .2s",
              }}>
                <span style={{ fontSize: 13 }}>{meta.emoji}</span>
                <span>{meta.label}</span>
                {cnt > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: "#000",
                    background: meta.color, borderRadius: 8, padding: "0 6px", lineHeight: 1.7,
                  }}>{cnt}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Kanban board ── */}
      <div className="apps-board" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 24px 32px", alignItems: "flex-start",
      }}>
        {STAGES.map((stage) => {
          const items = (apps ?? []).filter(a => a.status === stage);
          const meta  = STAGE_META[stage];
          return (
            <div key={stage} style={{
              background: C.bg2, border: `1px solid ${C.border}`,
              borderRadius: 13, padding: "14px 12px",
              minHeight: 240, flex: "0 0 248px", width: 248,
              display: "flex", flexDirection: "column", gap: 0,
            }}>
              {/* Column header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background: meta.color, flexShrink:0 }} />
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color: C.text2 }}>
                    {meta.label}
                  </span>
                </div>
                <span style={{
                  fontSize:11, fontWeight:700,
                  color: items.length > 0 ? meta.color : C.text3,
                  background: items.length > 0 ? `${meta.color}18` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${items.length > 0 ? `${meta.color}35` : C.border}`,
                  borderRadius:6, padding:"1px 8px",
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                {items.map(a => (
                  <KanbanCard key={a.id} a={a} stage={stage} onModal={handleModal} />
                ))}
                {items.length === 0 && (
                  <div style={{
                    flex:1, display:"flex", flexDirection:"column", alignItems:"center",
                    justifyContent:"center", padding:"24px 0", gap:6,
                  }}>
                    <div style={{ fontSize:22, opacity:0.3 }}>{meta.emoji}</div>
                    <div style={{ fontSize:11, color:C.text3, textAlign:"center" }}>Nothing here yet</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "interview" && (
        <InterviewModal job={modal.job} onClose={() => setModal(null)}
          onConfirm={fields => {
            moveMut.mutate({
              job_id: modal.job_id, status: "interviewing",
              interview_at: `${fields.date}T${fields.time}:00`,
              interview_type: fields.type, interview_link: fields.link || null,
            }, { onSuccess: () => toast.success("Interview scheduled 📅", { duration: 5000 }) });
            setModal(null);
          }}
        />
      )}
      {modal?.type === "offer-accept" && (
        <OfferAcceptModal job={modal.job} onClose={() => setModal(null)}
          onConfirm={date => {
            moveCard(modal.job_id, "accepted", `🎊 Congratulations! You accepted ${modal.job?.title}!`);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "offer-expiry" && (
        <OfferExpiryModal job={modal.job} onClose={() => setModal(null)} />
      )}
    </div>
  );
}