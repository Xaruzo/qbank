import React, { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, Menu, Moon, Settings, Sun, UserCircle2, X } from "lucide-react";
import brandLogo from "../../models/Image/logo.png";

export default function Header({
  isDark,
  onToggleTheme,
  onHome,
  showNavToggle,
  navOpen,
  onToggleNav,
  authAvailable,
  isAuthLoading,
  isAuthenticated,
  profile,
  onSignIn,
  onSignOut,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const openSettings = () => {
    setMenuOpen(false);
    setSettingsOpen(true);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await onSignOut();
  };

  const accountIcon = (
    <span className="qb-account-avatar" aria-hidden="true">
      <UserCircle2 size={22} strokeWidth={1.9} />
    </span>
  );

  return (
    <>
      <header className="qb-hdr">
        <div className="qb-hdr-left">
          {showNavToggle && (
            <button
              type="button"
              className="qb-hdr-menu-btn"
              onClick={onToggleNav}
              aria-label={navOpen ? "Close menu" : "Open menu"}
              title={navOpen ? "Close menu" : "Open menu"}
            >
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <div className="qb-logo-block">
            <button type="button" className="qb-logo" onClick={onHome} title="Go to question list">
              <img className="qb-logo-img" src={brandLogo} alt="QBank logo" />
              <span>QBANK</span>
              <span className="qb-logo-tag">REVIEW WORKSPACE</span>
            </button>
            <div className="qb-hdr-meta-stack" aria-hidden="true">
              <span className="qb-hdr-meta-label">Dashboard</span>
              <span className="qb-hdr-meta-value">Questions, practice history, and mock exams</span>
            </div>
          </div>
        </div>
        <div className="qb-spacer" />
        <div className="qb-hdr-right">
          <button
            type="button"
            className="qb-theme-btn"
            onClick={onToggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="qb-theme-btn-text">{isDark ? "Light" : "Dark"}</span>
          </button>
          {!authAvailable ? (
            <button
              type="button"
              className="qb-auth-btn"
              onClick={openSettings}
              title="Auth is not configured. Open settings"
            >
              <UserCircle2 size={17} />
              Auth Off
            </button>
          ) : isAuthenticated ? (
            <div className="qb-account-wrap" ref={menuRef}>
              <button
                type="button"
                className="qb-account-btn qb-account-btn-avatar"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title={profile.email || profile.fullName}
              >
                {accountIcon}
              </button>

              {menuOpen && (
                <div className="qb-profile-menu" role="menu">
                  <div className="qb-profile-menu-head">
                    {accountIcon}
                    <div className="qb-profile-meta">
                      <div className="qb-profile-name">{profile.fullName}</div>
                      <div className="qb-profile-email">{profile.email}</div>
                    </div>
                  </div>

                  <button type="button" className="qb-profile-menu-item" onClick={onToggleTheme}>
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </button>
                  <button type="button" className="qb-profile-menu-item" onClick={openSettings}>
                    <Settings size={16} />
                    Settings
                  </button>
                  <button type="button" className="qb-profile-menu-item danger" onClick={handleSignOut}>
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="qb-auth-btn" onClick={onSignIn} disabled={isAuthLoading}>
              <LogIn size={17} />
              {isAuthLoading ? "Loading..." : "Sign In"}
            </button>
          )}
        </div>
      </header>

      {settingsOpen && (
        <div className="qb-settings-ov" onClick={() => setSettingsOpen(false)}>
          <div className="qb-settings-card" onClick={(event) => event.stopPropagation()}>
            <div className="qb-settings-head">
              <div>
                <div className="qb-settings-kicker">Preferences</div>
                <div className="qb-settings-title">Settings</div>
              </div>
              <button type="button" className="qb-settings-close" onClick={() => setSettingsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="qb-settings-section">
              <div className="qb-settings-label">Theme</div>
              <button type="button" className="qb-profile-menu-item qb-settings-action" onClick={onToggleTheme}>
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </button>
            </div>

            <div className="qb-settings-section">
              <div className="qb-settings-label">Account</div>
              <div className="qb-settings-text">
                {isAuthenticated
                  ? `Signed in as ${profile.email || profile.fullName}.`
                  : authAvailable
                    ? "Sign in with Google to add, edit, and manage questions."
                    : "Supabase auth is not configured yet."}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
