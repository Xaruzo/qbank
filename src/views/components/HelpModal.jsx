import React, { useState } from "react";
import { X, Keyboard, HelpCircle, ArrowLeft, Play } from "lucide-react";

export default function HelpModal({ isDark, onClose, onRestartTour }) {
  const [activeTab, setActiveTab] = useState("main");
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
  const isTablet = typeof window !== 'undefined' && window.innerWidth > 600 && window.innerWidth <= 900;

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
    { key: "←/→", description: "Navigate between questions in detail view" },
    { key: "Space", description: "Scroll down in question detail" },
    { key: "Shift + Space", description: "Scroll up in question detail" },
    { key: "Ctrl + Enter", description: "Submit form when editing/adding questions" },
  ];

  const faqItems = [
    {
      q: "How do I add a new question?",
      a: "Click the '+' button in the question list (requires authentication). You'll be taken to the question editor where you can add text, choices, solutions, and even draw diagrams."
    },
    {
      q: "Where are my questions stored?",
      a: "Questions are stored in Supabase (cloud database). When you're signed in, your data syncs automatically. Favorites, tips, and mock exam results are also saved to your account."
    },
    {
      q: "Can I use QBANK offline?",
      a: "Yes! QBANK is a Progressive Web App (PWA). Once loaded, you can view questions, take mock exams, and add tips even without internet. Your changes will sync when you're back online."
    },
    {
      q: "How do Mock Exams work?",
      a: "Go to Mock Exam page and click 'Start Professional Exam' for a timed 170-question test. Your progress is auto-saved. You can pause and resume anytime. After finishing, review your performance with detailed analytics."
    },
    {
      q: "What are Tips and how do I use them?",
      a: "Tips let you add personal study notes to any question. You can write text notes OR draw visual diagrams using the canvas tool. Categorize tips by type (Formula, Shortcut, Method, etc.) and track your mastery level (Learning, Familiar, Mastered)."
    },
    {
      q: "How do I favorite questions?",
      a: "Click the star icon on any question card or in the detail view. Your favorites are saved to your account and you can filter by favorites in the question list."
    },
    {
      q: "Can I edit or delete questions?",
      a: "Yes, if you have admin permissions. Click the 'Edit' button in question detail view or the 'Delete' button (only admins see these options)."
    },
    {
      q: "How do I switch between dark and light mode?",
      a: "Click the 'Light' or 'Dark' button in the header (top-right). Your preference is saved automatically."
    },
    {
      q: "What if I need help during the tour?",
      a: "Press ESC to skip the tour anytime, or click 'Skip' button. You can restart the tour from this Help menu."
    },
    {
      q: "Are my mock exam attempts saved?",
      a: "Yes! All completed mock exams are saved to your account. You can review them anytime from the Mock Exam page under 'Attempt History'."
    }
  ];

  return (
    <div 
      className="qb-settings-ov" 
      onClick={onClose}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      <div 
        className="qb-help-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "calc(100vw - 24px)" : isTablet ? "min(600px, 90vw)" : "min(680px, 90vw)",
          maxHeight: isMobile ? "calc(100dvh - 60px)" : "85vh",
          background: isDark ? "#2b2d31" : "#ffffff",
          border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
          borderRadius: isMobile ? "16px" : "20px",
          boxShadow: isDark 
            ? "0 20px 50px rgba(0, 0, 0, 0.4)" 
            : "0 18px 40px rgba(15, 23, 42, 0.12)",
          padding: isMobile ? "16px" : isTablet ? "20px" : "24px",
          paddingBottom: isMobile ? "calc(16px + env(safe-area-inset-bottom, 0px))" : isTablet ? "20px" : "24px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "14px" : isTablet ? "18px" : "20px",
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
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
                  background: isDark ? "#232428" : "#f5f8ff",
                  border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
                  color: isDark ? "#ffffff" : "#000000",
                  width: isMobile ? "32px" : "36px",
                  height: isMobile ? "32px" : "36px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                title="Back to main menu"
              >
                <ArrowLeft size={isMobile ? 16 : 18} />
              </button>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: isMobile ? "9px" : "10px",
                fontWeight: "700",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isDark ? "#9ca3af" : "#6b7280",
                marginBottom: "4px"
              }}>
                {activeTab === "main" ? "Help Center" : activeTab === "shortcuts" ? "Keyboard Shortcuts" : "FAQ"}
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: isMobile ? "17px" : isTablet ? "20px" : "22px",
                fontWeight: "700",
                letterSpacing: "-0.02em",
                color: isDark ? "#ffffff" : "#0f1b2d",
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
              background: isDark ? "#232428" : "#f5f8ff",
              border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
              color: isDark ? "#ffffff" : "#000000",
              width: isMobile ? "32px" : "36px",
              height: isMobile ? "32px" : "36px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
            title="Close help"
          >
            <X size={isMobile ? 16 : 18} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}>
          {activeTab === "main" ? (
            <div style={{ display: "grid", gap: isMobile ? "10px" : "12px" }}>
              {/* Restart Guide Card */}
              <button
                type="button"
                onClick={handleRestartGuide}
                style={{
                  background: isDark ? "rgba(245,158,11,0.14)" : "rgba(234,88,12,0.08)",
                  border: isDark ? "1px solid rgba(245,158,11,0.30)" : "1px solid rgba(234,88,12,0.18)",
                  borderRadius: isMobile ? "14px" : "16px",
                  padding: isMobile ? "16px" : isTablet ? "18px" : "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "12px" : "16px",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(245,158,11,0.45)" : "rgba(234,88,12,0.28)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(245,158,11,0.30)" : "rgba(234,88,12,0.18)";
                  }
                }}
              >
                <div style={{
                  width: isMobile ? "42px" : "48px",
                  height: isMobile ? "42px" : "48px",
                  borderRadius: isMobile ? "10px" : "12px",
                  background: isDark ? "#f59e0b" : "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Play size={isMobile ? 18 : 22} color="#ffffff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "700",
                    color: isDark ? "#ffffff" : "#0f1b2d",
                    marginBottom: isMobile ? "4px" : "6px"
                  }}>
                    Restart Tutorial Guide
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.6",
                    color: isDark ? "#ffffff" : "#000000"
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
                  background: isDark ? "#232428" : "#faf7f2",
                  border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
                  borderRadius: isMobile ? "14px" : "16px",
                  padding: isMobile ? "16px" : isTablet ? "18px" : "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "12px" : "16px",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = isDark ? "#2b2d31" : "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = isDark ? "#232428" : "#faf7f2";
                  }
                }}
              >
                <div style={{
                  width: isMobile ? "42px" : "48px",
                  height: isMobile ? "42px" : "48px",
                  borderRadius: isMobile ? "10px" : "12px",
                  background: isDark ? "rgba(96,165,250,0.14)" : "rgba(59,130,246,0.08)",
                  border: isDark ? "1px solid rgba(96,165,250,0.30)" : "1px solid rgba(59,130,246,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Keyboard size={isMobile ? 18 : 22} color={isDark ? "#60a5fa" : "#3b82f6"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "700",
                    color: isDark ? "#ffffff" : "#0f1b2d",
                    marginBottom: isMobile ? "4px" : "6px"
                  }}>
                    Keyboard Shortcuts
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.6",
                    color: isDark ? "#ffffff" : "#000000"
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
                  background: isDark ? "#232428" : "#faf7f2",
                  border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
                  borderRadius: isMobile ? "14px" : "16px",
                  padding: isMobile ? "16px" : isTablet ? "18px" : "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? "12px" : "16px",
                  transition: "all 0.2s ease",
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = isDark ? "#2b2d31" : "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = isDark ? "#232428" : "#faf7f2";
                  }
                }}
              >
                <div style={{
                  width: isMobile ? "42px" : "48px",
                  height: isMobile ? "42px" : "48px",
                  borderRadius: isMobile ? "10px" : "12px",
                  background: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.08)",
                  border: isDark ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(34,197,94,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <HelpCircle size={isMobile ? 18 : 22} color={isDark ? "#22c55e" : "#16a34a"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "700",
                    color: isDark ? "#ffffff" : "#0f1b2d",
                    marginBottom: isMobile ? "4px" : "6px"
                  }}>
                    Frequently Asked Questions
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.6",
                    color: isDark ? "#ffffff" : "#000000"
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
                    background: isDark ? "#232428" : "#faf7f2",
                    border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
                    borderRadius: isMobile ? "10px" : "12px"
                  }}
                >
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "12px" : "14px",
                    color: isDark ? "#ffffff" : "#000000",
                    flex: 1
                  }}>
                    {shortcut.description}
                  </div>
                  <kbd style={{
                    fontFamily: "'Fira Mono', monospace",
                    fontSize: isMobile ? "10px" : "12px",
                    fontWeight: "700",
                    color: isDark ? "#ffffff" : "#0f1b2d",
                    background: isDark ? "#3b3f45" : "#e6ddd0",
                    padding: isMobile ? "5px 10px" : "6px 12px",
                    borderRadius: "6px",
                    border: isDark ? "1px solid #4e535b" : "1px solid #d5c3ab",
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
                    background: isDark ? "#232428" : "#faf7f2",
                    border: isDark ? "1px solid #3b3f45" : "1px solid #e6ddd0",
                    borderRadius: isMobile ? "12px" : "14px",
                    padding: isMobile ? "14px" : "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobile ? "8px" : "10px"
                  }}
                >
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "13px" : "15px",
                    fontWeight: "700",
                    color: isDark ? "#ffffff" : "#0f1b2d",
                    lineHeight: "1.4"
                  }}>
                    {item.q}
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "1.7",
                    color: isDark ? "#ffffff" : "#000000"
                  }}>
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
