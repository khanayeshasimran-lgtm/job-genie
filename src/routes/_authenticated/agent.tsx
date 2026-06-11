import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { runAutoMatch, getAgentQueue, upsertApplication, explainMatchScore } from "@/lib/jobgenie.functions";
import { useState, useCallback } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentPage,
});

const C = {
  bg: "#0A0A0A", bg2: "#111111", bg3: "#161616", bg4: "#0D0D0D",
  accent: "#F59B00", accent2: "#D4840A",
  border: "#1E1E1E", border2: "#2A2A2A",
  text: "#FFFFFF", text2: "#999999", text3: "#666666",
  green: "#22C55E", red: "#EF4444", blue: "#3B82F6",
};

type AgentResult = {
  scanned: number;
  queued: number;
  matches: Array<{ job_id: string; title: string; company: string; score: number; pitch: string; source_url: string }>;
};

// ── AI Hiring Explainability ──────────────────────────────────────────────────

type SkillFactor = {
  skill: string;
  delta: number;
  reason: string;
};

type ExplainData = {
  summary: string;
  factors: SkillFactor[];
  verdict: string;
};

// ── Explainability Panel ──────────────────────────────────────────────────────

function ExplainPanel({
  jobTitle, company, score, pitch,
}: {
  jobTitle: string; company: string; score: number; pitch: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExplainData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const explainFn = useServerFn(explainMatchScore);
  const scoreColor = (s: number) => s >= 90 ? C.green : s >= 75 ? C.accent : C.text2;

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (data) return;
    setLoading(true);
    setErr(null);
    try {
      const result = await explainFn({ data: { jobTitle, company, score, pitch } });
      setData(result);
    } catch (e) {
      setErr("Couldn't load explanation. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const maxAbs = data ? Math.max(...data.factors.map((f) => Math.abs(f.delta)), 1) : 1;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Trigger button */}
      <button
        onClick={toggle}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          fontSize: 12, fontWeight: 600,
          color: open ? C.accent : C.text3,
          background: "none", border: `1px solid ${open ? "rgba(245,155,0,0.3)" : C.border2}`,
          borderRadius: 8, padding: "6px 13px",
          cursor: "pointer", fontFamily: "inherit",
          transition: "all .15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = C.accent;
          e.currentTarget.style.borderColor = "rgba(245,155,0,0.3)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.color = C.text3;
            e.currentTarget.style.borderColor = C.border2;
          }
        }}
      >
        {/* Spark icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L4.09 12.26a1 1 0 0 0 .91 1.61L11 13l-2 9 8.91-10.26a1 1 0 0 0-.91-1.61L11 11l2-9z" />
        </svg>
        Why {score}/100?
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          marginTop: 10,
          background: C.bg4,
          border: `1px solid rgba(245,155,0,0.15)`,
          borderRadius: 10,
          padding: "18px 18px 14px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* subtle glow */}
          <div style={{
            position: "absolute", width: 220, height: 100,
            background: "radial-gradient(ellipse,rgba(245,155,0,0.05) 0%,transparent 70%)",
            top: -20, right: 0, pointerEvents: "none",
          }} />

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
              <span style={{
                width: 14, height: 14, border: `2px solid rgba(245,155,0,0.25)`,
                borderTopColor: C.accent, borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{ fontSize: 12, color: C.text3 }}>Analysing match…</span>
            </div>
          )}

          {err && (
            <div style={{ fontSize: 12, color: C.red, padding: "8px 0" }}>{err}</div>
          )}

          {data && !loading && (
            <div>
              {/* Header row */}
              <div style={{
                display: "flex", alignItems: "flex-start",
                justifyContent: "space-between", gap: 12, marginBottom: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
                    textTransform: "uppercase", color: C.accent, marginBottom: 6,
                  }}>
                    AI Hiring Explainability
                  </div>
                  <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, margin: 0 }}>
                    {data.summary}
                  </p>
                </div>
                {/* Big score pill */}
                <div style={{
                  flexShrink: 0,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  background: "rgba(0,0,0,0.5)",
                  border: `1px solid ${scoreColor(score)}`,
                  borderRadius: 10, padding: "8px 14px",
                  minWidth: 60,
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>
                    {score}
                  </span>
                  <span style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>/100</span>
                </div>
              </div>

              {/* Factor bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                {data.factors.map((f) => {
                  const isPos = f.delta >= 0;
                  const pct = Math.round((Math.abs(f.delta) / maxAbs) * 100);
                  return (
                    <div key={f.skill}>
                      <div style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between", marginBottom: 3,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: isPos ? C.green : C.red,
                            minWidth: 32, textAlign: "right",
                          }}>
                            {isPos ? "+" : ""}{f.delta}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                            {f.skill}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: C.text3, maxWidth: 220, textAlign: "right" }}>
                          {f.reason}
                        </span>
                      </div>
                      {/* Bar */}
                      <div style={{
                        height: 3, background: C.border2, borderRadius: 99,
                        overflow: "hidden", marginLeft: 39,
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: isPos
                            ? `linear-gradient(90deg,${C.green},rgba(34,197,94,0.5))`
                            : `linear-gradient(90deg,${C.red},rgba(239,68,68,0.5))`,
                          borderRadius: 99,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Verdict */}
              <div style={{
                background: "rgba(245,155,0,0.06)",
                border: `1px solid rgba(245,155,0,0.18)`,
                borderRadius: 8, padding: "9px 12px",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={C.accent} style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
                </svg>
                <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.55 }}>
                  <span style={{ color: C.accent, fontWeight: 700 }}>Tip: </span>
                  {data.verdict}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function AgentPage() {
  const qc = useQueryClient();
  const runFn = useServerFn(runAutoMatch);
  const getQueueFn = useServerFn(getAgentQueue);
  const upsertFn = useServerFn(upsertApplication);

  const [threshold, setThreshold] = useState(92);
  const [lastResult, setLastResult] = useState<AgentResult | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["agent-queue"],
    queryFn: () => getQueueFn(),
  });

  const runMut = useMutation({
    mutationFn: () => runFn({ data: { threshold } }).catch(e => { console.error("CATCH:", e); throw e; }),
    onSuccess: (result) => {
      setLastResult(result as AgentResult);
      if ((result as AgentResult).queued > 0) {
        toast.success(`Agent queued ${(result as AgentResult).queued} high-match jobs!`);
      } else {
        toast.success(`Scanned ${(result as AgentResult).scanned} jobs — no new matches above ${threshold}%`);
      }
      qc.invalidateQueries({ queryKey: ["agent-queue"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e) => {
      console.error("AGENT ERROR:", e);
      toast.error((e as Error).message ?? "Unknown error");
    },
  });

  async function handleApply(jobId: string, sourceUrl: string) {
    setApplyingId(jobId);
    try {
      await upsertFn({ data: { job_id: jobId, status: "applied" } });
      qc.invalidateQueries({ queryKey: ["agent-queue"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Marked as applied!");
      if (sourceUrl) window.open(sourceUrl, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplyingId(null);
    }
  }

  async function handleApplyAll() {
    if (!queue?.length) return;
    let count = 0;
    for (const item of queue) {
      try {
        await upsertFn({ data: { job_id: item.job_id, status: "applied" } });
        count++;
      } catch { /* continue */ }
    }
    qc.invalidateQueries({ queryKey: ["agent-queue"] });
    qc.invalidateQueries({ queryKey: ["applications"] });
    toast.success(`Applied to ${count} jobs! Opening all in new tabs...`);
    queue.slice(0, 5).forEach((item) => {
      if ((item.job as { source_url?: string })?.source_url) {
        setTimeout(() => window.open((item.job as { source_url?: string }).source_url, "_blank"), count * 300);
        count++;
      }
    });
  }

  async function handleDismiss(jobId: string) {
    await upsertFn({ data: { job_id: jobId, status: "rejected" } });
    qc.invalidateQueries({ queryKey: ["agent-queue"] });
    toast("Dismissed");
  }

  const scoreColor = (s: number) => s >= 90 ? C.green : s >= 75 ? C.accent : C.text2;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
padding: "32px 24px 80px",
    }}>
      <div>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 10 }}>
            ✦ Auto-Apply Agent
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Your career agent
          </h1>
          <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.7, maxWidth: 540 }}>
            The agent scans all available jobs, scores each one against your profile, and queues every match above your threshold. Each queued job now shows an AI breakdown of exactly <em>why</em> it scored the way it did.
          </p>
        </div>

        {/* Agent control panel */}
        <div style={{
          background: C.bg2,
          border: `1px solid rgba(245,155,0,0.3)`,
          borderRadius: 14,
          padding: 28,
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Glow */}
          <div style={{
            position: "absolute", width: 320, height: 160,
            background: "radial-gradient(ellipse,rgba(245,155,0,0.07) 0%,transparent 70%)",
            top: -40, right: -40, pointerEvents: "none",
          }} />

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Match threshold</div>
                <p style={{ fontSize: 12, color: C.text3 }}>Only queue jobs scoring at or above this percentage.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range" min={70} max={99} value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  style={{ width: 140, accentColor: C.accent, cursor: "pointer" }}
                />
                <div style={{
                  fontSize: 22, fontWeight: 700,
                  color: threshold >= 90 ? C.green : threshold >= 80 ? C.accent : C.text2,
                  minWidth: 52, textAlign: "right",
                }}>
                  {threshold}%
                </div>
              </div>
            </div>

            <button
              onClick={() => runMut.mutate()}
              disabled={runMut.isPending}
              style={{
                background: runMut.isPending ? C.border2 : `linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`,
                border: "none",
                color: runMut.isPending ? C.text3 : "#000",
                fontSize: 14, fontWeight: 700,
                padding: "12px 28px",
                borderRadius: 10,
                cursor: runMut.isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 10,
                letterSpacing: "0.01em",
              }}
            >
              {runMut.isPending ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)",
                    borderTopColor: "#000", borderRadius: "50%",
                    display: "inline-block", animation: "spin 0.8s linear infinite",
                  }} />
                  Scanning…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L4.09 12.26a1 1 0 0 0 .91 1.61L11 13l-2 9 8.91-10.26a1 1 0 0 0-.91-1.61L11 11l2-9z" />
                  </svg>
                  Run agent
                </>
              )}
            </button>

            {lastResult && (
              <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Jobs scanned", value: lastResult.scanned },
                  { label: "Queued", value: lastResult.queued },
                  { label: "Threshold", value: `${threshold}%` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{value}</div>
                    <div style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Queue header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Agent queue</h2>
            <p style={{ fontSize: 12, color: C.text3 }}>High-match jobs ready for you to apply. Hit "Why X/100?" to see the full score breakdown.</p>
          </div>
          {(queue?.length ?? 0) > 0 && (
            <button
              onClick={handleApplyAll}
              style={{
                background: C.green, border: "none",
                color: "#000", fontSize: 13, fontWeight: 700,
                padding: "9px 20px", borderRadius: 9,
                cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Apply all ({queue?.length})
            </button>
          )}
        </div>

        {queueLoading ? (
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>
            Loading queue...
          </div>
        ) : !queue?.length ? (
          <div style={{
            background: C.bg2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "48px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Queue is empty</div>
            <p style={{ fontSize: 13, color: C.text3, maxWidth: 360, margin: "0 auto" }}>
              Run the agent above to scan all jobs and queue the best matches. Each match will include an AI-powered score breakdown.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {queue.map((item) => {
              const job = item.job as {
                id: string; title: string; company: string;
                location?: string; remote?: boolean; source_url?: string;
                employment_type?: string; salary_min?: number; salary_max?: number;
              };
              const pitch = (item as { ai_pitch?: string }).ai_pitch ?? "";
              const score = item.ai_score as number;
              return (
                <div key={item.id} style={{
                  background: C.bg2,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 12, padding: 20,
                  position: "relative",
                }}>
                  {/* Score badge */}
                  <div style={{
                    position: "absolute", top: 16, right: 16,
                    background: "rgba(0,0,0,0.6)",
                    border: `1px solid ${scoreColor(score)}`,
                    borderRadius: 7, padding: "4px 10px",
                    fontSize: 13, fontWeight: 700, color: scoreColor(score),
                  }}>
                    {score}/100
                  </div>

                  <div style={{ paddingRight: 70 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{job.title}</div>
                    <div style={{ fontSize: 13, color: C.text2, marginBottom: 12 }}>
                      {job.company}
                      {job.location && <span style={{ color: C.text3 }}> · {job.location}</span>}
                      {job.remote && <span style={{ color: C.accent, fontSize: 11, fontWeight: 600, marginLeft: 8 }}>Remote</span>}
                    </div>

                    {pitch && (
                      <div style={{
                        background: C.bg3, border: `1px solid rgba(245,155,0,0.15)`,
                        borderRadius: 8, padding: "10px 14px",
                        fontSize: 12, color: C.text2, lineHeight: 1.6,
                        marginBottom: 14,
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, display: "block", marginBottom: 5 }}>
                          AI pitch
                        </span>
                        {pitch}
                      </div>
                    )}

                    {/* ── AI EXPLAINABILITY ── */}
                    <ExplainPanel
                      jobTitle={job.title}
                      company={job.company}
                      score={score}
                      pitch={pitch}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={() => handleApply(item.job_id, job.source_url ?? "")}
                        disabled={applyingId === item.job_id}
                        style={{
                          background: C.green, border: "none",
                          color: "#000", fontSize: 12, fontWeight: 700,
                          padding: "7px 16px", borderRadius: 8,
                          cursor: "pointer", fontFamily: "inherit",
                          display: "inline-flex", alignItems: "center", gap: 6,
                          opacity: applyingId === item.job_id ? 0.5 : 1,
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {applyingId === item.job_id ? "Applying..." : "Apply now"}
                      </button>
                      <a
                        href={`/jobs/${job.id}`}
                        style={{
                          fontSize: 12, color: C.text2,
                          background: C.bg3, border: `1px solid ${C.border2}`,
                          borderRadius: 8, padding: "7px 14px",
                          textDecoration: "none", fontWeight: 500,
                        }}
                      >
                        View full job
                      </a>
                      {pitch && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(pitch); toast.success("Pitch copied"); }}
                          style={{
                            fontSize: 12, color: C.text3,
                            background: "none", border: `1px solid ${C.border2}`,
                            borderRadius: 8, padding: "7px 14px",
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          Copy pitch
                        </button>
                      )}
                      <button
                        onClick={() => handleDismiss(item.job_id)}
                        style={{
                          fontSize: 12, color: C.red,
                          background: "none", border: `1px solid rgba(239,68,68,0.2)`,
                          borderRadius: 8, padding: "7px 14px",
                          cursor: "pointer", fontFamily: "inherit",
                          marginLeft: "auto",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: 40, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: 16 }}>How the agent works</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { step: "01", label: "Scans all jobs", desc: "Every job in the database not yet in your pipeline." },
              { step: "02", label: "AI scores each one", desc: "Groq scores fit against your profile — skills, experience, level." },
              { step: "03", label: "Queues top matches", desc: `Only jobs at or above ${threshold}% match make the cut.` },
              { step: "04", label: "Explains every score", desc: 'Hit "Why X/100?" to see a skill-by-skill breakdown with deltas.' },
              { step: "05", label: "You apply in one click", desc: "Review the AI pitch, hit Apply, source URL opens automatically." },
            ].map(({ step, label, desc }) => (
              <div key={step}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 6 }}>{step}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}