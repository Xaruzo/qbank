import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck,
  User,
  Sliders,
  Palette,
  Database,
  ArrowLeft,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Target,
  Sun,
  Moon,
  Clock,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Crown,
  UserPlus,
  Search,
  KeyRound,
  Mail,
  Users,
  Loader2,
} from "lucide-react";
import type { SettingsPageProps, UserRole, UserRoleRecord, SelectOption } from "../../types";
import { useOverlayDialogA11y } from "../../controllers/useOverlayDialogA11y";
import AvatarStudio from "./AvatarStudio";
import CustomSelect from "./CustomSelect";
import ChangePasswordModal from "./ChangePasswordModal";
import { rolesModel } from "../../models/rolesModel";

const ROLE_GRANT_OPTIONS: SelectOption[] = [
  {
    value: "admin",
    label: "Admin (Manage Question Bank)",
    icon: <ShieldCheck size={14} className="text-purple-400" />,
  },
  {
    value: "superadmin",
    label: "Superadmin (Full Control)",
    icon: <Crown size={14} className="text-amber-400" />,
  },
  {
    value: "reviewer",
    label: "Reviewer (Standard Examinee)",
    icon: <User size={14} className="text-slate-400" />,
  },
];

const QUICK_ROLE_OPTIONS: SelectOption[] = [
  {
    value: "reviewer",
    label: "Reviewer",
    icon: <User size={13} className="text-slate-400" />,
  },
  {
    value: "admin",
    label: "Admin",
    icon: <ShieldCheck size={13} className="text-purple-400" />,
  },
  {
    value: "superadmin",
    label: "Superadmin",
    icon: <Crown size={13} className="text-amber-400" />,
  },
];

export default function SettingsPage({
  initialTab = "identity",
  onTabChange,
  settings,
  onUpdateSettings,
  onResetSettings,
  profile,
  onUpdateProfile,
  isDark,
  onToggleTheme,
  isAuthenticated,
  isQuestionAdmin = false,
  isSuperAdmin = false,
  totalQuestions = 0,
  mockAttemptsCount = 0,
  favoritesCount = 0,
  notesCount = 0,
  onBackToMain,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Check whether LITE / Power Saver mode is active
  const isLiteMode = Boolean(
    settings?.liteMode ||
    settings?.performanceTier === "lite" ||
    settings?.animationsEnabled === false
  );

  // Animated sliding glider for settings menu navigation (disabled on LITE/Power Saver)
  const navContainerRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (isLiteMode) {
      setIndicatorStyle(null);
      return;
    }

    const updateIndicator = () => {
      const currentItem = navItemRefs.current[activeTab];
      if (currentItem && navContainerRef.current) {
        const containerRect = navContainerRef.current.getBoundingClientRect();
        const itemRect = currentItem.getBoundingClientRect();
        setIndicatorStyle({
          top: itemRect.top - containerRect.top,
          left: itemRect.left - containerRect.left,
          width: itemRect.width,
          height: itemRect.height,
        });
      }
    };

    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab, isLiteMode, isSuperAdmin, isQuestionAdmin]);

  // Form State
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [email] = useState(profile?.email || (isAuthenticated ? "examinee@gmail.com" : "reviewer@offline.local"));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || null);
  const [avatarShape, setAvatarShape] = useState<"circle" | "badge">(profile?.avatarShape || "circle");
  const [selectedColor, setSelectedColor] = useState<string>(profile?.avatarColor || "amber");
  const [examTarget, setExamTarget] = useState<"professional" | "subprofessional">(
    profile?.examTarget || settings.examTarget || "professional"
  );
  const [examDate, setExamDate] = useState(profile?.targetExamDate || settings.targetExamDate || "2026-08-09");
  const [dailyGoal, setDailyGoal] = useState<number>(profile?.dailyStudyGoal || settings.dailyStudyGoal || 25);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clearCacheConfirm, setClearCacheConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const discardDialogRef = useRef<HTMLDivElement>(null);

  // User Roles Management State
  const [usersList, setUsersList] = useState<UserRoleRecord[]>(() => rolesModel.getAllUsers());
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "superadmin" | "admin" | "reviewer">("all");
  const [newRoleEmail, setNewRoleEmail] = useState("");
  const [newRoleSelect, setNewRoleSelect] = useState<UserRole>("admin");
  const [roleNotice, setRoleNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const refreshUsersList = async () => {
    setIsUsersLoading(true);
    try {
      setUsersList(await rolesModel.loadAllUsers());
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "roles") return;
    let active = true;
    setIsUsersLoading(true);
    rolesModel
      .loadAllUsers()
      .then((list) => {
        if (active) setUsersList(list);
      })
      .finally(() => {
        if (active) setIsUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleAssignRole = async (targetEmail: string, roleToAssign: UserRole, targetName?: string) => {
    setRoleNotice(null);
    const res = await rolesModel.assignRole(
      targetEmail,
      roleToAssign,
      { email: profile?.email, fullName: profile?.fullName },
      targetName
    );
    if (res.success) {
      setRoleNotice({
        type: "success",
        message: `Role successfully updated to '${roleToAssign.toUpperCase()}' for ${targetEmail}.`,
      });
      await refreshUsersList();
      setNewRoleEmail("");
      setTimeout(() => setRoleNotice(null), 4000);
    } else {
      setRoleNotice({ type: "error", message: res.error || "Failed to assign role." });
    }
  };

  const handleRevokeRole = async (targetEmail: string) => {
    setRoleNotice(null);
    const res = await rolesModel.revokeRole(targetEmail);
    if (res.success) {
      setRoleNotice({
        type: "success",
        message: `Permissions revoked for ${targetEmail}. Reverted to standard Reviewer access.`,
      });
      await refreshUsersList();
      setTimeout(() => setRoleNotice(null), 4000);
    } else {
      setRoleNotice({ type: "error", message: res.error || "Failed to revoke role." });
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (roleSearch.trim()) {
      const q = roleSearch.toLowerCase();
      return u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    }
    return true;
  });

  // Real-time hardware capabilities detection for Performance & Animation Optimizer
  const [hwStats, setHwStats] = useState({
    cores: 4,
    ram: 4,
    reducedMotion: false,
    analysis: "Analyzing device hardware...",
  });

  useEffect(() => {
    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const ram =
      typeof navigator !== "undefined" && "deviceMemory" in navigator
        ? (navigator as any).deviceMemory || 4
        : 4;
    const reducedMotion =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    let analysis = "";
    if (cores >= 8 && ram >= 8) {
      analysis = `High-spec workstation detected (${cores} cores, ${ram}GB RAM)`;
    } else if (cores <= 4 || ram <= 4) {
      analysis = `Low-to-mid specs detected (${cores} cores, ${ram}GB RAM)`;
    } else {
      analysis = `Balanced multi-core system detected (${cores} cores, ~${ram}GB RAM)`;
    }

    setHwStats({ cores, ram, reducedMotion, analysis });
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ── Unsaved-changes guard (PolicyPulse flow) ────────────────────────────
  // Snapshot of the last-known "saved" state; compared against the live form
  // each render to decide whether Cancel should prompt for confirmation.
  const buildProfileSnapshot = (p: SettingsPageProps["profile"]) =>
    JSON.stringify({
      fullName: (p?.fullName || "").trim() || "Reviewer",
      avatarUrl: p?.avatarUrl || null,
      avatarShape: p?.avatarShape || "circle",
      avatarColor: p?.avatarColor || "amber",
      examTarget: p?.examTarget || settings.examTarget || "professional",
      examDate: p?.targetExamDate || settings.targetExamDate || "2026-08-09",
      dailyGoal: p?.dailyStudyGoal || settings.dailyStudyGoal || 25,
    });

  const currentProfileSnapshot = JSON.stringify({
    fullName: fullName.trim() || "Reviewer",
    avatarUrl: avatarUrl ?? null,
    avatarShape,
    avatarColor: selectedColor,
    examTarget,
    examDate,
    dailyGoal,
  });

  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState(() =>
    buildProfileSnapshot(profile)
  );

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      if (profile.avatarUrl !== undefined) setAvatarUrl(profile.avatarUrl);
      if (profile.avatarShape) setAvatarShape(profile.avatarShape);
      if (profile.avatarColor) setSelectedColor(profile.avatarColor);
      if (profile.examTarget) setExamTarget(profile.examTarget);
      if (profile.targetExamDate) setExamDate(profile.targetExamDate);
      if (profile.dailyStudyGoal) setDailyGoal(profile.dailyStudyGoal);
      setSavedProfileSnapshot(buildProfileSnapshot(profile));
    }
  }, [profile]);

  const isProfileDirty = savedProfileSnapshot !== currentProfileSnapshot;

  useOverlayDialogA11y(
    showDiscardConfirm,
    () => setShowDiscardConfirm(false),
    discardDialogRef
  );

  const handleRequestExit = () => {
    if (isProfileDirty && !saveSuccess) {
      setShowDiscardConfirm(true);
      return;
    }
    onBackToMain();
  };

  const calculateDaysRemaining = (targetDateStr: string) => {
    try {
      const target = new Date(targetDateStr).getTime();
      const now = new Date().getTime();
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      return isNaN(diff) ? null : diff;
    } catch {
      return null;
    }
  };

  const daysRemaining = calculateDaysRemaining(examDate);

  // Avatar Studio drafts (PolicyPulse flow): stage locally, persist on Save
  const handleStageAvatar = (url: string | null, shape: "circle" | "badge") => {
    setAvatarUrl(url);
    setAvatarShape(shape);
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      onUpdateSettings({
        examTarget,
        targetExamDate: examDate,
        dailyStudyGoal: dailyGoal,
      });

      if (onUpdateProfile) {
        await onUpdateProfile({
          fullName: fullName.trim() || "Reviewer",
          avatarUrl,
          avatarShape,
          avatarColor: selectedColor,
          examTarget,
          targetExamDate: examDate,
          dailyStudyGoal: dailyGoal,
        });
      }

      setSaveSuccess(true);
      setSavedProfileSnapshot(currentProfileSnapshot);
      setTimeout(() => setSaveSuccess(false), 2800);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: {
          fullName,
          email,
          examTarget,
          targetExamDate: examDate,
          dailyStudyGoal: dailyGoal,
        },
        settings,
        stats: {
          totalQuestions,
          mockAttemptsCount,
          favoritesCount,
          notesCount,
        },
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `cse-qbank-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className={`qb-settings-page-root${isDark ? "" : " light"}`}>
      {/* ── Top Header Navigation Bar ── */}
      <header className="qb-settings-page-header">
        <div className="qb-settings-page-header-lead">
          <button
            type="button"
            className="qb-settings-page-back-btn"
            onClick={handleRequestExit}
            title="Return to Question Bank"
          >
            <ArrowLeft size={16} />
            <span>Back to Question Bank</span>
          </button>

          <div className="qb-settings-page-header-titles">
            <div className="qb-settings-page-badge-row">
              <span className="qb-settings-page-kicker">CONFIGURATION & OPTIMIZER</span>
              {isQuestionAdmin && (
                <span className="qb-settings-admin-badge">ADMIN ACCESS</span>
              )}
            </div>
            <h1 className="qb-settings-page-main-title">Settings & Preferences</h1>
            <p className="qb-settings-page-subtitle">
              Manage your reviewer profile, exam level persona, visual themes, and offline data cache.
            </p>
          </div>
        </div>

        <div className="qb-settings-page-header-meta">
          <div className="qb-settings-sync-indicator">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>{isAuthenticated ? "Cloud Sync Active" : "Local Storage Mode"}</span>
          </div>
        </div>
      </header>

      {/* ── Settings Layout: Left Nav + Right Pane ── */}
      <div className="qb-settings-page-layout">
        {/* Left Vertical Menu */}
        {/* Left Vertical Menu */}
        <nav
          className="qb-settings-page-nav"
          ref={navContainerRef}
          aria-label="Settings categories"
        >
          <div className="qb-settings-page-nav-header">
            <span>SETTINGS MENU</span>
          </div>

          {/* Animated sliding glider indicator (disabled on LITE / Power Saver mode) */}
          {indicatorStyle && !isLiteMode && (
            <div
              className="qb-settings-nav-indicator"
              style={{
                top: `${indicatorStyle.top}px`,
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                height: `${indicatorStyle.height}px`,
              }}
              aria-hidden="true"
            />
          )}

          <button
            ref={(el) => {
              navItemRefs.current["identity"] = el;
            }}
            type="button"
            className={`qb-settings-nav-item${activeTab === "identity" ? " active" : ""}${
              indicatorStyle && !isLiteMode ? " has-indicator" : ""
            }`}
            onClick={() => handleSelectTab("identity")}
          >
            <div className="qb-settings-nav-item-icon">
              <User size={18} />
            </div>
            <div className="qb-settings-nav-item-text">
              <span className="qb-settings-nav-item-title">Identity & Profile</span>
              <span className="qb-settings-nav-item-sub">Avatar, name & credentials</span>
            </div>
          </button>

          <button
            ref={(el) => {
              navItemRefs.current["persona"] = el;
            }}
            type="button"
            className={`qb-settings-nav-item${activeTab === "persona" ? " active" : ""}${
              indicatorStyle && !isLiteMode ? " has-indicator" : ""
            }`}
            onClick={() => handleSelectTab("persona")}
          >
            <div className="qb-settings-nav-item-icon">
              <Sliders size={18} />
            </div>
            <div className="qb-settings-nav-item-text">
              <span className="qb-settings-nav-item-title">Exam Persona & Targets</span>
              <span className="qb-settings-nav-item-sub">CSC level, goals & audio chimes</span>
            </div>
          </button>

          <button
            ref={(el) => {
              navItemRefs.current["appearance"] = el;
            }}
            type="button"
            className={`qb-settings-nav-item${activeTab === "appearance" ? " active" : ""}${
              indicatorStyle && !isLiteMode ? " has-indicator" : ""
            }`}
            onClick={() => handleSelectTab("appearance")}
          >
            <div className="qb-settings-nav-item-icon">
              <Palette size={18} />
            </div>
            <div className="qb-settings-nav-item-text">
              <span className="qb-settings-nav-item-title">Theme & Visuals</span>
              <span className="qb-settings-nav-item-sub">Dark/Light mode & animations</span>
            </div>
          </button>

          <button
            ref={(el) => {
              navItemRefs.current["storage"] = el;
            }}
            type="button"
            className={`qb-settings-nav-item${activeTab === "storage" ? " active" : ""}${
              indicatorStyle && !isLiteMode ? " has-indicator" : ""
            }`}
            onClick={() => handleSelectTab("storage")}
          >
            <div className="qb-settings-nav-item-icon">
              <Database size={18} />
            </div>
            <div className="qb-settings-nav-item-text">
              <span className="qb-settings-nav-item-title">Security & Storage</span>
              <span className="qb-settings-nav-item-sub">Offline cache & data export</span>
            </div>
          </button>

          {(isSuperAdmin || isQuestionAdmin) && (
            <button
              ref={(el) => {
                navItemRefs.current["roles"] = el;
              }}
              type="button"
              className={`qb-settings-nav-item${activeTab === "roles" ? " active" : ""}${
                indicatorStyle && !isLiteMode ? " has-indicator" : ""
              }`}
              onClick={() => handleSelectTab("roles")}
            >
              <div className="qb-settings-nav-item-icon">
                <Crown size={18} className="text-amber-400" />
              </div>
              <div className="qb-settings-nav-item-text">
                <span className="qb-settings-nav-item-title">Roles & Access Control</span>
                <span className="qb-settings-nav-item-sub">Superadmin user permissions</span>
              </div>
            </button>
          )}
        </nav>

        {/* Right Active Content Panel */}
        <main className="qb-settings-page-content">
          {/* TAB 1: IDENTITY & PROFILE */}
          {activeTab === "identity" && (
            <div className="qb-settings-panel-section">
              <div className="qb-settings-section-head">
                <h2 className="qb-settings-section-title">Identity & Reviewer Profile</h2>
                <p className="qb-settings-section-desc">
                  Customize how your profile appears across question solutions, mock exam reports, and bookmarks.
                </p>
              </div>

              {/* Avatar Studio (Modeled after PolicyPulse EditProfileModal) */}
              <AvatarStudio
                fullName={fullName}
                email={email}
                roleLabel={isQuestionAdmin ? "ADMIN" : isAuthenticated ? "EXAMINEE" : "REVIEWER"}
                avatarUrl={avatarUrl}
                avatarShape={avatarShape}
                savedAvatarUrl={profile?.avatarUrl || null}
                savedAvatarShape={profile?.avatarShape || "circle"}
                onStageAvatar={handleStageAvatar}
              />

              {/* Section 1: Reviewer Account Information */}
              <div className="qb-settings-panel-card">
                <div className="qb-settings-panel-card-head">
                  <div className="qb-settings-panel-card-title">
                    <User size={16} className="text-amber-400" />
                    <span>Account Details</span>
                  </div>
                  <span className="qb-settings-field-hint">Public reviewer identity</span>
                </div>

                <div className="qb-settings-account-grid">
                  <div className="qb-settings-field">
                    <label htmlFor="settings-fullname" className="qb-settings-label">
                      Display Name
                    </label>
                    <div className="qb-settings-input-wrap">
                      <User size={16} className="qb-settings-input-icon" />
                      <input
                        id="settings-fullname"
                        type="text"
                        className="qb-settings-text-input"
                        placeholder="Enter your name or examinee pseudonym"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        maxLength={40}
                        required
                      />
                    </div>
                    <span className="qb-settings-field-hint">
                      Shown across study notes, mock exam results, and practice history.
                    </span>
                  </div>

                  <div className="qb-settings-field">
                    <label htmlFor="settings-email" className="qb-settings-label">
                      Account Email
                    </label>
                    <div className="qb-settings-input-wrap readonly">
                      <Mail size={16} className="qb-settings-input-icon" />
                      <input
                        id="settings-email"
                        type="email"
                        readOnly
                        className="qb-settings-text-input is-readonly"
                        value={email}
                        title="Email address associated with your QBANK session"
                      />
                      <CheckCircle2 size={16} className="qb-settings-verified-icon" />
                    </div>
                    <span className="qb-settings-field-hint">
                      Verified primary address for cloud sync and secure 6-digit confirmation codes.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Account Security & Password Management (Dedicated Security Card) */}
              <div className="qb-settings-panel-card">
                <div className="qb-settings-panel-card-head">
                  <div className="qb-settings-panel-card-title">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Account Security &amp; Credentials</span>
                  </div>
                  <span className="qb-settings-panel-card-badge">
                    <ShieldCheck size={12} />
                    <span>Protected</span>
                  </span>
                </div>

                <div className="qb-settings-security-list">
                  {/* Row 1: Account Password */}
                  <div className="qb-settings-security-row">
                    <div className="qb-settings-security-left">
                      <div className="qb-settings-security-icon-box amber">
                        <KeyRound size={18} />
                      </div>
                      <div className="qb-settings-security-info">
                        <div className="qb-settings-security-name-line">
                          <span className="qb-settings-security-name">Account Password</span>
                          <span className="qb-settings-security-mask">••••••••••••</span>
                        </div>
                        <p className="qb-settings-security-desc">
                          Protected with salted SHA-256 encryption. Changing your password requires a 6-digit verification code sent to your registered Gmail.
                        </p>
                      </div>
                    </div>

                    <div className="qb-settings-security-right">
                      <button
                        type="button"
                        className="qb-settings-action-btn primary"
                        onClick={() => setShowChangePasswordModal(true)}
                        title="Change account password with Gmail verification"
                      >
                        <KeyRound size={14} />
                        <span>Change Password</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Two-Factor Verification */}
                  <div className="qb-settings-security-row">
                    <div className="qb-settings-security-left">
                      <div className="qb-settings-security-icon-box emerald">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="qb-settings-security-info">
                        <div className="qb-settings-security-name-line">
                          <span className="qb-settings-security-name">2-Factor Gmail Verification (OTP)</span>
                          <span className="qb-settings-security-pill success">
                            <CheckCircle2 size={12} />
                            <span>ACTIVE</span>
                          </span>
                        </div>
                        <p className="qb-settings-security-desc">
                          Enforced for password updates and sensitive reviewer actions to ensure account protection.
                        </p>
                      </div>
                    </div>

                    <div className="qb-settings-security-right">
                      <span className="qb-settings-security-pill success">
                        <CheckCircle2 size={13} />
                        <span>Verified Account</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXAM PERSONA & TARGETS */}
          {activeTab === "persona" && (
            <div className="qb-settings-panel-section">
              <div className="qb-settings-section-head">
                <h2 className="qb-settings-section-title">Civil Service Examination Persona</h2>
                <p className="qb-settings-section-desc">
                  Set your target examination level, scheduled exam date, and daily question pacing goals.
                </p>
              </div>

              {/* Examination Target Selection Cards */}
              <div className="qb-settings-field">
                <label className="qb-settings-label">Target Civil Service Exam Level</label>
                <div className="qb-settings-target-cards-grid">
                  <button
                    type="button"
                    className={`qb-settings-target-card${examTarget === "professional" ? " is-active" : ""}`}
                    onClick={() => setExamTarget("professional")}
                  >
                    <div className="qb-settings-target-card-top">
                      <ShieldCheck size={18} className="text-amber-400" />
                      <span className="qb-settings-target-card-title">CSC Professional Level</span>
                      {examTarget === "professional" && (
                        <span className="qb-settings-target-pill">Active Target</span>
                      )}
                    </div>
                    <p className="qb-settings-target-card-desc">
                      170 questions · 3h 10m · 80.00% benchmark. Covers Numerical, Verbal, General Information, and Analytical Reasoning.
                    </p>
                  </button>

                  <button
                    type="button"
                    className={`qb-settings-target-card${examTarget === "subprofessional" ? " is-active" : ""}`}
                    onClick={() => setExamTarget("subprofessional")}
                  >
                    <div className="qb-settings-target-card-top">
                      <Layers size={18} className="text-cyan-400" />
                      <span className="qb-settings-target-card-title">CSC Subprofessional Level</span>
                      {examTarget === "subprofessional" && (
                        <span className="qb-settings-target-pill">Active Target</span>
                      )}
                    </div>
                    <p className="qb-settings-target-card-desc">
                      165 questions · 2h 40m · 80.00% benchmark. Covers Numerical, Verbal, General Information, and Clerical Operations.
                    </p>
                  </button>
                </div>
              </div>

              {/* Date & Daily Study Goal Grid */}
              <div className="qb-settings-two-column-row">
                <div className="qb-settings-field">
                  <label htmlFor="settings-exam-date" className="qb-settings-label">
                    Scheduled Exam Date
                  </label>
                  <div className="qb-settings-input-wrap">
                    <Calendar size={16} className="qb-settings-input-icon" />
                    <input
                      id="settings-exam-date"
                      type="date"
                      className="qb-settings-text-input"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                  {daysRemaining !== null && (
                    <span className="qb-settings-field-hint" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {daysRemaining > 0 ? (
                        <>
                          <Clock size={13} />
                          <span>{daysRemaining} days remaining until exam day.</span>
                        </>
                      ) : daysRemaining === 0 ? (
                        <>
                          <AlertTriangle size={13} color="#f59e0b" />
                          <span>Exam is scheduled for today!</span>
                        </>
                      ) : (
                        <span>Exam date has passed. Update for your upcoming batch.</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="qb-settings-field">
                  <label className="qb-settings-label">Daily Question Goal</label>
                  <div className="qb-settings-goal-chips-row">
                    {[15, 25, 40, 60].map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        className={`qb-settings-goal-chip${dailyGoal === goal ? " is-active" : ""}`}
                        onClick={() => setDailyGoal(goal)}
                      >
                        {goal} Qs/day
                      </button>
                    ))}
                  </div>
                  <span className="qb-settings-field-hint">
                    Recommended pace: 25 items/day to cover the entire CSC bank comfortably.
                  </span>
                </div>
              </div>

              {/* Audio & Haptic Chimes Toggle */}
              <div className="qb-settings-toggle-card">
                <div className="qb-settings-toggle-card-lead">
                  <div className="qb-settings-icon-bubble">
                    <Target size={18} />
                  </div>
                  <div>
                    <h4 className="qb-settings-toggle-title">Answer Confirmation Sound & Haptics</h4>
                    <p className="qb-settings-toggle-desc">
                      Plays a subtle acoustic chime and tactile tick when selecting multiple-choice answers during mock exam simulations.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`qb-toggle-switch${settings.soundEffects ? " is-on" : ""}`}
                  onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
                  role="switch"
                  aria-checked={settings.soundEffects}
                  aria-label="Toggle answer confirmation sound effects"
                >
                  <span className="qb-toggle-knob" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: THEME & VISUALS (WITHOUT REDUNDANCY) */}
          {activeTab === "appearance" && (
            <div className="qb-settings-panel-section">
              <div className="qb-settings-section-head">
                <h2 className="qb-settings-section-title">Theme & Visual Experience</h2>
                <p className="qb-settings-section-desc">
                  Select your interface theme and graphics optimization. Changes take effect instantly.
                </p>
              </div>

              {/* Non-redundant, elegant Dark vs Light theme cards */}
              <div className="qb-settings-field">
                <label className="qb-settings-label">Interface Color Theme</label>
                <div className="qb-settings-theme-cards-row">
                  <button
                    type="button"
                    className={`qb-settings-theme-card${isDark ? " is-selected" : ""}`}
                    onClick={() => {
                      if (!isDark) onToggleTheme();
                    }}
                  >
                    <div className="qb-settings-theme-preview dark">
                      <div className="preview-topbar" />
                      <div className="preview-card-box">
                        <div className="preview-line w-3/4" />
                        <div className="preview-line w-1/2" />
                      </div>
                    </div>
                    <div className="qb-settings-theme-card-info">
                      <div className="qb-settings-theme-card-title-row">
                        <Moon size={16} />
                        <span className="font-semibold text-sm">Dark Theme (Default)</span>
                        {isDark && <Check size={14} className="text-amber-400 ml-auto" />}
                      </div>
                      <p className="qb-settings-theme-card-desc">
                        Deep slate canvas with high-contrast amber accents. Easy on eyes during nighttime review sessions.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`qb-settings-theme-card${!isDark ? " is-selected" : ""}`}
                    onClick={() => {
                      if (isDark) onToggleTheme();
                    }}
                  >
                    <div className="qb-settings-theme-preview light">
                      <div className="preview-topbar light" />
                      <div className="preview-card-box light">
                        <div className="preview-line light w-3/4" />
                        <div className="preview-line light w-1/2" />
                      </div>
                    </div>
                    <div className="qb-settings-theme-card-info">
                      <div className="qb-settings-theme-card-title-row">
                        <Sun size={16} />
                        <span className="font-semibold text-sm">Light Theme</span>
                        {!isDark && <Check size={14} className="text-amber-400 ml-auto" />}
                      </div>
                      <p className="qb-settings-theme-card-desc">
                        Clean off-white canvas with crisp dark typography. Ideal for bright daytime study environments.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Device Performance & Animation Optimizer (Modeled from image_23698f3c reference) */}
              <div className="qb-perf-optimizer-container">
                <div className="qb-perf-optimizer-header">
                  <div className="qb-perf-header-lead">
                    <Activity size={20} className="qb-perf-icon-glow" />
                    <div>
                      <h3 className="qb-perf-title">Device Performance & Animation Optimizer</h3>
                      <p className="qb-perf-desc">
                        Adaptive hardware scaling: automatically throttles GPU-heavy backdrop blur filters and CSS animations on budget devices or battery saver for smooth 60 FPS performance.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const currentTier =
                      settings.performanceTier ||
                      (settings.liteMode ? "lite" : !settings.animationsEnabled ? "lite" : "high");
                    return (
                      <div className="qb-perf-tier-badge">
                        <span className="qb-perf-tier-label">Active Tier:</span>
                        <span className="qb-perf-tier-val">
                          {currentTier === "high"
                            ? "HIGH (FORCED)"
                            : currentTier === "lite"
                            ? "LITE (POWER-SAVER)"
                            : "AUTO (DETECTED)"}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* 3 Interactive Cards */}
                {(() => {
                  const currentTier =
                    settings.performanceTier ||
                    (settings.liteMode ? "lite" : !settings.animationsEnabled ? "lite" : "high");

                  return (
                    <div className="qb-perf-cards-grid">
                      {/* Card 1: Adaptive Auto-Detect */}
                      <button
                        type="button"
                        className={`qb-perf-card${currentTier === "auto" ? " is-selected is-auto" : ""}`}
                        onClick={() => onUpdateSettings({ performanceTier: "auto" })}
                      >
                        <div className="qb-perf-card-head">
                          <div className="qb-perf-card-title-group">
                            <div className="qb-perf-icon-badge is-auto">
                              <Sparkles size={16} />
                            </div>
                            <span className="qb-perf-card-title">Adaptive Auto-Detect</span>
                          </div>
                          <div className="qb-perf-card-check-slot">
                            {currentTier === "auto" && (
                              <CheckCircle2 size={18} className="qb-perf-check-icon" />
                            )}
                          </div>
                        </div>
                        <p className="qb-perf-card-desc">
                          Inspects CPU cores, device memory, and OS battery/motion signals to dynamically calibrate animations.
                        </p>
                        <span className="qb-perf-card-tag recommended">Recommended</span>
                      </button>

                      {/* Card 2: High Fidelity */}
                      <button
                        type="button"
                        className={`qb-perf-card${currentTier === "high" ? " is-selected is-high" : ""}`}
                        onClick={() => onUpdateSettings({ performanceTier: "high" })}
                      >
                        <div className="qb-perf-card-head">
                          <div className="qb-perf-card-title-group">
                            <div className="qb-perf-icon-badge is-high">
                              <Zap size={16} />
                            </div>
                            <span className="qb-perf-card-title">High Fidelity</span>
                          </div>
                          <div className="qb-perf-card-check-slot">
                            {currentTier === "high" && (
                              <CheckCircle2 size={18} className="qb-perf-check-icon" />
                            )}
                          </div>
                        </div>
                        <p className="qb-perf-card-desc">
                          Enables full spring motion physics, translucent backdrop-blur shaders, and rich fluid transitions across all panels.
                        </p>
                        <span className="qb-perf-card-tag workstation">Workstations & PCs</span>
                      </button>

                      {/* Card 3: Lite / Power-Saver */}
                      <button
                        type="button"
                        className={`qb-perf-card${currentTier === "lite" ? " is-selected is-lite" : ""}`}
                        onClick={() => onUpdateSettings({ performanceTier: "lite" })}
                      >
                        <div className="qb-perf-card-head">
                          <div className="qb-perf-card-title-group">
                            <div className="qb-perf-icon-badge is-lite">
                              <Cpu size={16} />
                            </div>
                            <span className="qb-perf-card-title">Lite / Power-Saver</span>
                          </div>
                          <div className="qb-perf-card-check-slot">
                            {currentTier === "lite" && (
                              <CheckCircle2 size={18} className="qb-perf-check-icon" />
                            )}
                          </div>
                        </div>
                        <p className="qb-perf-card-desc">
                          Disables heavy GPU backdrop blur, stops ambient pulse loops, and accelerates transitions to 0.08s for maximum FPS and battery.
                        </p>
                        <span className="qb-perf-card-tag lowspec">Low-Spec & Tablets</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Bottom Hardware Specs Strip */}
                <div className="qb-perf-specs-strip">
                  <div className="qb-perf-specs-left">
                    <span>Hardware: <strong>{hwStats.cores} Cores</strong></span>
                    <span className="qb-perf-specs-dot">·</span>
                    <span>RAM: <strong>~{hwStats.ram} GB</strong></span>
                    <span className="qb-perf-specs-dot">·</span>
                    <span>Reduced Motion: <strong>{hwStats.reducedMotion ? "On" : "Off"}</strong></span>
                  </div>
                  <div className="qb-perf-specs-right">
                    Analysis: {hwStats.analysis}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & STORAGE */}
          {activeTab === "storage" && (
            <div className="qb-settings-panel-section">
              <div className="qb-settings-section-head">
                <h2 className="qb-settings-section-title">Security, Sync & Offline Storage</h2>
                <p className="qb-settings-section-desc">
                  Inspect your browser cache metrics, export exam progress, or refresh synchronization.
                </p>
              </div>

              {/* Storage Stats Row */}
              <div className="qb-settings-storage-stats-grid">
                <div className="qb-settings-stat-card">
                  <span className="qb-settings-stat-number">{totalQuestions}</span>
                  <span className="qb-settings-stat-label">Questions Cached</span>
                </div>
                <div className="qb-settings-stat-card">
                  <span className="qb-settings-stat-number">{mockAttemptsCount}</span>
                  <span className="qb-settings-stat-label">Mock Exam Attempts</span>
                </div>
                <div className="qb-settings-stat-card">
                  <span className="qb-settings-stat-number">{favoritesCount}</span>
                  <span className="qb-settings-stat-label">Starred Questions</span>
                </div>
                <div className="qb-settings-stat-card">
                  <span className="qb-settings-stat-number">{notesCount}</span>
                  <span className="qb-settings-stat-label">Custom Study Notes</span>
                </div>
              </div>

              {/* Sync Status Box */}
              <div className="qb-settings-storage-status-box">
                <div className="qb-settings-storage-status-head">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <div>
                    <h4 className="font-semibold text-sm text-heading">PWA Offline Storage Engine</h4>
                    <p className="text-xs text-muted">
                      Your exams, question bookmarks, and study notes are saved locally in IndexedDB and localStorage, ensuring 100% offline functionality.
                    </p>
                  </div>
                </div>
                <div className="qb-settings-storage-actions-row">
                  <button
                    type="button"
                    className="qb-settings-action-pill"
                    onClick={handleExportData}
                  >
                    <Download size={14} />
                    <span>Export Progress & Notes (.json)</span>
                  </button>
                </div>
              </div>

              {/* Reset Defaults & Clear Cache */}
              <div className="qb-settings-danger-card">
                <div className="qb-settings-danger-head">
                  <RotateCcw size={18} className="text-rose-400" />
                  <div>
                    <h4 className="font-semibold text-sm text-heading">Reset Application Preferences</h4>
                    <p className="text-xs text-muted">
                      Resets daily study goals, audio chimes, and visual preferences back to official factory defaults.
                    </p>
                  </div>
                </div>

                {clearCacheConfirm ? (
                  <div className="qb-settings-confirm-row">
                    <span className="text-xs font-semibold text-rose-400">Confirm reset?</span>
                    <button
                      type="button"
                      className="qb-settings-danger-confirm-btn"
                      onClick={() => {
                        if (onResetSettings) onResetSettings();
                        setClearCacheConfirm(false);
                      }}
                    >
                      Yes, Reset
                    </button>
                    <button
                      type="button"
                      className="qb-settings-danger-cancel-btn"
                      onClick={() => setClearCacheConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="qb-settings-danger-btn"
                    onClick={() => setClearCacheConfirm(true)}
                  >
                    Reset Settings to Default
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ROLES & ACCESS CONTROL (SUPERADMIN / ADMIN) */}
          {activeTab === "roles" && (
            <div className="qb-settings-panel-section">
              <div className="qb-settings-section-head">
                <div className="flex items-center gap-2">
                  <Crown size={22} className="text-amber-400" />
                  <h2 className="qb-settings-section-title">User Roles & Access Control</h2>
                </div>
                <p className="qb-settings-section-desc">
                  Manage platform administrative privileges, assign Superadmin or Question Admin roles, and control access rights across reviewer accounts.
                </p>
              </div>

              {roleNotice && (
                <div className={`qb-settings-role-notice ${roleNotice.type}`}>
                  {roleNotice.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{roleNotice.message}</span>
                </div>
              )}

              {/* Quick Role Assignment Card */}
              <div className="qb-settings-role-grant-card">
                <div className="qb-settings-role-grant-head">
                  <UserPlus size={18} className="text-amber-400" />
                  <div>
                    <h3 className="font-semibold text-sm text-heading">Grant or Assign User Role</h3>
                    <p className="text-xs text-muted">
                      Enter any examinee or staff email address to grant administrative permissions or assign roles.
                    </p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newRoleEmail.trim()) {
                      handleAssignRole(newRoleEmail.trim(), newRoleSelect);
                    }
                  }}
                  className="qb-settings-role-grant-form"
                >
                  <div className="qb-settings-input-wrap flex-1">
                    <User size={16} className="qb-settings-input-icon" />
                    <input
                      type="email"
                      className="qb-settings-text-input"
                      placeholder="e.g. reviewer@domain.com"
                      value={newRoleEmail}
                      onChange={(e) => setNewRoleEmail(e.target.value)}
                      required
                    />
                  </div>
                  <CustomSelect
                    value={newRoleSelect}
                    onChange={(val) => setNewRoleSelect(val as UserRole)}
                    options={ROLE_GRANT_OPTIONS}
                    className="qb-settings-role-select-wrap"
                    showCheckmark
                  />
                  <button type="submit" className="qb-settings-role-grant-btn">
                    <UserPlus size={16} />
                    <span>Assign Role</span>
                  </button>
                </form>
              </div>

              {/* Registered Users Roster Table */}
              <div className="qb-settings-users-roster-card">
                <div className="qb-settings-roster-toolbar">
                  <div className="qb-settings-roster-search">
                    <Search size={15} className="text-muted" />
                    <input
                      type="text"
                      className="qb-settings-roster-search-input"
                      placeholder="Search accounts by name, email, or role..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                    />
                  </div>
                  <div
                    className="qb-settings-roster-filters"
                    role="tablist"
                    aria-label="Filter accounts by role"
                  >
                    {(["all", "superadmin", "admin", "reviewer"] as const).map((rFilter) => (
                      <button
                        key={rFilter}
                        type="button"
                        role="tab"
                        aria-selected={roleFilter === rFilter}
                        className={`qb-settings-roster-filter-chip${roleFilter === rFilter ? " active" : ""}`}
                        onClick={() => setRoleFilter(rFilter)}
                      >
                        {rFilter === "all" ? "All Accounts" : rFilter.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="qb-settings-users-table-wrap">
                  <table className="qb-settings-users-table">
                    <thead>
                      <tr>
                        <th>USER ACCOUNT</th>
                        <th>CURRENT ROLE</th>
                        <th>ASSIGNED DATE</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!isUsersLoading &&
                        filteredUsers.map((uRecord) => {
                          const isRootSuper = uRecord.email.toLowerCase() === "xaruzowarlord@gmail.com";
                          return (
                            <tr key={uRecord.email}>
                              <td>
                                <div className="qb-user-cell">
                                  <div className={`qb-user-cell-avatar role-${uRecord.role}`}>
                                    <span>{uRecord.fullName.slice(0, 2).toUpperCase()}</span>
                                    {uRecord.avatarUrl && (
                                      <img
                                        src={uRecord.avatarUrl}
                                        alt=""
                                        className="qb-user-cell-avatar-img"
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="qb-user-cell-info">
                                    <span className="qb-user-cell-name">{uRecord.fullName}</span>
                                    <span className="qb-user-cell-email">{uRecord.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`qb-role-pill role-${uRecord.role}`}>
                                  {uRecord.role === "superadmin" && <Crown size={12} />}
                                  {uRecord.role === "admin" && <ShieldCheck size={12} />}
                                  <span>{uRecord.role.toUpperCase()}</span>
                                </span>
                              </td>
                              <td>
                                <div className="qb-user-assigned-cell">
                                  <span>{new Date(uRecord.assignedAt).toLocaleDateString()}</span>
                                  <span className="text-muted text-xs">by {uRecord.assignedBy || "System"}</span>
                                </div>
                              </td>
                              <td>
                                {isRootSuper ? (
                                  <span className="text-xs text-amber-400 font-medium italic">Primary Root Superadmin</span>
                                ) : (
                                  <div className="qb-user-role-actions">
                                    <CustomSelect
                                      value={uRecord.role}
                                      onChange={(val) =>
                                        handleAssignRole(uRecord.email, val as UserRole, uRecord.fullName)
                                      }
                                      options={QUICK_ROLE_OPTIONS}
                                      className="qb-table-role-select"
                                      showCheckmark
                                      portal
                                    />
                                    {uRecord.role !== "reviewer" && (
                                      <button
                                        type="button"
                                        className="qb-user-revoke-btn"
                                        title="Revoke admin privileges"
                                        onClick={() => handleRevokeRole(uRecord.email)}
                                      >
                                        Revoke
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  {isUsersLoading && (
                    <div className="qb-roster-state-box">
                      <Loader2 size={22} className="qb-roster-spinner" />
                      <p className="qb-roster-state-title">Syncing registered accounts...</p>
                    </div>
                  )}

                  {!isUsersLoading && filteredUsers.length === 0 && (
                    <div className="qb-roster-state-box">
                      <div className="qb-roster-state-icon">
                        <Users size={22} />
                      </div>
                      <p className="qb-roster-state-title">
                        {roleFilter !== "all" && !roleSearch.trim()
                          ? `No ${roleFilter.toUpperCase()} accounts found`
                          : "No matching accounts"}
                      </p>
                      <p className="qb-roster-state-desc">
                        {roleFilter !== "all" || roleSearch.trim()
                          ? "Try adjusting your role filter or search query to see other registered accounts."
                          : "Registered user accounts will appear here once signed in."}
                      </p>
                      {(roleFilter !== "all" || roleSearch.trim()) && (
                        <button
                          type="button"
                          className="qb-roster-reset-btn"
                          onClick={() => {
                            setRoleFilter("all");
                            setRoleSearch("");
                          }}
                        >
                          Reset filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="qb-settings-roster-footer">
                  <span className="qb-settings-roster-count">
                    Showing {filteredUsers.length} of {usersList.length}{" "}
                    {usersList.length === 1 ? "account" : "accounts"}
                  </span>
                  {(roleFilter !== "all" || roleSearch.trim()) && (
                    <button
                      type="button"
                      className="qb-roster-clear-link"
                      onClick={() => {
                        setRoleFilter("all");
                        setRoleSearch("");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Persistent Bottom Action Bar ── */}
          <footer className="qb-settings-page-footer">
            <div className="qb-settings-footer-left">
              <span className="qb-settings-footer-sync-note">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Changes sync automatically to local storage and your cloud profile.</span>
              </span>
            </div>

            <div className="qb-settings-footer-right">
              {saveSuccess && (
                <div className="qb-settings-success-chip">
                  <Check size={14} />
                  <span>Settings saved successfully!</span>
                </div>
              )}
              <button
                type="button"
                className="qb-settings-footer-cancel-btn"
                onClick={handleRequestExit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="qb-settings-footer-save-btn"
                onClick={() => handleSaveAll()}
                disabled={isSaving}
              >
                <Check size={15} />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </footer>
        </main>
      </div>

      {showDiscardConfirm &&
        createPortal(
          <div className="qb-modal-backdrop" onClick={() => setShowDiscardConfirm(false)}>
            <div
              ref={discardDialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-changes-title"
              className="qb-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="qb-discard-head">
                <div className="qb-discard-icon">
                  <AlertTriangle size={18} />
                </div>
                <div className="qb-discard-copy">
                  <h3 id="discard-changes-title" className="qb-modal-title">
                    Discard unsaved changes?
                  </h3>
                  <p className="qb-modal-text">
                    Your profile edits have not been saved yet. Leaving now will lose them.
                  </p>
                </div>
              </div>
              <div className="qb-modal-actions">
                <button
                  type="button"
                  className="qb-modal-btn qb-modal-btn-cancel"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  className="qb-modal-btn qb-modal-btn-danger"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onBackToMain();
                  }}
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Change Password Modal with Gmail 6-digit confirmation code */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        userEmail={email}
        isDark={isDark}
      />
    </div>
  );
}
