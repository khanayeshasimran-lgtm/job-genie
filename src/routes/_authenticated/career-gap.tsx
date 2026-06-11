import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeCareerGap } from "@/lib/jobgenie.functions";
import { useState, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/career-gap")({
  component: CareerGapPage,
});

const C = {
  bg: "#080809",
  bg2: "#0F0F10",
  bg3: "#141415",
  bg4: "#1A1A1C",
  accent: "#F59B00",
  accentDim: "rgba(245,155,0,0.10)",
  accentBorder: "rgba(245,155,0,0.25)",
  border: "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.10)",
  text: "#F2F2F3",
  text2: "#8A8A90",
  text3: "#4E4E55",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.25)",
  red: "#F05252",
  redDim: "rgba(240,82,82,0.08)",
  redBorder: "rgba(240,82,82,0.22)",
  amber: "#F59B00",
  blue: "#60A5FA",
};

const TARGET_ROLES = [
  "Data Analyst",
  "Full Stack Engineer",
  "ML Engineer",
  "Product Manager",
  "DevOps Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Data Scientist",
];

type GapResult = {
  score: number;
  target_score: number;
  headline: string;
  summary: string;
  skill_breakdown: Array<{
    name: string;
    pct: number;
    status: "strong" | "partial" | "missing";
  }>;
  missing_skills: string[];
  hire_probability: number;
  hire_probability_after: number;
  hire_note: string;
  salary_now: string;
  salary_after: string;
  salary_increase_pct: number;
  roadmap: Array<{
    step: number;
    title: string;
    resources: string;
    duration: string;
    difficulty: "Easy" | "Medium" | "Hard";
  }>;
};

function ScoreRing({ score, size = 104 }: { score: number; size?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 75 ? C.green : score >= 55 ? C.amber : C.red;
  const trackColor =
    score >= 75
      ? "rgba(34,197,94,0.12)"
      : score >= 55
      ? "rgba(245,155,0,0.12)"
      : "rgba(240,82,82,0.12)";
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke={trackColor} strokeWidth="8" />
        <circle
          cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 52 52)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.03em" }}>{score}%</span>
        <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.text3, marginTop: 1 }}>match</span>
      </div>
    </div>
  );
}

function SkillBar({ name, pct, status }: { name: string; pct: number; status: string }) {
  const color =
    status === "strong" ? C.green : status === "partial" ? C.amber : C.red;
  const trackColor =
    status === "strong"
      ? "rgba(34,197,94,0.12)"
      : status === "partial"
      ? "rgba(245,155,0,0.12)"
      : "rgba(240,82,82,0.12)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: trackColor, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 99, transition: "width .9s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

const DIFF_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Easy:   { label: "Easy",   color: C.green, bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.22)"  },
  Medium: { label: "Medium", color: C.amber, bg: "rgba(245,155,0,0.08)",  border: "rgba(245,155,0,0.22)"  },
  Hard:   { label: "Hard",   color: C.red,   bg: "rgba(240,82,82,0.08)",  border: "rgba(240,82,82,0.22)"  },
};

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement("script");
    s.id = id; s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
      textTransform: "uppercase", color: C.text3, marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Pill({
  children,
  color,
  bg,
  border,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", padding: "3px 9px",
      borderRadius: 5, color, background: bg, border: `1px solid ${border}`,
    }}>
      {children}
    </span>
  );
}

function CareerGapPage() {
  const analyzeFn = useServerFn(analyzeCareerGap);
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("Data Analyst");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<GapResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: () =>
      analyzeFn({ data: { text: resumeText, target_role: targetRole } }),
    onSuccess: (r) => setResult(r),
    onError: (e) => toast.error((e as Error).message),
  });

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      if (file.type === "text/plain") {
        setResumeText(await file.text());
        return;
      }
      if (file.type === "application/pdf") {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
          "pdfjs"
        );
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdf = await pdfjsLib
          .getDocument({ data: await file.arrayBuffer() })
          .promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const c = await page.getTextContent();
          text += c.items.map((x: any) => x.str).join(" ") + "\n";
        }
        setResumeText(text);
        toast.success("PDF extracted");
        return;
      }
      if (file.name.endsWith(".docx")) {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
          "mammoth"
        );
        const r = await (window as any).mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        setResumeText(r.value);
        toast.success("DOCX extracted");
      }
    } catch {
      toast.error("Could not read file");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter',-apple-system,sans-serif",
      padding: "32px 24px 80px",    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .result-section { animation: fadeUp .4s ease both }
        .role-btn:hover { opacity: .85 }
        .analyze-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px) }
        .analyze-btn:active:not(:disabled) { transform: translateY(0) }
        .dropzone:hover { border-color: ${C.accentBorder} !important }
      `}</style>

      <div>

        {/* ── Header ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: C.accent, fontWeight: 700, marginBottom: 12,
            background: C.accentDim, border: `1px solid ${C.accentBorder}`,
            padding: "4px 10px", borderRadius: 5,
          }}>
            ✦ AI Career Gap Analyzer
          </div>
          <h1 style={{
            fontSize: "clamp(1.9rem,3.2vw,2.6rem)", fontWeight: 700,
            letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.15,
          }}>
            Where do you stand?
          </h1>
          <p style={{ fontSize: 14, color: C.text2, maxWidth: 520, lineHeight: 1.7 }}>
            Upload your resume, pick a target role — AI maps every gap, builds
            your learning roadmap, and estimates your hiring probability.
          </p>
        </div>

        {/* ── Upload ── */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: C.text,
            marginBottom: 4, display: "flex", alignItems: "center", gap: 7,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Upload resume
          </div>
          <p style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>
            PDF, DOCX, or TXT — or paste below
          </p>

          <div
            className="dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            style={{
              border: `1.5px dashed ${fileName ? C.greenBorder : C.border2}`,
              borderRadius: 10, padding: "26px 20px", textAlign: "center",
              cursor: "pointer", background: C.bg3, marginBottom: 12,
              transition: "border-color .2s",
            }}
          >
            <input
              ref={inputRef} type="file" accept=".pdf,.docx,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {fileName ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{fileName}</span>
              </div>
            ) : (
              <div>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: C.accentDim, border: `1px solid ${C.accentBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 10px",
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: C.text2 }}>
                  <span style={{ color: C.accent, fontWeight: 600 }}>Click to browse</span>
                  {" "}or drag & drop
                </span>
              </div>
            )}
          </div>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={4}
            placeholder="Or paste your resume text here…"
            style={{
              width: "100%", background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13,
              padding: "10px 12px", outline: "none",
              fontFamily: "inherit", resize: "vertical",
              boxSizing: "border-box", lineHeight: 1.6,
              transition: "border-color .15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accentBorder)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
        </Card>

        {/* ── Target role ── */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Target role</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 }}>
            {TARGET_ROLES.map((r) => {
              const active = r === targetRole;
              return (
                <button
                  key={r}
                  className="role-btn"
                  onClick={() => setTargetRole(r)}
                  style={{
                    background: active ? C.accentDim : C.bg3,
                    border: `1px solid ${active ? C.accentBorder : C.border}`,
                    color: active ? C.accent : C.text2,
                    fontSize: 12, fontWeight: active ? 600 : 500,
                    padding: "7px 13px", borderRadius: 7,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all .15s",
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>

          <button
            className="analyze-btn"
            onClick={() => {
              if (resumeText.trim().length < 50) {
                toast.error("Add your resume text first");
                return;
              }
              mut.mutate();
            }}
            disabled={mut.isPending}
            style={{
              background: mut.isPending ? C.bg4 : C.accent,
              border: "none",
              color: mut.isPending ? C.text3 : "#000",
              fontSize: 13, fontWeight: 700, padding: "11px 26px",
              borderRadius: 8, cursor: mut.isPending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all .18s", letterSpacing: "-0.01em",
            }}
          >
            {mut.isPending ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>Analyze my career gaps →</>
            )}
          </button>
        </Card>

        {/* ── Results ── */}
        {result && (
          <div className="result-section">

            {/* Score hero */}
            <Card style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <ScoreRing score={result.score} />

                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{
                    fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: C.accent, fontWeight: 700, marginBottom: 7,
                  }}>
                    Career match · {targetRole}
                  </div>
                  <h2 style={{
                    fontSize: 17, fontWeight: 700, marginBottom: 8,
                    letterSpacing: "-0.02em", lineHeight: 1.3,
                  }}>
                    {result.headline}
                  </h2>
                  <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, margin: 0 }}>
                    {result.summary}
                  </p>
                </div>

                <div style={{
                  textAlign: "center",
                  background: C.greenDim,
                  border: `1px solid ${C.greenBorder}`,
                  borderRadius: 12, padding: "14px 22px",
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                    color: C.text3, marginBottom: 6, fontWeight: 600,
                  }}>
                    After roadmap
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.green, letterSpacing: "-0.04em" }}>
                    {result.target_score}%
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>
                    projected
                  </div>
                </div>
              </div>
            </Card>

            {/* Skills + Missing side by side */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 12, marginBottom: 12,
            }}>
              {/* Skill breakdown */}
              <Card>
                <SectionLabel>Skill breakdown</SectionLabel>
                {result.skill_breakdown.map((s) => (
                  <SkillBar key={s.name} {...s} />
                ))}
              </Card>

              {/* Missing skills + Hire probability */}
              <Card>
                <SectionLabel>Missing skills</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
                  {result.missing_skills.map((s) => (
                    <span key={s} style={{
                      fontSize: 11, color: C.red, background: C.redDim,
                      border: `1px solid ${C.redBorder}`,
                      borderRadius: 5, padding: "3px 9px", fontWeight: 500,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none"
                        stroke={C.red} strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="9" y2="9" />
                        <line x1="9" y1="1" x2="1" y2="9" />
                      </svg>
                      {s}
                    </span>
                  ))}
                </div>

                <SectionLabel>Hiring probability</SectionLabel>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    fontSize: 32, fontWeight: 700, color: C.text,
                    letterSpacing: "-0.04em",
                  }}>
                    {result.hire_probability}%
                  </div>
                  <div style={{
                    fontSize: 11, color: C.green, fontWeight: 600,
                    background: C.greenDim, border: `1px solid ${C.greenBorder}`,
                    borderRadius: 4, padding: "2px 7px",
                  }}>
                    → {result.hire_probability_after ?? result.hire_probability + 10}% after
                  </div>
                </div>

                {/* Stacked progress bars */}
                <div style={{ position: "relative", height: 6, borderRadius: 99, overflow: "hidden", background: C.bg4, marginBottom: 8 }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: `${result.hire_probability}%`,
                    background: C.amber, borderRadius: 99,
                    transition: "width 1s cubic-bezier(.4,0,.2,1)",
                  }} />
                </div>
                <p style={{ fontSize: 11, color: C.text3, lineHeight: 1.6, margin: 0 }}>
                  {result.hire_note}
                </p>
              </Card>
            </div>

            {/* Salary impact */}
            <Card style={{ marginBottom: 12 }}>
              <SectionLabel>Salary impact</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>

                {/* Current */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{
                    fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
                    color: C.text3, marginBottom: 5, fontWeight: 600,
                  }}>
                    Current est.
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em" }}>
                    {result.salary_now}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  padding: "0 20px", color: C.text3, fontSize: 18,
                  display: "flex", alignItems: "center",
                }}>
                  →
                </div>

                {/* After */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{
                    fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
                    color: C.text3, marginBottom: 5, fontWeight: 600,
                  }}>
                    After roadmap
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 700, color: C.green,
                    letterSpacing: "-0.04em",
                  }}>
                    {result.salary_after}
                  </div>
                </div>

                {/* Increase badge */}
                <div style={{
                  background: C.greenDim, border: `1px solid ${C.greenBorder}`,
                  borderRadius: 10, padding: "12px 20px",
                  textAlign: "center", flexShrink: 0, marginLeft: "auto",
                }}>
                  <div style={{
                    fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em",
                    color: C.green, marginBottom: 4, fontWeight: 700,
                  }}>
                    Increase
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.green, letterSpacing: "-0.04em" }}>
                    +{result.salary_increase_pct}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Roadmap */}
            <Card>
              <SectionLabel>Your learning roadmap</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {result.roadmap.map((step, i) => {
                  const dm = DIFF_META[step.difficulty];
                  const isLast = i === result.roadmap.length - 1;
                  return (
                    <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>

                      {/* Left: step number + connector line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: C.accentDim,
                          border: `1px solid ${C.accentBorder}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: C.accent,
                          flexShrink: 0, zIndex: 1,
                        }}>
                          {step.step}
                        </div>
                        {!isLast && (
                          <div style={{
                            width: 1, flex: 1, background: C.border,
                            marginTop: 6, marginBottom: 6, minHeight: 20,
                          }} />
                        )}
                      </div>

                      {/* Right: content */}
                      <div style={{
                        flex: 1,
                        paddingBottom: isLast ? 0 : 24,
                        paddingTop: 4,
                      }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: C.text,
                          marginBottom: 4, letterSpacing: "-0.01em",
                        }}>
                          {step.title}
                        </div>
                        <p style={{
                          fontSize: 12, color: C.text2, marginBottom: 10,
                          lineHeight: 1.6,
                        }}>
                          {step.resources}
                        </p>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                          <Pill color={dm.color} bg={dm.bg} border={dm.border}>
                            {dm.label}
                          </Pill>
                          <Pill color={C.text3} bg={C.bg4} border={C.border}>
                            ⏱ {step.duration}
                          </Pill>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}