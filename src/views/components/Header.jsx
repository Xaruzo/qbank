import { useEffect, useRef, useState } from "react";
import {
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserCircle2,
  X,
  HelpCircle,
  Home,
  ClipboardList,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import brandLogo from "../../models/Image/logo.png";

export default function Header({
  isDark,
  onToggleTheme,
  onHome,
  showNavToggle = true,
  navOpen,
  onToggleNav,
  authAvailable,
  isAuthLoading,
  isAuthenticated,
  profile,
  onSignIn,
  onSignOut,
  onOpenHelp,
  currentView = "home",
  onMockExam,
  onTips,
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

  const handleOpenHelp = () => {
    setMenuOpen(false);
    if (onOpenHelp) {
      onOpenHelp();
    }
  };

  const accountIcon = (
    <span className="qb-account-avatar" aria-hidden="true">
      {profile?.fullName ? (
        profile.fullName.slice(0, 2).toUpperCase()
      ) : (
        <UserCircle2 size={22} strokeWidth={1.9} />
      )}
    </span>
  );

  return (
    <>
      <header className="qb-hdr">
        {/* Left: Hamburger & Brand */}
        <div className="qb-hdr-left">
          {showNavToggle && (
            <button
              type="button"
              className={`qb-hdr-menu-btn${navOpen ? " is-active" : ""}`}
              onClick={onToggleNav}
              aria-label={navOpen ? "Close sidebar menu" : "Open sidebar menu"}
              title={navOpen ? "Close sidebar menu" : "Open sidebar menu"}
            >
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div className="qb-logo-block">
            <button
              type="button"
              className="qb-logo"
              onClick={onHome}
              title="Return to Question Bank"
            >
              <img className="qb-logo-img" src={brandLogo} alt="QBank logo" />
              <div className="qb-logo-text-group">
                <span className="qb-logo-title">QBANK</span>
                <span className="qb-logo-sub">Civil Service Reviewer</span>
              </div>
            </button>
          </div>
        </div>

        {/* Center: Desktop Quick Nav Links */}
        <nav className="qb-hdr-nav" aria-label="Quick Navigation">
          <button
            type="button"
            className={`qb-hdr-nav-item${
              currentView === "home" || currentView === "list" ? " is-active" : ""
            }`}
            onClick={onHome}
            title="Question Bank"
          >
            <Home size={15} />
            <span>Question Bank</span>
          </button>

          {onMockExam && (
            <button
              type="button"
              className={`qb-hdr-nav-item${
                currentView === "mock" ||
                currentView === "mockRun" ||
                currentView === "mockAttempt"
                  ? " is-active"
                  : ""
              }`}
              onClick={onMockExam}
              title="Timed Mock Exam"
            >
              <ClipboardList size={15} />
              <span>Timed Mock Exam</span>
            </button>
          )}

          {onTips && (
            <button
              type="button"
              className={`qb-hdr-nav-item${
                currentView === "tips" || currentView === "tipDetail" ? " is-active" : ""
              }`}
              onClick={onTips}
              title="Tips & Methods"
            >
              <Lightbulb size={15} />
              <span>Tips & Tricks</span>
            </button>
          )}
        </nav>

        {/* Right: Actions, Theme, Help & User Profile */}
        <div className="qb-hdr-right">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            className="qb-hdr-action-btn"
            onClick={onToggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Quick Help Guide */}
          {onOpenHelp && (
            <button
              type="button"
              className="qb-hdr-action-btn"
              onClick={handleOpenHelp}
              title="Open reviewer guide & help"
              aria-label="Open reviewer guide & help"
            >
              <HelpCircle size={17} />
            </button>
          )}

          {/* User Account / Auth */}
          {!authAvailable ? (
            <button
              type="button"
              className="qb-auth-btn qb-auth-off-btn"
              onClick={openSettings}
              title="Auth is not configured. Click to configure settings."
            >
              <UserCircle2 size={16} />
              <span>Guest Mode</span>
            </button>
          ) : isAuthenticated ? (
            <div className="qb-account-wrap" ref={menuRef}>
              <button
                type="button"
                className={`qb-account-btn qb-account-btn-avatar${
                  menuOpen ? " is-active" : ""
                }`}
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title={profile?.email || profile?.fullName || "Account menu"}
              >
                {accountIcon}
              </button>

              {menuOpen && (
                <div className="qb-profile-menu" role="menu">
                  <div className="qb-profile-menu-head">
                    {accountIcon}
                    <div className="qb-profile-meta">
                      <div className="qb-profile-name">
                        {profile?.fullName || "Reviewer"}
                      </div>
                      <div className="qb-profile-email">{profile?.email || ""}</div>
                      <span className="qb-profile-status-badge">
                        <CheckCircle2 size={11} /> Verified Account
                      </span>
                    </div>
                  </div>

                  <div className="qb-profile-menu-divider" />

                  <button
                    type="button"
                    className="qb-profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleTheme();
                    }}
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                  </button>

                  <button
                    type="button"
                    className="qb-profile-menu-item"
                    onClick={handleOpenHelp}
                  >
                    <HelpCircle size={16} />
                    <span>Reviewer Guide & Shortcuts</span>
                  </button>

                  <button
                    type="button"
                    className="qb-profile-menu-item"
                    onClick={openSettings}
                  >
                    <Settings size={16} />
                    <span>Settings & Preferences</span>
                  </button>

                  <div className="qb-profile-menu-divider" />

                  <button
                    type="button"
                    className="qb-profile-menu-item danger"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="qb-auth-btn qb-auth-signin-btn"
              onClick={onSignIn}
              disabled={isAuthLoading}
              title="Sign in with your Google account"
            >
              <LogIn size={15} />
              <span>{isAuthLoading ? "Signing in..." : "Sign In"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="qb-settings-ov" onClick={() => setSettingsOpen(false)}>
          <div
            className="qb-settings-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <div className="qb-settings-head">
              <div>
                <span className="qb-settings-kicker">Preferences</span>
                <h3 className="qb-settings-title">App Settings</h3>
              </div>
              <button
                type="button"
                className="qb-settings-close"
                onClick={() => setSettingsOpen(false)}
                title="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="qb-settings-section">
              <span className="qb-settings-label">Color Theme</span>
              <button
                type="button"
                className="qb-profile-menu-item qb-settings-action"
                onClick={onToggleTheme}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
              </button>
            </div>

            <div className="qb-settings-section">
              <span className="qb-settings-label">Account & Sync</span>
              <p className="qb-settings-text">
                {isAuthenticated
                  ? `Signed in as ${profile?.email || profile?.fullName}. Your exam progress, favorites, and study tips are backed up to the cloud.`
                  : authAvailable
                  ? "Sign in with Google to sync your mock exams, starred questions, and custom tips across devices."
                  : "Offline mode active. Questions and tips are stored in your browser's local cache."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
