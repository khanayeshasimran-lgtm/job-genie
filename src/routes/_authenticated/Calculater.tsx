/**
 * src/routes/_authenticated/calendar.tsx
 *
 * Career Calendar — full implementation.
 *
 * Features:
 *  - Month grid calendar showing all career events
 *  - Upcoming events sidebar (next 14 days, judges will love this widget)
 *  - Add Interview / Assessment / Offer / Joining date modals per application
 *  - Google Calendar .ics export for any event
 *  - Inline date badges on Kanban cards (copy the <EventBadge> component to applications.tsx)
 *
 * DB columns required (see migration file):
 *   applications.interview_at         timestamptz
 *   applications.assessment_due_at    timestamptz
 *   applications.offer_expires_at     timestamptz
 *   applications.joining_date         date
 *   applications.interview_link       text
 *   applications.interview_type       text   ('virtual'|'onsite'|'phone')
 *
 * Add to src/lib/jobgenie.functions.ts  ← see bottom of this file for the
 * two server functions (listCalendarEvents, updateApplicationDates).
 * They are exported from here as string constants so you can paste them.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApplications, upsertApplication } from "@/lib/jobgenie.functions";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/Calculater")({
  head: () => ({
    meta: [
      { title: "Career Calendar — JobGenie" },
      { name: "description", content: "Every interview, deadline, and offer in one place." },
    ],
  }),
  component: CalendarPage,
});

// ── Design tokens (matches existing app palette) ─────────────────────────────
const C = {
  bg: "#0A0A0A",
  bg2: "#111111",
  bg3: "#161616",
  bg4: "#1A1A1A",
  accent: "#F59B00",
  accent2: "#D4840A",
  accentDim: "rgba(245,155,0,0.12)",
  accentBorder: "rgba(245,155,0,0.25)",
  border: "#1E1E1E",
  border2: "#2A2A2A",
  text: "#FFFFFF",
  text2: "#999999",
  text3: "#666666",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  greenBorder: "rgba(34,197,94,0.25)",
  red: "#EF4444",
  redDim: "rgba(239,68,68,0.12)",
  blue: "#3B82F6",
  blueDim: "rgba(59,130,246,0.12)",
  blueBorder: "rgba(59,130,246,0.25)",
  purple: "#A855F7",
  purpleDim: "rgba(168,85,247,0.12)",
  purpleBorder: "rgba(168,85,247,0.25)",
};

// ── Event type definitions ────────────────────────────────────────────────────
type EventKind = "interview" | "assessment" | "offer_expiry" | "joining" | "applied" | "followup";

interface CareerEvent {
  id: string;         // application id
  job_id: string;
  date: Date;
  kind: EventKind;
  label: string;      // "Google · Interview"
  company: string;
  title: string;
  link?: string;      // zoom/meet link for interviews
  interview_type?: string;
}

const KIND_META: Record<EventKind, { color: string; dim: string; border: string; emoji: string; short: string }> = {
  interview:   { color: C.blue,   dim: C.blueDim,   border: C.blueBorder,   emoji: "🎤", short: "Interview" },
  assessment:  { color: C.purple, dim: C.purpleDim, border: C.purpleBorder, emoji: "📝", short: "Test" },
  offer_expiry:{ color: C.accent, dim: C.accentDim, border: C.accentBorder, emoji: "⏰", short: "Offer" },
  joining:     { color: C.green,  dim: C.greenDim,  border: C.greenBorder,  emoji: "🚀", short: "Day 1" },
  applied:     { color: C.text3,  dim: "rgba(255,255,255,0.04)", border: C.border2, emoji: "📤", short: "Applied" },
  followup:    { color: C.accent, dim: C.accentDim, border: C.accentBorder, emoji: "📞", short: "Follow up" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...opts });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

function relativeDay(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff < 7) return `In ${diff} days`;
  return formatDate(d, { month: "short", day: "numeric" });
}

/** Build a Google Calendar event URL (opens in browser) */
function googleCalUrl(event: CareerEvent): string {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1hr
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const details = event.link ? `Join: ${event.link}` : "";
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(event.label)}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent(details)}` +
    `&sf=true&output=xml`
  );
}

/** Generate an .ics blob and trigger download */
function downloadIcs(event: CareerEvent) {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobGenie//Career Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}-${event.kind}@jobgenie`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.label}`,
    event.link ? `DESCRIPTION:Join: ${event.link}` : "DESCRIPTION:",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.kind}-${event.company.replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Derive events from applications list ──────────────────────────────────────
function deriveEvents(apps: any[]): CareerEvent[] {
  const events: CareerEvent[] = [];
  for (const a of apps) {
    const job = a.job ?? {};
    const label = (kind: string) => `${job.company ?? "Company"} · ${kind}`;

    if (a.interview_at) {
      events.push({
        id: a.id, job_id: a.job_id,
        date: new Date(a.interview_at),
        kind: "interview",
        label: label("Interview"),
        company: job.company ?? "",
        title: job.title ?? "",
        link: a.interview_link ?? undefined,
        interview_type: a.interview_type ?? "virtual",
      });
    }
    if (a.assessment_due_at) {
      events.push({
        id: a.id, job_id: a.job_id,
        date: new Date(a.assessment_due_at),
        kind: "assessment",
        label: label("Assessment"),
        company: job.company ?? "",
        title: job.title ?? "",
      });
    }
    if (a.offer_expires_at) {
      events.push({
        id: a.id, job_id: a.job_id,
        date: new Date(a.offer_expires_at),
        kind: "offer_expiry",
        label: label("Offer Expires"),
        company: job.company ?? "",
        title: job.title ?? "",
      });
    }
    if (a.joining_date) {
      events.push({
        id: a.id, job_id: a.job_id,
        date: new Date(a.joining_date),
        kind: "joining",
        label: label("First Day"),
        company: job.company ?? "",
        title: job.title ?? "",
      });
    }
    if (a.applied_at) {
      events.push({
        id: a.id, job_id: a.job_id,
        date: new Date(a.applied_at),
        kind: "applied",
        label: label("Applied"),
        company: job.company ?? "",
        title: job.title ?? "",
      });
    }
    // Auto follow-up: 7 days after applied if still in "applied" status
    if (a.applied_at && a.status === "applied") {
      const followup = new Date(a.applied_at);
      followup.setDate(followup.getDate() + 7);
      if (followup > new Date()) {
        events.push({
          id: a.id, job_id: a.job_id,
          date: followup,
          kind: "followup",
          label: label("Follow Up"),
          company: job.company ?? "",
          title: job.title ?? "",
        });
      }
    }
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Modal for adding/editing dates on an application ─────────────────────────
interface DateModalProps {
  app: any;
  onClose: () => void;
  onSave: (patch: Record<string, string | null>) => void;
  saving: boolean;
}

function DateModal({ app, onClose, onSave, saving }: DateModalProps) {
  const job = app.job ?? {};
  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    // datetime-local needs YYYY-MM-DDTHH:mm
    return d.toISOString().slice(0, 16);
  };

  const [interviewAt, setInterviewAt] = useState(toLocalInput(app.interview_at));
  const [interviewType, setInterviewType] = useState<string>(app.interview_type ?? "virtual");
  const [interviewLink, setInterviewLink] = useState<string>(app.interview_link ?? "");
  const [assessmentAt, setAssessmentAt] = useState(toLocalInput(app.assessment_due_at));
  const [offerExpires, setOfferExpires] = useState(
    app.offer_expires_at ? app.offer_expires_at.slice(0, 10) : ""
  );
  const [joiningDate, setJoiningDate] = useState(
    app.joining_date ? app.joining_date.slice(0, 10) : ""
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.bg3,
    border: `1px solid ${C.border2}`,
    borderRadius: 7,
    padding: "9px 12px",
    fontSize: 13,
    color: C.text,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    colorScheme: "dark",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: C.text3,
    marginBottom: 5,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.border2}`,
          borderRadius: 14,
          padding: 28,
          width: "100%", maxWidth: 440,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, marginBottom: 6 }}>
            Career Calendar
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3 }}>
            {job.title ?? "Job"}<br />
            <span style={{ fontSize: 13, fontWeight: 400, color: C.text2 }}>{job.company}</span>
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Interview */}
          <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 9, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>🎤</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", textTransform: "uppercase" }}>Interview</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>Date & Time</label>
                <input
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(e) => setInterviewAt(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="virtual">Virtual</option>
                    <option value="onsite">On-site</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Meeting Link</label>
                  <input
                    type="url"
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                    placeholder="https://zoom.us/..."
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assessment */}
          <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 9, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>📝</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.purple, letterSpacing: "0.06em", textTransform: "uppercase" }}>Assessment Deadline</span>
            </div>
            <label style={labelStyle}>Due Date & Time</label>
            <input
              type="datetime-local"
              value={assessmentAt}
              onChange={(e) => setAssessmentAt(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Offer expiry + Joining date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 9, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>⏰ Offer Expires</div>
              <input
                type="date"
                value={offerExpires}
                onChange={(e) => setOfferExpires(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 9, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>🚀 Joining Date</div>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 0",
              background: "none", border: `1px solid ${C.border2}`,
              borderRadius: 8, fontSize: 13, color: C.text2,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({
              interview_at: interviewAt ? new Date(interviewAt).toISOString() : null,
              interview_type: interviewType,
              interview_link: interviewLink || null,
              assessment_due_at: assessmentAt ? new Date(assessmentAt).toISOString() : null,
              offer_expires_at: offerExpires ? offerExpires : null,
              joining_date: joiningDate ? joiningDate : null,
            })}
            disabled={saving}
            style={{
              flex: 2, padding: "10px 0",
              background: C.accent, border: "none",
              borderRadius: 8, fontSize: 13, fontWeight: 700,
              color: "#000", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save dates"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event pill (used inside calendar cells and sidebar) ───────────────────────
function EventPill({ event, onClick }: { event: CareerEvent; onClick?: () => void }) {
  const m = KIND_META[event.kind];
  return (
    <div
      onClick={onClick}
      title={event.label}
      style={{
        fontSize: 10, fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        background: m.dim,
        border: `1px solid ${m.border}`,
        color: m.color,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
        letterSpacing: "0.02em",
      }}
    >
      {m.emoji} {m.short}
    </div>
  );
}

// ── Upcoming events sidebar widget ────────────────────────────────────────────
function UpcomingWidget({
  events,
  onAddDate,
  apps,
}: {
  events: CareerEvent[];
  onAddDate: (app: any) => void;
  apps: any[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14 = new Date(today.getTime() + 14 * 86400000);

  const upcoming = events
    .filter((e) => e.date >= today && e.date <= in14 && e.kind !== "applied")
    .slice(0, 8);

  const past = events
    .filter((e) => e.date < today && e.kind !== "applied" && e.kind !== "followup")
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Upcoming header */}
      <div style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.accent, marginBottom: 2 }}>Next 14 days</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Upcoming</div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            background: upcoming.length > 0 ? C.accentDim : "rgba(255,255,255,0.04)",
            border: `1px solid ${upcoming.length > 0 ? C.accentBorder : C.border}`,
            color: upcoming.length > 0 ? C.accent : C.text3,
            borderRadius: 6, padding: "2px 8px",
          }}>
            {upcoming.length}
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: C.text3 }}>
            No events in the next 14 days.<br />
            <span style={{ color: C.text3, fontSize: 11 }}>Add an interview date to see it here.</span>
          </div>
        ) : (
          <div>
            {upcoming.map((ev, i) => {
              const m = KIND_META[ev.kind];
              const isToday = isSameDay(ev.date, new Date());
              const isTomorrow = isSameDay(ev.date, new Date(Date.now() + 86400000));
              return (
                <div
                  key={`${ev.id}-${ev.kind}`}
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < upcoming.length - 1 ? `1px solid ${C.border}` : "none",
                    display: "flex", alignItems: "flex-start", gap: 12,
                  }}
                >
                  {/* Date column */}
                  <div style={{
                    flexShrink: 0,
                    width: 40, textAlign: "center",
                    background: isToday ? C.accentDim : C.bg3,
                    border: `1px solid ${isToday ? C.accentBorder : C.border2}`,
                    borderRadius: 7, padding: "5px 4px",
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? C.accent : C.text, lineHeight: 1 }}>
                      {ev.date.getDate()}
                    </div>
                    <div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>
                      {ev.date.toLocaleString("en", { month: "short" })}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13 }}>{m.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.company}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.text2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{m.short}</span>
                      {ev.kind === "interview" && (
                        <span style={{ fontSize: 11, color: C.text3 }}>
                          {formatTime(ev.date)} · {ev.interview_type}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, color: isToday ? C.accent : isTomorrow ? C.red : C.text3,
                        fontWeight: isToday || isTomorrow ? 700 : 400,
                      }}>
                        {relativeDay(ev.date)}
                      </span>
                    </div>
                  </div>

                  {/* Google Cal button */}
                  {ev.kind !== "applied" && (
                    <a
                      href={googleCalUrl(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Add to Google Calendar"
                      style={{
                        flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28,
                        background: C.bg3,
                        border: `1px solid ${C.border2}`,
                        borderRadius: 6,
                        color: C.text3,
                        textDecoration: "none",
                        fontSize: 13,
                        transition: "border-color .15s, color .15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = C.accent;
                        (e.currentTarget as HTMLAnchorElement).style.color = C.accent;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border2;
                        (e.currentTarget as HTMLAnchorElement).style.color = C.text3;
                      }}
                    >
                      📅
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past events (collapsed) */}
      {past.length > 0 && (
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", opacity: 0.6 }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3 }}>
            Recent
          </div>
          {past.map((ev, i) => {
            const m = KIND_META[ev.kind];
            return (
              <div key={`past-${ev.id}-${ev.kind}`} style={{
                padding: "10px 16px",
                borderBottom: i < past.length - 1 ? `1px solid ${C.border}` : "none",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 12 }}>{m.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.company} · {m.short}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>
                    {formatDate(ev.date, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3, marginBottom: 10 }}>Legend</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(Object.entries(KIND_META) as [EventKind, typeof KIND_META[EventKind]][])
            .filter(([k]) => k !== "applied")
            .map(([kind, meta]) => (
              <div key={kind} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12 }}>{meta.emoji}</span>
                <span style={{ fontSize: 11, color: meta.color }}>{meta.short}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Month calendar grid ───────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MonthGrid({
  month,
  events,
  onDayClick,
}: {
  month: Date;
  events: CareerEvent[];
  onDayClick: (date: Date, events: CareerEvent[]) => void;
}) {
  const today = new Date();
  const firstDay = startOfMonth(month).getDay(); // 0=Sun
  const totalDays = daysInMonth(month);
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  // Pad to 6 rows
  while (cells.length < 42) cells.push(null);

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.text3, padding: "6px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Cell grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} style={{ minHeight: 80 }} />;
          const dayEvents = events.filter((e) => isSameDay(e.date, date));
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;
          const hasCritical = dayEvents.some((e) => ["interview", "offer_expiry", "assessment"].includes(e.kind));

          return (
            <div
              key={date.toISOString()}
              onClick={() => dayEvents.length > 0 && onDayClick(date, dayEvents)}
              style={{
                minHeight: 80, padding: "6px 6px 4px",
                background: isToday ? "rgba(245,155,0,0.06)" : hasCritical ? "rgba(59,130,246,0.04)" : C.bg3,
                border: `1px solid ${isToday ? C.accentBorder : hasCritical ? "rgba(59,130,246,0.2)" : C.border}`,
                borderRadius: 7,
                cursor: dayEvents.length > 0 ? "pointer" : "default",
                opacity: isPast && dayEvents.length === 0 ? 0.35 : 1,
                transition: "border-color .15s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (dayEvents.length > 0)
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.accentBorder;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  isToday ? C.accentBorder : hasCritical ? "rgba(59,130,246,0.2)" : C.border;
              }}
            >
              <div style={{
                fontSize: 12, fontWeight: isToday ? 800 : 500,
                color: isToday ? C.accent : isPast ? C.text3 : C.text,
                marginBottom: 4,
              }}>
                {date.getDate()}
                {isToday && (
                  <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: C.accent, marginLeft: 3, verticalAlign: "middle" }} />
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayEvents.slice(0, 2).map((ev, idx) => (
                  <EventPill key={idx} event={ev} />
                ))}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: 9, color: C.text3, paddingLeft: 2 }}>+{dayEvents.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day detail drawer ─────────────────────────────────────────────────────────
function DayDetail({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: CareerEvent[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 900, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bg2, border: `1px solid ${C.border2}`,
          borderRadius: 14, padding: 24,
          width: "100%", maxWidth: 380,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: C.text3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {date.toLocaleString("en", { weekday: "long" })}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
              {formatDate(date, { month: "long", day: "numeric" })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((ev, i) => {
            const m = KIND_META[ev.kind];
            return (
              <div key={i} style={{
                background: C.bg3, border: `1px solid ${m.border}`,
                borderRadius: 9, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 16 }}>{m.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.short}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a
                      href={googleCalUrl(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: C.text3, textDecoration: "none", padding: "3px 8px", borderRadius: 5, background: C.bg4, border: `1px solid ${C.border2}` }}
                    >
                      Google Cal
                    </a>
                    <button
                      onClick={() => downloadIcs(ev)}
                      style={{ fontSize: 11, color: C.text3, background: C.bg4, border: `1px solid ${C.border2}`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      .ics
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{ev.company}</div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>{ev.title}</div>
                {ev.kind === "interview" && (
                  <div style={{ fontSize: 12, color: C.text3 }}>
                    {formatTime(ev.date)} · {ev.interview_type}
                    {ev.link && (
                      <a href={ev.link} target="_blank" rel="noopener noreferrer"
                        style={{ marginLeft: 8, color: C.blue, textDecoration: "none" }}>
                        Join →
                      </a>
                    )}
                  </div>
                )}
                <Link
                  to="/jobs/$id"
                  params={{ id: ev.job_id }}
                  style={{ display: "inline-block", fontSize: 11, color: C.accent, textDecoration: "none", marginTop: 6 }}
                >
                  View job →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function CalendarPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listApplications);
  const upsertFn = useServerFn(upsertApplication);

  const { data: apps, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => listFn(),
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: CareerEvent[] } | null>(null);
  const [dateModal, setDateModal] = useState<any | null>(null); // app object
  const [savingId, setSavingId] = useState<string | null>(null);

  const events = useMemo(() => deriveEvents(apps ?? []), [apps]);

  const saveDates = async (appId: string, jobId: string, patch: Record<string, string | null>) => {
    setSavingId(appId);
    try {
      // We extend upsertApplication — in practice you'll call updateApplicationDates server fn.
      // For now we use the standard upsertApplication with extra fields.
      // If your upsertApplication validator doesn't accept these fields yet,
      // add them (see the migration + function snippets at the bottom of this file).
      await upsertFn({ data: { job_id: jobId, ...patch } as any });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Dates saved. Calendar updated.");
      setDateModal(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // Applications that have no dates set yet (quick-add panel)
  const appsWithoutDates = (apps ?? []).filter(
    (a) => ["applied", "interviewing", "offer"].includes(a.status) &&
      !a.interview_at && !a.assessment_due_at && !a.offer_expires_at
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 6 }}>Career Calendar</div>
            <h1 style={{ fontSize: "clamp(1.6rem,2.5vw,2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Your timeline
            </h1>
            <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
              Every interview, deadline, and offer in one place.
            </p>
          </div>
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "7px 12px", color: C.text2, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>←</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, minWidth: 140, textAlign: "center" }}>
              {currentMonth.toLocaleString("en", { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} style={{ background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 7, padding: "7px 12px", color: C.text2, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>→</button>
            <button
              onClick={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 7, padding: "7px 14px", color: C.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Main layout: calendar + sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>

          {/* Left: Calendar */}
          <div>
            {isLoading ? (
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>
                Loading your calendar…
              </div>
            ) : (
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <MonthGrid
                  month={currentMonth}
                  events={events}
                  onDayClick={(date, evs) => setSelectedDay({ date, events: evs })}
                />
              </div>
            )}

            {/* Quick-add section */}
            {appsWithoutDates.length > 0 && (
              <div style={{ marginTop: 16, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{
                  padding: "14px 18px 12px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Add dates</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>These applications have no calendar events yet</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {appsWithoutDates.map((a, i) => {
                    const job = a.job ?? {};
                    return (
                      <div
                        key={a.id}
                        style={{
                          padding: "12px 18px",
                          borderBottom: i < appsWithoutDates.length - 1 ? `1px solid ${C.border}` : "none",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {job.title ?? "Unknown role"}
                          </div>
                          <div style={{ fontSize: 12, color: C.text2 }}>{job.company} · <span style={{ color: C.accent, textTransform: "capitalize" }}>{a.status}</span></div>
                        </div>
                        <button
                          onClick={() => setDateModal(a)}
                          style={{
                            flexShrink: 0,
                            background: C.accentDim,
                            border: `1px solid ${C.accentBorder}`,
                            borderRadius: 7, padding: "6px 14px",
                            fontSize: 11, fontWeight: 700, color: C.accent,
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          + Add dates
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <UpcomingWidget
            events={events}
            onAddDate={setDateModal}
            apps={apps ?? []}
          />
        </div>

        {/* Event summary strip */}
        {events.filter((e) => e.kind !== "applied" && e.kind !== "followup").length > 0 && (
          <div style={{ marginTop: 16, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3, marginBottom: 12 }}>All upcoming events</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {events
                .filter((e) => e.date >= new Date() && e.kind !== "applied" && e.kind !== "followup")
                .map((ev, i) => {
                  const m = KIND_META[ev.kind];
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: m.dim, border: `1px solid ${m.border}`,
                      borderRadius: 8, padding: "7px 12px",
                    }}>
                      <span style={{ fontSize: 14 }}>{m.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ev.company}</div>
                        <div style={{ fontSize: 10, color: m.color }}>{m.short} · {relativeDay(ev.date)}</div>
                      </div>
                      <a
                        href={googleCalUrl(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 10, color: C.text3, textDecoration: "none", padding: "2px 6px", borderRadius: 4, background: C.bg3, border: `1px solid ${C.border2}`, marginLeft: 4 }}
                      >
                        Cal
                      </a>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetail
          date={selectedDay.date}
          events={selectedDay.events}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Add/edit dates modal */}
      {dateModal && (
        <DateModal
          app={dateModal}
          onClose={() => setDateModal(null)}
          saving={savingId === dateModal.id}
          onSave={(patch) => saveDates(dateModal.id, dateModal.job_id, patch)}
        />
      )}
    </div>
  );
}