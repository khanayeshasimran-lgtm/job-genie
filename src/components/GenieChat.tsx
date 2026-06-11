"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { askGenie } from "@/lib/genie.functions";

// ── Tokens (match app-shell) ──────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  bg2: "#111111",
  bg3: "#161616",
  accent: "#F59B00",
  border: "#1E1E1E",
  border2: "#2A2A2A",
  text: "#FFFFFF",
  text2: "#999999",
  text3: "#666666",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const SUGGESTED_PROMPTS = [
  "What should I do today?",
  "Which jobs should I prioritize?",
  "Help me prepare for my interview.",
  "Review my applications.",
  "Should I accept my offer?",
];

// ── Simple markdown renderer (bold + bullets only) ────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<br key={i} />);
      return;
    }

    // Bullet point
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
    const content = isBullet ? trimmed.slice(2) : trimmed;

    // Bold: **text**
    const parts = content.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? (
        <strong key={j} style={{ color: C.text, fontWeight: 600 }}>
          {part}
        </strong>
      ) : (
        part
      )
    );

    if (isBullet) {
      elements.push(
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 3,
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{rendered}</span>
        </div>
      );
    } else {
      elements.push(
        <div key={i} style={{ marginBottom: 3 }}>
          {rendered}
        </div>
      );
    }
  });

  return elements;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: C.accent,
            opacity: 0.7,
            animation: `genie-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function GenieChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);


  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (!hasGreeted) {
        setHasGreeted(true);
        const hour = new Date().getHours();
        const greeting =
          hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `${greeting}! 👋 I'm Genie, your career agent.\n\nI know your applications, interviews, offers, and job matches. Ask me anything about your career journey — or pick one of the suggestions below.`,
            ts: Date.now(),
          },
        ]);
      }
    }
  }, [open, hasGreeted]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        // Build history from existing messages (skip the welcome message)
        const history = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const result = await askGenie({ data: { message: trimmed, history } });

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: result.response,
            ts: Date.now(),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "Something went wrong. Please try again in a moment.",
            ts: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes genie-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes genie-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes genie-fab-in {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1);   }
        }
        .genie-msg-bubble::-webkit-scrollbar { display: none; }
        .genie-drawer { animation: genie-slide-up 0.22s ease; }
        .genie-fab    { animation: genie-fab-in   0.3s ease; }
        .genie-chip:hover {
          background: rgba(245,155,0,0.15) !important;
          border-color: rgba(245,155,0,0.5) !important;
          color: #F59B00 !important;
        }
        .genie-send:hover:not(:disabled) {
          background: #D4840A !important;
        }
        .genie-send:disabled { opacity: 0.45; cursor: not-allowed; }
        .genie-close:hover { background: rgba(255,255,255,0.08) !important; }
        .genie-overlay { animation: genie-slide-up 0.18s ease; }
      `}</style>

      {/* ── Floating Action Button ── */}
      {!open && (
        <button
          className="genie-fab"
          onClick={() => setOpen(true)}
          title="Ask Genie"
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9000,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent} 0%, #D4840A 100%)`,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(245,155,0,0.45), 0 2px 8px rgba(0,0,0,0.6)",
            fontSize: 26,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          🧞
        </button>
      )}

      {/* ── Backdrop (mobile) ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 8998,
            background: "rgba(0,0,0,0.5)",
          }}
          className="genie-overlay"
        />
      )}

      {/* ── Chat Drawer ── */}
      {open && (
        <div
          className="genie-drawer"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9001,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 560,
            maxHeight: "calc(100vh - 48px)",
            background: C.bg2,
            border: `1px solid ${C.border2}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,155,0,0.08)",
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${C.border}`,
              background: C.bg3,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.accent} 0%, #D4840A 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                🧞
              </div>
              <div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.2 }}
                >
                  Genie
                </div>
                <div style={{ fontSize: 11, color: C.accent, lineHeight: 1.2 }}>
                  Career Agent
                </div>
              </div>
            </div>

            <button
              className="genie-close"
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.text2,
                width: 30,
                height: 30,
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                {/* Avatar */}
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.accent} 0%, #D4840A 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                      marginBottom: 2,
                    }}
                  >
                    🧞
                  </div>
                )}

                {/* Bubble */}
                <div
                  className="genie-msg-bubble"
                  style={{
                    maxWidth: "82%",
                    padding: "10px 12px",
                    borderRadius:
                      msg.role === "user"
                        ? "14px 14px 4px 14px"
                        : "14px 14px 14px 4px",
                    background:
                      msg.role === "user"
                        ? `rgba(245,155,0,0.18)`
                        : C.bg3,
                    border:
                      msg.role === "user"
                        ? `1px solid rgba(245,155,0,0.3)`
                        : `1px solid ${C.border}`,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: msg.role === "user" ? C.text : C.text2,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.role === "assistant"
                    ? renderMarkdown(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.accent} 0%, #D4840A 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  🧞
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: C.bg3,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Suggested prompts — show only after welcome, before first user message */}
            {messages.length === 1 && !loading && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 4,
                  paddingLeft: 34,
                }}
              >
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    className="genie-chip"
                    onClick={() => send(p)}
                    style={{
                      background: "rgba(245,155,0,0.08)",
                      border: "1px solid rgba(245,155,0,0.2)",
                      color: C.text2,
                      fontSize: 11.5,
                      padding: "5px 10px",
                      borderRadius: 20,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "background 0.15s, border-color 0.15s, color 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: "10px 12px 12px",
              background: C.bg3,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                background: C.bg,
                border: `1px solid ${C.border2}`,
                borderRadius: 12,
                padding: "8px 8px 8px 12px",
                transition: "border-color 0.15s",
              }}
              onFocusCapture={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(245,155,0,0.4)";
              }}
              onBlurCapture={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = C.border2;
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Genie…"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: C.text,
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "none",
                  lineHeight: 1.5,
                  maxHeight: 100,
                  overflowY: "auto",
                  padding: 0,
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
              />
              <button
                className="genie-send"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: C.accent,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.text3,
                textAlign: "center",
                marginTop: 6,
                letterSpacing: "0.02em",
              }}
            >
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </>
  );
}