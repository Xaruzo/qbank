import React from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Top-level error boundary. Catches any render-time crash in the component
 * tree below it so the app never turns into a blank white screen.
 * Styling uses the app's CSS variables so it matches both dark and light themes.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("QBANK crashed:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      localStorage.removeItem("qbank-active-mock-exam");
    } catch (_) {}
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg, #050914)",
          color: "var(--text, #fff)",
          fontFamily: "'DM Sans', sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "var(--surface, #0d1524)",
            border: "1px solid var(--border, rgba(255,255,255,.08))",
            borderRadius: 18,
            padding: "28px 24px",
            textAlign: "center",
            boxShadow: "var(--shadow-card, 0 10px 30px rgba(0,0,0,.35))",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.14)",
              color: "var(--accent, #f59e0b)",
              margin: "0 auto 14px",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={26} />
          </div>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted, #9fb0c8)", marginBottom: 20, lineHeight: 1.5 }}>
            The app hit an unexpected error. Your saved questions, tips, and mock exam
            history are safe. Reload to continue studying.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--accent, #f59e0b)",
                color: "#070c18",
                border: "none",
                borderRadius: 999,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={15} />
              <span>Reload app</span>
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                color: "var(--text, #fff)",
                border: "1px solid var(--border, rgba(255,255,255,.14))",
                borderRadius: 999,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Home size={15} />
              <span>Go to home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;