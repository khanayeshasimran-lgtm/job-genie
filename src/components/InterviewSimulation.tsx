/**
 * InterviewSimulation.tsx
 *
 * Drop this component into your PrepPage just above the closing </div> of the
 * main content column, after the checklists section. It shares the same C / design
 * tokens as the rest of PrepPage — no extra deps needed.
 *
 * Usage in prep.$jobId.tsx:
 *   import { InterviewSimulation } from "@/components/InterviewSimulation";
 *   ...
 *   {application?.id && (
 *     <InterviewSimulation jobId={jobId} />
 *   )}
 *
 * Server functions needed (add to jobgenie.functions.ts):
 *   interviewAsk, interviewEvaluate, interviewDebrief
 */

import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { interviewAsk, interviewEvaluate, interviewDebrief } from "@/lib/jobgenie.functions";

// ── Re-use the same design tokens from PrepPage ───────────────────────────────
const C = {
  bg: "#0A0A0A",
  bg2: "#111111",
  bg3: "#161616",
  bg4: "#1A1A1A",
  accent: "#F59B00",
  accent2: "#D4840A",
  accentDim: "rgba(245,155,0,0.1)",
  accentBorder: "rgba(245,155,0,0.25)",
  border: "#1E1E1E",
  border2: "#2A2A2A",
  text: "#FFFFFF",
  text2: "#999999",
  text3: "#666666",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.1)",
  blue: "#3B82F6",
  blueDim: "rgba(59,130,246,0.1)",
  purple: "#A855F7",
  purpleDim: "rgba(168,85,247,0.1)",
  red: "#EF4444",
  redDim: "rgba(239,68,68,0.1)",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type TranscriptEntry = { role: "interviewer" | "candidate"; text: string };

type Evaluation = {
  question: string;
  answer: string;
  confidence_score: number;
  technical_score: number;
  communication_score: number;
  overall_score: number;
  strengths: string[];
  improvements: string[];
  sample_answer_snippet: string;
};

type Debrief = {
  overall_verdict: string;
  hire_readiness: number;
  top_strength: string;
  critical_gap: string;
  next_steps: string[];
};

type Phase = "idle" | "active" | "evaluating" | "debrief";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  );
}

function ScoreRing({
  value,
  label,
  color,
  size = 72,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border2} strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={C.text}
          fontSize={size < 80 ? 14 : 18}
          fontWeight={700}
          fontFamily="Inter, sans-serif"
        >
          {value}
        </text>
      </svg>
      <span style={{ fontSize: 10, color: C.text3, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AccentLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: C.accent,
        marginBottom: 8,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.text3,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

// ── EvalCard: per-answer feedback ─────────────────────────────────────────────
function EvalCard({ ev, index }: { ev: Evaluation; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: open ? C.bg3 : C.bg2,
          border: "none",
          padding: "12px 16px",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: C.accentDim,
            border: `1px solid ${C.accentBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: C.accent,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>
          {ev.question}
        </span>
        {/* mini score chips */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {[
            { v: ev.overall_score, color: ev.overall_score >= 70 ? C.green : ev.overall_score >= 50 ? C.accent : C.red },
          ].map(({ v, color }) => (
            <span
              key="overall"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: `${color}18`,
                color,
              }}
            >
              {v}
            </span>
          ))}
        </div>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.text3}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div style={{ background: C.bg3, borderTop: `1px solid ${C.border}`, padding: "16px 18px" }}>
          {/* Scores row */}
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 18 }}>
            <ScoreRing value={ev.confidence_score} label="Confidence" color={C.accent} size={72} />
            <ScoreRing value={ev.technical_score} label="Technical" color={C.blue} size={72} />
            <ScoreRing value={ev.communication_score} label="Communication" color={C.purple} size={72} />
          </div>

          {/* Your answer */}
          <SectionLabel>Your answer</SectionLabel>
          <p
            style={{
              fontSize: 12,
              color: C.text2,
              lineHeight: 1.65,
              background: C.bg4,
              borderRadius: 7,
              padding: "10px 12px",
              marginBottom: 14,
              border: `1px solid ${C.border}`,
              fontStyle: "italic",
            }}
          >
            {ev.answer}
          </p>

          {/* Strengths + improvements in 2 col */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <SectionLabel>✓ Strengths</SectionLabel>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ev.strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.text2, display: "flex", gap: 6 }}>
                    <span style={{ color: C.green, flexShrink: 0 }}>●</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel>↑ Improve</SectionLabel>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ev.improvements.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.text2, display: "flex", gap: 6 }}>
                    <span style={{ color: C.accent, flexShrink: 0 }}>●</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sample snippet */}
          <SectionLabel>What a strong answer includes</SectionLabel>
          <p
            style={{
              fontSize: 12,
              color: C.accent,
              lineHeight: 1.6,
              background: C.accentDim,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 7,
              padding: "10px 12px",
            }}
          >
            "{ev.sample_answer_snippet}"
          </p>
        </div>
      )}
    </div>
  );
}

// ── HireReadinessBar ──────────────────────────────────────────────────────────
function HireReadinessBar({ value }: { value: number }) {
  const color = value >= 75 ? C.green : value >= 55 ? C.accent : C.red;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.text3, marginBottom: 5 }}>
        <span>Hire readiness</span>
        <span style={{ color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: C.border2, borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function InterviewSimulation({ jobId }: { jobId: string }) {
  const askFn = useServerFn(interviewAsk);
  const evalFn = useServerFn(interviewEvaluate);
  const debriefFn = useServerFn(interviewDebrief);

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [loadingDebrief, setLoadingDebrief] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Max 6 questions, then debrief
  const MAX_QUESTIONS = 6;
  const isSessionDone = evaluations.length >= MAX_QUESTIONS;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentQuestion]);

  async function startSession() {
    setPhase("active");
    setTranscript([]);
    setEvaluations([]);
    setCurrentQuestion("");
    setDraftAnswer("");
    setDebrief(null);
    setLoadingAsk(true);
    try {
      const { question } = await askFn({ data: { job_id: jobId, transcript: [] } });
      setCurrentQuestion(question);
      setTranscript([{ role: "interviewer", text: question }]);
    } catch (e) {
      toast.error((e as Error).message);
      setPhase("idle");
    } finally {
      setLoadingAsk(false);
    }
  }

  async function submitAnswer() {
    if (!draftAnswer.trim() || loadingEval) return;
    const answer = draftAnswer.trim();
    setDraftAnswer("");
    setLoadingEval(true);

    // Append candidate turn to local transcript
    const updatedTranscript: TranscriptEntry[] = [
      ...transcript,
      { role: "candidate", text: answer },
    ];
    setTranscript(updatedTranscript);

    try {
      // Evaluate this answer
      const ev = await evalFn({
        data: { job_id: jobId, question: currentQuestion, answer },
      });
      const fullEval: Evaluation = { question: currentQuestion, answer, ...ev };
      const newEvals = [...evaluations, fullEval];
      setEvaluations(newEvals);

      if (newEvals.length >= MAX_QUESTIONS) {
        // All questions answered — get debrief
        setPhase("debrief");
        setLoadingDebrief(true);
        try {
          const db = await debriefFn({
            data: {
              job_id: jobId,
              evaluations: newEvals.map(({ question, answer, confidence_score, technical_score, communication_score, overall_score }) => ({
                question, answer, confidence_score, technical_score, communication_score, overall_score,
              })),
            },
          });
          setDebrief(db);
        } catch (e) {
          toast.error("Debrief failed: " + (e as Error).message);
        } finally {
          setLoadingDebrief(false);
        }
      } else {
        // Ask next question
        setLoadingAsk(true);
        try {
          const { question } = await askFn({ data: { job_id: jobId, transcript: updatedTranscript } });
          setCurrentQuestion(question);
          setTranscript((prev) => [...prev, { role: "interviewer", text: question }]);
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setLoadingAsk(false);
        }
      }
    } catch (e) {
      toast.error("Evaluation error: " + (e as Error).message);
    } finally {
      setLoadingEval(false);
    }
  }

  function resetSession() {
    setPhase("idle");
    setTranscript([]);
    setCurrentQuestion("");
    setDraftAnswer("");
    setEvaluations([]);
    setDebrief(null);
  }

  // ── IDLE STATE ──────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <Panel style={{ marginBottom: 16, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>🎙️</div>
        <AccentLabel>✦ Interview Simulation</AccentLabel>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: C.text }}>
          Practice before the real thing
        </h2>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, maxWidth: 440, margin: "0 auto 24px" }}>
          An AI interviewer will ask you <strong style={{ color: C.accent }}>{MAX_QUESTIONS} real questions</strong> tailored
          to this role. After each answer, you'll get instant scores for{" "}
          <span style={{ color: C.accent }}>Confidence</span>,{" "}
          <span style={{ color: C.blue }}>Technical</span>, and{" "}
          <span style={{ color: C.purple }}>Communication</span> — plus a full debrief.
        </p>
        <button
          onClick={startSession}
          style={{
            background: C.accent,
            border: "none",
            color: "#000",
            padding: "10px 28px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "background .2s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = C.accent2)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = C.accent)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Start mock interview
        </button>
      </Panel>
    );
  }

  // ── ACTIVE INTERVIEW ────────────────────────────────────────────────────────
  if (phase === "active") {
    return (
      <Panel style={{ marginBottom: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <AccentLabel>✦ Interview Simulation</AccentLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: C.text3 }}>
              Question{" "}
              <span style={{ color: C.accent, fontWeight: 700 }}>{evaluations.length + 1}</span>
              /{MAX_QUESTIONS}
            </span>
            <button
              onClick={resetSession}
              style={{
                background: "none",
                border: `1px solid ${C.border2}`,
                borderRadius: 6,
                color: C.text3,
                fontSize: 11,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              End session
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.border2, borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
          <div
            style={{
              height: "100%",
              width: `${(evaluations.length / MAX_QUESTIONS) * 100}%`,
              background: C.accent,
              borderRadius: 2,
              transition: "width .3s",
            }}
          />
        </div>

        {/* Chat feed */}
        <div
          style={{
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "16px",
            maxHeight: 340,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {transcript.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                flexDirection: t.role === "candidate" ? "row-reverse" : "row",
                alignItems: "flex-start",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: t.role === "interviewer" ? C.accentDim : C.blueDim,
                  border: `1px solid ${t.role === "interviewer" ? C.accentBorder : "rgba(59,130,246,0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {t.role === "interviewer" ? "🤖" : "👤"}
              </div>
              {/* Bubble */}
              <div
                style={{
                  maxWidth: "75%",
                  background: t.role === "interviewer" ? C.bg4 : C.accentDim,
                  border: `1px solid ${t.role === "interviewer" ? C.border : C.accentBorder}`,
                  borderRadius: 10,
                  padding: "10px 13px",
                  fontSize: 13,
                  color: t.role === "interviewer" ? C.text : C.text,
                  lineHeight: 1.6,
                }}
              >
                {i === transcript.length - 1 && t.role === "interviewer" && evaluations.length < MAX_QUESTIONS
                  ? <strong style={{ color: C.accent }}>{t.text}</strong>
                  : t.text}
              </div>
            </div>
          ))}
          {/* Interviewer "thinking" pulse */}
          {loadingAsk && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentDim, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🤖</div>
              <div style={{ background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", display: "flex", gap: 5 }}>
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    style={{
                      width: 6, height: 6, borderRadius: "50%", background: C.text3,
                      animation: `pulse 1.2s ${d * 0.2}s infinite`,
                    }}
                  />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }`}</style>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Answer input */}
        {!loadingAsk && (
          <div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 6, letterSpacing: "0.08em" }}>
              YOUR ANSWER
            </div>
            <textarea
              value={draftAnswer}
              onChange={(e) => setDraftAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitAnswer();
              }}
              placeholder="Type your answer here… (⌘↵ to submit)"
              rows={4}
              style={{
                width: "100%",
                background: C.bg3,
                border: `1px solid ${C.border2}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 13,
                padding: "12px 14px",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
              disabled={loadingEval}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.text3 }}>{draftAnswer.length} chars</span>
              <button
                onClick={submitAnswer}
                disabled={!draftAnswer.trim() || loadingEval}
                style={{
                  background: !draftAnswer.trim() || loadingEval ? C.border2 : C.accent,
                  border: "none",
                  color: !draftAnswer.trim() || loadingEval ? C.text3 : "#000",
                  padding: "9px 22px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !draftAnswer.trim() || loadingEval ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "background .2s",
                }}
              >
                {loadingEval ? <Spinner /> : null}
                {loadingEval ? "Evaluating..." : "Submit answer →"}
              </button>
            </div>
          </div>
        )}

        {/* Per-question scores so far */}
        {evaluations.length > 0 && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <SectionLabel>Answers so far</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evaluations.map((ev, i) => (
                <EvalCard key={i} ev={ev} index={i} />
              ))}
            </div>
          </div>
        )}
      </Panel>
    );
  }

  // ── DEBRIEF ─────────────────────────────────────────────────────────────────
  if (phase === "debrief") {
    if (loadingDebrief || !debrief) {
      return (
        <Panel style={{ marginBottom: 16, textAlign: "center", padding: "48px 24px" }}>
          <Spinner />
          <p style={{ marginTop: 16, fontSize: 13, color: C.text2 }}>Generating your session debrief…</p>
        </Panel>
      );
    }

    const avgConf = Math.round(evaluations.reduce((s, e) => s + e.confidence_score, 0) / evaluations.length);
    const avgTech = Math.round(evaluations.reduce((s, e) => s + e.technical_score, 0) / evaluations.length);
    const avgComm = Math.round(evaluations.reduce((s, e) => s + e.communication_score, 0) / evaluations.length);

    return (
      <Panel style={{ marginBottom: 16 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <AccentLabel>✦ Session Debrief</AccentLabel>
          <button
            onClick={resetSession}
            style={{
              background: C.accentDim,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 7,
              color: C.accent,
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ↺ Retry interview
          </button>
        </div>

        {/* Verdict banner */}
        <div
          style={{
            background: C.accentDim,
            border: `1px solid ${C.accentBorder}`,
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 22,
            fontSize: 14,
            color: C.text,
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: C.accent, fontWeight: 700 }}>Verdict: </span>
          {debrief.overall_verdict}
        </div>

        {/* Hire readiness */}
        <div style={{ marginBottom: 22 }}>
          <HireReadinessBar value={debrief.hire_readiness} />
        </div>

        {/* Score rings */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 24 }}>
          <ScoreRing value={avgConf} label="Confidence" color={C.accent} />
          <ScoreRing value={avgTech} label="Technical" color={C.blue} />
          <ScoreRing value={avgComm} label="Communication" color={C.purple} />
        </div>

        {/* Strength / gap */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div
            style={{
              background: C.greenDim,
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 10,
              padding: "14px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.green, textTransform: "uppercase", marginBottom: 6 }}>
              Top strength
            </div>
            <p style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{debrief.top_strength}</p>
          </div>
          <div
            style={{
              background: C.redDim,
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 10,
              padding: "14px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.red, textTransform: "uppercase", marginBottom: 6 }}>
              Critical gap
            </div>
            <p style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{debrief.critical_gap}</p>
          </div>
        </div>

        {/* Next steps */}
        <SectionLabel>Before the real interview — do these</SectionLabel>
        <ul style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {debrief.next_steps.map((s, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.text2 }}>
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: C.accentDim,
                  border: `1px solid ${C.accentBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.accent,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ul>

        {/* Per-answer breakdown */}
        <SectionLabel>Answer-by-answer breakdown</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {evaluations.map((ev, i) => (
            <EvalCard key={i} ev={ev} index={i} />
          ))}
        </div>
      </Panel>
    );
  }

  return null;
}