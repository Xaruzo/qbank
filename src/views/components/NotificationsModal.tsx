import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Timer,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Inbox,
  CheckCircle2,
  WifiOff,
  Calendar,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  category: "exam" | "study" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionType?: "mock" | "notes" | "tips" | "questions" | "missed" | "storage";
}

interface NotificationPersistedState {
  readIds: string[];
  dismissedIds: string[];
}

const NOTIF_STATE_KEY = "cse-qbank-notif-state-v1";

const readPersistedState = (): NotificationPersistedState => {
  try {
    const raw = localStorage.getItem(NOTIF_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
        dismissedIds: Array.isArray(parsed?.dismissedIds) ? parsed.dismissedIds : [],
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return { readIds: [], dismissedIds: [] };
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMockExam?: () => void;
  onNavigateToTips?: () => void;
  onNavigateToNotes?: () => void;
  onNavigateToQuestions?: () => void;
  onFilterMissed?: () => void;
  onOpenSettings?: (tab?: string) => void;
  onUnreadCountChange?: (count: number) => void;
  missedCount?: number;
  unseenCount?: number;
  todayAnsweredCount?: number;
  dailyStudyGoal?: number;
  daysUntilExam?: number | null;
  hasResumableMock?: boolean;
  isOnline?: boolean;
  pendingSyncCount?: number;
  isAuthenticated?: boolean;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  onNavigateToMockExam,
  onNavigateToTips,
  onNavigateToNotes,
  onNavigateToQuestions,
  onFilterMissed,
  onOpenSettings,
  onUnreadCountChange,
  missedCount = 0,
  unseenCount = 0,
  todayAnsweredCount = 0,
  dailyStudyGoal = 25,
  daysUntilExam = null,
  hasResumableMock = false,
  isOnline = true,
  pendingSyncCount = 0,
  isAuthenticated = false,
}: NotificationsModalProps) {
  const [notifState, setNotifState] = useState<NotificationPersistedState>(() => readPersistedState());
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "exam" | "study" | "system">("all");
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [portalCoords, setPortalCoords] = useState<{
    top: number;
    left: number;
    width: number;
    arrowLeft: number;
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const computePortalCoords = useCallback(() => {
    if (typeof window === "undefined") return;
    const anchor =
      document.querySelector(".qb-hdr-notif-btn") ||
      document.querySelector(".qb-hdr-notif-wrap");
    const anchorRect = anchor?.getBoundingClientRect();
    const vw = window.innerWidth;
    const top = Math.max(58, Math.round((anchorRect?.bottom ?? 48) + 11));
    const width = vw <= 640 ? Math.max(260, vw - 24) : Math.min(430, vw - 24);

    let left = 12;
    if (vw > 640) {
      const targetRight = anchorRect ? anchorRect.right + 14 : vw - 16;
      left = Math.max(12, Math.min(targetRight - width, vw - width - 12));
    }

    const anchorCenterX = anchorRect
      ? anchorRect.left + anchorRect.width / 2
      : left + width - 32;
    const arrowLeft = Math.round(
      Math.max(24, Math.min(width - 24, anchorCenterX - left))
    );

    setPortalCoords({ top, left, width, arrowLeft });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePortalCoords();
    window.addEventListener("resize", computePortalCoords);
    return () => window.removeEventListener("resize", computePortalCoords);
  }, [isOpen, computePortalCoords]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_STATE_KEY, JSON.stringify(notifState));
    } catch {
      // Ignore storage write errors
    }
  }, [notifState]);

  const rawNotifications = useMemo<Omit<NotificationItem, "read">[]>(() => {
    const items: Omit<NotificationItem, "read">[] = [];

    if (!isOnline || pendingSyncCount > 0) {
      items.push({
        id: `notif-sync-${!isOnline ? "offline" : "queued"}`,
        category: "system",
        title: !isOnline ? "Offline Mode Active" : `${pendingSyncCount} Sync Change${pendingSyncCount === 1 ? "" : "s"} Pending`,
        message: !isOnline
          ? `Your browser is offline${pendingSyncCount > 0 ? ` with ${pendingSyncCount} queued update(s)` : ""}. Changes stay saved locally and will sync once reconnected.`
          : `${pendingSyncCount} local update${pendingSyncCount === 1 ? " is" : "s are"} queued for synchronization.`,
        timestamp: "Live",
        actionLabel: "Open Sync & Storage",
        actionType: "storage",
      });
    }

    if (hasResumableMock) {
      items.push({
        id: "notif-resumable-mock",
        category: "exam",
        title: "Unfinished Mock Exam Paused",
        message: "You have an active mock exam session waiting. Resume where you left off to record your final score.",
        timestamp: "In progress",
        actionLabel: "Resume Exam",
        actionType: "mock",
      });
    }

    if (missedCount > 0) {
      items.push({
        id: `notif-missed-pool`,
        category: "study",
        title: `${missedCount} Missed Question${missedCount === 1 ? "" : "s"} to Review`,
        message: "Focus your practice on items you previously answered incorrectly until every one turns green.",
        timestamp: "Recommended",
        actionLabel: "Filter Missed Items",
        actionType: "missed",
      });
    }

    const goal = Math.max(1, dailyStudyGoal || 25);
    const goalMet = todayAnsweredCount >= goal;
    items.push({
      id: "notif-daily-goal",
      category: "study",
      title: goalMet
        ? `Daily Goal Reached (${todayAnsweredCount}/${goal})`
        : `Daily Study Goal: ${todayAnsweredCount}/${goal} Today`,
      message: goalMet
        ? "Great consistency! You met today's question target. Keep momentum with a quick practice run."
        : `Answer ${goal - todayAnsweredCount} more question${goal - todayAnsweredCount === 1 ? "" : "s"} today to complete your daily target.`,
      timestamp: "Today",
      actionLabel: "Practice Questions",
      actionType: "questions",
    });

    if (daysUntilExam !== null && daysUntilExam >= 0) {
      items.push({
        id: "notif-exam-countdown",
        category: "exam",
        title: daysUntilExam === 0
          ? "Target Exam Date is Today"
          : `${daysUntilExam} Day${daysUntilExam === 1 ? "" : "s"} Until Target Exam`,
        message: "Keep your pacing sharp with 80%+ accuracy on timed simulations matching CSC guidelines.",
        timestamp: daysUntilExam === 0 ? "Today" : `D-${daysUntilExam}`,
        actionLabel: "Open Mock Center",
        actionType: "mock",
      });
    }

    if (unseenCount > 0) {
      items.push({
        id: "notif-unseen-pool",
        category: "study",
        title: `${unseenCount} Unseen Question${unseenCount === 1 ? "" : "s"} Remaining`,
        message: "Expand coverage across subjects by working through questions you have not attempted yet.",
        timestamp: "Bank",
        actionLabel: "Explore Bank",
        actionType: "questions",
      });
    }

    if (!isAuthenticated) {
      items.push({
        id: "notif-cloud-sync-tip",
        category: "system",
        title: "Local Storage Mode Active",
        message: "Questions and study progress are saved locally on this device. Sign in to sync mock history and favorites.",
        timestamp: "Account",
        actionLabel: "View Settings",
        actionType: "storage",
      });
    }

    return items;
  }, [
    isOnline,
    pendingSyncCount,
    hasResumableMock,
    missedCount,
    todayAnsweredCount,
    dailyStudyGoal,
    daysUntilExam,
    unseenCount,
    isAuthenticated,
  ]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const dismissedSet = new Set(notifState.dismissedIds);
    const readSet = new Set(notifState.readIds);
    return rawNotifications
      .filter((item) => !dismissedSet.has(item.id))
      .map((item) => ({
        ...item,
        read: readSet.has(item.id),
      }));
  }, [rawNotifications, notifState]);

  // Sync unread count to parent badge
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);
  }, [notifications, onUnreadCountChange]);

  // Sync animated tab indicator position
  useEffect(() => {
    if (!isOpen) return;
    const updateIndicator = () => {
      const currentTabEl = tabRefs.current[activeTab];
      if (currentTabEl && tabContainerRef.current) {
        const containerRect = tabContainerRef.current.getBoundingClientRect();
        const tabRect = currentTabEl.getBoundingClientRect();
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        });
      }
    };

    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab, notifications, isOpen]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modalRef.current?.contains(target)) return;

      const notifWrap = document.querySelector(".qb-hdr-notif-wrap");
      if (notifWrap?.contains(target)) return;

      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const markAsRead = (id: string) => {
    setNotifState((prev) =>
      prev.readIds.includes(id) ? prev : { ...prev, readIds: [...prev.readIds, id] }
    );
  };

  const markAllAsRead = () => {
    setNotifState((prev) => ({
      ...prev,
      readIds: Array.from(new Set([...prev.readIds, ...notifications.map((n) => n.id)])),
    }));
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifState((prev) =>
      prev.dismissedIds.includes(id) ? prev : { ...prev, dismissedIds: [...prev.dismissedIds, id] }
    );
  };

  const clearAllNotifications = () => {
    setNotifState((prev) => ({
      ...prev,
      dismissedIds: Array.from(new Set([...prev.dismissedIds, ...notifications.map((n) => n.id)])),
    }));
  };

  const restoreAllNotifications = () => {
    setNotifState({ readIds: [], dismissedIds: [] });
  };

  const handleActionClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    onClose();

    switch (notif.actionType) {
      case "mock":
        onNavigateToMockExam?.();
        break;
      case "notes":
        onNavigateToNotes?.();
        break;
      case "tips":
        onNavigateToTips?.();
        break;
      case "missed":
        onFilterMissed?.();
        break;
      case "storage":
        onOpenSettings?.("storage");
        break;
      case "questions":
      default:
        onNavigateToQuestions?.();
        break;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "exam") return n.category === "exam";
    if (activeTab === "study") return n.category === "study";
    if (activeTab === "system") return n.category === "system";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderCategoryIcon = (notif: NotificationItem) => {
    if (notif.id.startsWith("notif-sync")) return <WifiOff size={16} className="qb-notif-icon-system" />;
    if (notif.id === "notif-exam-countdown") return <Calendar size={16} className="qb-notif-icon-exam" />;
    switch (notif.category) {
      case "exam":
        return <Timer size={16} className="qb-notif-icon-exam" />;
      case "study":
        return <BookOpen size={16} className="qb-notif-icon-study" />;
      case "system":
        return <ShieldCheck size={16} className="qb-notif-icon-system" />;
      default:
        return <ShieldCheck size={16} className="qb-notif-icon-default" />;
    }
  };

  const portalTarget =
    typeof document !== "undefined"
      ? document.querySelector(".qb") || document.body
      : null;

  const panelNode = (
    <div
      className="qb-notifications-dropdown"
      ref={modalRef}
      role="dialog"
      aria-label="Notifications Panel"
      style={
        portalCoords
          ? {
              position: "fixed",
              top: `${portalCoords.top}px`,
              left: `${portalCoords.left}px`,
              right: "auto",
              width: `${portalCoords.width}px`,
              maxWidth: "calc(100vw - 24px)",
              transformOrigin: `${portalCoords.arrowLeft}px top`,
            }
          : undefined
      }
    >
      <span
        className="qb-notif-arrow"
        aria-hidden="true"
        style={portalCoords ? { left: `${portalCoords.arrowLeft}px` } : undefined}
      />
      <div className="qb-notifications-surface">
      {/* Header */}
      <div className="qb-notif-header">
        <div className="qb-notif-title-row">
          <div className="qb-notif-title-group">
            <div className="qb-notif-title-icon-wrap">
              <Bell size={16} />
            </div>
            <h3 className="qb-notif-title">Notifications</h3>
            {unreadCount > 0 && (
              <span className="qb-notif-badge-pill tabular-nums">{unreadCount} New</span>
            )}
          </div>
          <div className="qb-notif-head-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="qb-notif-head-btn"
                onClick={markAllAsRead}
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="qb-notif-head-btn qb-notif-head-btn-danger"
                onClick={clearAllNotifications}
                title="Dismiss visible notifications"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              type="button"
              className="qb-notif-close-btn"
              onClick={onClose}
              title="Close notifications"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="qb-notif-tabs" ref={tabContainerRef} role="tablist">
          {indicatorStyle.width > 0 && (
            <span
              className="qb-notif-tab-indicator"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
              }}
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            role="tab"
            ref={(el) => { tabRefs.current["all"] = el; }}
            aria-selected={activeTab === "all"}
            className={`qb-notif-tab${activeTab === "all" ? " is-active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            role="tab"
            ref={(el) => { tabRefs.current["unread"] = el; }}
            aria-selected={activeTab === "unread"}
            className={`qb-notif-tab${activeTab === "unread" ? " is-active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            role="tab"
            ref={(el) => { tabRefs.current["exam"] = el; }}
            aria-selected={activeTab === "exam"}
            className={`qb-notif-tab${activeTab === "exam" ? " is-active" : ""}`}
            onClick={() => setActiveTab("exam")}
          >
            Exams
          </button>
          <button
            type="button"
            role="tab"
            ref={(el) => { tabRefs.current["study"] = el; }}
            aria-selected={activeTab === "study"}
            className={`qb-notif-tab${activeTab === "study" ? " is-active" : ""}`}
            onClick={() => setActiveTab("study")}
          >
            Study
          </button>
          <button
            type="button"
            role="tab"
            ref={(el) => { tabRefs.current["system"] = el; }}
            aria-selected={activeTab === "system"}
            className={`qb-notif-tab${activeTab === "system" ? " is-active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            Sync
          </button>
        </div>
      </div>

      {/* Notification Items List */}
      <div className="qb-notif-list" key={activeTab}>
        {filteredNotifications.length === 0 ? (
          <div className="qb-notif-empty">
            <div className="qb-notif-empty-icon">
              <Inbox size={32} />
            </div>
            <p className="qb-notif-empty-title">All caught up!</p>
            <p className="qb-notif-empty-desc">
              {activeTab === "unread"
                ? "You have no unread alerts."
                : "No alerts right now in this category."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`qb-notif-item${notif.read ? " is-read" : " is-unread"}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="qb-notif-item-icon-box">
                {renderCategoryIcon(notif)}
              </div>
              <div className="qb-notif-item-body">
                <div className="qb-notif-item-top">
                  <span className="qb-notif-item-title">{notif.title}</span>
                  <div className="qb-notif-item-meta">
                    {!notif.read && <span className="qb-notif-unread-dot" aria-label="Unread notification" />}
                    <span className="qb-notif-item-time">{notif.timestamp}</span>
                    <button
                      type="button"
                      className="qb-notif-item-dismiss"
                      onClick={(e) => removeNotification(notif.id, e)}
                      title="Dismiss notification"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <p className="qb-notif-item-msg">{notif.message}</p>
                {notif.actionLabel && (
                  <div className="qb-notif-item-actions">
                    <button
                      type="button"
                      className="qb-notif-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(notif);
                      }}
                    >
                      <span>{notif.actionLabel}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="qb-notif-footer">
        <span className="qb-notif-footer-tag">
          <CheckCircle2 size={12} />
          Live Study Alerts
        </span>
        <button
          type="button"
          className="qb-notif-footer-btn"
          onClick={restoreAllNotifications}
          title="Restore dismissed alerts"
        >
          Restore alerts
        </button>
      </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(panelNode, portalTarget) : panelNode;
}
