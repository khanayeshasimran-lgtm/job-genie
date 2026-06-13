import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApplications, upsertApplication } from "@/lib/jobgenie.functions";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

// ── Shared styles ─────────────────────────────────────────────────────────────
const modalBox: React.CSSProperties = {
  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
  zIndex: 101, background: C.bg2, border: `1px solid ${C.border2}`,
  borderRadius: 20, width: "min(460px, calc(100vw - 32px))",
  maxHeight: "90vh", overflowY: "auto",
  boxSizing: "border-box", boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
};

const inputStyle: React.CSSProperties = {
  background: "transparent", border: "none",
  color: C.text, fontSize: 13, fontFamily: "inherit",
  outline: "none", width: "100%", padding: 0,
};

const fieldBox: React.CSSProperties = {
  background: C.bg3, border: `1px solid ${C.border2}`,
  borderRadius: 10, padding: "10px 13px",
  display: "flex", alignItems: "center", gap: 9,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
  textTransform: "uppercase", color: C.text3, marginBottom: 8,
  display: "block",
};

// ── Backdrop ──────────────────────────────────────────────────────────────────
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 100,
    }} />
  );
}

// ── InterviewModal ────────────────────────────────────────────────────────────
interface InterviewFields { date: string; time: string; type: "online"|"onsite"|"phone"; link: string; }

const TYPE_OPTIONS: { value: InterviewFields["type"]; label: string; icon: string }[] = [
  { value: "online", label: "Video",  icon: "🎥" },
  { value: "phone",  label: "Phone",  icon: "📞" },
  { value: "onsite", label: "Onsite", icon: "🏢" },
];

function InterviewModal({ job, onConfirm, onClose }: {
  job: { title?: string; company?: string };
  onConfirm: (f: InterviewFields) => void;
  onClose: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewFields["type"]>("online");
  const [link, setLink] = useState("");
  const valid = !!selectedDate;

  const toFields = (): InterviewFields => ({
    date: selectedDate!.toISOString().split("T")[0],
    time: `${String(selectedDate!.getHours()).padStart(2,"0")}:${String(selectedDate!.getMinutes()).padStart(2,"0")}`,
    type: interviewType,
    link,
  });

  const calUrl = () => {
    const pad = (n: number) => String(n).padStart(2,"0");
    const d = selectedDate!;
    const end = new Date(d.getTime() + 60 * 60 * 1000);
    const fmt = (dt: Date) =>
      `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interview – ${job.title} @ ${job.company}`)}&dates=${fmt(d)}/${fmt(end)}&details=${encodeURIComponent(link ? `Link: ${link}` : `Type: ${interviewType}`)}`;
  };

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={modalBox}>

        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21,
            }}>📅</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.blue, marginBottom: 3 }}>
                Schedule interview
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {job.title}
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 6, fontSize: 18, lineHeight: 1, borderRadius: 8, transition: "background .12s, color .12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.text2; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.text3; }}
            >✕</button>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "5px 12px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: `${C.blue}60`, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{job.company}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Calendar — side by side layout */}
          <div>
            <span style={labelStyle}>Date &amp; Time</span>
            <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 12, overflow: "hidden" }}>
              <DatePicker
                selected={selectedDate}
                onChange={(date: any) => setSelectedDate(date)}
                showTimeSelect
                timeIntervals={15}
                minDate={new Date()}
                inline
              />
            </div>
            {selectedDate && (
              <div style={{
                marginTop: 8, padding: "10px 14px",
                background: "rgba(59,130,246,0.08)", border: `1px solid rgba(59,130,246,0.2)`,
                borderRadius: 10, fontSize: 12, color: C.blue, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>📅</span>
                {selectedDate.toLocaleString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                  year: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </div>
            )}
          </div>

          {/* Interview type — segmented control */}
          <div>
            <span style={labelStyle}>Interview type</span>
            <div style={{
              display: "flex", background: C.bg3, border: `1px solid ${C.border2}`,
              borderRadius: 10, padding: 3, gap: 2,
            }}>
              {TYPE_OPTIONS.map(opt => {
                const active = interviewType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInterviewType(opt.value)}
                    style={{
                      flex: 1, padding: "9px 4px", border: "none",
                      borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 12, fontWeight: 600,
                      background: active ? "rgba(59,130,246,0.2)" : "transparent",
                      color: active ? C.blue : C.text3,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "background .15s, color .15s",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting link */}
          {interviewType !== "onsite" && (
            <div>
              <span style={labelStyle}>
                Meeting link{" "}
                <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: C.text3 }}>— optional</span>
              </span>
              <div style={fieldBox}>
                <span style={{ fontSize: 15, flexShrink: 0, color: C.text3 }}>🔗</span>
                <input
                  type="url"
                  placeholder="https://meet.google.com/…"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 24px 22px", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px 0", borderRadius: 10, fontFamily: "inherit",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: "transparent", border: `1px solid ${C.border2}`, color: C.text2,
            transition: "border-color .15s, color .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2; }}
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => { if (!valid) return; onConfirm(toFields()); window.open(calUrl(), "_blank", "noopener"); }}
            style={{
              flex: 2, padding: "12px 0", borderRadius: 10, fontFamily: "inherit",
              fontSize: 13, fontWeight: 700,
              cursor: valid ? "pointer" : "not-allowed",
              background: valid ? C.blue : C.border2,
              border: "none", color: valid ? "#fff" : C.text3,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background .15s, opacity .15s", opacity: valid ? 1 : 0.45,
            }}
          >
            📅 Save &amp; add to calendar
          </button>
        </div>
        <p style={{ fontSize: 11, color: C.text3, textAlign: "center", margin: "0 0 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <span>↗</span> Opens Google Calendar in a new tab
        </p>
      </div>
    </>
  );
}

// ── OfferAcceptModal ──────────────────────────────────────────────────────────
function OfferAcceptModal({ job, onConfirm, onClose }: {
  job: { title?: string; company?: string };
  onConfirm: (joiningDate?: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ ...modalBox, width: "min(400px,calc(100vw - 32px))" }}>
        <div style={{
          background: "linear-gradient(160deg, rgba(34,197,94,0.1), rgba(34,197,94,0.02))",
          borderBottom: `1px solid rgba(34,197,94,0.14)`,
          padding: "32px 24px 24px", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🎊</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>Congratulations!</div>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.65 }}>
            You accepted <strong style={{ color: C.text }}>{job.title}</strong>
            <br />at <strong style={{ color: C.text }}>{job.company}</strong>
          </div>
          <div style={{ width: 44, height: 2, background: "rgba(34,197,94,0.45)", borderRadius: 2, marginTop: 2 }} />
        </div>
        <div style={{ display: "flex", gap: 10, padding: "20px 24px 22px" }}>
          <button onClick={onClose} style={{
            flex: 1, background: "transparent", border: `1px solid ${C.border2}`,
            color: C.text2, fontSize: 13, fontWeight: 600, padding: "12px 0",
            borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
            transition: "border-color .15s, color .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2; }}
          >Cancel</button>
          <button onClick={() => onConfirm(undefined)} style={{
            flex: 2, background: C.green, border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, padding: "12px 0",
            borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
          }}>
            Accept offer ✓
          </button>
        </div>
      </div>
    </>
  );
}

// ── OfferExpiryModal ──────────────────────────────────────────────────────────
function OfferExpiryModal({ job, onClose }: { job: { title?: string; company?: string }; onClose: () => void; }) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const valid = !!selectedDate;

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ ...modalBox, width: "min(400px,calc(100vw - 32px))" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              background: "rgba(245,155,0,0.15)", border: "1px solid rgba(245,155,0,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21,
            }}>⏰</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.accent, marginBottom: 3 }}>
                Offer deadline
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Set an expiry reminder</div>
            </div>
            <button onClick={onClose}
              style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 6, fontSize: 18, lineHeight: 1, borderRadius: 8, transition: "background .12s, color .12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.text2; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.text3; }}
            >✕</button>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "5px 12px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: `${C.accent}60`, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{job.title} · {job.company}</span>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <span style={labelStyle}>Expiry date &amp; time</span>
          <DatePicker
            selected={selectedDate}
            onChange={(date: any) => setSelectedDate(date)}
            showTimeSelect
            timeIntervals={15}
            minDate={new Date()}
            placeholderText="Pick expiry date and time…"
            customInput={
              <div style={{ ...fieldBox, cursor: "pointer" }}>
                <span style={{ fontSize: 15, flexShrink: 0, color: valid ? C.accent : C.text3 }}>⏰</span>
                <span style={{ fontSize: 13, color: selectedDate ? C.text : C.text3, flex: 1 }}>
                  {selectedDate
                    ? selectedDate.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
                    : "Pick expiry date and time…"}
                </span>
                <span style={{ fontSize: 11, color: C.text3 }}>▾</span>
              </div>
            }
          />
          {selectedDate && (
            <div style={{
              marginTop: 8, padding: "10px 14px",
              background: "rgba(245,155,0,0.08)", border: `1px solid rgba(245,155,0,0.2)`,
              borderRadius: 10, fontSize: 12, color: C.accent, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⏰</span>
              {selectedDate.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 24px 22px" }}>
          <button onClick={onClose} style={{
            flex: 1, background: "transparent", border: `1px solid ${C.border2}`,
            color: C.text2, fontSize: 13, fontWeight: 600, padding: "12px 0",
            borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
            transition: "border-color .15s, color .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2; }}
          >Skip</button>
          <button disabled={!valid} onClick={() => {
            if (!valid || !selectedDate) return;
            const pad = (n: number) => String(n).padStart(2,"0");
            const d = `${selectedDate.getFullYear()}${pad(selectedDate.getMonth()+1)}${pad(selectedDate.getDate())}`;
            const t = `${pad(selectedDate.getHours())}${pad(selectedDate.getMinutes())}00`;
            window.open(
              `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`⏰ Offer Expiry – ${job.company}`)}&dates=${d}T${t}/${d}T${t}&details=${encodeURIComponent(`Offer for ${job.title} at ${job.company} expires today`)}`,
              "_blank", "noopener"
            );
            onClose();
          }} style={{
            flex: 2, background: valid ? C.accent : C.border2,
            border: "none", color: valid ? "#000" : C.text3,
            fontSize: 13, fontWeight: 700, padding: "12px 0",
            borderRadius: 10, cursor: valid ? "pointer" : "not-allowed",
            fontFamily: "inherit", opacity: valid ? 1 : 0.45,
            transition: "background .15s, opacity .15s",
          }}>
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
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.background = `${color}18`;
        e.currentTarget.style.borderColor = `${color}70`;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = `${color}40`;
      }}
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
      {a.ai_score && (
        <div style={{ height: 2, background: `linear-gradient(90deg, ${scoreColor} 0%, transparent ${a.ai_score}%)` }} />
      )}
      <Link to="/jobs/$id" params={{ id: a.job_id }}
        style={{ display: "block", padding: "11px 12px 9px", textDecoration: "none", color: "inherit" }}
        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "transparent"; }}
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

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    (apps ?? []).forEach((a: { status: string }) => { map[a.status] = (map[a.status] ?? 0) + 1; });
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

  .react-datepicker {
    background: #161616 !important;
    border: 1px solid #252525 !important;
    border-radius: 12px !important;
    font-family: inherit !important;
    color: #fff !important;
    width: 100% !important;
  }

  .react-datepicker__triangle {
    display: none !important;
  }

  .react-datepicker__header {
    background: #111 !important;
    border-bottom: 1px solid #1e1e1e !important;
    border-radius: 12px 12px 0 0 !important;
    padding-top: 12px !important;
  }

  .react-datepicker__current-month,
  .react-datepicker-time__header {
    color: #fff !important;
    font-size: 13px !important;
    font-weight: 700 !important;
  }

  .react-datepicker__day-name {
    color: #555 !important;
    font-size: 11px !important;
    font-weight: 700 !important;
  }

  .react-datepicker__day {
    color: #888 !important;
    border-radius: 7px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
  }

  .react-datepicker__day:hover {
    background: #252525 !important;
    color: #fff !important;
  }

  .react-datepicker__day--selected {
    background: #3B82F6 !important;
    color: #fff !important;
    font-weight: 700 !important;
  }

  .react-datepicker__day--keyboard-selected {
    background: #3B82F640 !important;
    color: #fff !important;
  }

  .react-datepicker__day--disabled {
    color: #2a2a2a !important;
    cursor: default !important;
  }

  .react-datepicker__day--today {
    color: #F59B00 !important;
  }

  .react-datepicker__navigation-icon::before {
    border-color: #555 !important;
  }

  .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
    border-color: #fff !important;
  }

  .react-datepicker__navigation--previous {
    left: 8px !important;
  }

  .react-datepicker__navigation--next {
    right: 108px !important;
  }

  .react-datepicker__inner-container {
    display: flex !important;
    flex-wrap: nowrap !important;
  }

  .react-datepicker__month-container {
    float: left !important;
  }

  .react-datepicker__time-container {
    float: right !important;
    width: 108px !important;
    border-left: 1px solid #1e1e1e !important;
  }

  .react-datepicker__time {
    background: #161616 !important;
  }

  .react-datepicker__time-box {
    width: 108px !important;
    border-radius: 0 0 12px 0 !important;
  }

  .react-datepicker__time-list {
    scrollbar-width: thin;
    scrollbar-color: #2a2a2a transparent;
    height: 220px !important;
  }

  .react-datepicker__time-list-item {
    color: #888 !important;
    font-size: 12px !important;
    border-radius: 6px !important;
    margin: 1px 4px !important;
    white-space: nowrap !important;
  }

  .react-datepicker__time-list-item:hover {
    background: #252525 !important;
    color: #fff !important;
  }

  .react-datepicker__time-list-item--selected {
    background: #3B82F6 !important;
    color: #fff !important;
    font-weight: 700 !important;
  }

  .react-datepicker__week {
    display: flex !important;
  }

  .react-datepicker__day-names {
    display: flex !important;
  }

  .react-datepicker__day-name,
  .react-datepicker__day {
    flex: 1 !important;
    width: auto !important;
    margin: 1px !important;
    text-align: center !important;
    line-height: 28px !important;
  }

  .react-datepicker-popper {
    z-index: 200 !important;
  }

  .react-datepicker-time__header {
    font-size: 11px !important;
    padding: 4px 0 !important;
  }
`}</style>

      <div style={{ padding: "28px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 6, fontWeight: 700 }}>
              Pipeline
            </div>
            <h1 style={{ fontSize: "clamp(1.3rem,2.2vw,1.7rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Your Applications
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { val: total,                      label: "total",        color: C.text   },
              { val: counts.applied ?? 0,        label: "applied",      color: C.accent },
              { val: counts.interviewing ?? 0,   label: "interviewing", color: C.blue   },
              { val: counts.offer ?? 0,          label: "offers",       color: C.green  },
              { val: `${activeRate}%`,           label: "active rate",  color: C.purple },
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

      <div className="apps-board" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 24px 32px", alignItems: "flex-start",
      }}>
        {STAGES.map((stage) => {
          const items = (apps ?? []).filter((a: { status: string }) => a.status === stage);
          const meta  = STAGE_META[stage];
          return (
            <div key={stage} style={{
              background: C.bg2, border: `1px solid ${C.border}`,
              borderRadius: 13, padding: "14px 12px",
              minHeight: 240, flex: "0 0 248px", width: 248,
              display: "flex", flexDirection: "column", gap: 0,
            }}>
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
              <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                {items.map((a: any) => (
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
          onConfirm={() => {
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