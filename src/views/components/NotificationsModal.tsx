import { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Timer,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Inbox,
  CheckCircle2,
  HardDriveDownload,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  category: "exam" | "study" | "system" | "feature";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionType?: "mock" | "notes" | "tips" | "questions" | "info";
}

const STORAGE_KEY = "cse-qbank-notifications-v1";

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-csc-exam-alert",
    category: "exam",
    title: "Civil Service Exam Schedule Alert",
    message: "CSC Career Service Examination (Professional & Subprofessional) applications are active. Practice with timed 170-item simulations to build speed and accuracy.",
    timestamp: "10m ago",
    read: false,
    actionLabel: "Start Mock Exam",
    actionType: "mock",
  },
  {
    id: "notif-study-notes-update",
    category: "study",
    title: "High-Yield Reviewer Notes Updated",
    message: "New quick-reference summaries for RA 6713 (Code of Conduct) and Standard Alphabetical Filing Rules have been updated in your Study Notes scratchpad.",
    timestamp: "1h ago",
    read: false,
    actionLabel: "Open Study Notes",
    actionType: "notes",
  },
  {
    id: "notif-tips-visual-solutions",
    category: "study",
    title: "Interactive Whiteboard & Methods Ready",
    message: "Master work problems, age algebra, and ratio grids by drawing visual diagrams directly on any question solution card.",
    timestamp: "4h ago",
    read: false,
    actionLabel: "Explore Tips & Methods",
    actionType: "tips",
  },
  {
    id: "notif-offline-ready",
    category: "system",
    title: "Offline Reviewer Storage Active",
    message: "All questions, notes, and previous mock exam attempts are cached securely in local storage so you can review without an active internet connection.",
    timestamp: "1d ago",
    read: true,
    actionLabel: "View Question Bank",
    actionType: "questions",
  },
  {
    id: "notif-passing-standard",
    category: "exam",
    title: "80.00% General Passing Rating",
    message: "Passing the Civil Service Exam requires at least 80.00% rating with no subject score lower than the minimum cutoff. Review your weakest subjects daily.",
    timestamp: "2d ago",
    read: true,
    actionLabel: "Check Subject Focus",
    actionType: "questions",
  },
];

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMockExam?: () => void;
  onNavigateToTips?: () => void;
  onNavigateToNotes?: () => void;
  onNavigateToQuestions?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  onNavigateToMockExam,
  onNavigateToTips,
  onNavigateToNotes,
  onNavigateToQuestions,
  onUnreadCountChange,
}: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_NOTIFICATIONS;
  });

  const [activeTab, setActiveTab] = useState<"all" | "unread" | "exam" | "study">("all");
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync unread count to parent
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (_) {}
  }, [notifications, onUnreadCountChange]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
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

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const handleActionClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    onClose();

    switch (notif.actionType) {
      case "mock":
        if (onNavigateToMockExam) onNavigateToMockExam();
        break;
      case "notes":
        if (onNavigateToNotes) onNavigateToNotes();
        break;
      case "tips":
        if (onNavigateToTips) onNavigateToTips();
        break;
      case "questions":
        if (onNavigateToQuestions) onNavigateToQuestions();
        break;
      default:
        break;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "exam") return n.category === "exam";
    if (activeTab === "study") return n.category === "study";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderCategoryIcon = (category: NotificationItem["category"]) => {
    switch (category) {
      case "exam":
        return <Timer size={16} className="qb-notif-icon-exam" />;
      case "study":
        return <BookOpen size={16} className="qb-notif-icon-study" />;
      case "system":
        return <HardDriveDownload size={16} className="qb-notif-icon-system" />;
      case "feature":
        return <Sparkles size={16} className="qb-notif-icon-feature" />;
      default:
        return <ShieldCheck size={16} className="qb-notif-icon-default" />;
    }
  };

  return (
    <div className="qb-notifications-dropdown" ref={modalRef} role="dialog" aria-label="Notifications Panel">
      {/* Header */}
      <div className="qb-notif-header">
        <div className="qb-notif-title-row">
          <div className="qb-notif-title-group">
            <div className="qb-notif-title-icon-wrap">
              <Bell size={16} />
            </div>
            <h3 className="qb-notif-title">Notifications</h3>
            {unreadCount > 0 && (
              <span className="qb-notif-badge-pill">{unreadCount} New</span>
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
                title="Clear all notifications"
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
        <div className="qb-notif-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            className={`qb-notif-tab${activeTab === "all" ? " is-active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "unread"}
            className={`qb-notif-tab${activeTab === "unread" ? " is-active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "exam"}
            className={`qb-notif-tab${activeTab === "exam" ? " is-active" : ""}`}
            onClick={() => setActiveTab("exam")}
          >
            Exams
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "study"}
            className={`qb-notif-tab${activeTab === "study" ? " is-active" : ""}`}
            onClick={() => setActiveTab("study")}
          >
            Study Notes
          </button>
        </div>
      </div>

      {/* Notification Items List */}
      <div className="qb-notif-list">
        {filteredNotifications.length === 0 ? (
          <div className="qb-notif-empty">
            <div className="qb-notif-empty-icon">
              <Inbox size={32} />
            </div>
            <p className="qb-notif-empty-title">All caught up!</p>
            <p className="qb-notif-empty-desc">
              {activeTab === "unread"
                ? "You have no unread notifications."
                : "No notifications found in this category."}
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
                {renderCategoryIcon(notif.category)}
              </div>
              <div className="qb-notif-item-body">
                <div className="qb-notif-item-top">
                  <span className="qb-notif-item-title">{notif.title}</span>
                  <div className="qb-notif-item-meta">
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
              {!notif.read && <span className="qb-notif-unread-dot" aria-hidden="true" />}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="qb-notif-footer">
        <span className="qb-notif-footer-tag">
          <CheckCircle2 size={12} />
          Civil Service Reviewer Alert Center
        </span>
        <button
          type="button"
          className="qb-notif-footer-btn"
          onClick={() => {
            setNotifications(DEFAULT_NOTIFICATIONS);
          }}
          title="Reset to default updates"
        >
          Reset updates
        </button>
      </div>
    </div>
  );
}
