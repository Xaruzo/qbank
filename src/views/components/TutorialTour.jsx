import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Joyride, STATUS } from "react-joyride";

export default function TutorialTour({ run, onFinish, isDark }) {
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    console.log('[TutorialTour] useEffect - run:', run);
    if (run) {
      console.log('[TutorialTour] Adding qb-tour-active class');
      document.body.classList.add('qb-tour-active');
      hasFinishedRef.current = false;
    } else {
      console.log('[TutorialTour] Removing qb-tour-active class (run=false)');
      document.body.classList.remove('qb-tour-active');
    }
    
    return () => {
      console.log('[TutorialTour] Cleanup - removing qb-tour-active class');
      document.body.classList.remove('qb-tour-active');
    };
  }, [run]);
  
  const steps = [
    {
      target: "body",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: "999px",
            background: isDark ? "rgba(245,158,11,0.14)" : "rgba(234,88,12,0.08)",
            border: isDark ? "1px solid rgba(245,158,11,0.30)" : "1px solid rgba(234,88,12,0.18)",
            color: isDark ? "#f59e0b" : "#ea580c",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "14px"
          }}>
            Welcome Tour
          </div>
          <h3 style={{ 
            marginBottom: "14px", 
            fontSize: "20px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000",
            lineHeight: "1.2"
          }}>
            Welcome to QBANK
          </h3>
          <p style={{ 
            marginBottom: "10px", 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Your comprehensive Civil Service Exam preparation platform. Let us guide you through the key features.
          </p>
          <p style={{ 
            fontSize: "12px", 
            color: isDark ? "#ffffff" : "#000000",
            lineHeight: "1.6",
            fontStyle: "italic",
            opacity: 0.7
          }}>
            Use the buttons below to navigate the tour. Click Skip to exit anytime.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: ".qb-side-nav",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Navigation
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Access your Question Bank, take Mock Exams, and review Study Tips from this menu.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: ".qb-search-box",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Instant Search
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Find questions instantly by searching keywords, topics, or question labels. Results update as you type.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: ".qb-filter-card",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Smart Filters
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Filter questions by topic (Numerical, Verbal, Abstract) or custom labels to focus your practice sessions.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: ".qb-fav-btn",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Favorites
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Star important questions for quick access later. Your favorites sync across all devices with your account.
          </p>
        </div>
      ),
      placement: "left",
      disableBeacon: true,
    },
    {
      target: ".qb-qcard",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Question Cards
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Click any card to view the complete question, multiple choice options, and detailed explanations.
          </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
    },
    {
      target: ".qb-nav-item:has(svg):nth-of-type(2)",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Mock Exams
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Simulate real exam conditions with timed practice tests. Track performance, review attempts, and identify areas for improvement.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: ".qb-nav-item:has(svg):nth-of-type(3)",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Study Tips
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Create personal notes, draw diagrams, categorize by type (Formula, Shortcut, Method), and track your mastery level for each question.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: ".qb-theme-btn:nth-of-type(2)",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <h3 style={{ 
            marginBottom: "12px", 
            fontSize: "17px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000"
          }}>
            Theme Toggle
          </h3>
          <p style={{ 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Switch between dark and light modes for comfortable studying in any lighting condition. Your preference is saved automatically.
          </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: "body",
      content: (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: "999px",
            background: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.08)",
            border: isDark ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(34,197,94,0.18)",
            color: isDark ? "#22c55e" : "#16a34a",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "14px"
          }}>
            Ready to Start
          </div>
          <h3 style={{ 
            marginBottom: "14px", 
            fontSize: "20px", 
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000",
            lineHeight: "1.2"
          }}>
            You're All Set
          </h3>
          <p style={{ 
            marginBottom: "10px", 
            lineHeight: "1.7",
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "14px"
          }}>
            Begin your CSE preparation with confidence. Consistent practice is the key to success.
          </p>
          <p style={{ 
            fontSize: "12px", 
            color: isDark ? "#ffffff" : "#000000",
            lineHeight: "1.6",
            fontStyle: "italic",
            opacity: 0.7
          }}>
            Restart this tour anytime from the Help menu in the header.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status, action, type } = data;
    console.log('[TutorialTour] Callback:', { status, action, type });
    
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    // Handle ALL close scenarios
    if (finishedStatuses.includes(status) || action === 'close' || action === 'reset' || action === 'skip' || type === 'tour:end') {
      if (!hasFinishedRef.current) {
        console.log('[TutorialTour] Tour ending! Removing class and calling onFinish');
        hasFinishedRef.current = true;
        
        // Force remove class immediately
        document.body.classList.remove('qb-tour-active');
        
        // Double-check after a tick
        requestAnimationFrame(() => {
          document.body.classList.remove('qb-tour-active');
          console.log('[TutorialTour] Body classes after cleanup:', document.body.className);
        });
        
        // Call onFinish to set run=false in parent
        setTimeout(() => {
          console.log('[TutorialTour] Calling onFinish()');
          onFinish();
        }, 50);
      }
    }
  };

  return (
    <>
      {/* Blocking overlay - rendered via Portal OUTSIDE .qb to prevent being blocked */}
      {run && createPortal(
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'auto',
            background: 'transparent',
            cursor: 'not-allowed'
          }}
          onClick={(e) => {
            // Block ALL clicks on the overlay
            e.preventDefault();
            e.stopPropagation();
            console.log('[TutorialTour] Outside click blocked');
          }}
        />,
        document.body
      )}
      
      <Joyride
        steps={steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose={true}
        disableCloseOnEsc={false}
        hideCloseButton={false}
        spotlightClicks={true}
        spotlightPadding={0}
        hideBackButton={false}
        callback={handleJoyrideCallback}
        scrollToFirstStep={true}
        disableScrolling={false}
        disableScrollParentFix={true}
        styles={{
          options: {
            arrowColor: isDark ? "#2b2d31" : "#ffffff",
            backgroundColor: isDark ? "#2b2d31" : "#ffffff",
            overlayColor: isDark ? "rgba(30, 31, 34, 0.85)" : "rgba(0, 0, 0, 0.50)",
            primaryColor: isDark ? "#f59e0b" : "#ea580c",
            textColor: isDark ? "#ffffff" : "#000000",
            width: 420,
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: "18px",
            padding: "26px",
            fontSize: "14px",
            boxShadow: isDark 
              ? "0 20px 50px rgba(0, 0, 0, 0.4)" 
              : "0 18px 40px rgba(15, 23, 42, 0.12)",
            border: isDark 
              ? "1px solid #3b3f45" 
              : "1px solid #e6ddd0",
          },
          tooltipContainer: {
            textAlign: "left",
          },
          tooltipTitle: {
            fontSize: "17px",
            fontWeight: "700",
            marginBottom: "12px",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "-0.02em",
            color: isDark ? "#ffffff" : "#000000",
          },
          tooltipContent: {
            padding: "0",
            fontFamily: "'DM Sans', sans-serif",
          },
          buttonNext: {
            backgroundColor: isDark ? "#f59e0b" : "#ea580c",
            color: "#ffffff",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "700",
            padding: "11px 24px",
            border: "none",
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s ease",
          },
          buttonBack: {
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "13px",
            fontWeight: "600",
            marginRight: "14px",
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer",
            opacity: 0.7,
          },
          buttonSkip: {
            color: isDark ? "#ffffff" : "#000000",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer",
            opacity: 0.6,
          },
          buttonClose: {
            display: "none",
          },
          spotlight: {
            borderRadius: "12px",
          },
          beacon: {
            inner: isDark ? "#f59e0b" : "#ea580c",
            outer: isDark ? "rgba(245,158,11,0.3)" : "rgba(234,88,12,0.3)",
          },
        }}
        locale={{
          back: "Back",
          close: "Close",
          last: "Get Started",
          next: "Next",
          open: "Open",
          skip: "Skip",
        }}
      />
    </>
  );
}
