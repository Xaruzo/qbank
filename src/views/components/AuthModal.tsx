import React, { useState } from "react";
import { X, Mail, KeyRound, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInWithEmail: (email: string, password?: string) => Promise<{ error: any; mode?: string; message?: string }>;
  onSignInWithGoogle?: () => Promise<{ error: any }>;
  isDark?: boolean;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSignInWithEmail,
  onSignInWithGoogle,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [usePassword, setUsePassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await onSignInWithEmail(cleanEmail, usePassword ? password : "");
      if (res.error) {
        setErrorMsg(res.error.message || "Failed to sign in. Please verify your email.");
      } else {
        setSuccessMsg(res.message || "Signed in successfully!");
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!onSignInWithGoogle) return;
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await onSignInWithGoogle();
      if (res?.error) {
        setErrorMsg(res.error.message || "Google sign in failed.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qb-auth-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="qb-auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="qb-auth-modal-head">
          <div className="qb-auth-modal-head-text">
            <span className="qb-auth-modal-kicker">Reviewer Account</span>
            <h3 id="auth-modal-title" className="qb-auth-modal-title">Sign in to QBANK</h3>
            <p className="qb-auth-modal-sub">
              Access your questions, mock exam attempts, and personalized study notes.
            </p>
          </div>
          <button
            type="button"
            className="qb-auth-modal-close"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="qb-auth-modal-alert danger" role="alert">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="qb-auth-modal-alert success" role="status">
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* System Direct Email Login */}
        <form onSubmit={handleSubmit} className="qb-auth-modal-form">
          <div className="qb-auth-field-group">
            <label htmlFor="auth-email-input" className="qb-auth-label">
              Email Address
            </label>
            <div className="qb-auth-input-wrap">
              <Mail size={16} className="qb-auth-input-icon" />
              <input
                id="auth-email-input"
                type="email"
                required
                className="qb-auth-input"
                placeholder="e.g. yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {usePassword && (
            <div className="qb-auth-field-group">
              <label htmlFor="auth-password-input" className="qb-auth-label">
                Password <span className="qb-auth-optional">(optional for magic link)</span>
              </label>
              <div className="qb-auth-input-wrap">
                <KeyRound size={16} className="qb-auth-input-icon" />
                <input
                  id="auth-password-input"
                  type="password"
                  className="qb-auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="qb-auth-toggle-row">
            <button
              type="button"
              className="qb-auth-text-btn"
              onClick={() => setUsePassword(!usePassword)}
            >
              {usePassword ? "Sign in with direct email instead" : "Have a password? Use password sign-in"}
            </button>
          </div>

          <button
            type="submit"
            className="qb-auth-primary-submit"
            disabled={loading}
          >
            {loading ? "Authenticating..." : usePassword ? "Sign in with Credentials" : "Sign in to QBANK System"}
          </button>
        </form>

        {onSignInWithGoogle && (
          <>
            <div className="qb-auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            <button
              type="button"
              className="qb-auth-google-btn"
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
              <span>Sign in with Google</span>
            </button>
          </>
        )}

        <div className="qb-auth-footer-notice">
          <ShieldCheck size={14} />
          <span>Local offline caching & secure cloud sync enabled.</span>
        </div>
      </div>
    </div>
  );
}
