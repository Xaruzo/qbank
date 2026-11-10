import { useRef, useState, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOverlayDialogA11y } from "../../controllers/useOverlayDialogA11y";
import {
  Layers,
  Timer,
  NotebookPen,
  Lightbulb,
  Star,
  X,
  LogIn,
  LogOut,
  UserCircle2,
  HelpCircle,
  Settings,
  ChevronsUpDown,
  User,
  Moon,
  Sun,
  Monitor,
  Sliders,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import brandLogo from "../../models/Image/logo.png";
import type { SideNavProps, TopicId } from "../../types";

interface NavItemDef {
  id: "home" | "mock" | "tips" | "notes";
  label: string;
  shortLabel: string;
  railLabel?: string;
  badgeText?: string | null;
  badgeType?: "accent" | "neutral";
  title: string;
  icon: LucideIcon;
}

interface WorkspaceNavListProps {
  navItems: NavItemDef[];
  active: string;
  handlers: Record<string, (() => void) | undefined>;
  isOverlay?: boolean;
  onNavigate?: (action?: () => void) => () => void;
}

function WorkspaceNavList({
  navItems,
  active,
  handlers,
  isOverlay = false,
  onNavigate,
}: WorkspaceNavListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 0,
    ready: false,
  });
  // PolicyPulse icon activation pop: clicking the already-active tab re-runs
  // the spring animation by remounting the icon node.
  const [pulseKeys, setPulseKeys] = useState<Record<string, number>>({});

  const updateGlider = () => {
    const activeEl = itemRefs.current[active];
    const container = containerRef.current;
    if (activeEl && container) {
      const cRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setGlider({
        top: elRect.top - cRect.top,
        height: elRect.height,
        ready: true,
      });
    } else {
      setGlider((prev) => ({ ...prev, ready: false }));
    }
  };

  useLayoutEffect(() => {
    updateGlider();
  }, [active, navItems]);

  useEffect(() => {
    window.addEventListener("resize", updateGlider);
    return () => window.removeEventListener("resize", updateGlider);
  }, [active]);

  return (
    <nav ref={containerRef} className="qb-nav-list" aria-label="Study Workspace">
      {glider.ready && (
        <div
          className="qb-nav-glider"
          style={{
            transform: `translateY(${glider.top}px)`,
            height: `${glider.height}px`,
          }}
          aria-hidden="true"
        >
          <span className="qb-nav-glider-bar" />
          <span className="qb-nav-glider-pill" />
        </div>
      )}
      {navItems.map(({ id, label, badgeText, badgeType, icon: Icon, title }, idx) => {
        const isSelected = active === id;
        const clickHandler = handlers[id];

        return (
          <button
            key={id}
            ref={(el) => {
              itemRefs.current[id] = el;
            }}
            type="button"
            style={{ "--nav-idx": idx } as React.CSSProperties}
            className={`qb-nav-item${isSelected ? " is-active" : ""}`}
            onClick={() => {
              // PolicyPulse re-click pulse on the already-active destination
              if (isSelected) setPulseKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
              if (isOverlay && onNavigate) onNavigate(clickHandler)();
              else if (clickHandler) clickHandler();
            }}
            title={title}
          >
            <div className="qb-nav-item-lead">
              <span
                key={pulseKeys[id] || 0}
                className="qb-nav-icon-pop-wrap"
                aria-hidden="true"
              >
                <Icon size={17} className="qb-nav-item-icon" />
              </span>
              <span className="qb-nav-item-label">{label}</span>
            </div>
            {badgeText && (
              <span className={`qb-nav-badge${badgeType === "accent" ? " is-accent" : ""}`}>
                {badgeText}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

interface RailNavListProps {
  navItems: NavItemDef[];
  active: string;
  handlers: Record<string, (() => void) | undefined>;
  // PolicyPulse unseen-style dot: rail surfaces with new content since the
  // last visit get an accent dot pinned to their icon.
  newDotIds?: string[];
}

function RailNavList({
  navItems,
  active,
  handlers,
  newDotIds = [],
}: RailNavListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 0,
    ready: false,
  });
  const [pulseKeys, setPulseKeys] = useState<Record<string, number>>({});

  const updateGlider = () => {
    const activeEl = itemRefs.current[active];
    const container = containerRef.current;
    if (activeEl && container) {
      const cRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setGlider({
        top: elRect.top - cRect.top,
        height: elRect.height,
        ready: true,
      });
    } else {
      setGlider((prev) => ({ ...prev, ready: false }));
    }
  };

  useLayoutEffect(() => {
    updateGlider();
  }, [active, navItems]);

  useEffect(() => {
    window.addEventListener("resize", updateGlider);
    return () => window.removeEventListener("resize", updateGlider);
  }, [active]);

  return (
    <div ref={containerRef} className="qb-rail-nav">
      {glider.ready && (
        <div
          className="qb-rail-glider"
          style={{
            transform: `translateY(${glider.top}px)`,
            height: `${glider.height}px`,
          }}
          aria-hidden="true"
        >
          <span className="qb-rail-glider-bar" />
          <span className="qb-rail-glider-pill" />
        </div>
      )}
      {navItems.map(({ id, shortLabel, railLabel, icon: Icon, title }) => {
        const isSelected = active === id;
        const clickHandler = handlers[id];
        const showDot = newDotIds.includes(id);
        const railText = railLabel || shortLabel;

        return (
          <button
            key={id}
            ref={(el) => {
              itemRefs.current[id] = el;
            }}
            type="button"
            className={`qb-rail-btn${isSelected ? " is-active" : ""}`}
            onClick={() => {
              // PolicyPulse re-click pulse on the already-active destination
              if (isSelected) setPulseKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
              if (clickHandler) clickHandler();
            }}
            title={title || shortLabel}
            aria-label={shortLabel}
          >
            <span key={pulseKeys[id] || 0} className="qb-nav-icon-pop-wrap" aria-hidden="true">
              <Icon size={17} />
            </span>
            <span className="qb-rail-btn-label">{railText}</span>
            {showDot && <span className="qb-rail-btn-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

export default function SideNav({
  variant = "rail",
  open = false,
  active = "home",
  onHome,
  onLanding,
  onMockExam,
  onTips,
  onNotes,
  onClose,
  onToggleNav,
  totalQuestions = 0,
  starredCount = 0,
  isDark = true,
  onToggleTheme,
  onOpenHelp,
  onOpenSettings,
  isAuthenticated = false,
  profile = null,
  onSignIn,
  onSignOut,
  activeTopic = "all",
  onSelectTopic,
  topicCounts = {},
  settings,
  themeMode,
  onSetThemeMode,
  isQuestionAdmin = false,
}: SideNavProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const railPopoverRef = useRef<HTMLDivElement>(null);
  const railBtnRef = useRef<HTMLButtonElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const [railCoords, setRailCoords] = useState<{ top: number; left: number } | null>(null);

  // PolicyPulse unread logic: track how many questions were present at the
  // last bank visit; additions since then surface as a "new" indicator that
  // resets when the reviewer opens the Question Bank.
  const SEEN_QUESTIONS_KEY = "qbank-seen-questions-total";
  const [seenTotal, setSeenTotal] = useState<number | null>(() => {
    try {
      const stored = window.localStorage?.getItem(SEEN_QUESTIONS_KEY);
      return stored == null || stored === "" ? null : Number(stored) || 0;
    } catch {
      return null;
    }
  });
  const unseenNewCount =
    seenTotal != null && totalQuestions > seenTotal ? totalQuestions - seenTotal : 0;
  const newDotIds = unseenNewCount > 0 ? ["home"] : [];

  useEffect(() => {
    // Visiting the bank resets the unread tracking (PolicyPulse seen-reset).
    if (active !== "home" || totalQuestions <= 0) return;
    setSeenTotal((prev) => (prev === totalQuestions ? prev : totalQuestions));
  }, [active, totalQuestions]);

  useEffect(() => {
    if (seenTotal == null) return;
    try {
      window.localStorage?.setItem(SEEN_QUESTIONS_KEY, String(seenTotal));
    } catch {
      // Ignore storage write errors
    }
  }, [seenTotal]);

  const rolePillClass = isQuestionAdmin ? "admin" : isAuthenticated ? "pro" : "guest";
  const rolePillLabel = isQuestionAdmin ? "ADMIN" : isAuthenticated ? "REVIEWER" : "GUEST";
  const activeThemeMode = themeMode ?? (isDark ? "dark" : "light");

  useOverlayDialogA11y(variant === "overlay" && open, onClose, cardRef);

  const updateRailCoords = () => {
    if (railBtnRef.current) {
      const rect = railBtnRef.current.getBoundingClientRect();
      const popoverHeight = 350;
      const top = Math.max(12, Math.min(window.innerHeight - popoverHeight - 12, rect.bottom - popoverHeight));
      const left = rect.right + 12;
      setRailCoords({ top, left });
    }
  };

  useLayoutEffect(() => {
    if (profileMenuOpen && !open) {
      updateRailCoords();
    }
  }, [profileMenuOpen, open]);

  useEffect(() => {
    if (!profileMenuOpen || open) return;
    // PolicyPulse auto-dismiss: the floating rail popover closes when the
    // viewport resizes (covers entering tablet/mobile mid-menu).
    const handleResize = () => setProfileMenuOpen(false);
    const handleScroll = () => updateRailCoords();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [profileMenuOpen, open]);

  // Click outside to dismiss PolicyPulse profile tooltip popover
  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inExpanded = popoverRef.current && popoverRef.current.contains(target);
      const inRail = railPopoverRef.current && railPopoverRef.current.contains(target);
      const inBtn = railBtnRef.current && railBtnRef.current.contains(target);
      if (!inExpanded && !inRail && !inBtn) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const handlers: Record<string, (() => void) | undefined> = {
    home: onHome,
    mock: onMockExam,
    tips: onTips,
    notes: onNotes,
  };

  const navItems: NavItemDef[] = [
    {
      id: "home",
      label: "Question Bank",
      shortLabel: "Bank",
      title: "Question Bank (All practice questions)",
      icon: Layers,
    },
    {
      id: "mock",
      label: "Timed Mock Exam",
      shortLabel: "Mock Exam",
      railLabel: "Mock",
      title: "Timed Mock Exam (Full CSC Simulation)",
      icon: Timer,
    },
    {
      id: "notes",
      label: "Study Notes",
      shortLabel: "Notes",
      title: "Study Notes & Reviewer Scratchpad",
      icon: NotebookPen,
    },
    {
      id: "tips",
      label: "Tips & Methods",
      shortLabel: "Tips",
      title: "Tips, Whiteboards & Problem Methods",
      icon: Lightbulb,
    },
  ];

  const handleNavigate = (action?: () => void) => () => {
    if (action) action();
    if (onClose) onClose();
  };

  // Reusable Top Brand Row
  const renderBrandHeader = () => (
    <div className="qb-nav-brand-header">
      <div
        className="qb-nav-brand-lockup"
        onClick={handleNavigate(onLanding || onHome)}
        role="button"
        tabIndex={0}
        title="CSE QBANK Reviewer"
      >
        <img src={brandLogo} alt="QBANK logo" className="qb-nav-brand-logo" />
        <div className="qb-nav-brand-titles">
          <span className="qb-nav-brand-title">CSE QBANK</span>
          <span className="qb-nav-brand-sub">Civil Service Reviewer</span>
        </div>
      </div>

      <button
        type="button"
        className="qb-nav-close-btn"
        onClick={onClose}
        aria-label="Close menu"
        title="Close navigation"
      >
        <X size={18} />
      </button>
    </div>
  );

  // Reusable Workspace Navigation with up-and-down gliding focus indicator
  const renderWorkspaceNav = (isOverlay = false) => (
    <div className="qb-nav-group">
      <div className="qb-nav-group-header">
        <span className="qb-nav-group-title">STUDY WORKSPACE</span>
        <span className={`qb-popover-role-pill ${rolePillClass} qb-nav-role-pill`}>{rolePillLabel}</span>
      </div>
      <WorkspaceNavList
        navItems={navItems}
        active={active}
        handlers={handlers}
        isOverlay={isOverlay}
        onNavigate={handleNavigate}
      />
    </div>
  );

  // PolicyPulse Profile Tooltip Popover Menu
  const renderProfilePopover = (isOverlay = false) => {
    if (!profileMenuOpen) return null;

    return (
      <div
        className={`qb-profile-popover${!isDark ? " light" : ""}`}
        role="dialog"
        aria-label="Profile and quick preferences"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Card */}
        <div className="qb-profile-popover-user-card">
          <div className={`qb-profile-popover-avatar shape-${profile?.avatarShape || "badge"}`}>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.fullName || "User"} className="qb-popover-avatar-img" />
            ) : profile?.fullName ? (
              profile.fullName.slice(0, 2).toUpperCase()
            ) : (
              <UserCircle2 size={24} />
            )}
          </div>
          <div className="qb-profile-popover-user-meta">
            <div className="qb-profile-popover-name-row">
              <span className="qb-profile-popover-name">
                {profile?.fullName || (isAuthenticated ? "Reviewer" : "Practice as Guest")}
              </span>
              {isQuestionAdmin ? (
                <span className="qb-popover-role-pill admin">ADMIN</span>
              ) : isAuthenticated ? (
                <span className="qb-popover-role-pill pro">REVIEWER</span>
              ) : (
                <span className="qb-popover-role-pill guest">GUEST</span>
              )}
            </div>
            <span className="qb-profile-popover-email">
              {profile?.email || (isAuthenticated ? "Online Account" : "Offline local")}
            </span>
            <div className="qb-profile-popover-persona-line">
              <span className="persona-label">Persona:</span>
              <span className="persona-val">
                {profile?.examTarget === "subprofessional" ? "Subprofessional · 165 Qs" : "Professional · 170 Qs"}
              </span>
            </div>
          </div>
        </div>

        <div className="qb-profile-popover-divider" />

        {/* APPEARANCE Segmented Toggle (Smooth sliding glider animation) */}
        <div className="qb-profile-popover-section">
          <span className="qb-profile-popover-section-label">APPEARANCE</span>
          <div
            className="qb-profile-segmented-appearance"
            data-theme={activeThemeMode}
            data-mode={onSetThemeMode ? "ternary" : "binary"}
          >
            <div
              className={`qb-seg-theme-glider is-${activeThemeMode}`}
              aria-hidden="true"
            />
            <button
              type="button"
              className={`qb-seg-theme-btn${activeThemeMode === "dark" ? " is-active" : ""}`}
              onClick={() => {
                if (activeThemeMode === "dark") return;
                if (onSetThemeMode) onSetThemeMode("dark");
                else if (!isDark && onToggleTheme) onToggleTheme();
              }}
              aria-pressed={activeThemeMode === "dark"}
            >
              <Moon size={14} className="qb-seg-theme-icon" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              className={`qb-seg-theme-btn${activeThemeMode === "light" ? " is-active" : ""}`}
              onClick={() => {
                if (activeThemeMode === "light") return;
                if (onSetThemeMode) onSetThemeMode("light");
                else if (isDark && onToggleTheme) onToggleTheme();
              }}
              aria-pressed={activeThemeMode === "light"}
            >
              <Sun size={14} className="qb-seg-theme-icon" />
              <span>Light</span>
            </button>
            {onSetThemeMode && (
              <button
                type="button"
                className={`qb-seg-theme-btn${activeThemeMode === "system" ? " is-active" : ""}`}
                onClick={() => {
                  if (activeThemeMode !== "system") onSetThemeMode("system");
                }}
                aria-pressed={activeThemeMode === "system"}
                title="Follow the device appearance"
              >
                <Monitor size={14} className="qb-seg-theme-icon" />
                <span>System</span>
              </button>
            )}
          </div>
        </div>

        <div className="qb-profile-popover-divider" />

        {/* Menu Actions */}
        <div className="qb-profile-popover-actions">
          <button
            type="button"
            className="qb-profile-popover-item"
            onClick={() => {
              setProfileMenuOpen(false);
              if (isOverlay && onClose) onClose();
              if (onOpenSettings) onOpenSettings("identity");
            }}
          >
            <User size={15} />
            <span>Edit Profile & Picture</span>
          </button>

          <button
            type="button"
            className="qb-profile-popover-item"
            onClick={() => {
              setProfileMenuOpen(false);
              if (isOverlay && onClose) onClose();
              if (onOpenSettings) onOpenSettings("persona");
            }}
          >
            <Sliders size={15} />
            <span>Persona & Workspace Settings</span>
          </button>

          {onOpenHelp && (
            <button
              type="button"
              className="qb-profile-popover-item"
              onClick={() => {
                setProfileMenuOpen(false);
                if (isOverlay && onClose) onClose();
                onOpenHelp();
              }}
            >
              <HelpCircle size={15} />
              <span>Reviewer Guide & Shortcuts</span>
            </button>
          )}

          <div className="qb-profile-popover-divider" />

          {isAuthenticated ? (
            onSignOut && (
              <button
                type="button"
                className="qb-profile-popover-item danger"
                onClick={() => {
                  setProfileMenuOpen(false);
                  if (isOverlay && onClose) onClose();
                  onSignOut();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            )
          ) : (
            onSignIn && (
              <button
                type="button"
                className="qb-profile-popover-item signin"
                onClick={() => {
                  setProfileMenuOpen(false);
                  if (isOverlay && onClose) onClose();
                  onSignIn();
                }}
              >
                <LogIn size={15} />
                <span>Sign In to QBANK</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  // Reusable Bottom User Section & Preferences
  const renderFooterSection = (isOverlay = false) => (
    <div className="qb-nav-footer">
      {/* Quick Summary Strip */}
      <div className="qb-nav-quick-meta">
        <span className="tabular-nums">{totalQuestions} questions</span>
        <span className="qb-nav-meta-dot">·</span>
        <span className="qb-nav-meta-starred tabular-nums">
          <Star size={12} className="qb-nav-meta-star-icon" fill="currentColor" />
          <span>{starredCount} starred</span>
        </span>
      </div>

      {/* PolicyPulse Profile Trigger & Popover Anchor */}
      <div className="qb-profile-popover-anchor" ref={popoverRef}>
        {renderProfilePopover(isOverlay)}

        <button
          type="button"
          className={`qb-profile-trigger-tile${profileMenuOpen ? " is-active" : ""}`}
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          aria-expanded={profileMenuOpen}
          aria-haspopup="dialog"
          title={profile?.email || profile?.fullName || "Reviewer profile and workspace quick menu"}
        >
          <div className="qb-profile-trigger-avatar-wrap">
            <div className={`qb-profile-trigger-avatar shape-${profile?.avatarShape || "badge"}`}>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName || "User profile"} className="qb-avatar-img" />
              ) : profile?.fullName ? (
                profile.fullName.slice(0, 2).toUpperCase()
              ) : (
                <UserCircle2 size={20} />
              )}
            </div>
            <span className={`qb-profile-online-dot${isAuthenticated ? " online" : " guest"}`} />
          </div>

          <div className="qb-profile-trigger-meta">
            <span className="qb-profile-trigger-name">
              {profile?.fullName || (isAuthenticated ? "Reviewer" : "Practice as Guest")}
            </span>
            <span className="qb-profile-trigger-email">
              {profile?.email || (isAuthenticated ? "Online Account" : "Offline mode")}
            </span>
          </div>

          <ChevronsUpDown size={14} className="qb-profile-trigger-icon" />
        </button>
      </div>
    </div>
  );

  // Overlay variant (Mobile & Tablet Drawer)
  if (variant === "overlay") {
    if (!open) return null;

    return (
      <div className="qb-mnav-ov" onClick={onClose}>
        <aside
          ref={cardRef}
          className="qb-side-drawer qb-modern-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          onClick={(e) => e.stopPropagation()}
        >
          {renderBrandHeader()}
          <div className="qb-modern-drawer-scroll">
            {renderWorkspaceNav(true)}
          </div>
          {renderFooterSection(true)}
        </aside>
      </div>
    );
  }

  // Desktop Sidebar (Smooth animated transition between collapsed rail and expanded panel)
  return (
    <aside
      className={`qb-side ${open ? "qb-side-expanded" : "qb-side-collapsed"}`}
      aria-label={open ? "Sidebar navigation expanded" : "Sidebar navigation collapsed"}
    >
      <div className="qb-side-inner qb-modern-sidebar-inner">
        {open ? (
          <div className="qb-side-expanded-content">
            <div className="qb-modern-sidebar-scroll">
              {renderWorkspaceNav(false)}
            </div>
            {renderFooterSection(false)}
          </div>
        ) : (
          <div className="qb-side-collapsed-content">
            <div className="qb-rail-wrap">
              <RailNavList
                navItems={navItems}
                active={active}
                handlers={handlers}
                newDotIds={newDotIds}
              />

              <div className="qb-rail-bottom">
                <span className={`qb-popover-role-pill ${rolePillClass} qb-rail-role-pill`}>
                  {rolePillLabel}
                </span>
                <button
                  ref={railBtnRef}
                  type="button"
                  className={`qb-rail-profile-btn${profileMenuOpen ? " is-active" : ""}`}
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  title={profile?.fullName || (isAuthenticated ? "Reviewer profile" : "Guest profile")}
                  aria-label="Profile menu"
                  aria-expanded={profileMenuOpen}
                >
                  <div className="qb-profile-trigger-avatar-wrap">
                    <div className={`qb-profile-trigger-avatar small shape-${profile?.avatarShape || "badge"}`}>
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" className="qb-avatar-img" />
                      ) : profile?.fullName ? (
                        profile.fullName.slice(0, 2).toUpperCase()
                      ) : (
                        <UserCircle2 size={18} />
                      )}
                    </div>
                    <span className={`qb-profile-online-dot${isAuthenticated ? " online" : " guest"}`} />
                  </div>
                </button>

                {profileMenuOpen && railCoords && createPortal(
                  <div
                    ref={railPopoverRef}
                    className={`qb-rail-portal-popover-wrap${!isDark ? " light" : ""}`}
                    style={{
                      position: "fixed",
                      top: `${railCoords.top}px`,
                      left: `${railCoords.left}px`,
                      width: "295px",
                      zIndex: 999999,
                    }}
                  >
                    {renderProfilePopover(false)}
                  </div>,
                  document.body
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    className="qb-rail-tool-btn"
                    onClick={() => onOpenSettings("identity")}
                    title="Settings & Preferences"
                    aria-label="Settings"
                  >
                    <Settings size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
