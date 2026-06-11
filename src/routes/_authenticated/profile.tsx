import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile, parseResumeText, enhanceResume } from "@/lib/jobgenie.functions";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
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
  blue: "#3B82F6",
};

function Inp({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: C.bg3,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        color: C.text,
        fontSize: 13,
        padding: "9px 12px",
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
    />
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.text3,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

type ProfileForm = {
  full_name: string;
  headline: string;
  location: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  summary: string;
  skills: string;
};

type EnhancementResult = {
  overall_score: number;
  verdict: string;
  sections: Array<{
    name: string;
    score: number;
    feedback: string;
    suggestion: string;
  }>;
  ats_gaps: string[];
  top_strengths: string[];
  quick_wins: string[];
};

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? C.green : score >= 50 ? C.accent : C.red;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
      <circle cx="46" cy="46" r={r} fill="none" stroke={C.border2} strokeWidth="6" />
      <circle
        cx="46" cy="46" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 46 46)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x="46" y="50" textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="Inter,sans-serif">
        {score}
      </text>
    </svg>
  );
}

// ── Section score bar ─────────────────────────────────────────────────────────
function SectionBar({ name, score, feedback, suggestion }: {
  name: string; score: number; feedback: string; suggestion: string;
}) {
  const color = score >= 75 ? C.green : score >= 50 ? C.accent : C.red;
  return (
    <div style={{
      background: C.bg3,
      border: `1px solid ${C.border2}`,
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}/100</span>
      </div>
      <div style={{ height: 3, background: C.border2, borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
      </div>
      <p style={{ fontSize: 12, color: C.text2, marginBottom: 4, lineHeight: 1.5 }}>
        <span style={{ color: C.red }}>Issue:</span> {feedback}
      </p>
      <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
        <span style={{ color: C.green }}>Fix:</span> {suggestion}
      </p>
    </div>
  );
}

// ── Enhancement results panel ─────────────────────────────────────────────────
function EnhancementPanel({ result, onClose }: { result: EnhancementResult; onClose: () => void }) {
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid rgba(245,155,0,0.3)`,
      borderRadius: 14,
      padding: 24,
      marginBottom: 16,
      position: "relative",
    }}>
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: `1px solid ${C.border2}`,
          color: C.text3, borderRadius: 6, fontSize: 11,
          padding: "3px 10px", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        Dismiss
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <ScoreRing score={result.overall_score} />
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.accent, marginBottom: 6 }}>
            Resume Score
          </div>
          <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, maxWidth: 480 }}>
            {result.verdict}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: C.bg3, border: `1px solid rgba(34,197,94,0.2)`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.green, marginBottom: 10 }}>
            ✓ Top Strengths
          </div>
          {result.top_strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: C.text2, marginBottom: 6, display: "flex", gap: 8 }}>
              <span style={{ color: C.green, flexShrink: 0 }}>·</span>{s}
            </div>
          ))}
        </div>
        <div style={{ background: C.bg3, border: `1px solid rgba(245,155,0,0.2)`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accent, marginBottom: 10 }}>
            ⚡ Quick Wins
          </div>
{result.quick_wins.map((w, i) => (
  <div
    key={i}
    style={{
      fontSize: 12,
      color: C.text2,
      marginBottom: 6,
      display: "flex",
      gap: 8,
    }}
  >
    <span style={{ color: C.accent, flexShrink: 0 }}>·</span>

    {typeof w === "string"
      ? w
      : (w as any)?.task ?? JSON.stringify(w)}
  </div>
))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3, marginBottom: 12 }}>
          Section Breakdown
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {result.sections.map((s) => (
            <SectionBar key={s.name} {...s} />
          ))}
        </div>
      </div>

      {result.ats_gaps.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3, marginBottom: 10 }}>
            ATS Keyword Gaps
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {result.ats_gaps.map((kw) => (
              <span key={kw} style={{
                fontSize: 11, color: C.red,
                background: "rgba(239,68,68,0.08)",
                border: `1px solid rgba(239,68,68,0.25)`,
                borderRadius: 5, padding: "3px 9px",
              }}>
                {kw}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.text3, marginTop: 8 }}>
            These keywords appear in job listings but are missing from your resume. Add relevant ones to your skills or experience bullets.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Resume Upload Panel ───────────────────────────────────────────────────────
function ResumeUploadPanel({ onTextExtracted }: { onTextExtracted: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  async function extractText(file: File) {
    setExtracting(true);
    setFileName(file.name);
    try {
      if (file.type === "text/plain") {
        const text = await file.text();
        onTextExtracted(text);
        toast.success("Resume loaded — ready to parse");
        return;
      }
      if (file.type === "application/pdf") {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "pdfjs-main");
        const pdfjsAny = (window as any).pdfjsLib;
        if (!pdfjsAny) throw new Error("PDF.js failed to load");
        pdfjsAny.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsAny.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        onTextExtracted(fullText);
        toast.success("PDF parsed — ready to extract profile");
        return;
      }
      if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js", "mammoth-js");
        const mammoth = (window as any).mammoth;
        if (!mammoth) throw new Error("Mammoth failed to load");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onTextExtracted(result.value);
        toast.success("DOCX parsed — ready to extract profile");
        return;
      }
      toast.error("Unsupported file type. Use PDF, DOCX, or TXT.");
      setFileName(null);
    } catch {
      toast.error("Could not read file. Try pasting the text instead.");
      setFileName(null);
    } finally {
      setExtracting(false);
    }
  }

  function loadScript(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) { resolve(); return; }
      const s = document.createElement("script");
      s.id = id; s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    extractText(files[0]);
  }

  return (
    <div
      style={{
        background: C.bg2,
        border: `1px solid ${dragging ? "rgba(245,155,0,0.5)" : C.border2}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        transition: "border-color .2s",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Upload your resume</span>
      </div>
      <p style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>
        Drop a PDF, DOCX, or TXT file — text is extracted and auto-fills your profile. Nothing is stored.
      </p>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C.accent : C.border2}`,
          borderRadius: 10,
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(245,155,0,0.04)" : C.bg3,
          transition: "all .2s",
          marginBottom: 14,
        }}
        onMouseEnter={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(245,155,0,0.35)"; }}
        onMouseLeave={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = C.border2; }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {extracting ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span style={{ fontSize: 13, color: C.text2 }}>Reading {fileName}…</span>
          </div>
        ) : fileName ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{fileName}</span>
            <span style={{ fontSize: 12, color: C.text3 }}>Text extracted — use the buttons below</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span style={{ fontSize: 13, color: C.text2 }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>Click to browse</span> or drag & drop
            </span>
            <span style={{ fontSize: 11, color: C.text3 }}>PDF · DOCX · TXT</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["PDF", "DOCX", "TXT"].map((fmt) => (
          <span key={fmt} style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: C.text3,
            background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px",
          }}>
            {fmt}
          </span>
        ))}
        <span style={{ fontSize: 11, color: C.text3, alignSelf: "center" }}>
          · Processed locally, never uploaded
        </span>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── Enhance button with timeout + retry ──────────────────────────────────────
const ENHANCE_TIMEOUT_MS = 45_000; // 45 s — AI calls can be slow

function useEnhanceMutation(
  enhanceFn: (args: { data: { text: string } }) => Promise<EnhancementResult>,
  resumeText: string,
  onResult: (r: EnhancementResult) => void
) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [dotCount, setDotCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const dotTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Always-fresh refs so useCallback never captures stale closures
  const resumeTextRef = useRef(resumeText);
  const enhanceFnRef = useRef(enhanceFn);
  const onResultRef = useRef(onResult);
  useEffect(() => { resumeTextRef.current = resumeText; }, [resumeText]);
  useEffect(() => { enhanceFnRef.current = enhanceFn; }, [enhanceFn]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  // Reset error state whenever the user loads new resume text
  useEffect(() => {
    if (state === "error") setState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeText]);

  // Animate the dots while loading so user knows it's alive
  useEffect(() => {
    if (state === "loading") {
      dotTimer.current = setInterval(() => setDotCount((n) => (n + 1) % 4), 500);
    } else {
      if (dotTimer.current) clearInterval(dotTimer.current);
      setDotCount(0);
    }
    return () => { if (dotTimer.current) clearInterval(dotTimer.current); };
  }, [state]);

  const run = useCallback(async () => {
    if (state === "loading") return;

    const text = resumeTextRef.current.trim();
    console.log("[enhance] run called, text length:", text.length, "state:", state);
    if (text.length < 50) {
      toast.error("Paste your resume text first (at least 50 characters).");
      console.log("[enhance] blocked — text too short");
      return;
    }

    setState("loading");

    // Cancel any previous hanging call
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const timeoutId = setTimeout(() => {
      abortRef.current?.abort();
    }, ENHANCE_TIMEOUT_MS);

    try {
      const result = await enhanceFnRef.current({ data: { text } });

      // Validate shape — server can return null/undefined on AI errors
      if (
        !result ||
        typeof result.overall_score !== "number" ||
        !Array.isArray(result.sections)
      ) {
        throw new Error("The AI returned an unexpected response. Please try again.");
      }

      onResultRef.current(result);
      toast.success(`Resume scored: ${result.overall_score}/100`);
      setState("idle");
    } catch (err: any) {
      console.error("[enhance] error:", err);
      if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
        toast.error("Enhancement timed out after 45 s. The AI is busy — try again in a moment.", {
          duration: 6000,
        });
      } else {
        toast.error(err?.message ?? "Enhancement failed. Please try again.", { duration: 6000 });
      }
      setState("error");
    } finally {
      clearTimeout(timeoutId);
    }
  }, [state]);

  const reset = useCallback(() => setState("idle"), []);

  return { run, state, dotCount, reset };
}

function ProfilePage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);
  const parseFn = useServerFn(parseResumeText);
  const enhanceFn = useServerFn(enhanceResume);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getFn() });
  const [form, setForm] = useState<ProfileForm>({
    full_name: "", headline: "", location: "", phone: "",
    linkedin_url: "", github_url: "", portfolio_url: "", summary: "", skills: "",
  });
  const [resumeText, setResumeText] = useState("");
  const [enhancement, setEnhancement] = useState<EnhancementResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        headline: profile.headline ?? "",
        location: profile.location ?? "",
        phone: profile.phone ?? "",
        linkedin_url: profile.linkedin_url ?? "",
        github_url: profile.github_url ?? "",
        portfolio_url: profile.portfolio_url ?? "",
        summary: profile.summary ?? "",
        skills: Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : "",
      });
    }
  }, [profile]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          ...form,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        },
      }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const parseMut = useMutation({
    mutationFn: () => parseFn({ data: { text: resumeText } }),
    onSuccess: () => {
      toast.success("Resume parsed — profile updated");
      setResumeText("");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const { run: runEnhance, state: enhanceState, dotCount, reset: resetEnhance } =
    useEnhanceMutation(enhanceFn, resumeText, setEnhancement);

  const completeness = profile?.completeness ?? 0;
  const exp = (profile?.experience as Array<{ title?: string; company?: string; period?: string; description?: string }> | null) ?? [];
  const edu = (profile?.education as Array<{ degree?: string; school?: string; period?: string }> | null) ?? [];
  const hasResumeText = resumeText.trim().length >= 50;
  const enhanceLoading = enhanceState === "loading";
  const busy = parseMut.isPending || enhanceLoading;

  function f(k: keyof ProfileForm) {
    return (v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
padding: "32px 24px 80px",
    }}>
      <div>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          flexWrap: "wrap", gap: 20, marginBottom: 32,
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 8 }}>
              Account
            </div>
            <h1 style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
              Your profile
            </h1>
            <p style={{ fontSize: 13, color: C.text2 }}>Used by AI to score jobs and tailor pitches.</p>
          </div>
          <div style={{ minWidth: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.text3, marginBottom: 6 }}>
              <span>Completeness</span>
              <span style={{ color: C.accent, fontWeight: 600 }}>{completeness}%</span>
            </div>
            <div style={{ height: 4, background: C.border2, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completeness}%`, background: C.accent, borderRadius: 2, transition: "width .4s" }} />
            </div>
          </div>
        </div>

        {/* Resume upload */}
        <ResumeUploadPanel onTextExtracted={(text) => setResumeText(text)} />

        {/* AI Parse + Enhance panel */}
        <div style={{
          background: C.bg2,
          border: `1px solid rgba(245,155,0,0.25)`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", width: 280, height: 140,
            background: "radial-gradient(ellipse,rgba(245,155,0,0.08) 0%,transparent 70%)",
            top: -40, right: -40, pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={C.accent}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Or paste resume text</span>
            </div>
            <p style={{ fontSize: 13, color: C.text2, marginBottom: 14 }}>
              Paste or upload above — then parse to fill your profile, or enhance to get an AI score and fix list.
            </p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={6}
              placeholder="Paste your full resume here..."
              style={{
                width: "100%", background: C.bg3,
                border: `1px solid ${C.border2}`, borderRadius: 8,
                color: C.text, fontSize: 13, padding: "10px 12px",
                outline: "none", fontFamily: "inherit", resize: "vertical",
                boxSizing: "border-box", marginBottom: 12,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
            />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {/* Parse */}
              <button
                onClick={() => parseMut.mutate()}
                disabled={busy || !hasResumeText}
                style={{
                  background: !hasResumeText || parseMut.isPending ? C.border2 : C.accent,
                  border: "none",
                  color: !hasResumeText || parseMut.isPending ? C.text3 : "#000",
                  fontSize: 13, fontWeight: 600, padding: "9px 20px",
                  borderRadius: 8, cursor: !hasResumeText || busy ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7,
                  opacity: busy && !parseMut.isPending ? 0.5 : 1,
                  transition: "opacity .2s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 14.66V20a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h5.34" />
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2" />
                </svg>
                {parseMut.isPending ? "Parsing..." : "Parse resume"}
              </button>

              {/* Enhance */}
              <button
                onClick={() => {
                  if (enhanceState === "error") resetEnhance();
                  runEnhance();
                }}
                disabled={busy && !enhanceLoading || !hasResumeText}
                style={{
                  background: "transparent",
                  border: `1px solid ${
                    !hasResumeText
                      ? C.border2
                      : enhanceState === "error"
                      ? `rgba(239,68,68,0.5)`
                      : "rgba(245,155,0,0.5)"
                  }`,
                  color: !hasResumeText
                    ? C.text3
                    : enhanceState === "error"
                    ? C.red
                    : C.accent,
                  fontSize: 13, fontWeight: 600, padding: "9px 20px",
                  borderRadius: 8,
                  cursor: (!hasResumeText || (busy && !enhanceLoading)) ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7,
                  transition: "all .2s",
                  minWidth: 160,
                }}
                onMouseEnter={(e) => {
                  if (hasResumeText && !busy)
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,155,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {enhanceLoading ? (
                  <>
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
                    >
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Analysing{"." .repeat(dotCount + 1)}
                  </>
                ) : enhanceState === "error" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Retry enhance
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    Enhance resume
                  </>
                )}
              </button>

              {/* Live status hint when loading */}
              {enhanceLoading && (
                <span style={{ fontSize: 11, color: C.text3 }}>
                  AI is reading your resume — this can take up to 45 s…
                </span>
              )}
            </div>

            <p style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>
              <strong style={{ color: C.text2 }}>Parse</strong> fills your profile fields.&nbsp;
              <strong style={{ color: C.text2 }}>Enhance</strong> scores your resume and gives you a fix list.
            </p>
          </div>
        </div>

        {/* Enhancement results */}
        {enhancement && (
          <EnhancementPanel result={enhancement} onClose={() => setEnhancement(null)} />
        )}

        {/* Profile form */}
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Full name"><Inp value={form.full_name} onChange={f("full_name")} /></Field>
            <Field label="Headline"><Inp value={form.headline} onChange={f("headline")} placeholder="Senior Frontend Engineer" /></Field>
            <Field label="Location"><Inp value={form.location} onChange={f("location")} /></Field>
            <Field label="Phone"><Inp value={form.phone} onChange={f("phone")} /></Field>
            <Field label="LinkedIn URL"><Inp value={form.linkedin_url} onChange={f("linkedin_url")} /></Field>
            <Field label="GitHub URL"><Inp value={form.github_url} onChange={f("github_url")} /></Field>
            <Field label="Portfolio URL" wide><Inp value={form.portfolio_url} onChange={f("portfolio_url")} /></Field>
          </div>
          <Field label="Summary">
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={3}
              style={{
                width: "100%", background: C.bg3, border: `1px solid ${C.border2}`,
                borderRadius: 8, color: C.text, fontSize: 13, padding: "9px 12px",
                outline: "none", fontFamily: "inherit", resize: "vertical",
                boxSizing: "border-box", marginBottom: 16,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
            />
          </Field>
          <Field label="Skills (comma-separated)">
            <Inp value={form.skills} onChange={f("skills")} placeholder="React, TypeScript, GraphQL" />
          </Field>
          <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Save */}
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              style={{
                background: saveMut.isPending ? C.border2 : C.accent,
                border: "none",
                color: saveMut.isPending ? C.text3 : "#000",
                fontSize: 13, fontWeight: 600, padding: "9px 22px",
                borderRadius: 8, cursor: saveMut.isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {saveMut.isPending ? "Saving..." : "Save profile"}
            </button>

            {/* Clear */}
            <button
              onClick={() => setConfirmClear(true)}
              disabled={saveMut.isPending}
              style={{
                background: "transparent",
                border: `1px solid rgba(239,68,68,0.35)`,
                color: C.red,
                fontSize: 13, fontWeight: 600, padding: "9px 18px",
                borderRadius: 8, cursor: saveMut.isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7,
                transition: "background .15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
              }
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Clear fields
            </button>
          </div>
        </div>

        {/* Experience */}
        {exp.length > 0 && (
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Experience</h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {exp.map((e, i) => (
                <li key={i} style={{ borderLeft: `2px solid rgba(245,155,0,0.35)`, paddingLeft: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                    {e.title} <span style={{ color: C.text2, fontWeight: 400 }}>· {e.company}</span>
                  </div>
                  {e.period && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>{e.period}</div>}
                  {e.description && (
  <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
    {typeof e.description === "string"
      ? e.description
      : JSON.stringify(e.description)}
  </p>
)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Education */}
        {edu.length > 0 && (
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Education</h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {edu.map((e, i) => (
                <li key={i} style={{ fontSize: 13, color: C.text2 }}>
                  <span style={{ fontWeight: 600, color: C.text }}>{e.degree}</span>
                  {" · "}{e.school}
                  {e.period && <span style={{ fontSize: 11, color: C.text3 }}> · {e.period}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills badges */}
        {Array.isArray(profile?.skills) && (profile!.skills as string[]).length > 0 && (
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(profile!.skills as string[]).map((s, i) => (
                <span key={`${s}-${i}`} style={{
                  fontSize: 12, color: C.text2, background: C.bg3,
                  border: `1px solid ${C.border2}`, borderRadius: 6, padding: "4px 10px",
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm clear dialog ── */}
      {confirmClear && (
        <div
          onClick={() => setConfirmClear(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161616",
              border: "1px solid #2A2A2A",
              borderRadius: 14,
              padding: "28px 32px",
              width: 340,
              boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.red, marginBottom: 10 }}>
              Clear profile fields
            </div>
            <p style={{ fontSize: 14, color: C.text, marginBottom: 6, fontWeight: 600 }}>
              Are you sure?
            </p>
            <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>
              This will clear all form fields and the resume text area so you can paste new data. Your saved profile in the database is not affected until you hit Save.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setForm({
                    full_name: "", headline: "", location: "", phone: "",
                    linkedin_url: "", github_url: "", portfolio_url: "", summary: "", skills: "",
                  });
                  setResumeText("");
                  setEnhancement(null);
                  setConfirmClear(false);
                  toast("Fields cleared — paste or upload a new resume.", {
                    icon: "🗑️",
                    style: { background: C.bg2, color: C.text, border: `1px solid ${C.border2}` },
                  });
                }}
                style={{
                  flex: 1,
                  background: C.red,
                  border: "none",
                  color: "#fff",
                  fontSize: 13, fontWeight: 600, padding: "9px 0",
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: `1px solid ${C.border2}`,
                  color: C.text2,
                  fontSize: 13, fontWeight: 600, padding: "9px 0",
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}