import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  listJobs,
  getFilterPrefs,
  saveFilterPrefs,
  upsertApplication,
  type Filters,
} from "@/lib/jobgenie.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: JobsPage,
});

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:     "#0A0A0A",
  bg2:    "#111111",
  bg3:    "#161616",
  bg4:    "#1A1A1A",
  accent: "#F59B00",
  accent2:"#D4840A",
  border: "#272626",
  border2:"#252525",
  text:   "#FFFFFF",
  text2:  "#999999",
  text3:  "#555555",
  green:  "#22C55E",
  blue:   "#3B82F6",
  purple: "#A855F7",
  red:    "#EF4444",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string {
  if (!min && !max) return "";
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : (currency ?? "");
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    : n >= 1000  ? `${Math.round(n / 1000)}K`
    : `${n}`;
  if (min && max) return `${sym}${fmt(min)}–${sym}${fmt(max)}`;
  if (max)        return `up to ${sym}${fmt(max)}`;
  return          `${sym}${fmt(min!)}+`;
}

// ── Company logo via Google favicons ──────────────────────────────────────────
function CompanyLogo({ company, size = 36 }: { company: string; size?: number }) {
  const domain = company
    .toLowerCase()
    .replace(/\s+(pvt|ltd|limited|inc|corp|technologies|solutions|systems|consulting|services|india|group|global|international)\.?$/gi, "")
    .trim().replace(/\s+/g, "") + ".com";

  const [failed, setFailed] = useState(false);
  const initials = company.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const palette = ["#F59B00","#3B82F6","#A855F7","#22C55E","#EF4444","#F97316","#06B6D4","#EC4899"];
  const bg = palette[company.charCodeAt(0) % palette.length];

  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 9,
        background: `${bg}18`, border: `1px solid ${bg}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33, fontWeight: 700, color: bg, flexShrink: 0,
      }}>
        {initials}
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 9,
      background: C.bg4, border: `1px solid ${C.border2}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
    }}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={company}
        width={size * 0.58} height={size * 0.58}
        style={{ objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  saved:        { label: "Saved",         color: C.accent,  bg: "rgba(245,155,0,0.12)"  },
  applied:      { label: "Applied",       color: C.blue,    bg: "rgba(59,130,246,0.12)" },
  interviewing: { label: "Interviewing",  color: C.purple,  bg: "rgba(168,85,247,0.12)" },
  offer:        { label: "Offer",         color: C.green,   bg: "rgba(34,197,94,0.12)"  },
  rejected:     { label: "Rejected",      color: C.text3,   bg: "rgba(255,255,255,0.05)"},
  accepted:     { label: "Accepted",      color: C.green,   bg: "rgba(34,197,94,0.12)"  },
  declined:     { label: "Declined",      color: C.text3,   bg: "rgba(255,255,255,0.05)"},
  withdrawn:    { label: "Withdrawn",     color: C.text3,   bg: "rgba(255,255,255,0.05)"},
};

// ── Filter input ──────────────────────────────────────────────────────────────
function Inp({ placeholder, value, onChange, type = "text", icon }: {
  placeholder?: string; value?: string | number;
  onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.text3, pointerEvents: "none" }}>
          {icon}
        </div>
      )}
      <input
        type={type} placeholder={placeholder} value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8,
          color: C.text, fontSize: 13,
          padding: icon ? "8px 10px 8px 32px" : "8px 10px",
          outline: "none", width: "100%", fontFamily: "inherit",
          boxSizing: "border-box", transition: "border-color .15s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(245,155,0,0.5)")}
        onBlur={(e)  => (e.currentTarget.style.borderColor = C.border2)}
      />
    </div>
  );
}

function Sel({ value, onChange, options }: {
  value?: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value ?? "any"} onChange={(e) => onChange(e.target.value)}
      style={{
        background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8,
        color: value && value !== "any" ? C.text : C.text2,
        fontSize: 13, padding: "8px 10px", outline: "none", width: "100%",
        fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box",
      }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Job card (grid layout) ────────────────────────────────────────────────────
function JobCard({ job, onApply, applying }: {
  job: any;
  onApply: (id: string, sourceUrl: string | null) => void;
  applying: boolean;
}) {
  const navigate = useNavigate();
  const app = job.application;
  const salary  = formatSalary(job.salary_min, job.salary_max, job.currency);
  const posted  = timeAgo(job.posted_at);
  const tags    = (job.tags as string[] | null)?.slice(0, 3) ?? [];
  const desc    = (job.description as string | null)?.slice(0, 120)?.trimEnd();
  const cfg     = app?.status ? STATUS_CFG[app.status] : null;
  const hasApp  = !!app;

  return (
    <div
      style={{
        background: C.bg2, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "16px 16px 14px",
        display: "flex", flexDirection: "column", gap: 0,
        transition: "border-color .18s, box-shadow .18s",
        position: "relative", overflow: "hidden",
        cursor: "pointer",
        height: "100%", boxSizing: "border-box",
      }}
      onClick={() => navigate({ to: "/jobs/$id", params: { id: job.id } })}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(245,155,0,0.3)";
        el.style.boxShadow   = "0 4px 20px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = C.border;
        el.style.boxShadow   = "none";
      }}
    >
      {/* AI score bar at top */}
      {app?.ai_score && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${C.accent} 0%, transparent ${app.ai_score}%)`,
        }} />
      )}

      {/* Logo + company + date */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <CompanyLogo company={job.company} size={34} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", lineHeight: 1.2 }}>
              {job.company}
            </div>
            {job.location && (
              <div style={{ fontSize: 11, color: C.text3, display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {job.location.length > 22 ? job.location.slice(0, 22) + "…" : job.location}
              </div>
            )}
          </div>
        </div>
        {/* Posted date top-right */}
        {posted && (
          <span style={{ fontSize: 10, color: C.text3, whiteSpace: "nowrap", marginTop: 2 }}>
            {posted}
          </span>
        )}
      </div>

      {/* Job title */}
      <div style={{
        fontSize: 14, fontWeight: 650, color: C.text,
        letterSpacing: "-0.01em", lineHeight: 1.3,
        marginBottom: 6,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {job.title}
      </div>

      {/* Description summary */}
      {desc && (
        <div style={{
          fontSize: 12, color: C.text3, lineHeight: 1.55,
          marginBottom: 10, flex: 1,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {desc}{desc.length >= 120 ? "…" : ""}
        </div>
      )}

      {/* Badges row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 11, minHeight: 20 }}>
        {job.remote && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.green,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 4, padding: "2px 6px",
          }}>Remote</span>
        )}
        {job.employment_type && (
          <span style={{
            fontSize: 10, color: C.text3, background: C.bg4,
            border: `1px solid ${C.border2}`, borderRadius: 4, padding: "2px 6px",
            textTransform: "capitalize",
          }}>
            {job.employment_type.replace("_", " ")}
          </span>
        )}
        {job.experience_level && (
          <span style={{
            fontSize: 10, color: C.text3, background: C.bg4,
            border: `1px solid ${C.border2}`, borderRadius: 4, padding: "2px 6px",
            textTransform: "capitalize",
          }}>
            {job.experience_level}
          </span>
        )}
        {tags.map((t: string) => (
          <span key={t} style={{
            fontSize: 10, color: C.text3, background: C.bg4,
            border: `1px solid ${C.border2}`, borderRadius: 4, padding: "2px 6px",
          }}>
            {t}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.border, marginBottom: 11 }} />

      {/* Bottom: salary + status + CTA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          {salary ? (
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>
              {salary}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.text3 }}>Salary not listed</div>
          )}
          {cfg && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: cfg.color,
              background: cfg.bg, borderRadius: 4, padding: "1px 6px",
              display: "inline-block", marginTop: 3,
            }}>
              {cfg.label}
            </span>
          )}
          {app?.ai_score && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#000",
              background: C.accent, borderRadius: 4, padding: "1px 6px",
              display: "inline-block", marginTop: 3, marginLeft: cfg ? 4 : 0,
            }}>
              {app.ai_score}% match
            </span>
          )}
        </div>

        {/* CTA */}
        {hasApp && app.status !== "saved" ? (
          // Already progressed — go to applications
          <Link
            to="/applications"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 12, fontWeight: 600, color: C.text2,
              background: C.bg3, border: `1px solid ${C.border2}`,
              borderRadius: 7, padding: "0 12px", height: 30,
              display: "flex", alignItems: "center", gap: 4,
              textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Track
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onApply(job.id, job.source_url); }}
            disabled={applying}
            style={{
              fontSize: 12, fontWeight: 700, color: "#000",
              background: applying
                ? "rgba(245,155,0,0.4)"
                : `linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`,
              border: "none", borderRadius: 7,
              padding: "0 14px", height: 30,
              cursor: applying ? "wait" : "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 4,
              boxShadow: applying ? "none" : "0 2px 8px rgba(245,155,0,0.3)",
              transition: "opacity .15s",
            }}
          >
            {applying ? "…" : (
              <>
                Apply
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
function JobsPage() {
  const qc = useQueryClient();
  const listJobsFn  = useServerFn(listJobs);
  const getPrefsFn  = useServerFn(getFilterPrefs);
  const savePrefsFn = useServerFn(saveFilterPrefs);
  const upsertFn    = useServerFn(upsertApplication);

  const [filters,    setFilters]    = useState<Filters>({});
  const [loaded,     setLoaded]     = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    getPrefsFn().then((p) => { setFilters(p); setLoaded(true); });
  }, [getPrefsFn]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { savePrefsFn({ data: filters }).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [filters, loaded, savePrefsFn]);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => listJobsFn({ data: filters }),
    enabled: loaded,
  });

  const applyMut = useMutation({
    mutationFn: (job_id: string) => upsertFn({ data: { job_id, status: "applied" } }),
    onSuccess: () => {
      toast.success("Marked as applied 🎉");
      setApplyingId(null);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: () => { toast.error("Failed"); setApplyingId(null); },
  });

  function handleApply(jobId: string, sourceUrl: string | null) {
    setApplyingId(jobId);
    // Open the real job posting in a new tab
    if (sourceUrl) window.open(sourceUrl, "_blank", "noopener,noreferrer");
    // Mark as applied in the background
    applyMut.mutate(jobId);
  }

  function set<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  const activeCount = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== "" && v !== false).length,
    [filters]
  );

  const stats = useMemo(() => {
    if (!jobs) return null;
    return {
      total:   jobs.length,
      remote:  jobs.filter((j) => j.remote).length,
      applied: jobs.filter((j) => j.application).length,
    };
  }, [jobs]);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .jobs-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .jobs-grid { grid-template-columns: 1fr; }
        }
        .jobs-filter-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        @media (max-width: 640px) {
          .jobs-filter-row { grid-template-columns: 1fr; }
        }
        @keyframes shimmer {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.15; }
        }
      `}</style>

      {/* Full-bleed padding matching the sidebar edge */}
      <div style={{ padding: "32px 24px 80px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 6, fontWeight: 600 }}>
              Discover
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem,2.5vw,2rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Jobs for you
            </h1>
          </div>
          {stats && (
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { val: stats.total,   label: "listings" },
                { val: stats.remote,  label: "remote"   },
                { val: stats.applied, label: "tracked"  },
              ].map(({ val, label }) => (
                <div key={label} style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          background: C.bg2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "12px 14px", marginBottom: 16,
        }}>
          <div className="jobs-filter-row">
            <Inp
              placeholder="Search title, company, keyword…"
              value={filters.q}
              onChange={(v) => set("q", v || undefined)}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              }
            />
            <Inp
              placeholder="City or country"
              value={filters.location}
              onChange={(v) => set("location", v || undefined)}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              }
            />
            <Inp
              placeholder="Min salary"
              type="number"
              value={filters.min_salary}
              onChange={(v) => set("min_salary", v ? Number(v) : undefined)}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              }
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div style={{ flex: "1 1 120px" }}>
              <Sel
                value={filters.employment_type ?? "any"}
                onChange={(v) => set("employment_type", v === "any" ? undefined : v)}
                options={[
                  { value: "any",        label: "Any type"   },
                  { value: "full_time",  label: "Full-time"  },
                  { value: "part_time",  label: "Part-time"  },
                  { value: "contract",   label: "Contract"   },
                  { value: "internship", label: "Internship" },
                ]}
              />
            </div>
            <div style={{ flex: "1 1 110px" }}>
              <Sel
                value={filters.experience_level ?? "any"}
                onChange={(v) => set("experience_level", v === "any" ? undefined : v)}
                options={[
                  { value: "any",    label: "Any level" },
                  { value: "entry",  label: "Entry"     },
                  { value: "mid",    label: "Mid"       },
                  { value: "senior", label: "Senior"    },
                  { value: "lead",   label: "Lead"      },
                ]}
              />
            </div>

            {/* Remote pill toggle */}
            <button
              onClick={() => set("remote", filters.remote ? undefined : true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                border: filters.remote ? "1px solid rgba(34,197,94,0.4)" : `1px solid ${C.border2}`,
                background: filters.remote ? "rgba(34,197,94,0.08)" : C.bg3,
                color: filters.remote ? C.green : C.text2,
                fontSize: 12, fontWeight: filters.remote ? 600 : 400,
                fontFamily: "inherit", transition: "all .15s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Remote
            </button>

            {activeCount > 0 && (
              <button
                onClick={() => setFilters({})}
                style={{
                  background: "none", border: `1px solid ${C.border2}`,
                  color: C.text3, fontSize: 12, padding: "7px 11px",
                  borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text3)}
              >
                Clear {activeCount}
              </button>
            )}

            <div style={{ marginLeft: "auto", fontSize: 11, color: C.text3, whiteSpace: "nowrap" }}>
              {isLoading ? "Loading…" : `${jobs?.length ?? 0} results`}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="jobs-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                background: C.bg2, border: `1px solid ${C.border}`,
                borderRadius: 12, height: 220,
                animation: `shimmer ${1.4 + i * 0.1}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        ) : (jobs?.length ?? 0) === 0 ? (
          <div style={{
            background: C.bg2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "64px 24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No jobs match these filters</div>
            <div style={{ fontSize: 13, color: C.text3 }}>Try broadening your search or clearing filters</div>
          </div>
        ) : (
          <div className="jobs-grid">
            {jobs!.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                onApply={handleApply}
                applying={applyingId === j.id && applyMut.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}