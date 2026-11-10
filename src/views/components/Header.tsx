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
  CheckCircle2,
  Sparkles,
  Bell,
} from "lucide-react";
import brandLogo from "../../models/Image/logo.png";
import NotificationsModal from "./NotificationsModal";
import SettingsModal from "./SettingsModal";
import type { HeaderProps, AppSettings, UserProfile } from "../../types";

interface ExtendedHeaderProps extends HeaderProps {
  onResetSettings?: () => void;
  onUpdateProfile?: (partial: Partial<UserProfile>) => Promise<{ success: boolean }>;
}

export default function Header({
  isDark,
  onToggleTheme,
  onHome,
  onLanding,
  showNavToggle = true,
  navOpen = false,
  onToggleNav,
  authAvailable = true,
  isAuthLoading = false,
  isAuthenticated = false,
  profile = null,
  onSignIn,
  onSignOut,
  onOpenHelp,
  onOpenSettings,
  onMockExam,
  onTips,
  onNotes,
  currentView = "home",
  settings,
  onUpdateSettings,
  onResetSettings,
  onUpdateProfile,
}: ExtendedHeaderProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
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
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setSettingsOpen(true);
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    if (onSignOut) {
      await onSignOut();
    }
  };

  const handleOpenHelp = () => {
    setMenuOpen(false);
    if (onOpenHelp) {
      onOpenHelp();
    }
  };

  const accountIcon = (
    <span className={`qb-account-avatar shape-${profile?.avatarShape || "badge"}`} aria-hidden="true">
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={profile.fullName || "User profile"}
          className="qb-avatar-img"
        />
      ) : profile?.fullName ? (
        profile.fullName.slice(0, 2).toUpperCase()
      ) : (
        <UserCircle2 size={20} strokeWidth={1.8} />
      )}
    </span>
  );

  return (
    <>
      <header className="qb-hdr">
        {/* Left: Hamburger & Brand */}
        <div className="qb-hdr-left">
          {showNavToggle && onToggleNav && (
            <div className="qb-hdr-menu-slot">
              <button
                type="button"
                className={`qb-hdr-menu-btn${navOpen ? " is-active" : ""}`}
                onClick={onToggleNav}
                aria-label={navOpen ? "Close sidebar menu" : "Open sidebar menu"}
                title={navOpen ? "Close sidebar menu" : "Open sidebar menu"}
              >
                {navOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          )}

          <div className="qb-logo-block">
            <button
              type="button"
              className="qb-logo"
              onClick={onHome}
              title="Return to Question Bank"
            >
              <img className="qb-logo-img" src={brandLogo} alt="QBANK logo" />
              <div className="qb-logo-text-group">
                <span className="qb-logo-title">QBANK</span>
                <span className="qb-logo-sub">Civil Service Reviewer</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Actions, Theme, Help & User Profile */}
        <div className="qb-hdr-right">
          {/* Quick Landing Overview Link (Hidden when logged in) */}
          {onLanding && !isAuthenticated && (
            <button
              type="button"
              className={`qb-hdr-landing-link${currentView === "landing" ? " is-active" : ""}`}
              onClick={onLanding}
              title="View Landing Page & Exam Overview"
              aria-label="View Landing Page & Exam Overview"
            >
              <Sparkles size={14} className="qb-hdr-landing-icon" />
              <span>Overview</span>
            </button>
          )}

          {/* Notifications Center Button & Panel */}
          <div className="qb-hdr-notif-wrap" ref={notifWrapRef}>
            <button
              type="button"
              className={`qb-hdr-action-btn qb-hdr-notif-btn${unreadCount > 0 ? " has-unread" : ""}${notificationsOpen ? " is-active" : ""}`}
              onClick={() => setNotificationsOpen((prev) => !prev)}
              title="Notifications & Reviewer Updates"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-expanded={notificationsOpen}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="qb-hdr-notif-badge" aria-hidden="true">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <NotificationsModal
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              onNavigateToMockExam={onMockExam}
              onNavigateToTips={onTips}
              onNavigateToNotes={onNotes}
              onNavigateToQuestions={onHome}
              onUnreadCountChange={setUnreadCount}
            />
          </div>

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
                className={`qb-account-btn qb-account-btn-avatar shape-${
                  profile?.avatarShape || "badge"
                }${menuOpen ? " is-active" : ""}`}
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
