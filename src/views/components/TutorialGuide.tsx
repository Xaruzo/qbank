import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export default function TutorialGuide({ run, onFinish, isDark }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (run) {
      document.body.classList.add("qb-guide-active");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("qb-guide-active");
      document.body.style.overflow = "";
    }

    return () => {
      document.body.classList.remove("qb-guide-active");
      document.body.style.overflow = "";
    };
  }, [run]);

  if (!run) return null;

  const steps = [
    {
      title: "Welcome to QBANK",
      badge: "Step 1 of 5",
      content:
        "Your comprehensive Civil Service Exam preparation platform. This quick guide will help you navigate the key reviewer features.",
    },
    {
      title: "Question Bank Hub",
      badge: "Step 2 of 5",
      content:
        "Browse and search through authentic questions organized by topic (Numerical, Verbal, Analytical, Clerical). Use topic filters, starred bookmarks, and custom labels to structure your review.",
    },
    {
      title: "Timed Mock Exam Simulations",
      badge: "Step 3 of 5",
      content:
        "Take timed practice tests matching official CSC specs (170-item Professional & 165-item Subprofessional). Track your score against the 80.00% passing threshold.",
    },
    {
      title: "Study Notes & Visual Scratchpad",
      badge: "Step 4 of 5",
      content:
        "Create study notes, draw math formulas on the digital canvas, and categorize study tips by type (Formula, Shortcut, Method) to solidify complex concepts.",
    },
    {
      title: "You're Ready to Excel!",
      badge: "Step 5 of 5",
      content:
        "Start exploring QBANK and prepare for your Civil Service examination with confidence. You can restart this guide anytime from the top navigation bar.",
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // QBANK System Palette Definitions
  const theme = isDark
    ? {
        overlayBg: "rgba(4, 8, 18, 0.82)",
        modalBg: "linear-gradient(180deg, #0e172c 0%, #091020 100%)",
        modalBorder: "1px solid rgba(255, 255, 255, 0.14)",
        modalShadow: "0 24px 55px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(245, 166, 35, 0.15)",
        titleColor: "#ffffff",
        textColor: "#94a3b8",
        closeBg: "rgba(255, 255, 255, 0.08)",
        closeBorder: "1px solid rgba(255, 255, 255, 0.12)",
        closeColor: "#94a3b8",
        closeHoverBg: "rgba(255, 255, 255, 0.16)",
        closeHoverColor: "#ffffff",
        badgeBg: "rgba(245, 166, 35, 0.14)",
        badgeBorder: "1px solid rgba(245, 166, 35, 0.35)",
        badgeColor: "#f5a623",
        dotActive: "#f5a623",
        dotInactive: "rgba(255, 255, 255, 0.16)",
        backBtnBg: "rgba(255, 255, 255, 0.08)",
        backBtnBorder: "1px solid rgba(255, 255, 255, 0.14)",
        backBtnColor: "#e2e8f0",
        primaryBtnBg: "#f5a623",
        primaryBtnColor: "#050914",
        primaryBtnShadow: "0 4px 16px rgba(245, 166, 35, 0.35)",
      }
    : {
        overlayBg: "rgba(15, 23, 42, 0.45)",
        modalBg: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        modalBorder: "1px solid #cbd5e1",
        modalShadow: "0 20px 50px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(245, 166, 35, 0.2)",
        titleColor: "#0f172a",
        textColor: "#475569",
        closeBg: "#f1f5f9",
        closeBorder: "1px solid #cbd5e1",
        closeColor: "#64748b",
        closeHoverBg: "#e2e8f0",
        closeHoverColor: "#0f172a",
        badgeBg: "rgba(245, 166, 35, 0.15)",
        badgeBorder: "1px solid rgba(217, 119, 6, 0.35)",
        badgeColor: "#d97706",
        dotActive: "#f5a623",
        dotInactive: "rgba(0, 0, 0, 0.15)",
        backBtnBg: "#f1f5f9",
        backBtnBorder: "1px solid #cbd5e1",
        backBtnColor: "#334155",
        primaryBtnBg: "#f5a623",
        primaryBtnColor: "#050914",
        primaryBtnShadow: "0 4px 16px rgba(245, 166, 35, 0.25)",
      };

  return (
    <div
      className="qb-guide-overlay"
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: theme.overlayBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="qb-guide-modal"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: theme.modalBg,
          borderRadius: "20px",
          padding: "28px 26px",
          boxShadow: theme.modalShadow,
          border: theme.modalBorder,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Skip / Close Button */}
        <button
          type="button"
          onClick={handleSkip}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: theme.closeBg,
            border: theme.closeBorder,
            color: theme.closeColor,
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.closeHoverBg;
            e.currentTarget.style.color = theme.closeHoverColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.closeBg;
            e.currentTarget.style.color = theme.closeColor;
          }}
          title="Close guide"
        >
          <X size={16} />
        </button>

        {/* Step Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "6px",
            background: theme.badgeBg,
            border: theme.badgeBorder,
            color: theme.badgeColor,
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-sans)",
            width: "fit-content",
          }}
        >
          <Sparkles size={12} />
          <span>{currentStepData.badge}</span>
        </div>

        {/* Title & Body Content */}
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              color: theme.titleColor,
              lineHeight: "1.25",
              marginBottom: "10px",
              fontFamily: "var(--font-heading)",
            }}
          >
            {currentStepData.title}
          </h2>
          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: theme.textColor,
              fontFamily: "var(--font-sans)",
              margin: 0,
            }}
          >
            {currentStepData.content}
          </p>
        </div>

        {/* Progress Indicator Dots */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 0",
          }}
        >
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentStep ? "24px" : "8px",
                height: "8px",
                borderRadius: "999px",
                background: index === currentStep ? theme.dotActive : theme.dotInactive,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Navigation Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "4px",
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            style={{
              background: theme.backBtnBg,
              border: theme.backBtnBorder,
              color: theme.backBtnColor,
              fontSize: "14px",
              fontWeight: "600",
              padding: "10px 18px",
              borderRadius: "10px",
              cursor: currentStep === 0 ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              opacity: currentStep === 0 ? 0.35 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s ease",
            }}
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            style={{
              background: theme.primaryBtnBg,
              border: "none",
              color: theme.primaryBtnColor,
              fontSize: "14px",
              fontWeight: "700",
              padding: "10px 24px",
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              boxShadow: theme.primaryBtnShadow,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>{isLastStep ? "Get Started" : "Next"}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
