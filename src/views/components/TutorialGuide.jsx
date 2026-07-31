import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function TutorialGuide({ run, onFinish, isDark }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (run) {
      document.body.classList.add('qb-guide-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('qb-guide-active');
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.classList.remove('qb-guide-active');
      document.body.style.overflow = '';
    };
  }, [run]);

  if (!run) return null;

  const steps = [
    {
      title: "Welcome to QBANK",
      badge: "Step 1 of 5",
      badgeColor: isDark ? "#f59e0b" : "#ea580c",
      content: "Your comprehensive Civil Service Exam preparation platform. This quick guide will help you understand the key features."
    },
    {
      title: "Question Bank",
      badge: "Step 2 of 5",
      badgeColor: isDark ? "#60a5fa" : "#3b82f6",
      content: "Browse and search through questions organized by topic (Numerical, Verbal, Abstract). Use filters, favorites, and labels to organize your study sessions."
    },
    {
      title: "Mock Exams",
      badge: "Step 3 of 5",
      badgeColor: isDark ? "#a78bfa" : "#8b5cf6",
      content: "Take timed practice tests that simulate real exam conditions. Track your performance, review past attempts, and identify areas for improvement."
    },
    {
      title: "Study Tips",
      badge: "Step 4 of 5",
      badgeColor: isDark ? "#22c55e" : "#16a34a",
      content: "Create personal notes, draw diagrams, and categorize tips by type (Formula, Shortcut, Method). Track your mastery level for each topic."
    },
    {
      title: "You're Ready!",
      badge: "Step 5 of 5",
      badgeColor: isDark ? "#22c55e" : "#16a34a",
      content: "Start exploring QBANK and prepare for your Civil Service Exam with confidence. You can restart this guide anytime from the Help menu."
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const handleOverlayClick = (e) => {
    // Prevent clicks on overlay from closing the modal
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div 
      className="qb-guide-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="qb-guide-modal"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: isDark ? '#2b2d31' : '#ffffff',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: isDark 
            ? '0 20px 60px rgba(0, 0, 0, 0.5)' 
            : '0 20px 60px rgba(15, 23, 42, 0.15)',
          border: isDark ? '1px solid #3b3f45' : '1px solid #e6ddd0',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: isDark ? '#ffffff' : '#000000',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
          }}
          title="Skip tutorial"
        >
          <X size={18} />
        </button>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '6px 12px',
          borderRadius: '999px',
          background: `${currentStepData.badgeColor}20`,
          border: `1px solid ${currentStepData.badgeColor}40`,
          color: currentStepData.badgeColor,
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: "'DM Sans', sans-serif",
          width: 'fit-content'
        }}>
          {currentStepData.badge}
        </div>

        {/* Title */}
        <div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: isDark ? '#ffffff' : '#000000',
            lineHeight: '1.2',
            marginBottom: '12px',
            fontFamily: "'Syne', sans-serif"
          }}>
            {currentStepData.title}
          </h2>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.7',
            color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)',
            fontFamily: "'DM Sans', sans-serif"
          }}>
            {currentStepData.content}
          </p>
        </div>

        {/* Progress Dots */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: index === currentStep 
                  ? (isDark ? '#f59e0b' : '#ea580c')
                  : isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '14px',
              fontWeight: '600',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: currentStep === 0 ? 0.3 : 0.7,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentStep !== 0) e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              if (currentStep !== 0) e.currentTarget.style.opacity = '0.7';
            }}
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            style={{
              background: isDark ? '#f59e0b' : '#ea580c',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              padding: '12px 28px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
