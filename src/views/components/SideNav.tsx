import { useRef, useState, useLayoutEffect, useEffect } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  User,
  Moon,
  Sun,
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
            onClick={isOverlay && onNavigate ? onNavigate(clickHandler) : clickHandler}
            title={title}
          >
            <div className="qb-nav-item-lead">
              <Icon size={17} className="qb-nav-item-icon" />
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
}

function RailNavList({
  navItems,
  active,
  handlers,
}: RailNavListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 0,
    ready: false,
  });

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
      {navItems.map(({ id, shortLabel, icon: Icon, title }) => {
        const isSelected = active === id;
        const clickHandler = handlers[id];

        return (
          <button
            key={id}
            ref={(el) => {
              itemRefs.current[id] = el;
            }}
            type="button"
            className={`qb-rail-btn${isSelected ? " is-active" : ""}`}
            onClick={clickHandler}
            title={title || shortLabel}
            aria-label={shortLabel}
          >
            <Icon size={17} />
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
  isQuestionAdmin = false,
}: SideNavProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  useOverlayDialogA11y(variant === "overlay" && open, onClose, cardRef);

  // Click outside to dismiss PolicyPulse profile tooltip popover
  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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
      badgeText: totalQuestions > 0 ? `${totalQuestions}` : null,
      badgeType: "neutral",
      title: "Question Bank (All practice questions)",
      icon: Layers,
    },
    {
      id: "mock",
      label: "Timed Mock Exam",
      shortLabel: "Mock Exam",
      badgeText: "170 Qs",
      badgeType: "accent",
      title: "Timed Mock Exam (Full CSC Simulation)",
      icon: Timer,
    },
    {
      id: "notes",
      label: "Study Notes",
      shortLabel: "Notes",
      badgeText: "Scratchpad",
      badgeType: "neutral",
      title: "Study Notes & Reviewer Scratchpad",
      icon: NotebookPen,
    },
    {
      id: "tips",
      label: "Tips & Methods",
      shortLabel: "Tips",
      badgeText: "Visual Cues",
      badgeType: "neutral",
      title: "Tips, Whiteboards & Problem Methods",
      icon: Lightbulb,
    },
  ];

  const handleNavigate = (action?: () => void) => () => {
    if (action) action();
    if (onClose) onClose();
  };

  // Reusable Top Brand Row
  const renderBrandHeader = (isOverlay = false) => (
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

      {isOverlay ? (
        <button
          type="button"
          className="qb-nav-close-btn"
          onClick={onClose}
          aria-label="Close menu"
          title="Close navigation"
        >
          <X size={18} />
        </button>
      ) : onToggleNav ? (
        <button
          type="button"
          className="qb-nav-collapse-btn"
          onClick={onToggleNav}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      ) : null}
    </div>
  );

  // Reusable Workspace Navigation with up-and-down gliding focus indicator
  const renderWorkspaceNav = (isOverlay = false) => (
    <div className="qb-nav-group">
      <div className="qb-nav-group-header">
        <span className="qb-nav-group-title">STUDY WORKSPACE</span>
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
        className="qb-profile-popover"
        role="dialog"
        aria-label="Profile and quick preferences"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Card */}
        <div className="qb-profile-popover-user-card">
          <div className="qb-profile-popover-avatar">
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

        {/* APPEARANCE Segmented Toggle (Just like PolicyPulse!) */}
        <div className="qb-profile-popover-section">
          <span className="qb-profile-popover-section-label">APPEARANCE</span>
          <div className="qb-profile-segmented-appearance">
            <button
              type="button"
              className={`qb-seg-theme-btn${isDark ? " is-active" : ""}`}
              onClick={() => {
                if (!isDark && onToggleTheme) onToggleTheme();
              }}
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>
            <button
              type="button"
              className={`qb-seg-theme-btn${!isDark ? " is-active" : ""}`}
              onClick={() => {
                if (isDark && onToggleTheme) onToggleTheme();
              }}
            >
              <Sun size={14} />
              <span>Light</span>
            </button>
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
            <div className="qb-profile-trigger-avatar">
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
          {renderBrandHeader(true)}
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
            {renderBrandHeader(false)}
            <div className="qb-modern-sidebar-scroll">
              {renderWorkspaceNav(false)}
            </div>
            {renderFooterSection(false)}
          </div>
        ) : (
          <div className="qb-side-collapsed-content">
            <div className="qb-rail-wrap">
              {onToggleNav && (
                <button
                  type="button"
                  className="qb-rail-toggle-btn"
                  onClick={onToggleNav}
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen size={18} />
                </button>
              )}

              <div className="qb-rail-divider" />

              <RailNavList
                navItems={navItems}
                active={active}
                handlers={handlers}
              />

              <div className="qb-rail-bottom">
                <button
                  type="button"
                  className={`qb-rail-profile-btn${profileMenuOpen ? " is-active" : ""}`}
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  title={profile?.fullName || (isAuthenticated ? "Reviewer profile" : "Guest profile")}
                  aria-label="Profile menu"
                >
                  <div className="qb-profile-trigger-avatar-wrap">
                    <div className="qb-profile-trigger-avatar small">
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
