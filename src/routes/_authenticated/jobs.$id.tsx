import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getJob,
  scoreJob,
  explainScore,
  upsertApplication,
  listNotes,
  addNote,
  deleteNote,
  listChecklists,
  addChecklist,
  toggleChecklist,
  deleteChecklist,
} from "@/lib/jobgenie.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  component: JobDetail,
});

// ── Tokens ───────────────────────────────────────────────────────────────────
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
  greenDim: "rgba(34,197,94,0.12)",
  red: "#EF4444",
  redDim: "rgba(239,68,68,0.12)",
  blue: "#3B82F6",
  blueDim: "rgba(59,130,246,0.12)",
  accentDim: "rgba(245,155,0,0.1)",
  accentBorder: "rgba(245,155,0,0.25)",
};

const STATUS_OPTIONS = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const;

type ExplainResult = {
  overall_score: number;
  verdict: string;
  skill_contributions: Array<{
    skill: string;
    delta: number;
    present: boolean;
    weight: "high" | "medium" | "low";
    note: string;
  }>;
  top_boosts: string[];
  top_gaps: string[];
  hiring_likelihood: "very_high" | "high" | "medium" | "low";
  likelihood_reason: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return C.green;
  if (s >= 60) return C.accent;
  return C.red;
}

function likelihoodMeta(l: ExplainResult["hiring_likelihood"]) {
  const map = {
    very_high: { label: "Very High", color: C.green, bg: C.greenDim },
    high:      { label: "High",      color: C.green, bg: C.greenDim },
    medium:    { label: "Medium",    color: C.accent, bg: C.accentDim },
    low:       { label: "Low",       color: C.red,   bg: C.redDim },
  };
  return map[l] ?? map.medium;
}

function weightDot(w: "high" | "medium" | "low") {
  const c = w === "high" ? C.red : w === "medium" ? C.accent : C.text3;
  return (
    <span
      title={`${w} importance`}
      style={{
        display: "inline-block",
        width: 7, height: 7,
        borderRadius: "50%",
        background: c,
        flexShrink: 0,
        marginTop: 1,
      }}
    />
  );
}

// ── Contribution bar row ──────────────────────────────────────────────────────
function ContribRow({ item }: { item: ExplainResult["skill_contributions"][number] }) {
  const [hovered, setHovered] = useState(false);
  const positive = item.delta >= 0;
  const absVal = Math.abs(item.delta);
  // Bar width: delta of ±25 → 100%, scale proportionally, min 4px visible
  const barPct = Math.max(4, Math.min(100, (absVal / 25) * 100));
  const barColor = positive ? C.green : C.red;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 14px",
        borderRadius: 9,
        background: hovered ? C.bg3 : "transparent",
        transition: "background .15s",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hovered ? 6 : 0 }}>
        {/* Weight indicator */}
        {weightDot(item.weight)}

        {/* Skill name */}
        <span style={{
          fontSize: 13, fontWeight: 500, color: item.present ? C.text : C.text3,
          flex: "0 0 130px", minWidth: 0, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
          textDecoration: item.present ? "none" : "line-through",
        }}>
          {item.skill}
        </span>

        {/* Bar track */}
        <div style={{ flex: 1, height: 6, background: C.border2, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${barPct}%`,
            background: barColor,
            borderRadius: 3,
            transition: "width .4s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>

        {/* Delta badge */}
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: positive ? C.green : C.red,
          flex: "0 0 46px", textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}>
          {positive ? "+" : ""}{item.delta}
        </span>

        {/* Present chip */}
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: "1px 6px", borderRadius: 4,
          background: item.present ? C.greenDim : C.redDim,
          color: item.present ? C.green : C.red,
          flex: "0 0 60px", textAlign: "center",
          letterSpacing: "0.04em",
        }}>
          {item.present ? "✓ Have" : "✗ Missing"}
        </span>
      </div>

      {/* Hover note */}
      {hovered && (
        <div style={{
          marginLeft: 17, // align under skill name (past dot)
          fontSize: 12, color: C.text3,
          lineHeight: 1.5,
          paddingTop: 2,
        }}>
          {item.note}
        </div>
      )}
    </div>
  );
}

// ── Explainability panel ──────────────────────────────────────────────────────
function ExplainPanel({
  jobId,
  existingScore,
  existingReasons,
  existingGaps,
  existingPitch,
}: {
  jobId: string;
  existingScore?: number | null;
  existingReasons?: string[] | null;
  existingGaps?: string[] | null;
  existingPitch?: string | null;
}) {
  const explainFn = useServerFn(explainScore);
  const scoreFn = useServerFn(scoreJob);
  const qc = useQueryClient();
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [tab, setTab] = useState<"explain" | "classic">("explain");

  const explainMut = useMutation({
    mutationFn: () => explainFn({ data: { job_id: jobId } }),
    onSuccess: (r) => {
      setResult(r as ExplainResult);
      toast.success("Explainability report ready");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const scoreMut = useMutation({
    mutationFn: () => scoreFn({ data: { job_id: jobId } }),
    onSuccess: () => {
      toast.success("AI scoring complete");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const displayScore = result?.overall_score ?? existingScore;
  const lhMeta = result ? likelihoodMeta(result.hiring_likelihood) : null;
  const isLoading = explainMut.isPending || scoreMut.isPending;

  return (
    <Panel style={{ marginBottom: 16 }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", flexWrap: "wrap",
        gap: 16, marginBottom: 20,
      }}>
        <div>
          <div style={{
            fontSize: 11, letterSpacing: "0.15em",
            textTransform: "uppercase", color: C.accent, marginBottom: 4,
          }}>
            ✦ AI Match & Explainability
          </div>
          <p style={{ fontSize: 13, color: C.text3 }}>
            See exactly why you score the way you do — skill by skill.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Explain button (primary CTA) */}
          <button
            onClick={() => { setTab("explain"); explainMut.mutate(); }}
            disabled={isLoading}
            style={{
              background: isLoading ? C.border2 : `linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`,
              border: "none",
              color: isLoading ? C.text3 : "#000",
              padding: "8px 18px", borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            {explainMut.isPending ? (
              <><Spinner /> Analysing...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  <path d="M11 8v6M8 11h6" />
                </svg>
                {result ? "Re-explain" : "Explain my score"}
              </>
            )}
          </button>

          {/* Classic score button */}
          <button
            onClick={() => { setTab("classic"); scoreMut.mutate(); }}
            disabled={isLoading}
            style={{
              background: "none",
              border: `1px solid ${C.border2}`,
              color: isLoading ? C.text3 : C.text2,
              padding: "8px 14px", borderRadius: 8,
              fontSize: 13, fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            {scoreMut.isPending ? <Spinner /> : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
            {existingScore ? "Re-score" : "Quick score"}
          </button>
        </div>
      </div>

      {/* No data yet */}
      {!displayScore && !result && !isLoading && (
        <div style={{
          background: C.bg3, border: `1px dashed ${C.border2}`,
          borderRadius: 10, padding: "32px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            No score yet
          </p>
          <p style={{ fontSize: 13, color: C.text3, maxWidth: 380, margin: "0 auto" }}>
            Click <strong style={{ color: C.accent }}>Explain my score</strong> to see a skill-by-skill breakdown of why you match this job — like a recruiter's internal notes made transparent.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: 42, borderRadius: 9,
              background: `linear-gradient(90deg,${C.bg3} 25%,${C.border2} 50%,${C.bg3} 75%)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
              opacity: 1 - i * 0.12,
            }} />
          ))}
          <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>
        </div>
      )}

      {/* Score + likelihood hero */}
      {displayScore && !isLoading && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 24,
          alignItems: "flex-end", marginBottom: 20,
          paddingBottom: 20, borderBottom: `1px solid ${C.border}`,
        }}>
          {/* Score ring */}
          <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke={C.border2} strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40"
                fill="none"
                stroke={scoreColor(displayScore)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - displayScore / 100)}`}
                transform="rotate(-90 48 48)"
                style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(displayScore), lineHeight: 1 }}>
                {displayScore}
              </span>
              <span style={{ fontSize: 10, color: C.text3 }}>/100</span>
            </div>
          </div>

          {/* Verdict + likelihood */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {result?.verdict && (
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 10, fontWeight: 500 }}>
                {result.verdict}
              </p>
            )}
            {lhMeta && result && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  padding: "3px 10px", borderRadius: 5,
                  background: lhMeta.bg, color: lhMeta.color,
                }}>
                  {lhMeta.label} hiring likelihood
                </span>
                <span style={{ fontSize: 12, color: C.text3 }}>{result.likelihood_reason}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EXPLAIN TAB — skill contributions ── */}
      {result && !isLoading && tab === "explain" && (
        <>
          {/* Legend */}
          <div style={{
            display: "flex", gap: 20, flexWrap: "wrap",
            marginBottom: 12, paddingLeft: 2,
            fontSize: 11, color: C.text3,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: C.red, display: "inline-block" }} />
              High importance
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: C.accent, display: "inline-block" }} />
              Medium
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: C.text3, display: "inline-block" }} />
              Low
            </span>
            <span style={{ marginLeft: "auto", fontStyle: "italic" }}>Hover a row for recruiter note</span>
          </div>

          {/* Contribution rows — sorted: present first, then by |delta| desc */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
            {[...result.skill_contributions]
              .sort((a, b) => {
                if (a.present !== b.present) return b.present ? 1 : -1;
                return Math.abs(b.delta) - Math.abs(a.delta);
              })
              .map((item, i) => (
                <ContribRow key={i} item={item} />
              ))
            }
          </div>

          {/* Divider summary */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 16, marginTop: 4,
          }}>
            {/* Top boosts */}
            <div style={{
              background: C.greenDim, border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 9, padding: "14px 16px",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.green, marginBottom: 8,
              }}>
                ↑ What's working for you
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {result.top_boosts.map((b, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text2, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: C.green, fontSize: 11, marginTop: 2 }}>●</span> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Top gaps */}
            <div style={{
              background: C.redDim, border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 9, padding: "14px 16px",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", color: C.red, marginBottom: 8,
              }}>
                ↓ What's holding you back
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {result.top_gaps.map((g, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text2, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: C.red, fontSize: 11, marginTop: 2 }}>○</span> {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* ── CLASSIC TAB — original score reasons/gaps/pitch ── */}
      {tab === "classic" && !isLoading && (existingReasons || existingGaps || existingPitch) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {existingReasons?.length ? (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
                textTransform: "uppercase", color: C.text3, marginBottom: 10,
              }}>
                Why you fit
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {existingReasons.map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text2, display: "flex", gap: 8 }}>
                    <span style={{ color: C.green }}>●</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {existingGaps?.length ? (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
                textTransform: "uppercase", color: C.text3, marginBottom: 10,
              }}>
                Gaps to address
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {existingGaps.map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text2, display: "flex", gap: 8 }}>
                    <span style={{ color: C.text3 }}>○</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {existingPitch && (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
                textTransform: "uppercase", color: C.text3, marginBottom: 10,
              }}>
                Your tailored pitch
              </div>
              <div style={{
                background: C.bg3,
                border: `1px solid rgba(245,155,0,0.2)`,
                borderRadius: 8, padding: "14px 16px",
                fontSize: 13, color: C.text2, lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}>
                {existingPitch}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(existingPitch); toast.success("Pitch copied"); }}
                style={{
                  marginTop: 8, background: "none",
                  border: `1px solid ${C.border2}`, color: C.text2,
                  fontSize: 11, fontWeight: 600, padding: "5px 12px",
                  borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Copy pitch
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function BtnPrimary({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.border2 : C.accent,
        border: "none",
        color: disabled ? C.text3 : "#000",
        padding: "8px 18px",
        borderRadius: 8, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 7,
        transition: "background .2s",
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = C.accent2; }}
      onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = C.accent; }}
    >
      {children}
    </button>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.bg2, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 24, ...style,
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function JobDetail() {
  const { id } = useParams({ from: "/_authenticated/jobs/$id" });
  const qc = useQueryClient();
  const getJobFn = useServerFn(getJob);
  const upsertFn = useServerFn(upsertApplication);

  const { data } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobFn({ data: { id } }),
  });

  const statusMut = useMutation({
    mutationFn: (status: typeof STATUS_OPTIONS[number]) =>
      upsertFn({ data: { job_id: id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  if (!data)
    return (
      <div style={{ minHeight: "100vh", background: C.bg, padding: "60px 2rem", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 900, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, height: 240, opacity: 0.4 }} />
      </div>
    );

  const { job, application: _application } = data;
  const application = _application as typeof _application & {
    interview_probability?: number | null;
    ai_pitch?: string | null;
  } | null | undefined;

  const isInterviewingOrOffer =
    application?.status === "interviewing" || application?.status === "offer";

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "40px 2rem",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Back */}
        <Link to="/jobs" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: C.text2, textDecoration: "none", marginBottom: 28,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to jobs
        </Link>

        {/* Job header */}
        <Panel style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div>
              <h1 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
                {job.title}
              </h1>
              <p style={{ fontSize: 15, color: C.text2, marginBottom: 10 }}>{job.company}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: C.text3 }}>
                {job.location && <span>📍 {job.location}</span>}
                {job.remote && (
                  <span style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 5, padding: "2px 8px", color: C.accent, fontSize: 11, fontWeight: 600 }}>
                    Remote
                  </span>
                )}
                {job.employment_type && <span>{job.employment_type.replace("_", " ")}</span>}
                {job.salary_min && job.salary_max && (
                  <span>{job.currency} {job.salary_min.toLocaleString()}–{job.salary_max.toLocaleString()}</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <select
                value={application?.status ?? "saved"}
                onChange={(e) => statusMut.mutate(e.target.value as typeof STATUS_OPTIONS[number])}
                style={{
                  background: C.bg3, border: `1px solid ${C.border2}`,
                  borderRadius: 8, color: C.text, fontSize: 13,
                  padding: "7px 12px", outline: "none",
                  fontFamily: "inherit", cursor: "pointer", width: 160,
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>

              {job.source_url && (
                <a href={job.source_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: C.text2, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  Apply at source ↗
                </a>
              )}

              {isInterviewingOrOffer && (
                <a href={`/prep/${id}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 700, color: "#000",
                  background: C.accent, borderRadius: 8, padding: "7px 14px",
                  textDecoration: "none", letterSpacing: "0.03em",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                  </svg>
                  Interview Prep
                </a>
              )}
            </div>
          </div>
        </Panel>

        {/* ── Explainability panel ── */}
        <ExplainPanel
          jobId={id}
          existingScore={application?.ai_score}
          existingReasons={application?.ai_match_reasons as string[] | null}
          existingGaps={application?.ai_gaps as string[] | null}
          existingPitch={application?.ai_pitch}
        />

        {/* Description */}
        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>About the role</h2>
          <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {job.description}
          </p>
          {(job.requirements as string[] | null)?.length ? (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: 10 }}>
                Requirements
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(job.requirements as string[]).map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text2, display: "flex", gap: 8 }}>
                    <span style={{ color: C.accent }}>•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        {/* Checklist + Notes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {application ? (
            <ChecklistPanel applicationId={application.id} />
          ) : (
            <Panel><p style={{ fontSize: 13, color: C.text3 }}>Save the job to add checklists.</p></Panel>
          )}
          {application ? (
            <NotesPanel applicationId={application.id} />
          ) : (
            <Panel><p style={{ fontSize: 13, color: C.text3 }}>Save the job to add notes.</p></Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Checklist ────────────────────────────────────────────────────────────────
function ChecklistPanel({ applicationId }: { applicationId: string }) {
  const listFn = useServerFn(listChecklists);
  const addFn = useServerFn(addChecklist);
  const toggleFn = useServerFn(toggleChecklist);
  const delFn = useServerFn(deleteChecklist);
  const qc = useQueryClient();
  const [label, setLabel] = useState("");

  const { data: items } = useQuery({
    queryKey: ["checklist", applicationId],
    queryFn: () => listFn({ data: { application_id: applicationId } }),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["checklist", applicationId] });

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Checklist</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!label.trim()) return;
          await addFn({ data: { application_id: applicationId, label: label.trim() } });
          setLabel(""); inv();
        }}
        style={{ display: "flex", gap: 8, marginBottom: 14 }}
      >
        <input
          value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a task..."
          style={{ flex: 1, background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, padding: "7px 11px", outline: "none", fontFamily: "inherit" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
        />
        <button type="submit" style={{ background: C.accent, border: "none", color: "#000", width: 32, height: 32, borderRadius: 7, fontWeight: 700, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          +
        </button>
      </form>
      <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items?.map((c: any) => (
          <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <div
              onClick={async () => { await toggleFn({ data: { id: c.id, done: !c.done } }); inv(); }}
              style={{ width: 16, height: 16, border: `2px solid ${c.done ? C.accent : C.border2}`, borderRadius: 4, background: c.done ? C.accent : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {c.done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#000" strokeWidth="2" strokeLinecap="round" /></svg>}
            </div>
            <span style={{ flex: 1, color: c.done ? C.text3 : C.text2, textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span>
            <button
              onClick={async () => { await delFn({ data: { id: c.id } }); inv(); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: C.text3, opacity: 0, transition: "opacity .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
            </button>
          </li>
        ))}
        {items?.length === 0 && <li style={{ fontSize: 12, color: C.text3 }}>No tasks yet. Try: tailor resume, send follow-up, prep for interview.</li>}
      </ul>
    </div>
  );
}

// ── Notes ────────────────────────────────────────────────────────────────────
function NotesPanel({ applicationId }: { applicationId: string }) {
  const listFn = useServerFn(listNotes);
  const addFn = useServerFn(addNote);
  const delFn = useServerFn(deleteNote);
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: notes } = useQuery({
    queryKey: ["notes", applicationId],
    queryFn: () => listFn({ data: { application_id: applicationId } }),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["notes", applicationId] });

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Notes</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          await addFn({ data: { application_id: applicationId, title: null, body: body.trim() } });
          setBody(""); inv();
        }}
        style={{ marginBottom: 14 }}
      >
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Recruiter name, interview prep, salary thoughts..."
          rows={3}
          style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 7, color: C.text, fontSize: 13, padding: "9px 11px", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: 8 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
        />
        <button type="submit" style={{ background: C.accent, border: "none", color: "#000", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>
          Add note
        </button>
      </form>
      <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notes?.map((n: any) => (
          <li key={n.id} style={{ fontSize: 13, borderLeft: `2px solid rgba(245,155,0,0.4)`, paddingLeft: 12, position: "relative" }}>
            <p style={{ color: C.text2, whiteSpace: "pre-wrap", marginBottom: 6 }}>{n.body}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: C.text3 }}>{new Date(n.created_at).toLocaleString()}</span>
              <button
                onClick={async () => { await delFn({ data: { id: n.id } }); inv(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 0, opacity: 0, transition: "opacity .15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}