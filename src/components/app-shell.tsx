import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { dashboardSummary } from "@/lib/jobgenie.functions";
import { type ReactNode, useState, useEffect } from "react";
import { GenieChat } from "@/components/GenieChat";
import logoImg from "@/assets/logo.png";

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:     "#0A0A0A",
  bg2:    "#111111",
  bg3:    "#161616",
  accent: "#F59B00",
  border: "#1E1E1E",
  border2:"#2A2A2A",
  text:   "#FFFFFF",
  text2:  "#999999",
  text3:  "#666666",
};

const SIDEBAR_EXPANDED_W = 220;
const SIDEBAR_COLLAPSED_W = 56;

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
    {
    to: "/jobs",
    label: "Jobs",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
        {
    to: "/career-gap",
    label: "Career Compass",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  
  {
    to: "/agent",
    label: "Agent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <circle cx="12" cy="5" r="2"/>
        <path d="M12 7v4M8 11V9M16 11V9"/>
      </svg>
    ),
  },

  {
    to: "/applications",
    label: "Applications",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
    ),
  },
  {
    to: "/opportunities",
    label: "Opportunities",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
] as const;

// Prep nav item (special — needs jobId param)
const PREP_ITEM = {
  label: "Interview Prep",
  icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
};

// ── Logo mark ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src={logoImg}
      alt="JobGenie"
      width={size}
      height={size}
      style={{ borderRadius: Math.round(size * 0.25), flexShrink: 0, display: "block", objectFit: "contain" }}
    />
  );
}

// ── Collapse toggle button ────────────────────────────────────────────────────
function CollapseBtn({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      style={{
        width: 24, height: 24,
        borderRadius: 6,
        background: "none",
        border: `1px solid ${C.border2}`,
        color: C.text3,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        transition: "color .15s, border-color .15s, background .15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = C.text;
        el.style.borderColor = C.border2;
        el.style.background = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = C.text3;
        el.style.background = "none";
      }}
    >
      {collapsed ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      )}
    </button>
  );
}

// ── Nav link ──────────────────────────────────────────────────────────────────
function NavLink({
  active, collapsed, icon, label, badge, onClick, href,
}: {
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: collapsed ? 0 : 10,
    padding: collapsed ? "9px 0" : "9px 12px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? C.text : C.text2,
    background: active ? "rgba(245,155,0,0.1)" : "transparent",
    textDecoration: "none",
    marginBottom: 2,
    transition: "background .15s, color .15s",
    position: "relative",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box" as const,
    border: "none",
    fontFamily: "inherit",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
  };

  const content = (
    <>
      {active && !collapsed && (
        <div style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 3, height: 18, background: C.accent, borderRadius: "0 2px 2px 0",
        }} />
      )}
      <span style={{
        color: active ? C.accent : "inherit",
        display: "flex", flexShrink: 0,
        transition: "color .15s",
      }}>
        {icon}
      </span>
      {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
      {!collapsed && badge}
    </>
  );

  const hoverStyle = {
    onMouseEnter: (e: React.MouseEvent) => {
      if (!active) {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.04)";
        el.style.color = C.text;
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (!active) {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "transparent";
        el.style.color = C.text2;
      }
    },
  };

  const tooltip = collapsed ? (
    <div className="sidebar-tooltip">{label}</div>
  ) : null;

  if (href) {
    return (
      <div style={{ position: "relative" }}>
        <a href={href} style={base} {...hoverStyle}>{content}</a>
        {tooltip}
      </div>
    );
  }
  if (onClick) {
    return (
      <div style={{ position: "relative" }}>
        <button style={base} onClick={onClick} {...hoverStyle}>{content}</button>
        {tooltip}
      </div>
    );
  }
  return null;
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: ReactNode }) {
const pathname = useRouterState({ select: (s: { location: { pathname: string } }) => s.location.pathname });  const navigate = useNavigate();
  const summaryFn = useServerFn(dashboardSummary);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => summaryFn(),
    refetchInterval: 30000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const onPrepPage = pathname.startsWith("/prep/");
  const prepJobId = onPrepPage ? pathname.split("/prep/")[1]?.split("/")[0] : null;
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: C.bg, color: C.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .sidebar-tooltip {
          display: none;
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1E1E1E;
          border: 1px solid #2A2A2A;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .sidebar-tooltip::before {
          content: "";
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: #2A2A2A;
        }
        div:hover > .sidebar-tooltip { display: block; }
        .app-sidebar {
          transition: width .2s cubic-bezier(.4,0,.2,1);
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
        }
        @media (min-width: 768px) {
          .show-mobile { display: none !important; }
        }
      `}</style>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden-mobile app-sidebar"
        style={{
          width: sidebarW,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${C.border}`,
          background: C.bg2,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Logo + collapse toggle */}
        <div style={{
          padding: collapsed ? "16px 0" : "16px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
          flexShrink: 0,
        }}>
          {!collapsed ? (
            <Link to="/jobs" style={{
              display: "flex", alignItems: "center", gap: 9,
              textDecoration: "none", color: C.text, fontWeight: 600, fontSize: 14,
              flex: 1, minWidth: 0,
            }}>
              <LogoMark size={28} />
              <span>JobGenie</span>
            </Link>
          ) : (
            <Link to="/jobs" title="JobGenie" style={{ display: "flex" }}>
              <LogoMark size={28} />
            </Link>
          )}
          {!collapsed && <CollapseBtn collapsed={false} onClick={() => setCollapsed(true)} />}
        </div>

        <div style={{ height: 1, background: C.border, margin: collapsed ? "0 10px 10px" : "0 14px 10px", flexShrink: 0 }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? "0 8px" : "0 8px", overflowY: "auto", overflowX: "hidden" }}>
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const isNotifs = item.to === "/notifications";
            return (
              <div key={item.to} style={{ position: "relative" }}>
                <Link
                  to={item.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: collapsed ? 0 : 10,
                    padding: collapsed ? "9px 0" : "9px 10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? C.text : C.text2,
                    background: active ? "rgba(245,155,0,0.1)" : "transparent",
                    textDecoration: "none",
                    marginBottom: 2,
                    transition: "background .15s, color .15s",
                    position: "relative",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLAnchorElement).style.color = C.text;
                    }
                  }}
onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color = C.text2;
                    }
                  }}
                >
                  {active && !collapsed && (
                    <div style={{
                      position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                      width: 3, height: 18, background: C.accent, borderRadius: "0 2px 2px 0",
                    }} />
                  )}
                  <span style={{ color: active ? C.accent : "inherit", display: "flex", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!collapsed && isNotifs && summary?.unread ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#000",
                      background: C.accent, borderRadius: 10,
                      padding: "1px 7px", lineHeight: 1.6,
                    }}>
                      {summary.unread}
                    </span>
                  ) : null}
                  {collapsed && isNotifs && summary?.unread ? (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      width: 7, height: 7, borderRadius: "50%",
                      background: C.accent, border: "1.5px solid #111",
                    }} />
                  ) : null}
                </Link>
                {collapsed && <div className="sidebar-tooltip">{item.label}</div>}
              </div>
            );
          })}

          {/* Interview Prep */}
          <div style={{ position: "relative" }}>
            <a
              href={prepJobId ? `/prep/${prepJobId}` : undefined}
              onClick={!prepJobId ? (e) => { e.preventDefault(); navigate({ to: "/applications" }); } : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: collapsed ? 0 : 10,
                padding: collapsed ? "9px 0" : "9px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: onPrepPage ? 600 : 400,
                color: onPrepPage ? C.text : C.text2,
                background: onPrepPage ? "rgba(245,155,0,0.1)" : "transparent",
                textDecoration: "none",
                marginBottom: 2,
                transition: "background .15s, color .15s",
                position: "relative",
                cursor: "pointer",
                overflow: "hidden",
                whiteSpace: "nowrap",
                width: "100%",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                if (!onPrepPage) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLAnchorElement).style.color = C.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!onPrepPage) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = C.text2;
                }
              }}
            >
              {onPrepPage && !collapsed && (
                <div style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 18, background: C.accent, borderRadius: "0 2px 2px 0",
                }} />
              )}
              <span style={{ color: onPrepPage ? C.accent : "inherit", display: "flex", flexShrink: 0 }}>
                {PREP_ITEM.icon}
              </span>
              {!collapsed && <span style={{ flex: 1 }}>Interview Prep</span>}
              {!collapsed && !prepJobId && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                  color: C.accent, background: "rgba(245,155,0,0.12)",
                  border: "1px solid rgba(245,155,0,0.25)",
                  borderRadius: 4, padding: "1px 5px",
                }}>
                  NEW
                </span>
              )}
            </a>
            {collapsed && <div className="sidebar-tooltip">Interview Prep</div>}
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: collapsed ? "10px 8px 14px" : "10px 8px 14px", flexShrink: 0 }}>
          {collapsed && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, position: "relative" }}>
              <button
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "none", border: `1px solid ${C.border2}`,
                  color: C.text3, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  transition: "color .15s, background .15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = C.text;
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = C.text3;
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <div className="sidebar-tooltip">Expand</div>
            </div>
          )}

          {!collapsed && (
            <div style={{
              background: C.bg3, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "9px 12px", marginBottom: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.text3, marginBottom: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Pipeline
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                {summary?.total ?? 0}{" "}
                <span style={{ fontWeight: 400, fontSize: 11, color: C.text3 }}>applications</span>
              </div>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <button
              onClick={signOut}
              style={{
                width: "100%",
                background: "none", border: `1px solid ${C.border2}`,
                color: C.text2, fontSize: 12, fontWeight: 500,
                padding: collapsed ? "8px 0" : "7px 12px",
                borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : 8,
                transition: "color .15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text2)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              {!collapsed && "Sign out"}
            </button>
            {collapsed && <div className="sidebar-tooltip">Sign out</div>}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <div
          className="show-mobile"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bg2,
          }}
        >
          <Link to="/jobs" style={{
            display: "flex", alignItems: "center", gap: 8,
            textDecoration: "none", color: C.text, fontWeight: 600, fontSize: 14,
          }}>
            <LogoMark size={26} />
            JobGenie
          </Link>
          <button onClick={signOut} style={{
            background: "none", border: `1px solid ${C.border2}`,
            color: C.text2, width: 32, height: 32, borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="show-mobile"
          style={{
            display: "flex", overflowX: "auto", gap: 4,
            padding: "6px 10px", borderBottom: `1px solid ${C.border}`,
            background: C.bg2,
          }}
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} style={{
                padding: "5px 11px", borderRadius: 6, fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? C.accent : C.text2,
                background: active ? "rgba(245,155,0,0.1)" : "transparent",
                textDecoration: "none", whiteSpace: "nowrap",
                border: active ? "1px solid rgba(245,155,0,0.25)" : "1px solid transparent",
              }}>
                {item.label}
              </Link>
            );
          })}
          <a
            href={prepJobId ? `/prep/${prepJobId}` : "/applications"}
            style={{
              padding: "5px 11px", borderRadius: 6, fontSize: 12,
              fontWeight: onPrepPage ? 600 : 400,
              color: onPrepPage ? C.accent : C.text2,
              background: onPrepPage ? "rgba(245,155,0,0.1)" : "transparent",
              textDecoration: "none", whiteSpace: "nowrap",
              border: onPrepPage ? "1px solid rgba(245,155,0,0.25)" : "1px solid transparent",
            }}
          >
            Prep
          </a>
        </nav>

        {children}
      </main>

      {/* Genie */}
      <GenieChat />
    </div>
  );
}