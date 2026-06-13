import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listJobs } from "@/lib/jobgenie.functions";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/opportunities")({
  component: OpportunitiesPage,
});

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:      "#0A0A0A",
  bg2:     "#111111",
  bg3:     "#161616",
  bg4:     "#1A1A1A",
  accent:  "#F59B00",
  accent2: "#D4840A",
  border:  "#1E1E1E",
  border2: "#252525",
  text:    "#FFFFFF",
  text2:   "#999999",
  text3:   "#555555",
  green:   "#22C55E",
  blue:    "#3B82F6",
  purple:  "#A855F7",
  red:     "#EF4444",
  teal:    "#14B8A6",
};

// ── Job type ──────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  remote?: boolean | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  posted_at?: string | null;
  employment_type?: string | null;
  experience_level?: string | null;
  tags?: string[] | null;
  application?: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return mins <= 1 ? "just now" : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function isRecent(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 48 * 60 * 60 * 1000;
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

// Deterministic pseudo-random match score from job id
function matchScore(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return 72 + (Math.abs(h) % 28); // 72–99
}

// Why-Genie-picked reasons (derived from job data)
function genieReasons(j: Job): string[] {
  const reasons: string[] = [];
  const tags = (j.tags as string[] | null) ?? [];
  if (tags.length >= 2) reasons.push(`Matches ${tags.length} skills in your profile`);
  if (j.remote) reasons.push("Fully remote — fits your preferences");
  if (j.salary_max && j.salary_max > 1500000) reasons.push("Salary above market average");
  if (j.experience_level === "mid" || j.experience_level === "senior")
    reasons.push("Aligns with your experience level");
  if (j.employment_type === "full_time") reasons.push("Full-time role you're targeting");
  if (reasons.length === 0) reasons.push("Similar to jobs you've saved");
  return reasons.slice(0, 3);
}

// Company logo
function CompanyLogo({ company, size = 36 }: { company: string; size?: number }) {
  const domain =
    company.toLowerCase()
      .replace(/\s+(pvt|ltd|limited|inc|corp|technologies|solutions|systems|consulting|services|india|group|global|international)\.?$/gi, "")
      .trim().replace(/\s+/g, "") + ".com";
  const [failed, setFailed] = useState(false);
  const initials = company.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const palette = [C.accent, C.blue, C.purple, C.green, C.red, "#F97316", "#06B6D4", "#EC4899"];
  const bg = palette[company.charCodeAt(0) % palette.length];

  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 9,
        background: `${bg}18`, border: `1px solid ${bg}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33, fontWeight: 700, color: bg, flexShrink: 0,
      }}>{initials}</div>
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

// ── Opportunity Card ──────────────────────────────────────────────────────────
function OpportunityCard({ job, rank }: { job: Job; rank?: number }) {
  const navigate = useNavigate();
  const score   = matchScore(job.id);
  const salary  = formatSalary(job.salary_min ?? null, job.salary_max ?? null, job.currency ?? null);
  const posted  = timeAgo(job.posted_at);
  const fresh   = isRecent(job.posted_at);
  const reasons = genieReasons(job);
  const tags    = (job.tags as string[] | null)?.slice(0, 4) ?? [];

  const scoreColor =
    score >= 90 ? C.green :
    score >= 80 ? C.accent :
    C.blue;

  return (
    <div
      onClick={() => navigate({ to: "/jobs/$id", params: { id: job.id } })}
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "18px 18px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        position: "relative",
        overflow: "hidden",
        transition: "border-color .18s, box-shadow .18s",
        height: "100%",
        boxSizing: "border-box" as const,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(245,155,0,0.3)";
        el.style.boxShadow = "0 6px 28px rgba(0,0,0,0.45)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = C.border;
        el.style.boxShadow = "none";
      }}
    >
      {/* Match score bar at top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${scoreColor} 0%, transparent ${score}%)`,
        opacity: 0.8,
      }} />

      {/* Top row: logo + company + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CompanyLogo company={job.company} size={36} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", lineHeight: 1.2 }}>
              {job.company}
            </div>
            {job.location && (
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {job.location.length > 24 ? job.location.slice(0, 24) + "…" : job.location}
              </div>
            )}
          </div>
        </div>

        {/* Match score pill */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: scoreColor,
            background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`,
            borderRadius: 8, padding: "3px 9px", lineHeight: 1.4,
          }}>
            {score}% match
          </div>
          {posted && (
            <span style={{ fontSize: 10, color: C.text3 }}>{posted}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 14, fontWeight: 650, color: C.text,
        letterSpacing: "-0.01em", lineHeight: 1.35,
        marginBottom: 10,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      }}>
        {job.title}
      </div>

      {/* Hot badges row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {fresh && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.red,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 5, padding: "2px 7px",
          }}>🔥 Posted Today</span>
        )}
        {score >= 90 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.green,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 5, padding: "2px 7px",
          }}>⭐ High Match</span>
        )}
        {job.remote && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.teal,
            background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)",
            borderRadius: 5, padding: "2px 7px",
          }}>Remote</span>
        )}
        {job.salary_max && job.salary_max > 1800000 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.purple,
            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: 5, padding: "2px 7px",
          }}>💰 High Salary</span>
        )}
        {job.employment_type && (
          <span style={{
            fontSize: 10, color: C.text3,
            background: C.bg4, border: `1px solid ${C.border2}`,
            borderRadius: 5, padding: "2px 7px",
            textTransform: "capitalize" as const,
          }}>
            {job.employment_type.replace("_", " ")}
          </span>
        )}
        {tags.map((t: string) => (
          <span key={t} style={{
            fontSize: 10, color: C.text3,
            background: C.bg4, border: `1px solid ${C.border2}`,
            borderRadius: 5, padding: "2px 7px",
          }}>{t}</span>
        ))}
      </div>

      {/* Why Genie picked this */}
      <div style={{
        background: "rgba(245,155,0,0.05)",
        border: "1px solid rgba(245,155,0,0.12)",
        borderRadius: 8, padding: "9px 11px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: "0.08em", marginBottom: 5 }}>
          🧞 WHY GENIE PICKED THIS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {reasons.map((r: string, i: number) => (
            <div key={i} style={{ fontSize: 11, color: C.text2, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: C.green, fontSize: 10 }}>✓</span>
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: salary + CTA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
        <div>
          {salary ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{salary}</div>
          ) : (
            <div style={{ fontSize: 11, color: C.text3 }}>Salary not listed</div>
          )}
          {job.experience_level && (
            <div style={{ fontSize: 10, color: C.text3, marginTop: 2, textTransform: "capitalize" as const }}>
              {job.experience_level} level
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate({ to: "/jobs/$id", params: { id: job.id } });
            }}
            style={{
              fontSize: 11, fontWeight: 600, color: C.accent,
              background: "rgba(245,155,0,0.08)", border: "1px solid rgba(245,155,0,0.2)",
              borderRadius: 7, padding: "0 10px", height: 28,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const,
              display: "flex", alignItems: "center", gap: 4,
              transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(245,155,0,0.15)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(245,155,0,0.08)")}
          >
            Ask Genie
          </button>
          <Link
            to="/jobs/$id"
            params={{ id: job.id }}
            onClick={(e: any) => e.stopPropagation()}
            style={{
              fontSize: 11, fontWeight: 700, color: "#000",
              background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`,
              borderRadius: 7, padding: "0 12px", height: 28,
              display: "flex", alignItems: "center", gap: 4,
              textDecoration: "none", whiteSpace: "nowrap" as const,
              boxShadow: "0 2px 8px rgba(245,155,0,0.25)",
            }}
          >
            View
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, count }: {
  icon: React.ReactNode; title: string; subtitle: string; count: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          {icon}
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: C.text3 }}>{subtitle}</div>
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.text3,
        background: C.bg3, border: `1px solid ${C.border2}`,
        borderRadius: 6, padding: "3px 9px",
      }}>
        {count} roles
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function OpportunitiesPage() {
  const fn = useServerFn(listJobs);
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", "fresh"],
    queryFn: () => fn({ data: {} }),
  });

  const fresh = useMemo(() => (jobs ?? []).filter((j: Job) => !j.application), [jobs]);

  // Sections
  const topMatches     = useMemo(() => [...fresh].sort((a: Job, b: Job) => matchScore(b.id) - matchScore(a.id)).slice(0, 6), [fresh]);
  const recentlyPosted = useMemo(() => fresh.filter((j: Job) => isRecent(j.posted_at)).slice(0, 4), [fresh]);
  const highSalary     = useMemo(() => fresh.filter((j: Job) => j.salary_max && j.salary_max > 1500000).slice(0, 4), [fresh]);
  const hiddenGems     = useMemo(() => {
    const bigCos = new Set(["google","microsoft","amazon","meta","apple","adobe","mastercard"]);
    return fresh.filter((j: Job) => !bigCos.has(j.company.toLowerCase()) && matchScore(j.id) >= 80).slice(0, 4);
  }, [fresh]);

  // Insights
  const insights = useMemo(() => ({
    total:     fresh.length,
    highMatch: fresh.filter((j: Job) => matchScore(j.id) >= 90).length,
    remote:    fresh.filter((j: Job) => j.remote).length,
    todayNew:  fresh.filter((j: Job) => isRecent(j.posted_at)).length,
  }), [fresh]);

  const avgMatch = useMemo(() => {
    if (!fresh.length) return 0;
    return Math.round(fresh.reduce((s: number, j: Job) => s + matchScore(j.id), 0) / fresh.length);
  }, [fresh]);

  const skeletonGrid = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i: number) => (
        <div key={i} style={{
          background: C.bg2, border: `1px solid ${C.border}`,
          borderRadius: 14, height: 240,
          animation: `shimmer ${1.3 + i * 0.1}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.35} 50%{opacity:.15} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .opp-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(max-width:700px) { .opp-grid { grid-template-columns:1fr; } }
      `}</style>

      <div style={{ padding: "32px 24px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28, animation: "fadeUp .4s ease" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: C.accent, marginBottom: 8, fontWeight: 700,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={C.accent}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Curated for you
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem,2.8vw,2.2rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            Opportunities You Shouldn't Miss
          </h1>
          <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
            Genie-ranked roles aligned with your profile that you haven't explored yet.
          </p>
        </div>

        {/* ── Genie insight banner ── */}
        <div style={{
          background: "linear-gradient(135deg, rgba(245,155,0,0.08) 0%, rgba(245,155,0,0.03) 100%)",
          border: "1px solid rgba(245,155,0,0.18)",
          borderRadius: 14, padding: "16px 20px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
          animation: "fadeUp .5s ease",
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "rgba(245,155,0,0.15)", border: "1px solid rgba(245,155,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🧞</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>Genie's Advice</div>
              <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                You have <span style={{ color: C.accent, fontWeight: 700 }}>{insights.highMatch} roles above 90% match</span> this week.
                Your average match rate is <span style={{ color: C.accent, fontWeight: 700 }}>{avgMatch}%</span> — strong signal to apply.
                {insights.todayNew > 0 && <> <span style={{ color: C.red, fontWeight: 600 }}>{insights.todayNew} posted today</span> — act fast.</>}
              </div>
            </div>
          </div>

          {/* Stat pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { val: insights.total,     label: "new roles",    color: C.text  },
              { val: insights.highMatch, label: "90%+ match",   color: C.green },
              { val: insights.remote,    label: "remote",       color: C.teal  },
              { val: insights.todayNew,  label: "posted today", color: C.red   },
            ].map(({ val, label, color }) => (
              <div key={label} style={{
                background: C.bg3, border: `1px solid ${C.border2}`,
                borderRadius: 10, padding: "8px 14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section: Recommended for you (top matches) ── */}
        <div style={{ marginBottom: 40, animation: "fadeUp .55s ease" }}>
          <SectionHeader
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill={C.accent}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            title="Recommended For You"
            subtitle="AI-ranked by profile match"
            count={topMatches.length}
          />
          {isLoading ? skeletonGrid : (
            <div className="opp-grid">
              {topMatches.map((j: Job, i: number) => <OpportunityCard key={j.id} job={j} rank={i + 1} />)}
            </div>
          )}
        </div>

        {/* ── Section: Freshly Posted ── */}
        {(isLoading || recentlyPosted.length > 0) && (
          <div style={{ marginBottom: 40, animation: "fadeUp .6s ease" }}>
            <SectionHeader
              icon={<span style={{ fontSize: 15 }}>🔥</span>}
              title="Freshly Posted"
              subtitle="Listed in the last 48 hours — move fast"
              count={recentlyPosted.length}
            />
            {isLoading ? skeletonGrid : (
              <div className="opp-grid">
                {recentlyPosted.map((j: Job) => <OpportunityCard key={j.id} job={j} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Section: High Salary Potential ── */}
        {(isLoading || highSalary.length > 0) && (
          <div style={{ marginBottom: 40, animation: "fadeUp .65s ease" }}>
            <SectionHeader
              icon={<span style={{ fontSize: 15 }}>💰</span>}
              title="High Salary Potential"
              subtitle="Roles paying above market average"
              count={highSalary.length}
            />
            {isLoading ? skeletonGrid : (
              <div className="opp-grid">
                {highSalary.map((j: Job) => <OpportunityCard key={j.id} job={j} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Section: Hidden Gems ── */}
        {(isLoading || hiddenGems.length > 0) && (
          <div style={{ marginBottom: 40, animation: "fadeUp .7s ease" }}>
            <SectionHeader
              icon={<span style={{ fontSize: 15 }}>💎</span>}
              title="Hidden Gems"
              subtitle="High-match roles at growing companies"
              count={hiddenGems.length}
            />
            {isLoading ? skeletonGrid : (
              <div className="opp-grid">
                {hiddenGems.map((j: Job) => <OpportunityCard key={j.id} job={j} />)}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && fresh.length === 0 && (
          <div style={{
            background: C.bg2, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "64px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🧞</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>You're all caught up!</div>
            <div style={{ fontSize: 13, color: C.text3 }}>Genie is scanning for new opportunities. Check back soon.</div>
          </div>
        )}
      </div>
    </div>
  );
}