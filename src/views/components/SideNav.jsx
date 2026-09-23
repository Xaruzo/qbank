import { useRef } from "react";
import { useOverlayDialogA11y } from "../../controllers/useOverlayDialogA11y";
import {
  Home,
  ClipboardList,
  Lightbulb,
  X,
  Sun,
  Moon,
  HelpCircle,
  LogIn,
  LogOut,
  UserCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import brandLogo from "../../models/Image/logo.png";

const NAV_ITEMS = [
  {
    id: "home",
    label: "Question Bank",
    subtitle: "Practice authentic CSC questions",
    title: "Question Bank",
    icon: Home,
  },
  {
    id: "mock",
    label: "Timed Mock Exam",
    subtitle: "Full-length CSC simulations & stats",
    title: "Timed Mock Exam",
    icon: ClipboardList,
  },
  {
    id: "tips",
    label: "Tips & Methods",
    subtitle: "Whiteboard diagrams, formulas & cues",
    title: "Tips & Tricks",
    icon: Lightbulb,
  },
];

export default function SideNav({
  variant = "rail",
  open,
  active,
  onHome,
  onMockExam,
  onTips,
  onClose,
  totalQuestions = 0,
  starredCount = 0,
  isDark,
  onToggleTheme,
  onOpenHelp,
  isAuthenticated,
  profile,
  onSignIn,
  onSignOut,
}) {
  const cardRef = useRef(null);
  useOverlayDialogA11y(variant === "overlay" && open, onClose, cardRef);

  if (variant === "overlay") {
    if (!open) return null;

    const handleNavigate = (action) => () => {
      action();
      if (onClose) onClose();
    };

    return (
      <div className="qb-mnav-ov" onClick={onClose}>
        <aside
          ref={cardRef}
          className="qb-side-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Top Header */}
          <div className="qb-drawer-head">
            <div className="qb-drawer-brand">
              <img src={brandLogo} alt="QBank logo" className="qb-drawer-logo" />
              <div className="qb-drawer-brand-text">
                <span className="qb-drawer-title">QBANK</span>
                <span className="qb-drawer-sub">Civil Service Reviewer</span>
              </div>
            </div>

            <button
              type="button"
              className="qb-drawer-close-btn"
              onClick={onClose}
              aria-label="Close navigation menu"
              title="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Status Bar in Drawer */}
          <div className="qb-drawer-user-section">
            {isAuthenticated ? (
              <div className="qb-drawer-user-card">
                <div className="qb-drawer-avatar">
                  {profile?.fullName ? (
                    profile.fullName.slice(0, 2).toUpperCase()
                  ) : (
                    <UserCircle2 size={24} />
                  )}
                </div>
                <div className="qb-drawer-user-meta">
                  <div className="qb-drawer-user-name">
                    {profile?.fullName || "Reviewer"}
                  </div>
                  <div className="qb-drawer-user-email">
                    {profile?.email || "Signed in"}
                  </div>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    className="qb-drawer-signout-btn"
                    onClick={() => {
                      if (onClose) onClose();
                      onSignOut();
                    }}
                    title="Sign Out"
                  >
                    <LogOut size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div className="qb-drawer-guest-card">
                <div className="qb-drawer-guest-info">
                  <span className="qb-drawer-guest-label">Guest Reviewer</span>
                  <span className="qb-drawer-guest-sub">Sign in to sync your mock exams</span>
                </div>
                {onSignIn && (
                  <button
                    type="button"
                    className="qb-drawer-signin-btn"
                    onClick={() => {
                      if (onClose) onClose();
                      onSignIn();
                    }}
                  >
                    <LogIn size={14} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Navigation List */}
          <div className="qb-drawer-nav-section">
            <span className="qb-drawer-section-label">STUDY AREAS</span>
            <nav className="qb-drawer-nav">
              {NAV_ITEMS.map(({ id, label, subtitle, icon: Icon }) => {
                const isSelected = active === id;
                const clickHandler =
                  id === "home" ? onHome : id === "mock" ? onMockExam : onTips;

                return (
                  <button
                    key={id}
                    type="button"
                    className={`qb-drawer-nav-item${isSelected ? " is-active" : ""}`}
                    onClick={handleNavigate(clickHandler)}
                  >
                    <div className="qb-drawer-nav-icon-wrap">
                      <Icon size={19} />
                    </div>
                    <div className="qb-drawer-nav-text-wrap">
                      <div className="qb-drawer-nav-label-row">
                        <span className="qb-drawer-nav-title">{label}</span>
                        {id === "home" && totalQuestions > 0 && (
                          <span className="qb-drawer-item-badge">
                            {totalQuestions}
                          </span>
                        )}
                        {id === "mock" && (
                          <span className="qb-drawer-item-badge accent">
                            Timed
                          </span>
                        )}
                      </div>
                      <span className="qb-drawer-nav-desc">{subtitle}</span>
                    </div>
                    <ChevronRight size={14} className="qb-drawer-nav-arrow" />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Stats Widget */}
          <div className="qb-drawer-stats-card">
            <div className="qb-drawer-stats-head">
              <Sparkles size={14} className="qb-drawer-stats-icon" />
              <span>Study Progress</span>
            </div>
            <div className="qb-drawer-stats-grid">
              <div className="qb-drawer-stat-col">
                <strong>{totalQuestions}</strong>
                <span>Items in Bank</span>
              </div>
              <div className="qb-drawer-stat-sep" />
              <div className="qb-drawer-stat-col">
                <strong>{starredCount}</strong>
                <span>Starred</span>
              </div>
            </div>
          </div>

          {/* Drawer Footer Utilities */}
          <div className="qb-drawer-footer">
            {onToggleTheme && (
              <button
                type="button"
                className="qb-drawer-util-btn"
                onClick={onToggleTheme}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
              </button>
            )}

            {onOpenHelp && (
              <button
                type="button"
                className="qb-drawer-util-btn"
                onClick={() => {
                  if (onClose) onClose();
                  onOpenHelp();
                }}
              >
                <HelpCircle size={16} />
                <span>Help & Guide</span>
              </button>
            )}
          </div>
        </aside>
      </div>
    );
  }

  // Desktop rail variant
  const iconSize = open ? 18 : 22;
  const handlers = { home: onHome, mock: onMockExam, tips: onTips };

  return (
    <aside className={`qb-side${open ? " qb-side-expanded" : " qb-side-collapsed"}`}>
      <div className="qb-side-inner">
        {open && (
          <div className="qb-side-block qb-side-intro">
            <span className="qb-side-kicker">Workspace</span>
            <strong className="qb-side-title">Study Center</strong>
            <p className="qb-side-copy">
              Practice questions, run official exam simulations, and create whiteboard formulas.
            </p>
          </div>
        )}

        <nav className="qb-side-nav" aria-label="Desktop Sidebar">
          {NAV_ITEMS.map(({ id, label, title, subtitle, icon: Icon }) => {
            const isSelected = active === id;

            return (
              <button
                key={id}
                type="button"
                className={`qb-nav-item${isSelected ? " on" : ""}`}
                onClick={handlers[id]}
                title={title}
              >
                <div className="qb-nav-item-icon-box">
                  <Icon size={iconSize} />
                </div>
                {open ? (
                  <div className="qb-nav-item-body">
                    <span className="qb-nav-text">{label}</span>
                    <span className="qb-nav-subtext">{subtitle}</span>
                  </div>
                ) : (
                  <span className="qb-nav-text qb-nav-text-collapsed">{label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {open && (
          <div className="qb-side-block qb-side-foot">
            <span className="qb-side-foot-label">Civil Service Tip</span>
            <span className="qb-side-foot-text">
              Pacing is critical: 170 items in 3 hours 10 minutes equals roughly 67 seconds per item.
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
