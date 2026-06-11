import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeVoiceAnswer } from "@/lib/jobgenie.functions";

const C = {
  bg: "#0A0A0A", bg2: "#111111", bg3: "#161616",
  accent: "#F59B00", accent2: "#D4840A",
  accentDim: "rgba(245,155,0,0.1)", accentBorder: "rgba(245,155,0,0.25)",
  border: "#1E1E1E", border2: "#2A2A2A",
  text: "#FFFFFF", text2: "#999999", text3: "#666666",
  green: "#22C55E", greenDim: "rgba(34,197,94,0.1)",
  red: "#EF4444", redDim: "rgba(239,68,68,0.1)",
  blue: "#3B82F6", blueDim: "rgba(59,130,246,0.1)",
  purple: "#A855F7", purpleDim: "rgba(168,85,247,0.1)",
};

const FILLERS = ["um", "uh", "like", "you know", "so", "basically", "literally", "right", "okay"];

function countFillers(text: string): number {
  const lower = text.toLowerCase();
  return FILLERS.reduce((count, filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    return count + (lower.match(regex)?.length ?? 0);
  }, 0);
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={70} height={70} viewBox="0 0 70 70">
        <circle cx={35} cy={35} r={r} fill="none" stroke={C.border2} strokeWidth={5} />
        <circle
          cx={35} cy={35} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x={35} y={39} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
    </div>
  );
}

function PulsingOrb({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {active && (
        <>
          <div style={{ position: "absolute", width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", animation: "ping 1.2s ease-out infinite" }} />
          <div style={{ position: "absolute", width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.1)", animation: "ping 1.2s ease-out infinite 0.3s" }} />
        </>
      )}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: active ? C.red : C.bg3,
        border: `2px solid ${active ? C.red : C.border2}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s",
        cursor: "pointer",
        zIndex: 1,
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : C.text3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
        </svg>
      </div>
      <style>{`
        @keyframes ping { 0% { transform: scale(0.9); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
      `}</style>
    </div>
  );
}

type AnalysisResult = {
  confidence_score: number;
  clarity_score: number;
  pace_score: number;
  tone_score: number;
  overall_score: number;
  wpm: number;
  wpm_verdict: string;
  filler_verdict: string;
  confidence_notes: string;
  tone_notes: string;
  top_strength: string;
  top_fix: string;
  improved_opening: string;
};

export function VoiceAnswerCoach({ jobId, question }: { jobId: string; question: string }) {
  const analyzeFn = useServerFn(analyzeVoiceAnswer);

  const [state, setState] = useState<"idle" | "recording" | "analyzing" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) setSupported(false);
    return () => stopTimer();
  }, []);

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalText = "";

    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + " ";
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(finalText);
      setInterimTranscript(interim);
      setFillerCount(countFillers(finalText + interim));
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") setError(`Mic error: ${e.error}`);
    };

    recognition.start();
    startTimeRef.current = Date.now();
    setState("recording");

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }

  async function stopAndAnalyze() {
    recognitionRef.current?.stop();
    stopTimer();
    setState("analyzing");

    const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const fullText = transcript + interimTranscript;
    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    const fillers = countFillers(fullText);

    try {
      const analysis = await analyzeFn({
        data: {
          job_id: jobId,
          question,
          transcript: fullText,
          duration_seconds: finalDuration,
          filler_count: fillers,
          word_count: wordCount,
        },
      });
      setResult(analysis);
      setState("done");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }

  function reset() {
    setTranscript("");
    setInterimTranscript("");
    setDuration(0);
    setFillerCount(0);
    setResult(null);
    setError(null);
    setState("idle");
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!supported) return (
    <div style={{ padding: "12px 16px", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 10, fontSize: 13, color: C.text3 }}>
      🎙 Voice coaching requires Chrome or Edge (Web Speech API not supported in this browser).
    </div>
  );

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", background: C.bg3, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.accent }}>
            🎙 Voice Answer Coach
          </span>
          <span style={{ fontSize: 10, background: C.accentDim, border: `1px solid ${C.accentBorder}`, color: C.accent, padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>
            AI-Powered
          </span>
        </div>
        {state === "done" && (
          <button onClick={reset} style={{ fontSize: 11, color: C.text3, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            ↺ Try again
          </button>
        )}
      </div>

      <div style={{ padding: "20px 18px", background: C.bg2 }}>
        {/* Question reminder */}
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 14, padding: "10px 14px", background: C.bg3, borderRadius: 8, borderLeft: `3px solid ${C.accentBorder}`, lineHeight: 1.5 }}>
          <span style={{ color: C.accent, fontWeight: 600 }}>Q: </span>{question}
        </div>

        {/* Idle state */}
        {state === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
            <p style={{ fontSize: 13, color: C.text2, textAlign: "center", maxWidth: 380, lineHeight: 1.6 }}>
              Hit record and answer out loud. AI will score your <strong style={{ color: C.text }}>confidence</strong>, <strong style={{ color: C.text }}>clarity</strong>, <strong style={{ color: C.text }}>pace</strong>, and <strong style={{ color: C.text }}>tone</strong>.
            </p>
            <div onClick={startRecording}>
              <PulsingOrb active={false} />
            </div>
            <span style={{ fontSize: 12, color: C.text3 }}>Click to start recording</span>
          </div>
        )}

        {/* Recording state */}
        {state === "recording" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, animation: "ping 1s ease-out infinite" }} />
                <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Recording — {formatTime(duration)}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.text3 }}>
                <span>{transcript.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span style={{ color: fillerCount > 5 ? C.red : fillerCount > 2 ? C.accent : C.green }}>
                  {fillerCount} fillers
                </span>
              </div>
            </div>

            {/* Live transcript */}
            <div style={{ minHeight: 80, background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: C.text2, lineHeight: 1.7 }}>
              {transcript && <span>{transcript}</span>}
              {interimTranscript && <span style={{ color: C.text3, fontStyle: "italic" }}>{interimTranscript}</span>}
              {!transcript && !interimTranscript && <span style={{ color: C.text3 }}>Listening...</span>}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button onClick={stopAndAnalyze} style={{ background: C.red, border: "none", color: "#fff", padding: "10px 28px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="#fff"><rect x={4} y={4} width={16} height={16} rx={2} /></svg>
                Stop & Analyze
              </button>
            </div>
          </div>
        )}

        {/* Analyzing */}
        {state === "analyzing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "28px 0" }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
              <path d="M21 12a9 9 0 00-9-9" />
            </svg>
            <p style={{ fontSize: 13, color: C.text2 }}>Analysing confidence, clarity, pace and tone...</p>
          </div>
        )}

        {/* Results */}
        {state === "done" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Score rings */}
            <div style={{ display: "flex", justifyContent: "space-around", padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
              <ScoreRing score={result.overall_score} label="Overall" color={result.overall_score >= 75 ? C.green : result.overall_score >= 50 ? C.accent : C.red} />
              <ScoreRing score={result.confidence_score} label="Confidence" color={C.accent} />
              <ScoreRing score={result.clarity_score} label="Clarity" color={C.blue} />
              <ScoreRing score={result.pace_score} label="Pace" color={C.purple} />
              <ScoreRing score={result.tone_score} label="Tone" color={C.green} />
            </div>

            {/* Speech metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Pace</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{result.wpm} <span style={{ fontSize: 11, color: C.text3, fontWeight: 400 }}>WPM</span></div>
                <div style={{ fontSize: 11, color: result.wpm_verdict.includes("good") ? C.green : C.accent, marginTop: 2 }}>{result.wpm_verdict}</div>
              </div>
              <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Filler Words</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: fillerCount > 5 ? C.red : fillerCount > 2 ? C.accent : C.green }}>{fillerCount}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{result.filler_verdict}</div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <NoteRow icon="💪" label="Confidence" value={result.confidence_notes} />
              <NoteRow icon="🎵" label="Tone" value={result.tone_notes} />
            </div>

            {/* Strength / Fix */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: C.greenDim, border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>✓ Top Strength</div>
                <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, margin: 0 }}>{result.top_strength}</p>
              </div>
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: C.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>⚡ Fix This First</div>
                <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, margin: 0 }}>{result.top_fix}</p>
              </div>
            </div>

            {/* Improved opening */}
            <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>✦ Stronger Opening</div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>"{result.improved_opening}"</p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: C.red, marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "9px 12px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}>
      <span>{icon}</span>
      <div>
        <span style={{ color: C.text3, fontWeight: 600 }}>{label}: </span>
        <span style={{ color: C.text2, lineHeight: 1.5 }}>{value}</span>
      </div>
    </div>
  );
}