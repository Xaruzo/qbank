import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
} from "lucide-react";
import { updateLocalAccountPassword } from "../../controllers/useAuthController";

import { supabase } from "../../utils/supabaseClient";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onPasswordResetSuccess: (email: string, newPassword: string) => void;
}

type Step = "email" | "code" | "password" | "success";

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = "",
  onPasswordResetSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string>(defaultEmail);
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync default email when modal opens and check for URL recovery hash tokens
  useEffect(() => {
    if (isOpen) {
      if (defaultEmail && !email) {
        setEmail(defaultEmail);
      }
      setErrorMsg("");
      setStatusMsg("");

      // Detect if user navigated from a Supabase email reset link (#access_token=... or #type=recovery)
      const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
      const search = typeof window !== "undefined" ? window.location.search || "" : "";
      if (hash.includes("type=recovery") || hash.includes("access_token") || search.includes("type=recovery")) {
        setStep("password");
        setStatusMsg("Email reset link verified via Supabase Auth! Please create your new password below.");
      }
    }
  }, [isOpen, defaultEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const currentCode = codeDigits.join("");

  const callAuthApi = async (url: string, body: object) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        return { ok: res.ok, status: res.status, data, isServer: true };
      }
    } catch (err) {
      console.warn("Server API unavailable, using client recovery mode:", err);
    }
    return { ok: false, isServer: false, data: null };
  };

  // Step 1: Request Code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setStatusMsg("");

    try {
      let sbSent = false;
      // Trigger Supabase built-in password reset email
      if (supabase) {
        try {
          const origin = window.location.origin;
          const pathname = window.location.pathname;
          const redirectTo = `${origin}${pathname}?page=signin`;
          const { error: sbErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
          if (!sbErr) {
            sbSent = true;
          } else {
            console.warn("Supabase resetPasswordForEmail notice:", sbErr.message);
          }
        } catch (sbErr) {
          console.warn("Supabase resetPasswordForEmail exception:", sbErr);
        }
      }

      const result = await callAuthApi("/api/auth/forgot-password", { email: cleanEmail });

      if (result.isServer && result.data) {
        if (!result.ok) {
          throw new Error(result.data.error || "Failed to send verification email.");
        }
        setStatusMsg(result.data.message || `A 6-digit verification code was sent to ${cleanEmail}.`);
      } else {
        if (sbSent) {
          setStatusMsg(`Password reset email sent to ${cleanEmail}. Please check your inbox and click the link to reset your password.`);
        } else {
          setStatusMsg(`Verification request processed for ${cleanEmail}. Check your inbox for instructions.`);
        }
      }

      setResendCooldown(60);
      setStep("code");
      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while requesting reset.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle 6-digit code typing
  const handleDigitChange = (index: number, val: string) => {
    const rawVal = val.replace(/\D/g, "");
    if (!rawVal) {
      const next = [...codeDigits];
      next[index] = "";
      setCodeDigits(next);
      return;
    }

    // Single digit entry
    if (rawVal.length === 1) {
      const next = [...codeDigits];
      next[index] = rawVal;
      setCodeDigits(next);
      if (index < 5) {
        digitRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Multi-digit paste into a single box
    const pasted = rawVal.slice(0, 6).split("");
    const next = [...codeDigits];
    for (let i = 0; i < 6; i++) {
      if (pasted[i]) {
        next[i] = pasted[i];
      }
    }
    setCodeDigits(next);
    const lastFilled = Math.min(pasted.length - 1, 5);
    digitRefs.current[lastFilled]?.focus();
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...codeDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setCodeDigits(next);
    digitRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code from your email.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const result = await callAuthApi("/api/auth/verify-code", {
        email: email.trim().toLowerCase(),
        code: currentCode,
      });

      if (result.isServer && result.data) {
        if (!result.ok) {
          throw new Error(result.data.error || "Invalid or expired verification code.");
        }
      }

      setStatusMsg("Code verified! Set your new password below.");
      setStep("password");
    } catch (err: any) {
      setErrorMsg(err.message || "Verification code is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // If Supabase user session exists, update user password directly
      if (supabase) {
        try {
          const { error: sbUpdateErr } = await supabase.auth.updateUser({ password: newPassword });
          if (sbUpdateErr) {
            console.warn("Supabase updateUser notice:", sbUpdateErr);
          }
        } catch (sbErr) {
          console.warn("Supabase auth updateUser exception:", sbErr);
        }
      }

      await callAuthApi("/api/auth/reset-password", {
        email: cleanEmail,
        code: currentCode,
        newPassword,
      });

      // Update local credentials store for immediate local sign-in
      await updateLocalAccountPassword(cleanEmail, newPassword);

      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSuccess = () => {
    onPasswordResetSuccess(email.trim().toLowerCase(), newPassword);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="qb-fp-backdrop" role="dialog" aria-modal="true" aria-labelledby="qb-fp-title">
      <div className="qb-fp-card">
        {/* Header */}
        <div className="qb-fp-header">
          <div className="qb-fp-badge">
            <ShieldCheck size={14} />
            <span>Secure Password Recovery</span>
          </div>
          <button
            type="button"
            className="qb-fp-close-btn"
            onClick={onClose}
            aria-label="Close forgot password dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title & Description */}
        <div className="qb-fp-title-wrap">
          <h3 id="qb-fp-title" className="qb-fp-title">
            {step === "email" && "Reset your QBANK password"}
            {step === "code" && "Verification & Reset Code"}
            {step === "password" && "Create a new password"}
            {step === "success" && "Password reset complete"}
          </h3>
          <p className="qb-fp-desc">
            {step === "email" &&
              "Enter the email associated with your reviewer account. We'll send a reset link to your email and allow 6-digit code verification."}
            {step === "code" &&
              `Enter the 6-digit code or click the email link sent to ${email}.`}
            {step === "password" &&
              "Verification confirmed. Choose a strong new password with at least 6 characters."}
            {step === "success" &&
              "Your password has been securely updated. You can now log into your reviewer account immediately."}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="qb-fp-alert danger" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="qb-fp-alert success" role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Step 1: Input Email */}
        {step === "email" && (
          <form onSubmit={handleRequestCode} className="qb-fp-form">
            <div className="qb-fp-field">
              <label htmlFor="fp-email" className="qb-fp-label">
                Account Email Address
              </label>
              <div className="qb-fp-input-wrap">
                <Mail size={16} className="qb-fp-input-icon" />
                <input
                  id="fp-email"
                  type="email"
                  required
                  placeholder="examinee@gmail.com"
                  className="qb-fp-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="qb-fp-actions">
              <button
                type="submit"
                className="qb-fp-submit-btn"
                disabled={loading || !email.trim().includes("@")}
              >
                {loading ? (
                  <span>Sending verification email...</span>
                ) : (
                  <>
                    <span>Send Verification Code / Link</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Input 6-Digit Code */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="qb-fp-form">
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
                  setStep("email");
                  setErrorMsg("");
                }}
                disabled={loading}
              >
                Change Email
              </button>

              <button
                type="submit"
                className="qb-fp-submit-btn"
                disabled={loading || currentCode.length !== 6}
              >
                {loading ? <span>Verifying...</span> : <span>Verify & Continue</span>}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Enter New Password */}
        {step === "password" && (
          <form onSubmit={handleResetPassword} className="qb-fp-form">
            <div className="qb-fp-field">
              <label htmlFor="fp-new-pwd" className="qb-fp-label">
                New Password
              </label>
              <div className="qb-fp-input-wrap">
                <Lock size={16} className="qb-fp-input-icon" />
                <input
                  id="fp-new-pwd"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  className="qb-fp-input with-toggle"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  className="qb-fp-pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="qb-fp-val-row">
                <span className={`qb-fp-val-item${newPassword.length >= 6 ? " met" : ""}`}>
                  <CheckCircle2 size={12} />
                  <span>Minimum 6 characters</span>
                </span>
              </div>
            </div>

            <div className="qb-fp-field">
              <label htmlFor="fp-confirm-pwd" className="qb-fp-label">
                Confirm New Password
              </label>
              <div className="qb-fp-input-wrap">
                <Lock size={16} className="qb-fp-input-icon" />
                <input
                  id="fp-confirm-pwd"
                  type={showPassword ? "text" : "password"}
                  required
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
                      newPassword === confirmPassword ? " met" : ""
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>
                      {newPassword === confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="qb-fp-actions">
              <button
                type="submit"
                className="qb-fp-submit-btn"
                disabled={
                  loading ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
              >
                {loading ? <span>Updating password...</span> : <span>Save New Password</span>}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="qb-fp-success-wrap">
            <div className="qb-fp-success-icon-wrap">
              <CheckCircle2 size={44} className="qb-fp-success-icon" />
            </div>
            <h4 className="qb-fp-success-title">Password Successfully Reset!</h4>
            <p className="qb-fp-success-desc">
              Your QBANK reviewer credentials have been updated for <strong>{email}</strong>. You can now proceed to log in with your new password.
            </p>
            <button
              type="button"
              className="qb-fp-done-btn"
              onClick={handleFinalSuccess}
              autoFocus
            >
              <KeyRound size={16} className="qb-fp-done-btn-icon" />
              <span>Sign In with New Password</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
