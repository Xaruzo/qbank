import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Award,
  Zap,
  Home,
  ClipboardList,
  BookOpen,
  Lightbulb,
  RefreshCw,
  Compass,
} from "lucide-react";
import brandLogo from "../../assets/logo.png";
import AppleHeroCanvas from "./AppleHeroCanvas";
import ForgotPasswordModal from "./ForgotPasswordModal";
import type { SignInPageProps } from "../../types";

export default function SignInPage({
  isDark,
  onToggleTheme,
  onBackToLanding,
  onSuccessLogin,
  onSignInWithEmail,
  onSignInWithGoogle,
  onGoHome,
  onGoMockExam,
  onGoTips,
  onGoNotes,
}: SignInPageProps) {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [signupStep, setSignupStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [usePassword, setUsePassword] = useState<boolean>(true);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [signupCodeDigits, setSignupCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);

  const signupDigitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-open forgot password modal if landing on page with recovery token
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
    const search = typeof window !== "undefined" ? window.location.search || "" : "";
    if (hash.includes("type=recovery") || hash.includes("access_token") || search.includes("type=recovery")) {
      setShowForgotPassword(true);
    }
  }, []);

  // 60-second cooldown timer for rate-limited emails
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const currentSignupCode = signupCodeDigits.join("");

  const handleSignupDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...signupCodeDigits];
      next[index] = "";
      setSignupCodeDigits(next);
      return;
    }
    const char = clean.slice(-1);
    const next = [...signupCodeDigits];
    next[index] = char;
    setSignupCodeDigits(next);

    if (index < 5 && char) {
      signupDigitRefs.current[index + 1]?.focus();
    }
  };

  const handleSignupKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !signupCodeDigits[index] && index > 0) {
      signupDigitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      signupDigitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      signupDigitRefs.current[index + 1]?.focus();
    }
  };

  const handleSignupPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setSignupCodeDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    signupDigitRefs.current[focusIdx]?.focus();
  };

  // Helper for signup code dispatch
  const requestSignupCode = async (cleanEmail: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/send-signup-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send verification code.");
      }
      setSuccessMsg(`A 6-digit verification code has been dispatched to ${cleanEmail}. Please enter it below to complete registration.`);
      setSignupStep("verify");
      setResendCooldown(60);
      setSignupCodeDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        signupDigitRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Verification & final account creation
  const handleVerifySignupAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim().toLowerCase();
    if (currentSignupCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify code on server
      const res = await fetch("/api/auth/verify-signup-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: currentSignupCode,
          password,
          fullName: cleanEmail.split("@")[0],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Incorrect or expired verification code.");
      }

      // 2. Complete client registration and session sign-in
      const signInRes = await onSignInWithEmail(cleanEmail, password, { mode: "signup" });
      if (signInRes?.error && !signInRes?.user) {
        // Fallback: try signing in with the newly confirmed credentials
        const retryRes = await onSignInWithEmail(cleanEmail, password, { mode: "signin" });
        if (retryRes?.error) {
          throw new Error(retryRes.error.message || "Account created, but automatic sign in failed. Please sign in.");
        }
      }

      setSuccessMsg("Email verified! Account created and logged in. Welcome to CSE QBANK!");
      setTimeout(() => {
        onSuccessLogin();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (usePassword && !password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    // When registering: require email verification code so no one can register an email they don't own!
    if (isRegisterMode) {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }

      // Dispatch 6-digit ownership verification code to the email
      await requestSignupCode(cleanEmail);
      return;
    }

    if (!usePassword && resendCooldown > 0) {
      setErrorMsg(`Please wait ${resendCooldown}s before requesting another instant login link.`);
      return;
    }

    setLoading(true);
    try {
      const res = await onSignInWithEmail(cleanEmail, usePassword ? password : "", {
        mode: "signin",
      });
      if (res?.error) {
        const errMsg = res.error.message || "Failed to authenticate. Please check your credentials.";
        setErrorMsg(errMsg);
        if (errMsg.includes("Too many attempts") || errMsg.includes("60 seconds") || errMsg.includes("rate limit")) {
          setResendCooldown(60);
        }
      } else {
        if (!usePassword) {
          setResendCooldown(60);
        }
        const message = res?.message || "Welcome back! Redirecting to reviewer...";
        setSuccessMsg(message);
        setTimeout(() => {
          onSuccessLogin();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!onSignInWithGoogle) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await onSignInWithGoogle();
      if (res?.error) {
        setErrorMsg(res.error.message || "Google authentication failed.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Google sign in error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`qb-signin-root${isDark ? "" : " light"}`}>
      {/* Living Apple-Style Frame-by-Frame Canvas Background (Stable frame, zero shifting on form toggle) */}
      <AppleHeroCanvas isDark={isDark} disableScrollScrubbing />
      <div className="qb-signin-scrim" aria-hidden="true" />

      {/* Top Bar */}
      <header className="qb-signin-nav">
        <button
          type="button"
          className="qb-signin-back-btn"
          onClick={onBackToLanding}
          title="Back to Landing Page"
        >
          <ArrowLeft size={16} />
          <span>Back to Overview</span>
        </button>

        <div className="qb-signin-nav-right">
          <button
            type="button"
            className="qb-signin-theme-btn"
            onClick={onToggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="qb-signin-main">
        <div className="qb-signin-layout">
          {/* Left Hero / Benefit Panel */}
          <div className="qb-signin-aside">
            <div className="qb-signin-aside-content">
              <div className="qb-signin-badge">
                <ShieldCheck size={16} />
                <span>Civil Service Exam Review Hub</span>
              </div>

              <div className="qb-signin-brand-lockup">
                <img src={brandLogo} alt="QBANK logo" className="qb-signin-brand-img" />
                <h1 className="qb-signin-aside-title">QBANK Account</h1>
              </div>

              <p className="qb-signin-aside-desc">
                Your free, dedicated study workspace for the Civil Service Commission examination.
                Sign in to sync your progress seamlessly across devices.
              </p>

              <div className="qb-signin-benefits-list">
                <div className="qb-signin-benefit-item">
                  <div className="qb-signin-benefit-icon amber">
                    <Award size={18} />
                  </div>
                  <div className="qb-signin-benefit-text">
                    <h5>Official 80% Benchmark Tracking</h5>
                    <p>Track your scores across 170-item and 165-item mock attempts against the CSC threshold.</p>
                  </div>
                </div>

                <div className="qb-signin-benefit-item">
                  <div className="qb-signin-benefit-icon cyan">
                    <Zap size={18} />
                  </div>
                  <div className="qb-signin-benefit-text">
                    <h5>Cloud Backup & Cross-Device Sync</h5>
                    <p>Review on your mobile phone on the commute and continue on your laptop at home.</p>
                  </div>
                </div>

                <div className="qb-signin-benefit-item">
                  <div className="qb-signin-benefit-icon purple">
                    <Sparkles size={18} />
                  </div>
                  <div className="qb-signin-benefit-text">
                    <h5>Custom Study Notes & Scratchpads</h5>
                    <p>Save your handwritten math solutions, formula sheets, and starred question bookmarks.</p>
                  </div>
                </div>
              </div>

              <div className="qb-signin-aside-quote">
                <p>
                  "Consistency and timed practice are the true secret to passing the Civil Service Exam on the first try."
                </p>
                <span>— Professional & Subprofessional Review Strategy</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="qb-signin-card-wrap">
            <div className="qb-signin-card">
              {/* Card Header & Tab Switcher */}
              <div className="qb-signin-card-header">
                <div className="qb-signin-tabs">
                  <button
                    type="button"
                    className={`qb-signin-tab${!isRegisterMode ? " active" : ""}`}
                    onClick={() => {
                      setIsRegisterMode(false);
                      setSignupStep("form");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                  >
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    className={`qb-signin-tab${isRegisterMode ? " active" : ""}`}
                    onClick={() => {
                      setIsRegisterMode(true);
                      setSignupStep("form");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                  >
                    <span>Create Account</span>
                  </button>
                </div>

                <h2 className="qb-signin-card-title">
                  {isRegisterMode
                    ? signupStep === "verify"
                      ? "Verify Email Ownership"
                      : "Create your reviewer account"
                    : "Welcome back to QBANK"}
                </h2>
                <p className="qb-signin-card-sub">
                  {isRegisterMode
                    ? signupStep === "verify"
                      ? `Confirm that you own ${email.trim()} to activate your reviewer account.`
                      : "Enter your email to verify ownership and start saving your exam simulations."
                    : "Access your questions, mock exam attempts, and personalized study notes."}
                </p>
              </div>

              {/* Alert Feedback */}
              {errorMsg && (
                <div className="qb-signin-alert danger" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className="qb-signin-alert-text">
                    <p style={{ margin: 0 }}>{errorMsg}</p>
                    {!usePassword && (errorMsg.includes("Too many attempts") || errorMsg.includes("60 seconds") || errorMsg.includes("rate limit")) && (
                      <div className="qb-signin-rate-limit-helper" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(239, 68, 68, 0.25)" }}>
                        <p style={{ margin: "0 0 6px 0", fontSize: "12px", opacity: 0.9 }}>
                          <strong>Why did this happen?</strong> Supabase enforces an anti-spam limit of 1 email per 60 seconds. You don't have to wait!
                        </p>
                        <button
                          type="button"
                          className="qb-signin-switch-pwd-action"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#f5a623",
                            color: "#050914",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setUsePassword(true);
                            setErrorMsg("");
                          }}
                        >
                          <KeyRound size={13} />
                          <span>Switch to Password Login to Enter Immediately</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="qb-signin-alert success" role="status">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Auth Form / Verification Form */}
              {isRegisterMode && signupStep === "verify" ? (
                <form onSubmit={handleVerifySignupAndCreate} className="qb-signin-form">
                  <div className="qb-fp-digits-wrap" onPaste={handleSignupPaste}>
                    <label className="qb-fp-label center" style={{ color: "var(--text-heading)", fontWeight: 700 }}>
                      Enter 6-Digit Email Verification Code
                    </label>
                    <p style={{ textAlign: "center", fontSize: "12.5px", color: "var(--text-muted)", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                      We dispatched a 6-digit confirmation code to <strong>{email.trim()}</strong>. Enter it below to prove ownership and activate your reviewer account.
                    </p>
                    <div className="qb-fp-digit-inputs">
                      {signupCodeDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (signupDigitRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className={`qb-fp-digit-box${digit ? " filled" : ""}`}
                          value={digit}
                          onChange={(e) => handleSignupDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleSignupKeyDown(idx, e)}
                          disabled={loading}
                          aria-label={`Digit ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="qb-fp-resend-row">
                    <span className="qb-fp-resend-text">Didn't receive the email?</span>
                    <button
                      type="button"
                      className="qb-fp-resend-btn"
                      disabled={loading || resendCooldown > 0}
                      onClick={() => requestSignupCode(email.trim())}
                    >
                      <RefreshCw size={12} className={loading ? "spin" : ""} />
                      <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}</span>
                    </button>
                  </div>

                  <div className="qb-fp-actions" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="qb-fp-back-step-btn"
                      onClick={() => {
                        setSignupStep("form");
                        setErrorMsg("");
                      }}
                      disabled={loading}
                    >
                      Change Details
                    </button>

                    <button
                      type="submit"
                      className="qb-fp-submit-btn"
                      disabled={loading || currentSignupCode.length !== 6}
                    >
                      {loading ? (
                        <span className="qb-signin-loading-text">Verifying...</span>
                      ) : (
                        <>
                          <span>Verify & Complete Registration</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="qb-signin-form">
                  <div className="qb-signin-field">
                    <label htmlFor="signin-email" className="qb-signin-label">
                      Email Address
                    </label>
                    <div className="qb-signin-input-wrap">
                      <Mail size={16} className="qb-signin-input-icon" />
                      <input
                        id="signin-email"
                        name="email"
                        type="email"
                        autoComplete="username email"
                        spellCheck={false}
                        required
                        className="qb-signin-input"
                        placeholder="e.g. examinee@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        autoFocus
                      />
                      {email.trim().includes("@") && email.trim().includes(".") && (
                        <CheckCircle2 size={16} className="qb-signin-input-valid-icon" />
                      )}
                    </div>
                  </div>

                  <div className="qb-signin-field">
                    <label htmlFor="signin-password" className="qb-signin-label">
                      Password
                    </label>
                    <div className="qb-signin-input-wrap">
                      <KeyRound size={16} className="qb-signin-input-icon" />
                      <input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isRegisterMode ? "new-password" : "current-password"}
                        spellCheck={false}
                        required
                        className="qb-signin-input with-toggle"
                        placeholder={isRegisterMode ? "Create a secure password (6+ chars)" : "Enter your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="qb-signin-pwd-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {!isRegisterMode && (
                      <div className="qb-signin-under-field-row">
                        <button
                          type="button"
                          className="qb-signin-forgot-link"
                          onClick={() => setShowForgotPassword(true)}
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                    {isRegisterMode && (
                      <div className="qb-signin-validation-list">
                        <span className={`qb-signin-val-item${password.length >= 6 ? " met" : ""}`}>
                          <CheckCircle2 size={12} />
                          <span>At least 6 characters</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {isRegisterMode && (
                    <div className="qb-signin-field">
                      <label htmlFor="signin-confirm-password" className="qb-signin-label">
                        Confirm Password
                      </label>
                      <div className="qb-signin-input-wrap">
                        <KeyRound size={16} className="qb-signin-input-icon" />
                        <input
                          id="signin-confirm-password"
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          spellCheck={false}
                          required
                          className="qb-signin-input"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      {confirmPassword.length > 0 && (
                        <div className="qb-signin-validation-list">
                          <span className={`qb-signin-val-item${password === confirmPassword ? " met" : ""}`}>
                            <CheckCircle2 size={12} />
                            <span>{password === confirmPassword ? "Passwords match" : "Passwords do not match"}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="qb-signin-submit-btn"
                    disabled={loading || (!usePassword && resendCooldown > 0)}
                  >
                    {loading ? (
                      <span className="qb-signin-loading-text">Authenticating...</span>
                    ) : (
                      <>
                        <span>
                          {isRegisterMode
                            ? "Verify Email & Create Account"
                            : usePassword
                            ? "Sign In to QBANK"
                            : resendCooldown > 0
                            ? `Resend Login Link (${resendCooldown}s)`
                            : "Send Instant Login Link"}
                        </span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* OAuth Google option */}
              {onSignInWithGoogle && (
                <>
                  <div className="qb-signin-divider">
                    <span>OR CONTINUE WITH</span>
                  </div>

                  <button
                    type="button"
                    className="qb-signin-google-btn"
                    onClick={handleGoogleClick}
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google Account</span>
                  </button>
                </>
              )}

              {/* Security footnote */}
              <div className="qb-signin-footer-box">
                <div className="qb-signin-security-note">
                  <ShieldCheck size={14} />
                  <span>Direct browser local storage with secure cloud sync enabled.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Page-Level Footer (Eliminates empty void & anchors the viewport) ── */}
      <footer className="qb-signin-page-footer">
        <div className="qb-signin-page-footer-inner">
          {/* Brand Column */}
          <div className="qb-signin-pfooter-col qb-signin-pfooter-brand">
            <div
              className="qb-signin-pfooter-logo-row"
              onClick={onBackToLanding}
              role="button"
              tabIndex={0}
              title="Return to Landing Page"
            >
              <img src={brandLogo} alt="QBANK logo" className="qb-signin-pfooter-logo" />
              <div>
                <span className="qb-signin-pfooter-title">CSE QBANK</span>
                <span className="qb-signin-pfooter-sub">Civil Service Exam Reviewer</span>
              </div>
            </div>
            <p className="qb-signin-pfooter-desc">
              Dedicated, offline-ready review platform built around the authentic 80.00% benchmark and 67-second per item pacing target.
            </p>
          </div>

          {/* Review Modules Links */}
          <div className="qb-signin-pfooter-col">
            <h4 className="qb-signin-pfooter-head">Review Modules</h4>
            <div className="qb-signin-pfooter-links">
              <button type="button" className="qb-signin-pfooter-link" onClick={onBackToLanding}>
                <Compass size={14} />
                <span>Exam Overview</span>
              </button>
              <button type="button" className="qb-signin-pfooter-link" onClick={onGoHome || onBackToLanding}>
                <Home size={14} />
                <span>Question Bank</span>
              </button>
              <button type="button" className="qb-signin-pfooter-link" onClick={onGoMockExam || onBackToLanding}>
                <ClipboardList size={14} />
                <span>Timed Mock Exam (170/165 Items)</span>
              </button>
              <button type="button" className="qb-signin-pfooter-link" onClick={onGoNotes || onBackToLanding}>
                <BookOpen size={14} />
                <span>Study Notes & Scratchpad</span>
              </button>
              <button type="button" className="qb-signin-pfooter-link" onClick={onGoTips || onBackToLanding}>
                <Lightbulb size={14} />
                <span>Tips & Tricks</span>
              </button>
            </div>
          </div>

          {/* Standards & Trust Highlights */}
          <div className="qb-signin-pfooter-col">
            <h4 className="qb-signin-pfooter-head">Review Standards</h4>
            <div className="qb-signin-pfooter-highlights">
              <div className="qb-signin-pfooter-badge">
                <Award size={15} className="qb-badge-icon amber" />
                <span>Official 80.00% General Rating Benchmark</span>
              </div>
              <div className="qb-signin-pfooter-badge">
                <Zap size={15} className="qb-badge-icon cyan" />
                <span>100% Free · Zero Calculator Scratchpads</span>
              </div>
              <div className="qb-signin-pfooter-badge">
                <ShieldCheck size={15} className="qb-badge-icon emerald" />
                <span>Works Offline via PWA Local Cache</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="qb-signin-pfooter-legal">
          <p>
            © {new Date().getFullYear()} CSE QBANK. Independent study reviewer for Philippine Civil Service examinees.
            Not affiliated with or endorsed by the Civil Service Commission (CSC) of the Philippines.
          </p>
        </div>
      </footer>

      {/* Forgot Password Modal with Brevo Email & 6-Digit Code */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        defaultEmail={email}
        onPasswordResetSuccess={(resetEmail, newPwd) => {
          setEmail(resetEmail);
          setPassword(newPwd);
          setUsePassword(true);
          setSuccessMsg("Password reset successfully! Click 'Sign In to QBANK' to continue.");
        }}
      />
    </div>
  );
}
