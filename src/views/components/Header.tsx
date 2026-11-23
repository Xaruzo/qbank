import { useEffect, useState } from "react";
import {
  LogIn,
  Menu,
  UserCircle2,
  X,
  Compass,
  Bell,
  WifiOff,
  CloudUpload,
} from "lucide-react";
import brandLogo from "../../assets/logo.png";
import NotificationsModal from "./NotificationsModal";
import type { HeaderProps } from "../../types";

export default function Header({
  onHome,
  onDashboard,
  onLanding,
  showNavToggle = true,
  navOpen = false,
  onToggleNav,
  authAvailable = true,
  isAuthLoading = false,
  isAuthenticated = false,
  profile = null,
  onSignIn,
  onOpenSettings,
  onMockExam,
  onTips,
  onNotes,
  onFilterMissed,
  missedCount = 0,
  unseenCount = 0,
  todayAnsweredCount = 0,
  dailyStudyGoal = 25,
  daysUntilExam = null,
  hasResumableMock = false,
  isOnline = true,
  pendingSyncCount = 0,
  currentView = "home",
}: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenNotifs = () => setNotificationsOpen(true);
    window.addEventListener("qbank-open-notifications", handleOpenNotifs);
    return () => window.removeEventListener("qbank-open-notifications", handleOpenNotifs);
  }, []);

  const openProfileSettings = () => {
    if (onOpenSettings) {
      onOpenSettings("identity");
    }
  };

  const accountIcon = (
    <div className="qb-profile-trigger-avatar-wrap">
      <div
        className={`qb-header-avatar qb-account-avatar qb-profile-trigger-avatar shape-${
          profile?.avatarShape || "badge"
        }`}
        aria-hidden="true"
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.fullName || "User profile"}
            className="qb-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : profile?.fullName ? (
          profile.fullName.slice(0, 2).toUpperCase()
        ) : (
          <UserCircle2 size={18} strokeWidth={1.8} />
        )}
      </div>
      <span className={`qb-profile-online-dot${isAuthenticated ? " online" : ""}`} />
    </div>
  );

  const showSyncState = !isOnline || pendingSyncCount > 0;

  return (
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
            onClick={onDashboard || onHome}
            title="Return to Study Dashboard"
          >
            <img className="qb-logo-img" src={brandLogo} alt="QBANK logo" />
            <div className="qb-logo-text-group">
              <span className="qb-logo-title">QBANK</span>
              <span className="qb-logo-sub">Civil Service Reviewer</span>
            </div>
          </button>
        </div>
      </div>

      {/* Right: Connection Sync Indicator (only when offline or queued), Overview, Notifications & Profile */}
      <div className="qb-hdr-right">
        {showSyncState && (
          <button
            type="button"
            className={`qb-hdr-sync-status${!isOnline ? " is-offline" : " is-pending"}`}
            onClick={() => onOpenSettings?.("storage")}
            title={
              !isOnline
                ? `Offline mode${pendingSyncCount > 0 ? ` · ${pendingSyncCount} change(s) queued` : ""}`
                : `${pendingSyncCount} change(s) waiting to sync`
            }
          >
            {!isOnline ? <WifiOff size={13} /> : <CloudUpload size={13} />}
            <span className="tabular-nums">
              {!isOnline
                ? pendingSyncCount > 0
                  ? `Offline · ${pendingSyncCount}`
                  : "Offline"
                : `${pendingSyncCount} pending`}
            </span>
          </button>
        )}

        {onLanding && !isAuthenticated && !isAuthLoading && (
          <button
            type="button"
            className={`qb-hdr-landing-link${currentView === "landing" ? " is-active" : ""}`}
            onClick={onLanding}
            title="View Landing Page & Exam Overview"
            aria-label="View Landing Page & Exam Overview"
          >
            <Compass size={14} className="qb-hdr-landing-icon" />
            <span>Overview</span>
          </button>
        )}

        {/* Notifications Center Button & Panel */}
        <div className="qb-hdr-notif-wrap">
          <button
            type="button"
            className={`qb-hdr-action-btn qb-hdr-notif-btn${unreadCount > 0 ? " has-unread" : ""}${notificationsOpen ? " is-active" : ""}`}
            onClick={() => setNotificationsOpen((prev) => !prev)}
            title="Reviewer Alerts & Study Progress"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            aria-expanded={notificationsOpen}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="qb-hdr-notif-badge tabular-nums" aria-hidden="true">
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
            onFilterMissed={onFilterMissed}
            onOpenSettings={onOpenSettings}
            onUnreadCountChange={setUnreadCount}
            missedCount={missedCount}
            unseenCount={unseenCount}
            todayAnsweredCount={todayAnsweredCount}
            dailyStudyGoal={dailyStudyGoal}
            daysUntilExam={daysUntilExam}
            hasResumableMock={hasResumableMock}
            isOnline={isOnline}
            pendingSyncCount={pendingSyncCount}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* User Account / Profile Link (menu actions live inside SideNav popover to avoid redundancy) */}
        {!authAvailable ? (
          <button
            type="button"
            className="qb-auth-btn qb-auth-off-btn"
            onClick={openProfileSettings}
            title="Open Settings & Profile"
          >
            <UserCircle2 size={16} />
            <span>Local Profile</span>
          </button>
        ) : isAuthenticated ? (
          <button
            type="button"
            className={`qb-account-btn-avatar shape-${profile?.avatarShape || "badge"}`}
            onClick={openProfileSettings}
            aria-label={profile?.fullName ? `Open ${profile.fullName}'s profile settings` : "Open settings"}
            title={profile?.email ? `${profile.email} · Profile & Settings` : "Profile & Settings"}
          >
            {accountIcon}
          </button>
        ) : isAuthLoading ? (
          <div
            aria-hidden="true"
            className="h-[34px] w-[34px] shrink-0 rounded-full bg-slate-800/70 light:bg-slate-200/80 animate-pulse"
          />
        ) : (
          <button
            type="button"
            className="qb-auth-btn qb-auth-signin-btn"
            onClick={onSignIn}
            title="Sign in with your Google account"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
