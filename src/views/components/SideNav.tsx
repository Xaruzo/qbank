import { useRef, useState, useLayoutEffect, useEffect } from "react";
import { useOverlayDialogA11y } from "../../controllers/useOverlayDialogA11y";
import {
  Layers,
  Timer,
  NotebookPen,
  Lightbulb,
  Calculator,
  BookOpen,
  Landmark,
  BrainCircuit,
  FileSpreadsheet,
  Star,
  X,
  LogIn,
  LogOut,
  UserCircle2,
  HelpCircle,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
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

const EXAM_SUBJECTS = [
  { id: "numerical" as TopicId, label: "Numerical Ability", short: "NUM", icon: Calculator, color: "#f5a623" },
  { id: "verbal" as TopicId, label: "Verbal Ability", short: "VRB", icon: BookOpen, color: "#22d3ee" },
  { id: "general" as TopicId, label: "General Information", short: "GEN", icon: Landmark, color: "#a78bfa" },
  { id: "analytical" as TopicId, label: "Analytical Ability", short: "ANA", icon: BrainCircuit, color: "#34d399" },
  { id: "clerical" as TopicId, label: "Clerical Operations", short: "CLE", icon: FileSpreadsheet, color: "#f43f5e" },
];

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

interface SubjectsNavListProps {
  subjects: typeof EXAM_SUBJECTS;
  active: string;
  activeTopic: TopicId | "all";
  topicCounts: Record<string, number>;
  onTopicClick: (topicId: TopicId) => void;
}

function SubjectsNavList({
  subjects,
  active,
  activeTopic,
  topicCounts,
  onTopicClick,
}: SubjectsNavListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 0,
    ready: false,
  });

  const isCurrentSection = active === "home" && activeTopic !== "all";

  const updateGlider = () => {
    if (!isCurrentSection) {
      setGlider((prev) => ({ ...prev, ready: false }));
      return;
    }
    const activeEl = itemRefs.current[activeTopic];
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
  }, [active, activeTopic, isCurrentSection]);

  useEffect(() => {
    window.addEventListener("resize", updateGlider);
    return () => window.removeEventListener("resize", updateGlider);
  }, [active, activeTopic, isCurrentSection]);

  return (
    <div ref={containerRef} className="qb-nav-subjects-list" role="list">
      {glider.ready && (
        <div
          className="qb-nav-subject-glider"
          style={{
            transform: `translateY(${glider.top}px)`,
            height: `${glider.height}px`,
          }}
          aria-hidden="true"
        >
          <span className="qb-nav-subject-glider-bar" />
          <span className="qb-nav-subject-glider-pill" />
        </div>
      )}
      {subjects.map((sub, idx) => {
        const isCurrentTopic = active === "home" && activeTopic === sub.id;
        const count = topicCounts[sub.id] ?? 0;
        const SubIcon = sub.icon;

        return (
          <button
            key={sub.id}
            ref={(el) => {
              itemRefs.current[sub.id] = el;
            }}
            type="button"
            style={{ "--nav-idx": idx + 4 } as React.CSSProperties}
            className={`qb-nav-subject-btn${isCurrentTopic ? " is-active" : ""}`}
            onClick={() => onTopicClick(sub.id)}
            title={`Filter by ${sub.label} (${count} questions)`}
          >
            <div className="qb-nav-subject-left">
              <SubIcon size={15} style={{ color: sub.color }} className="qb-nav-subject-icon" />
              <span className="qb-nav-subject-name">{sub.label}</span>
            </div>
            <span className="qb-nav-subject-count tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
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
}: SideNavProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useOverlayDialogA11y(variant === "overlay" && open, onClose, cardRef);

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

  const handleTopicClick = (topicId: TopicId | "all") => {
    if (onSelectTopic) onSelectTopic(topicId);
    if (handlers.home) handlers.home();
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
      ) : (
        onToggleNav && (
          <button
            type="button"
            className="qb-nav-close-btn"
            onClick={onToggleNav}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )
      )}
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

  // Reusable Exam Subjects Quick Jump with animated focus glider
  const renderSubjectsNav = () => (
    <div className="qb-nav-group qb-nav-subjects-group">
      <div className="qb-nav-group-header">
        <span className="qb-nav-group-title">EXAM SUBJECTS</span>
      </div>
      <SubjectsNavList
        subjects={EXAM_SUBJECTS}
        active={active}
        activeTopic={activeTopic}
        topicCounts={topicCounts}
        onTopicClick={handleTopicClick}
      />
    </div>
  );

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

      {/* User Card */}
      <div className="qb-nav-user-row">
        {isAuthenticated ? (
          <div className="qb-nav-user-info">
            <div className="qb-nav-user-avatar">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName || "User profile"}
                  className="qb-avatar-img"
                />
              ) : profile?.fullName ? (
                profile.fullName.slice(0, 2).toUpperCase()
              ) : (
                <UserCircle2 size={20} />
              )}
            </div>
            <div className="qb-nav-user-details">
              <span className="qb-nav-user-name">{profile?.fullName || "Reviewer"}</span>
              <span className="qb-nav-user-email">{profile?.email || "Signed In"}</span>
            </div>
            {onSignOut && (
              <button
                type="button"
                className="qb-nav-icon-action-btn"
                onClick={() => {
                  if (isOverlay && onClose) onClose();
                  onSignOut();
                }}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        ) : (
          <div className="qb-nav-guest-row">
            <div className="qb-nav-guest-meta">
              <span className="qb-nav-guest-title">Practice as Guest</span>
              <span className="qb-nav-guest-sub">Sync progress to cloud</span>
            </div>
            {onSignIn && (
              <button
                type="button"
                className="qb-nav-signin-pill"
                onClick={() => {
                  if (isOverlay && onClose) onClose();
                  onSignIn();
                }}
                title="Sign In to QBANK"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Utility Actions Strip */}
      <div className="qb-nav-utility-row">
        {onOpenHelp && (
          <button
            type="button"
            className="qb-nav-utility-btn"
            onClick={() => {
              if (isOverlay && onClose) onClose();
              onOpenHelp();
            }}
            title="Reviewer shortcuts & CSC exam guide"
            aria-label="Help and shortcuts"
          >
            <HelpCircle size={14} />
            <span>Help</span>
          </button>
        )}
        {onOpenSettings && (
          <button
            type="button"
            className="qb-nav-utility-btn"
            onClick={() => {
              if (isOverlay && onClose) onClose();
              onOpenSettings();
            }}
            title="App Settings, Optimizer & Preferences"
            aria-label="Settings and Preferences"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        )}
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
            {renderSubjectsNav()}
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
              {renderSubjectsNav()}
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

              <div className="qb-rail-divider" />

              <div className="qb-rail-topics">
                {EXAM_SUBJECTS.map((sub) => {
                  const isCurrentTopic = active === "home" && activeTopic === sub.id;
                  const count = topicCounts[sub.id] ?? 0;
                  const SubIcon = sub.icon;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      className={`qb-rail-topic-btn${isCurrentTopic ? " is-active" : ""}`}
                      onClick={() => handleTopicClick(sub.id)}
                      title={`${sub.label} (${count} Qs)`}
                      aria-label={sub.label}
                    >
                      <SubIcon size={15} style={{ color: sub.color }} />
                    </button>
                  );
                })}
              </div>

              <div className="qb-rail-bottom">
                {onOpenHelp && (
                  <button
                    type="button"
                    className="qb-rail-tool-btn"
                    onClick={onOpenHelp}
                    title="Help & Shortcuts"
                    aria-label="Help"
                  >
                    <HelpCircle size={15} />
                  </button>
                )}
                {onOpenSettings && (
                  <button
                    type="button"
                    className="qb-rail-tool-btn"
                    onClick={onOpenSettings}
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
