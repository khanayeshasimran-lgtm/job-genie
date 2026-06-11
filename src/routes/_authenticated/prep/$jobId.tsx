import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { VoiceAnswerCoach } from "@/components/VoiceAnswerCoach";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getPrepData,
  generatePrepContent,
  listChecklists,
  addChecklist,
  toggleChecklist,
  deleteChecklist,
  type PrepContent,
} from "@/lib/jobgenie.functions";
import { InterviewSimulation } from "@/components/InterviewSimulation";

export const Route = createFileRoute("/_authenticated/prep/$jobId")({
  component: PrepPage,
});

// ── Design tokens ─────────────────────────────────────────────────────────────
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
};

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  Technical: { text: C.blue, bg: C.blueDim },
  Behavioural: { text: C.green, bg: C.greenDim },
  "Role-Specific": { text: C.purple, bg: C.purpleDim },
};

// ── Default checklist items ───────────────────────────────────────────────────
const DEFAULT_DOC_ITEMS = [
  "Updated resume (tailored to this role)",
  "Cover letter (role-specific)",
  "Portfolio / work samples link",
  "LinkedIn profile up to date",
  "References list (3 contacts ready)",
  "Transcripts or certifications (if required)",
  "ID / work authorization documents",
];

const DEFAULT_TODO_ITEMS = [
  "Research the company — mission, product, recent news",
  "Review the job description line by line",
  "Plan commute & arrive 10–15 min early",
  "Prepare 2–3 questions to ask the interviewer",
];

// ── Reusable primitives ───────────────────────────────────────────────────────
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.text3,
        marginBottom: 12,
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

function BtnPrimary({
  children,
  onClick,
  disabled,
  loading,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? C.border2 : C.accent,
        border: "none",
        color: disabled || loading ? C.text3 : "#000",
        padding: "9px 20px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        transition: "background .2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading)
          (e.currentTarget as HTMLButtonElement).style.background = C.accent2;
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading)
          (e.currentTarget as HTMLButtonElement).style.background = C.accent;
      }}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

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
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  );
}

function SkeletonBlock({ height = 80 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 8,
        background: `linear-gradient(90deg, ${C.bg3} 25%, ${C.bg4} 50%, ${C.bg3} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    >
      <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>
    </div>
  );
}

// ── Accordion question card ───────────────────────────────────────────────────
function QuestionCard({
  q,
  index,
}: {
  q: PrepContent["questions"][number];
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORY_COLORS[q.category] ?? { text: C.text2, bg: C.bg3 };
  return (
    <div
      style={{
        border: `1px solid ${open ? C.border2 : C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color .2s",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: open ? C.bg3 : C.bg2,
          border: "none",
          padding: "14px 18px",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "background .15s",
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
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: C.text,
            lineHeight: 1.5,
          }}
        >
          {q.question}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
            background: cat.bg,
            color: cat.text,
            flexShrink: 0,
            letterSpacing: "0.05em",
          }}
        >
          {q.category}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.text3}
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            background: C.bg3,
            borderTop: `1px solid ${C.border}`,
            padding: "14px 18px 14px 52px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: cat.text,
              marginBottom: 6,
            }}
          >
            Coaching hint
          </div>
          <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.65 }}>{q.hint}</p>
        </div>
      )}
    </div>
  );
}

// ── Google Maps embed ─────────────────────────────────────────────────────────
function MapsEmbed({ location, company }: { location: string; company: string }) {
  const query = encodeURIComponent(`${company} ${location}`);
  const src = `https://maps.google.com/maps?q=${query}&output=embed&z=14`;
  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${C.border2}`,
        height: 220,
      }}
    >
      <iframe
        title="Company location"
        src={src}
        width="100%"
        height="100%"
        style={{ border: "none", display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// ── Interactive checklist ─────────────────────────────────────────────────────
function PrepChecklist({
  applicationId,
  aiItems,
  defaultItems,
  title,
  placeholder,
}: {
  applicationId: string;
  aiItems?: string[];
  defaultItems: string[];
  title: string;
  placeholder: string;
}) {
  const listFn = useServerFn(listChecklists);
  const addFn = useServerFn(addChecklist);
  const toggleFn = useServerFn(toggleChecklist);
  const delFn = useServerFn(deleteChecklist);
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seededDefaults, setSeededDefaults] = useState(false);

  const qKey = ["checklist", applicationId, title];

  const { data: items, isSuccess } = useQuery({
    queryKey: qKey,
    queryFn: () => listFn({ data: { application_id: applicationId } }),
    select: (rows) => rows.filter((r) => r.label.startsWith(`[${title}] `)),
  });

  const inv = () => qc.invalidateQueries({ queryKey: qKey });

  async function seedDefaults() {
    if (seededDefaults || !isSuccess || (items && items.length > 0)) return;
    setSeededDefaults(true);
    for (const item of defaultItems) {
      await addFn({
        data: { application_id: applicationId, label: `[${title}] ${item}` },
      });
    }
    inv();
  }

  if (isSuccess && items?.length === 0 && !seededDefaults) {
    seedDefaults();
  }

  async function seedAiItems() {
    if (!aiItems?.length || seeding) return;
    setSeeding(true);
    try {
      for (const raw of aiItems) {
        const item = typeof raw === "string" ? raw : (raw as any).task ?? JSON.stringify(raw);
        await addFn({
          data: { application_id: applicationId, label: `[${title}] ${item}` },
        });
      }
      inv();
      toast.success(`${aiItems.length} AI items added`);
    } finally {
      setSeeding(false);
    }
  }

  const displayLabel = (l: string) => l.replace(`[${title}] `, "");

  const done = items?.filter((i) => i.done).length ?? 0;
  const total = items?.length ?? 0;

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</h3>
        {aiItems?.length ? (
          <button
            onClick={seedAiItems}
            disabled={seeding}
            style={{
              background: C.accentDim,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 6,
              color: C.accent,
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              cursor: seeding ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {seeding ? <Spinner /> : null}
            {seeding ? "Adding..." : "✦ Add AI suggestions"}
          </button>
        ) : null}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: C.text3,
              marginBottom: 5,
            }}
          >
            <span>{done}/{total} done</span>
            <span style={{ color: done === total ? C.green : C.accent, fontWeight: 600 }}>
              {Math.round((done / total) * 100)}%
            </span>
          </div>
          <div style={{ height: 3, background: C.border2, borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(done / total) * 100}%`,
                background: done === total ? C.green : C.accent,
                borderRadius: 2,
                transition: "width .3s",
              }}
            />
          </div>
        </div>
      )}

      {/* Add input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key !== "Enter" || !label.trim()) return;
            e.preventDefault();
            await addFn({
              data: {
                application_id: applicationId,
                label: `[${title}] ${label.trim()}`,
              },
            });
            setLabel("");
            inv();
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: C.bg3,
            border: `1px solid ${C.border2}`,
            borderRadius: 7,
            color: C.text,
            fontSize: 13,
            padding: "7px 11px",
            outline: "none",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
        />
        <button
          onClick={async () => {
            if (!label.trim()) return;
            await addFn({
              data: {
                application_id: applicationId,
                label: `[${title}] ${label.trim()}`,
              },
            });
            setLabel("");
            inv();
          }}
          style={{
            background: C.accent,
            border: "none",
            color: "#000",
            width: 32,
            height: 32,
            borderRadius: 7,
            fontWeight: 700,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>

      {/* Items */}
      <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items?.map((c) => (
          <li
            key={c.id}
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}
          >
            <div
              onClick={async () => {
                await toggleFn({ data: { id: c.id, done: !c.done } });
                inv();
              }}
              style={{
                width: 16,
                height: 16,
                border: `2px solid ${c.done ? C.accent : C.border2}`,
                borderRadius: 4,
                background: c.done ? C.accent : "transparent",
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
            >
              {c.done && (
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <polyline
                    points="2 6 5 9 10 3"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <span
              style={{
                flex: 1,
                color: c.done ? C.text3 : C.text2,
                textDecoration: c.done ? "line-through" : "none",
                transition: "color .15s",
              }}
            >
              {displayLabel(c.label)}
            </span>
            <button
              onClick={async () => {
                await delFn({ data: { id: c.id } });
                inv();
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: C.text3,
                opacity: 0,
                transition: "opacity .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PrepPage() {
  const { jobId } = useParams({ from: "/_authenticated/prep/$jobId" });
  const qc = useQueryClient();
  const getPrepFn = useServerFn(getPrepData);
  const generateFn = useServerFn(generatePrepContent);

  const { data, isLoading } = useQuery({
    queryKey: ["prep", jobId],
    queryFn: () => getPrepFn({ data: { job_id: jobId } }),
  });

  const generateMut = useMutation({
    mutationFn: () => generateFn({ data: { job_id: jobId } }),
    onSuccess: () => {
      toast.success("Prep content generated");
      qc.invalidateQueries({ queryKey: ["prep", jobId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const job = data?.job;
  const application = data?.application;
  const prep = data?.prepContent ?? (generateMut.data as PrepContent | undefined);

  const hasLocation =
    job?.location && !job.location.toLowerCase().includes("remote");

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "32px 24px 80px",
          color: C.text,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkeletonBlock height={100} />
          <SkeletonBlock height={200} />
          <SkeletonBlock height={300} />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.text2,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Job not found.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "32px 24px 80px",
      }}
    >
      <div>
        {/* Back nav */}
        <Link
          to="/applications"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: C.text2,
            textDecoration: "none",
            marginBottom: 28,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to pipeline
        </Link>

        {/* ── 1. Header ── */}
        <Panel style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <AccentLabel>✦ Interview Prep</AccentLabel>
              <h1
                style={{
                  fontSize: "clamp(1.5rem,2.8vw,2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                {job.title}
              </h1>
              <p style={{ fontSize: 14, color: C.text2, marginBottom: 10 }}>{job.company}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: C.text3 }}>
                {job.location && <span>📍 {job.location}</span>}
                {job.remote && (
                  <span style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 5, padding: "2px 8px", color: C.accent, fontSize: 11, fontWeight: 600 }}>
                    Remote
                  </span>
                )}
                {job.experience_level && (
                  <span style={{ textTransform: "capitalize" }}>{job.experience_level.replace("_", " ")}</span>
                )}
                {application?.status && (
                  <span style={{ background: C.greenDim, border: "1px solid rgba(34,197,94,0.25)", borderRadius: 5, padding: "2px 8px", color: C.green, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
                    {application.status}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <BtnPrimary
                onClick={() => generateMut.mutate()}
                loading={generateMut.isPending}
                disabled={generateMut.isPending}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
                {generateMut.isPending ? "Generating with Groq..." : prep ? "Regenerate prep" : "Generate prep with AI"}
              </BtnPrimary>
              {prep?.generated_at && (
                <span style={{ fontSize: 11, color: C.text3 }}>
                  Generated{" "}
                  {new Date(prep.generated_at).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {(application?.ai_score as number | null) && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <SectionLabel>Match score</SectionLabel>
                <span style={{ fontSize: 28, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{application!.ai_score}</span>
                <span style={{ fontSize: 12, color: C.text3 }}>/100</span>
              </div>
              {(application?.ai_match_reasons as string[] | null)?.length ? (
                <div style={{ flex: 1 }}>
                  <SectionLabel>Why you fit</SectionLabel>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(application!.ai_match_reasons as string[]).map((r, i) => (
                      <li key={i} style={{ fontSize: 12, color: C.text2, display: "flex", gap: 6 }}>
                        <span style={{ color: C.green }}>●</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Panel>

        {/* ── Generate prompt if no prep yet ── */}
        {!prep && !generateMut.isPending && (
          <Panel style={{ marginBottom: 16, textAlign: "center", padding: "48px 24px", border: `1px dashed ${C.border2}`, background: "transparent" }}>
            <div style={{ fontSize: 40, marginBottom: 16, filter: "grayscale(0.3)" }}>🎯</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: C.text }}>Ready to prepare?</h2>
            <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 24px" }}>
              Click <strong style={{ color: C.accent }}>Generate prep with AI</strong>{" "}
              above and Groq will build your company overview, 8 tailored mock questions,
              and a document checklist in seconds.
            </p>
            <BtnPrimary onClick={() => generateMut.mutate()}>Generate now</BtnPrimary>
          </Panel>
        )}

        {/* ── Generating skeleton ── */}
        {generateMut.isPending && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
            <Panel>
              <SectionLabel>Company overview</SectionLabel>
              <SkeletonBlock height={72} />
            </Panel>
            <Panel>
              <SectionLabel>Mock interview questions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} height={48} />)}
              </div>
            </Panel>
          </div>
        )}

        {/* ── 2. Company overview ── */}
        {prep && (
          <Panel style={{ marginBottom: 16 }}>
            <AccentLabel>✦ Company overview</AccentLabel>
            <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.75, marginBottom: prep.culture_notes ? 16 : 0 }}>
              {prep.company_overview}
            </p>
            {prep.culture_notes && (
              <>
                <SectionLabel>Culture & what they look for</SectionLabel>
                <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.75 }}>{prep.culture_notes}</p>
              </>
            )}
          </Panel>
        )}

        {/* ── 3. Mock interview questions ── */}
{prep && (
  <Panel style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <AccentLabel>✦ Mock interview questions</AccentLabel>
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
          <span key={cat} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: colors.bg, color: colors.text, letterSpacing: "0.05em" }}>
            {cat}
          </span>
        ))}
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {prep.questions.map((q, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <QuestionCard q={q} index={i} />
          <VoiceAnswerCoach jobId={jobId} question={q.question} />
        </div>
      ))}
    </div>
  </Panel>
)}
        {/* ── 4. Interview simulation ── */}
        {application?.id && (
          <InterviewSimulation jobId={jobId} />
        )}

        {/* ── 5. Checklists ── */}
        {application?.id ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Panel>
              <PrepChecklist
                applicationId={application.id}
                aiItems={prep?.doc_checklist}
                defaultItems={DEFAULT_DOC_ITEMS}
                title="Doc Checklist"
                placeholder="Add a document..."
              />
            </Panel>
            <Panel>
              <PrepChecklist
                applicationId={application.id}
                defaultItems={DEFAULT_TODO_ITEMS}
                title="Prep To-Do"
                placeholder="Research company, plan commute..."
              />
            </Panel>
          </div>
        ) : (
          <Panel style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.text3 }}>
              Save this job to your pipeline to unlock the interactive checklists.
            </p>
          </Panel>
        )}

        {/* ── 6. Job description reference ── */}
        <Panel style={{ marginBottom: 16 }}>
          <AccentLabel>✦ Job description reference</AccentLabel>
          <p
            style={{
              fontSize: 13,
              color: C.text2,
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
              maxHeight: 200,
              overflow: "hidden",
              maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
            }}
          >
            {job.description}
          </p>
          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, color: C.accent, textDecoration: "none", fontWeight: 600 }}
            >
              View full listing ↗
            </a>
          )}
        </Panel>

        {/* ── 7. Company location (map) ── */}
        {hasLocation && (
          <Panel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <AccentLabel>✦ Company location</AccentLabel>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.company} ${job.location}`)}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: C.text2, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
              >
                Open in Maps ↗
              </a>
            </div>
            <MapsEmbed location={job.location!} company={job.company} />
            <p style={{ fontSize: 11, color: C.text3, marginTop: 10, lineHeight: 1.5 }}>
              Plan your commute before interview day. Arrive 15 minutes early.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}