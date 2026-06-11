import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { importAdzunaJobs, importJSearchJobs } from "@/lib/jobgenie.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/seed")({
  component: SeedPage,
});

const C = {
  bg: "#0A0A0A", bg2: "#111111", bg3: "#161616",
  accent: "#F59B00", accent2: "#D4840A",
  border: "#1E1E1E", border2: "#2A2A2A",
  text: "#FFFFFF", text2: "#999999", text3: "#666666",
  green: "#22C55E", red: "#EF4444",
  blue: "#3B82F6", blue2: "#2563EB",
};

const ADZUNA_SEARCHES = [
  { query: "frontend developer", location: "india" },
  { query: "backend developer", location: "india" },
  { query: "full stack developer", location: "india" },
  { query: "product manager", location: "india" },
  { query: "data scientist", location: "india" },
  { query: "devops engineer", location: "india" },
];

const JSEARCH_SEARCHES = [
  { query: "frontend developer", location: "India" },
  { query: "backend developer", location: "India" },
  { query: "full stack developer", location: "India" },
  { query: "product manager", location: "India" },
  { query: "data scientist", location: "India" },
  { query: "devops engineer", location: "India" },
];

type LogEntry = {
  msg: string;
  ok: boolean;
  source: "adzuna" | "jsearch";
};

function SectionHeader({
  label, source, count,
}: { label: string; source: "adzuna" | "jsearch"; count: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", padding: "2px 8px", borderRadius: 5,
          background: source === "adzuna" ? "rgba(245,155,0,0.12)" : "rgba(59,130,246,0.12)",
          border: `1px solid ${source === "adzuna" ? "rgba(245,155,0,0.3)" : "rgba(59,130,246,0.3)"}`,
          color: source === "adzuna" ? C.accent : C.blue,
        }}>
          {source === "adzuna" ? "Adzuna" : "JSearch · RapidAPI"}
        </span>
      </div>
      <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>{count}</p>
    </div>
  );
}

function SeedPage() {
  const adzunaFn = useServerFn(importAdzunaJobs);
  const jsearchFn = useServerFn(importJSearchJobs);
  const [log, setLog] = useState<LogEntry[]>([]);

  function addLog(msg: string, ok: boolean, source: "adzuna" | "jsearch") {
    setLog((l) => [{ msg, ok, source }, ...l]);
  }

  // ── Adzuna single ────────────────────────────────────────────────────────
  const adzunaSingleMut = useMutation({
    mutationFn: (params: { query: string; location: string }) =>
      adzunaFn({ data: { ...params, pages: 2 } }),
    onSuccess: (result, vars) => {
      const msg = `"${vars.query}" → ${result.inserted} inserted, ${result.skipped} skipped (${result.total_fetched} fetched)`;
      addLog(msg, true, "adzuna");
      toast.success(`Adzuna: ${msg}`);
    },
    onError: (e, vars) => {
      const msg = `"${vars.query}" → ${(e as Error).message}`;
      addLog(msg, false, "adzuna");
      toast.error(`Adzuna error: ${(e as Error).message}`);
    },
  });

  // ── Adzuna all ───────────────────────────────────────────────────────────
  const adzunaAllMut = useMutation({
    mutationFn: async () => {
      for (const s of ADZUNA_SEARCHES) {
        try {
          const result = await adzunaFn({ data: { ...s, pages: 2 } });
          addLog(`"${s.query}" → ${result.inserted} inserted, ${result.skipped} skipped`, true, "adzuna");
        } catch (e) {
          addLog(`"${s.query}" → ${(e as Error).message}`, false, "adzuna");
        }
      }
    },
    onSuccess: () => toast.success("All Adzuna categories done!"),
    onError: (e) => toast.error((e as Error).message),
  });

  // ── JSearch single ───────────────────────────────────────────────────────
  const jsearchSingleMut = useMutation({
    mutationFn: async (params: { query: string; location: string }) => {
      try {
        // pages:1 to avoid timeout on individual calls
        const result = await jsearchFn({ data: { ...params, pages: 1 } });
        return result;
      } catch (e) {
        // Surface raw error
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        throw new Error(msg);
      }
    },
    onSuccess: (result, vars) => {
      const msg = `"${vars.query}" → ${result.inserted} inserted, ${result.skipped} skipped (${result.total_fetched} fetched)`;
      addLog(msg, true, "jsearch");
      toast.success(`JSearch: ${msg}`);
    },
    onError: (e, vars) => {
      const msg = `"${vars.query}" → ${(e as Error).message}`;
      addLog(msg, false, "jsearch");
      toast.error(`JSearch error: ${(e as Error).message}`);
      console.error("[JSearch error]", vars.query, e);
    },
  });

  // ── JSearch all ──────────────────────────────────────────────────────────
  // Calls each category one at a time from the CLIENT to avoid one giant
  // server-function call that times out.
  const jsearchAllMut = useMutation({
    mutationFn: async () => {
      for (const s of JSEARCH_SEARCHES) {
        try {
          const result = await jsearchFn({ data: { ...s, pages: 1 } });
          addLog(`"${s.query}" → ${result.inserted} inserted, ${result.skipped} skipped`, true, "jsearch");
        } catch (e) {
          const msg = e instanceof Error ? e.message : JSON.stringify(e);
          addLog(`"${s.query}" → ${msg}`, false, "jsearch");
          console.error("[JSearch all error]", s.query, e);
        }
      }
    },
    onSuccess: () => toast.success("All JSearch categories done!"),
    onError: (e) => toast.error((e as Error).message),
  });

  const busy =
    adzunaAllMut.isPending ||
    adzunaSingleMut.isPending ||
    jsearchAllMut.isPending ||
    jsearchSingleMut.isPending;

  const btnBase: React.CSSProperties = {
    width: "100%", padding: "13px 0", marginBottom: 12,
    border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700,
    fontFamily: "inherit", transition: "opacity .2s", cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1,
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      padding: "80px 2rem",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 16 }}>
          Admin Utility
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 8 }}>
          Job Seeder
        </h1>
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.7, marginBottom: 40 }}>
          Import real jobs from two sources into Supabase. Both write to the same{" "}
          <code style={{ fontSize: 12, color: C.text3, background: C.bg3, padding: "1px 6px", borderRadius: 4 }}>jobs</code>{" "}
          table and deduplicate by <code style={{ fontSize: 12, color: C.text3, background: C.bg3, padding: "1px 6px", borderRadius: 4 }}>source_url</code>.
          JSearch runs 1 page per call to avoid timeouts.
        </p>

        {/* ── ADZUNA ── */}
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <SectionHeader label="Adzuna" source="adzuna" count="India feed · 6 categories · 2 pages × 20 = ~40 jobs each" />
          <button
            onClick={() => adzunaAllMut.mutate()}
            disabled={busy}
            style={{
              ...btnBase,
              background: busy ? C.bg3 : `linear-gradient(90deg,${C.accent},${C.accent2})`,
              border: busy ? `1px solid ${C.border2}` : "none",
              color: busy ? C.text3 : "#000",
            }}
          >
            {adzunaAllMut.isPending ? "Importing Adzuna…" : "Import all Adzuna (6 × 40 = ~240 jobs)"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ADZUNA_SEARCHES.map((s) => (
              <button
                key={s.query} disabled={busy}
                onClick={() => adzunaSingleMut.mutate(s)}
                style={{
                  padding: "10px 14px", background: C.bg3,
                  border: `1px solid ${C.border2}`, borderRadius: 8,
                  fontSize: 12, fontWeight: 500, color: busy ? C.text3 : C.text2,
                  cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit",
                  transition: "all .15s", textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = busy ? C.text3 : C.text2; }}
              >
                {s.query}
              </button>
            ))}
          </div>
        </div>

        {/* ── JSEARCH ── */}
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 40 }}>
          <SectionHeader label="JSearch · RapidAPI" source="jsearch" count="Indeed + LinkedIn + Glassdoor · 6 categories · 1 page each (avoids timeout)" />
          <button
            onClick={() => jsearchAllMut.mutate()}
            disabled={busy}
            style={{
              ...btnBase,
              background: busy ? C.bg3 : `linear-gradient(90deg,${C.blue},${C.blue2})`,
              border: busy ? `1px solid ${C.border2}` : "none",
              color: busy ? C.text3 : "#fff",
            }}
          >
            {jsearchAllMut.isPending ? "Importing JSearch…" : "Import all JSearch (6 categories)"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {JSEARCH_SEARCHES.map((s) => (
              <button
                key={s.query} disabled={busy}
                onClick={() => jsearchSingleMut.mutate(s)}
                style={{
                  padding: "10px 14px", background: C.bg3,
                  border: `1px solid ${C.border2}`, borderRadius: 8,
                  fontSize: 12, fontWeight: 500, color: busy ? C.text3 : C.text2,
                  cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit",
                  transition: "all .15s", textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = busy ? C.text3 : C.text2; }}
              >
                {s.query}
              </button>
            ))}
          </div>
        </div>

        {/* ── LOG ── */}
        {log.length > 0 && (
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Log</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 100, background: C.bg3, border: `1px solid ${C.border2}`, color: C.text3 }}>
                  {log.length} entries
                </span>
                <button
                  onClick={() => setLog([])}
                  style={{ background: "none", border: `1px solid ${C.border2}`, borderRadius: 6, fontSize: 11, color: C.text3, padding: "2px 10px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {log.map((entry, i) => (
                <div key={i} style={{
                  fontSize: 12, fontFamily: "monospace", padding: "5px 10px",
                  borderRadius: 6, background: C.bg3,
                  color: entry.ok ? (entry.source === "adzuna" ? C.green : C.blue) : C.red,
                  borderLeft: `2px solid ${entry.ok ? (entry.source === "adzuna" ? C.green : C.blue) : C.red}`,
                }}>
                  [{entry.source === "adzuna" ? "Adzuna" : "JSearch"}] {entry.ok ? "✓" : "✗"} {entry.msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}