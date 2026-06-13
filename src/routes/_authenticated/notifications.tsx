import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotifications, markNotificationsRead } from "@/lib/jobgenie.functions";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const C = {
  bg: "#0A0A0A", bg2: "#111111", bg3: "#161616",
  accent: "#F59B00", accent2: "#D4840A",
  border: "#1E1E1E", border2: "#2A2A2A",
  text: "#FFFFFF", text2: "#999999", text3: "#666666",
};

function NotificationsPage() {
  const qc     = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationsRead);

  const { data: items } = useQuery({
    queryKey: ["notifications"],
    queryFn:  () => listFn(),
  });

  const mark = useMutation({
    mutationFn: () => markFn(),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  useEffect(() => { mark.mutate(); }, []);

  const unread = (items ?? []).filter((n: any) => !n.read).length;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "32px 24px 80px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.accent, marginBottom: 8, fontWeight: 700 }}>
            Inbox
          </div>
          <h1 style={{ fontSize: "clamp(1.4rem,2.5vw,2rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
            Notifications
          </h1>
          <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
            AI scores, reminders, and updates.
            {unread > 0 && <span style={{ color: C.accent, fontWeight: 600 }}> {unread} unread</span>}
          </p>
        </div>
        <button onClick={() => mark.mutate()} style={{
          background: "none", border: `1px solid ${C.border2}`,
          color: C.text2, fontSize: 12, fontWeight: 600,
          padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
        }}>
          Mark all read
        </button>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items?.map((n: any) => (
          <div key={n.id} style={{
            background: C.bg2,
            border: `1px solid ${n.read ? C.border : "rgba(245,155,0,0.22)"}`,
            borderRadius: 12, padding: "16px 20px",
            opacity: n.read ? 0.5 : 1,
            transition: "opacity .2s",
            position: "relative",
          }}>
            {/* Unread accent bar */}
            {!n.read && (
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: C.accent, borderRadius: "12px 0 0 12px" }} />
            )}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, paddingLeft: n.read ? 0 : 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 13, color: C.text2, marginBottom: 8, lineHeight: 1.55 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: C.text3 }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, flexShrink: 0, marginTop: 5, boxShadow: `0 0 6px ${C.accent}` }} />
              )}
            </div>
          </div>
        ))}

        {items?.length === 0 && (
          <div style={{
            background: C.bg2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "64px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>All caught up</div>
            <div style={{ fontSize: 13, color: C.text3 }}>No new notifications.</div>
          </div>
        )}
      </div>
    </div>
  );
}