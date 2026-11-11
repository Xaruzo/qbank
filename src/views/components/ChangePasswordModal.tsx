import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Lock,
  Check,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  isDark?: boolean;
}

type Step = "form" | "code" | "success";

export default function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail,
  isDark: initialIsDark = true,
}: ChangePasswordModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Dynamic theme detection so modal matches current active theme perfectly
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return !document.documentElement.classList.contains("light");
    }
    return initialIsDark;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateTheme = () => {
      const isLight =
        document.documentElement.classList.contains("light") ||
        document.body.classList.contains("light");
      setIsDark(!isLight);
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [initialIsDark]);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCodeDigits(["", "", "", "", "", ""]);
      setErrorMsg("");
      setStatusMsg("");
      setLoading(false);
      setResendCooldown(0);
    }
  }, [isOpen]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const currentCode = codeDigits.join("");

  // Helper for server API calls
  const callAuthApi = async (url: string, body: object) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      return { ok: false, status: 500, data: { error: err?.message || "Network error" } };
    }
  };

  // Step 1: Validate Current Password and Request Email Verification Code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setStatusMsg("");

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("New password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify current credentials against Supabase Auth
      if (supabase && userEmail) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });

        if (signInErr) {
          // Check local credentials fallback
          let localValid = false;
          try {
            const raw = localStorage.getItem("cse_qbank_local_auth_users");
            if (raw) {
              const creds = JSON.parse(raw);
              const userCred = creds[userEmail.toLowerCase()];
              if (userCred?.salt && userCred?.hash) {
                const encoder = new TextEncoder();
                const data = encoder.encode(currentPassword + userCred.salt);
                const digest = await crypto.subtle.digest("SHA-256", data);
                const hash = Array.from(new Uint8Array(digest))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");
                if (hash === userCred.hash) {
                  localValid = true;
                }
              }
            }
          } catch {}

          if (!localValid) {
            setErrorMsg("Current password is incorrect. Please check your credentials.");
            setLoading(false);
            return;
          }
        }
      }

      // 2. Dispatch 6-digit confirmation code to user's registered Gmail
      const result = await callAuthApi("/api/auth/send-change-password-code", {
        email: userEmail,
      });

      if (!result.ok) {
        throw new Error(result.data?.error || "Failed to dispatch verification email.");
      }

      setStatusMsg(
        result.data?.message ||
          `A 6-digit verification code has been dispatched to ${userEmail}. Check your inbox to confirm.`
      );
      setStep("code");
      setResendCooldown(60);

      // Auto-focus first digit after transition
      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to initiate password change. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP digit handling
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...codeDigits];
      next[index] = "";
      setCodeDigits(next);
      return;
    }
    const char = clean.slice(-1);
    const next = [...codeDigits];
    next[index] = char;
    setCodeDigits(next);

    if (index < 5 && char) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setCodeDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    digitRefs.current[focusIdx]?.focus();
  };

  // Step 2: Verify Code and Finalize Password Change
  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCode.length !== 6) {
      setErrorMsg("Please enter the full 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setStatusMsg("");

    try {
      // 1. Call server verification endpoint
      const result = await callAuthApi("/api/auth/verify-change-password", {
        email: userEmail,
        code: currentCode,
        newPassword,
      });

      if (!result.ok) {
        throw new Error(result.data?.error || "Incorrect or expired verification code.");
      }

      // 2. Also update password on active Supabase client session if available
      if (supabase) {
        try {
          const { error: sbUpdateErr } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (sbUpdateErr) {
            console.warn("Supabase updateUser notice:", sbUpdateErr.message);
          }
        } catch (sbErr) {
          console.warn("Supabase auth updateUser exception:", sbErr);
        }
      }

      // 3. Update local credential hash fallback if stored
      try {
        const raw = localStorage.getItem("cse_qbank_local_auth_users");
        if (raw) {
          const creds = JSON.parse(raw);
          const cleanEmail = userEmail.toLowerCase();
          if (creds[cleanEmail]) {
            const encoder = new TextEncoder();
            const salt = creds[cleanEmail].salt || "qbank_salt";
            const data = encoder.encode(newPassword + salt);
            const digest = await crypto.subtle.digest("SHA-256", data);
            const hash = Array.from(new Uint8Array(digest))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            creds[cleanEmail].hash = hash;
            creds[cleanEmail].updatedAt = new Date().toISOString();
            localStorage.setItem("cse_qbank_local_auth_users", JSON.stringify(creds));
          }
        }
      } catch {}

      setStep("success");
      setStatusMsg("Password updated successfully! Your account is now secured with your new password.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update password. Please check your verification code.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className={`qb-fp-backdrop${isDark ? "" : " light"}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pwd-title"
    >
      <div
        className={`qb-fp-card${isDark ? "" : " light"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="qb-fp-header">
          <div className="qb-fp-badge">
            <ShieldCheck size={14} />
            <span>ACCOUNT SECURITY</span>
          </div>
          <button
            type="button"
            className="qb-fp-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title & Description */}
        <div className="qb-fp-title-wrap">
          <h2 id="change-pwd-title" className="qb-fp-title">
            {step === "form" && "Change Account Password"}
            {step === "code" && "Confirm with Gmail Code"}
            {step === "success" && "Password Updated"}
          </h2>
          <p className="qb-fp-desc">
            {step === "form" &&
              "Enter your current credentials and choose a new password. A verification code will be sent to your Gmail to confirm."}
            {step === "code" &&
              `Enter the 6-digit verification code sent to ${userEmail} to confirm this was requested by you.`}
            {step === "success" &&
              "Your reviewer account password has been successfully updated and secured."}
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="qb-fp-alert danger" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && step !== "success" && (
          <div className="qb-fp-alert success" role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* STEP 1: Current, New, and Confirm Password Inputs */}
        {step === "form" && (
          <form onSubmit={handleRequestCode} className="qb-fp-form">
            <div className="qb-fp-field">
              <label htmlFor="cp-current" className="qb-fp-label">
                Current Password
              </label>
              <div className="qb-fp-input-wrap">
                <Lock size={16} className="qb-fp-input-icon" />
                <input
                  id="cp-current"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                  className="qb-fp-input with-toggle"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  className="qb-fp-pwd-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="qb-fp-field">
              <label htmlFor="cp-new" className="qb-fp-label">
                New Password
              </label>
              <div className="qb-fp-input-wrap">
                <KeyRound size={16} className="qb-fp-input-icon" />
                <input
                  id="cp-new"
                  type={showNewPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Enter your new password (6+ chars)"
                  className="qb-fp-input with-toggle"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="qb-fp-pwd-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="qb-fp-val-row">
                <span className={`qb-fp-val-item${newPassword.length >= 6 ? " met" : ""}`}>
                  <CheckCircle2 size={13} />
                  <span>At least 6 characters</span>
                </span>
                <span
                  className={`qb-fp-val-item${
                    newPassword && newPassword !== currentPassword ? " met" : ""
                  }`}
                >
                  <CheckCircle2 size={13} />
                  <span>Different from current password</span>
                </span>
              </div>
            </div>

            <div className="qb-fp-field">
              <label htmlFor="cp-confirm" className="qb-fp-label">
                Confirm New Password
              </label>
              <div className="qb-fp-input-wrap">
                <KeyRound size={16} className="qb-fp-input-icon" />
                <input
                  id="cp-confirm"
                  type={showNewPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className="qb-fp-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {confirmPassword.length > 0 && (
                <div className="qb-fp-val-row">
                  <span
                    className={`qb-fp-val-item${
                      newPassword && newPassword === confirmPassword ? " met" : ""
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>
                      {newPassword === confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="qb-fp-actions" style={{ marginTop: 8 }}>
              <button
                type="submit"
                className="qb-fp-submit-btn"
                disabled={
                  loading ||
                  !currentPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword ||
                  newPassword === currentPassword
                }
              >
                {loading ? (
                  <span>Authenticating & Sending Code...</span>
                ) : (
                  <>
                    <span>Continue & Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Input 6-Digit Code */}
        {step === "code" && (
          <form onSubmit={handleVerifyAndChange} className="qb-fp-form">
            <div className="qb-fp-digits-wrap" onPaste={handlePaste}>
              <label className="qb-fp-label center">Enter 6-Digit Verification Code</label>
              <div className="qb-fp-digit-inputs">
                {codeDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (digitRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`qb-fp-digit-box${digit ? " filled" : ""}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
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
                onClick={() => handleRequestCode()}
              >
                <RefreshCw size={12} className={loading ? "spin" : ""} />
                <span>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </span>
              </button>
            </div>

            <div className="qb-fp-actions">
              <button
                type="button"
                className="qb-fp-back-step-btn"
                onClick={() => {
                  setStep("form");
                  setErrorMsg("");
                }}
                disabled={loading}
              >
                Back
              </button>

              <button
                type="submit"
                className="qb-fp-submit-btn"
                disabled={loading || currentCode.length !== 6}
              >
                {loading ? (
                  <span>Verifying & Updating...</span>
                ) : (
                  <>
                    <span>Confirm & Change Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === "success" && (
          <div className="qb-fp-success-wrap">
            <div className="qb-fp-success-icon-wrap">
              <CheckCircle2 size={42} />
            </div>
            <h3 className="qb-fp-success-title">Password Successfully Changed</h3>
            <p className="qb-fp-success-desc">
              Your password has been securely updated. A confirmation has been registered for your account.
              Please use your new password for future sign-ins.
            </p>
            <button
              type="button"
              className="qb-fp-done-btn"
              onClick={onClose}
              autoFocus
            >
              <Check size={17} strokeWidth={2.6} className="qb-fp-done-btn-icon" />
              <span>Done & Return to Workspace</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
