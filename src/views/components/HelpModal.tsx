import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard, HelpCircle, ArrowLeft, Play } from "lucide-react";

export default function HelpModal({ isDark, onClose, onRestartTour }) {
  const [activeTab, setActiveTab] = useState("main");
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 600;
  const isTablet = typeof window !== "undefined" && window.innerWidth > 600 && window.innerWidth <= 900;

  const handleRestartGuide = () => {
    if (!onRestartTour) return;
    onClose();
    setTimeout(() => {
      onRestartTour();
    }, 100);
  };

  const shortcuts = [
    { key: "Esc", description: "Close modals, exit overlays, or skip guide" },
    { key: "Ctrl + K", description: "Focus search box (quick find)" },
    { key: "← / →", description: "Navigate between questions in detail view" },
    { key: "Space", description: "Scroll down in question detail" },
    { key: "Shift + Space", description: "Scroll up in question detail" },
    { key: "Ctrl + Enter", description: "Submit form when editing/adding questions" },
  ];

  const faqItems = [
    {
      q: "How do I add a new question?",
      a: "Click the '+' button in the question list (requires admin permissions). You'll be taken to the question editor where you can add text, choices, solutions, and draw math diagrams."
    },
    {
      q: "Where are my questions stored?",
      a: "Questions are synced with your Supabase account. Favorites, study tips, and mock exam results backup automatically when you're signed in."
    },
    {
      q: "Can I use QBANK offline?",
      a: "Yes! QBANK is PWA compliant. Once loaded, you can view questions, take mock exams, and create study notes offline. Your changes sync when reconnected."
    },
    {
      q: "How do Timed Mock Exams work?",
      a: "Go to Mock Exam page and choose Professional (170 items, 3h10m) or Subprofessional (165 items, 2h40m). Progress auto-saves so you can pause and resume anytime."
    },
    {
      q: "What are Study Tips & Canvas Drawings?",
      a: "Study Tips let you attach notes or freehand canvas drawings to any question. Categorize them by type (Formula, Shortcut, Method) and track your mastery level."
    },
    {
      q: "How do I favorite questions?",
      a: "Click the star icon on any question card or detail view. Starred items sync across your devices and can be filtered in your workspace."
    },
    {
      q: "How do I toggle Dark & Light mode?",
      a: "Click the theme icon in the top header or side navigation rail. Your preference is saved automatically across sessions."
    },
    {
      q: "Are my mock exam attempts saved?",
      a: "Yes! All completed mock exam attempts are saved under Attempt History on the Mock Exam page, complete with full diagnostic review analytics."
    }
  ];

  // QBANK System Palette Definitions
  const theme = isDark
    ? {
        overlayBg: "rgba(4, 8, 18, 0.82)",
        modalBg: "linear-gradient(180deg, #0e172c 0%, #091020 100%)",
        modalBorder: "1px solid rgba(255, 255, 255, 0.14)",
        modalShadow: "0 24px 55px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(245, 166, 35, 0.15)",
        headerKickerColor: "#f5a623",
        headerTitleColor: "#ffffff",
        buttonBg: "rgba(255, 255, 255, 0.08)",
        buttonBorder: "1px solid rgba(255, 255, 255, 0.12)",
        buttonColor: "#e2e8f0",
        buttonHoverBg: "rgba(255, 255, 255, 0.16)",
        buttonHoverColor: "#ffffff",
        cardBg: "rgba(255, 255, 255, 0.04)",
        cardBorder: "1px solid rgba(255, 255, 255, 0.10)",
        cardHoverBg: "rgba(255, 255, 255, 0.08)",
        cardHoverBorder: "1px solid rgba(245, 166, 35, 0.35)",
        cardTitleColor: "#ffffff",
        cardBodyColor: "#94a3b8",
        kbdBg: "rgba(245, 166, 35, 0.14)",
        kbdBorder: "1px solid rgba(245, 166, 35, 0.35)",
        kbdColor: "#f5a623",
        restartCardBg: "rgba(245, 166, 35, 0.12)",
        restartCardBorder: "1px solid rgba(245, 166, 35, 0.35)",
        restartCardHoverBorder: "1px solid rgba(245, 166, 35, 0.55)",
      }
    : {
        overlayBg: "rgba(15, 23, 42, 0.45)",
        modalBg: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        modalBorder: "1px solid #cbd5e1",
        modalShadow: "0 20px 50px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(245, 166, 35, 0.2)",
        headerKickerColor: "#d97706",
        headerTitleColor: "#0f172a",
        buttonBg: "#f1f5f9",
        buttonBorder: "1px solid #cbd5e1",
        buttonColor: "#334155",
        buttonHoverBg: "#e2e8f0",
        buttonHoverColor: "#0f172a",
        cardBg: "#f8fafc",
        cardBorder: "1px solid #e2e8f0",
        cardHoverBg: "#ffffff",
        cardHoverBorder: "1px solid rgba(245, 166, 35, 0.4)",
        cardTitleColor: "#0f172a",
        cardBodyColor: "#475569",
        kbdBg: "#e2e8f0",
        kbdBorder: "1px solid #cbd5e1",
        kbdColor: "#0f172a",
        restartCardBg: "rgba(245, 166, 35, 0.12)",
        restartCardBorder: "1px solid rgba(217, 119, 6, 0.35)",
        restartCardHoverBorder: "1px solid rgba(217, 119, 6, 0.55)",
      };

  return createPortal(
    <div 
      className="qb-settings-ov" 
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: theme.overlayBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation"
      }}
    >
      <div 
        className="qb-help-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "calc(100vw - 24px)" : isTablet ? "min(600px, 90vw)" : "min(680px, 90vw)",
          maxHeight: isMobile ? "calc(100dvh - 60px)" : "85vh",
          background: theme.modalBg,
          border: theme.modalBorder,
          borderRadius: isMobile ? "16px" : "20px",
          boxShadow: theme.modalShadow,
          padding: isMobile ? "16px" : isTablet ? "20px" : "24px",
          paddingBottom: isMobile ? "calc(16px + env(safe-area-inset-bottom, 0px))" : isTablet ? "20px" : "24px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "14px" : isTablet ? "18px" : "20px",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y"
        }}
      >
        {/* Header */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          gap: isMobile ? "10px" : "14px",
          flexShrink: 0
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: isMobile ? "8px" : "12px", 
            minWidth: 0,
            flex: 1
          }}>
            {activeTab !== "main" && (
              <button
                type="button"
                onClick={() => setActiveTab("main")}
                style={{
                  background: theme.buttonBg,
                  border: theme.buttonBorder,
                  color: theme.buttonColor,
                  width: isMobile ? "32px" : "36px",
                  height: isMobile ? "32px" : "36px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.buttonHoverBg;
                  e.currentTarget.style.color = theme.buttonHoverColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.buttonBg;
                  e.currentTarget.style.color = theme.buttonColor;
                }}
                title="Back to main menu"
              >
                <ArrowLeft size={isMobile ? 16 : 18} />
              </button>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-sans)",
                fontSize: isMobile ? "9px" : "10px",
                fontWeight: "700",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.headerKickerColor,
                marginBottom: "4px"
              }}>
                {activeTab === "main" ? "Help Center" : activeTab === "shortcuts" ? "Keyboard Shortcuts" : "FAQ"}
              </div>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: isMobile ? "17px" : isTablet ? "20px" : "22px",
                fontWeight: "700",
                letterSpacing: "-0.02em",
                color: theme.headerTitleColor,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: isMobile ? "nowrap" : "normal"
              }}>
                {activeTab === "main" ? "How can we help?" : activeTab === "shortcuts" ? "Shortcuts" : "FAQ"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: theme.buttonBg,
              border: theme.buttonBorder,
              color: theme.buttonColor,
              width: isMobile ? "32px" : "36px",
              height: isMobile ? "32px" : "36px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.buttonHoverBg;
              e.currentTarget.style.color = theme.buttonHoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.buttonBg;
              e.currentTarget.style.color = theme.buttonColor;
            }}
            title="Close help"
          >
            <X size={isMobile ? 16 : 18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain"
        }}>
          {activeTab === "main" ? (
            <div style={{ display: "grid", gap: isMobile ? "10px" : "12px" }}>
              {/* Restart Guide Card */}
              <button
                type="button"
                onClick={handleRestartGuide}
                style={{
                  background: theme.restartCardBg,
                  border: theme.restartCardBorder,
                  borderRadius: isMobile ? "14px" : "16px",
                  padding: isMobile ? "16px" : isTablet ? "18px" : "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "12px" : "16px",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation"
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(245,166,35,0.6)" : "rgba(217,119,6,0.6)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(245,166,35,0.35)" : "rgba(217,119,6,0.35)";
                  }
                }}
              >
                <div style={{
                  width: isMobile ? "42px" : "48px",
                  height: isMobile ? "42px" : "48px",
                  borderRadius: isMobile ? "10px" : "12px",
                  background: "#f5a623",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Play size={isMobile ? 18 : 22} color="#050914" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "700",
                    color: theme.cardTitleColor,
                    marginBottom: isMobile ? "4px" : "6px"
                  }}>
                    Restart Tutorial Guide
                  </div>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.6",
                    color: theme.cardBodyColor
                  }}>
                    {isMobile ? "Quick walkthrough of QBANK's features." : "A quick walkthrough of QBANK's key features. Great for first-time users or as a refresher."}
                  </div>
                </div>
              </button>

              {/* Keyboard Shortcuts Card */}
              <button
                type="button"
                onClick={() => setActiveTab("shortcuts")}
                style={{
                  background: theme.cardBg,
                  border: theme.cardBorder,
                  borderRadius: isMobile ? "14px" : "16px",
                  padding: isMobile ? "16px" : isTablet ? "18px" : "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "12px" : "16px",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation"
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = theme.cardHoverBg;
                    e.currentTarget.style.borderColor = isDark ? "rgba(96,165,250,0.4)" : "#3b82f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = theme.cardBg;
                    e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0";
                  }
                }}
              >
                <div style={{
                  width: isMobile ? "42px" : "48px",
                  height: isMobile ? "42px" : "48px",
                  borderRadius: isMobile ? "10px" : "12px",
                  background: isDark ? "rgba(96,165,250,0.14)" : "rgba(59,130,246,0.1)",
                  border: isDark ? "1px solid rgba(96,165,250,0.30)" : "1px solid rgba(59,130,246,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Keyboard size={isMobile ? 18 : 22} color={isDark ? "#60a5fa" : "#2563eb"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "700",
                    color: theme.cardTitleColor,
                    marginBottom: isMobile ? "4px" : "6px"
                  }}>
                    Keyboard Shortcuts
                  </div>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.6",
                    color: theme.cardBodyColor
                  }}>
                    {isMobile ? "Learn shortcuts to navigate faster." : "Learn keyboard shortcuts to navigate faster and boost your productivity."}
                  </div>
                </div>
              </button>

              {/* FAQ Card */}
              <button
                type="button"
                onClick={() => setActiveTab("faq")}
                style={{
                  background: theme.cardBg,
                  border: theme.cardBorder,
                  borderRadius: isMobile ? "14px" : "16px",
                  padding: isMobile ? "16px" : isTablet ? "18px" : "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "12px" : "16px",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation"
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = theme.cardHoverBg;
                    e.currentTarget.style.borderColor = isDark ? "rgba(34,197,94,0.4)" : "#16a34a";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = theme.cardBg;
                    e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0";
                  }
                }}
              >
                <div style={{
                  width: isMobile ? "42px" : "48px",
                  height: isMobile ? "42px" : "48px",
                  borderRadius: isMobile ? "10px" : "12px",
                  background: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.1)",
                  border: isDark ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(34,197,94,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <HelpCircle size={isMobile ? 18 : 22} color={isDark ? "#22c55e" : "#16a34a"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "700",
                    color: theme.cardTitleColor,
                    marginBottom: isMobile ? "4px" : "6px"
                  }}>
                    Frequently Asked Questions
                  </div>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.6",
                    color: theme.cardBodyColor
                  }}>
                    {isMobile ? "Find answers to common questions." : "Find answers to common questions about features, accounts, and troubleshooting."}
                  </div>
                </div>
              </button>
            </div>
          ) : activeTab === "shortcuts" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "6px" : "8px" }}>
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isMobile ? "12px" : "16px",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    background: theme.cardBg,
                    border: theme.cardBorder,
                    borderRadius: isMobile ? "10px" : "12px"
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "12px" : "14px",
                    color: theme.cardTitleColor,
                    flex: 1
                  }}>
                    {shortcut.description}
                  </div>
                  <kbd style={{
                    fontFamily: "'Fira Mono', monospace",
                    fontSize: isMobile ? "10px" : "12px",
                    fontWeight: "700",
                    color: theme.kbdColor,
                    background: theme.kbdBg,
                    padding: isMobile ? "5px 10px" : "6px 12px",
                    borderRadius: "6px",
                    border: theme.kbdBorder,
                    whiteSpace: "nowrap"
                  }}>
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          ) : activeTab === "faq" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "16px" }}>
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: theme.cardBg,
                    border: theme.cardBorder,
                    borderRadius: isMobile ? "12px" : "14px",
                    padding: isMobile ? "14px" : "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobile ? "8px" : "10px"
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "13px" : "15px",
                    fontWeight: "700",
                    color: theme.cardTitleColor,
                    lineHeight: "1.4"
                  }}>
                    {item.q}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.7",
                    color: theme.cardBodyColor
                  }}>
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
