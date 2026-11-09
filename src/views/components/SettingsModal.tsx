import { useState, useRef, useEffect, useId } from "react";
import {
  X,
  Zap,
  Sparkles,
  User,
  Sun,
  Moon,
  Database,
  Check,
  ShieldCheck,
  Clock,
  Target,
  Sliders,
  Calendar,
  Layers,
  Activity,
  Trash2,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Bell,
} from "lucide-react";
import { useOverlayDialogA11y } from "../../controllers/useOverlayDialogA11y";
import type { AppSettings, UserProfile } from "../../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onResetSettings?: () => void;
  profile: UserProfile | null;
  onUpdateProfile?: (partial: Partial<UserProfile>) => Promise<{ success: boolean }>;
  isDark: boolean;
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  totalQuestions?: number;
  mockAttemptsCount?: number;
  favoritesCount?: number;
}

type SettingsTab = "optimizer" | "profile" | "appearance" | "storage";

const AVATAR_COLORS = [
  { id: "amber", label: "Amber Gold", bg: "rgba(245, 166, 35, 0.2)", border: "#f5a623", text: "#f5a623" },
  { id: "cyan", label: "Cyan Blue", bg: "rgba(34, 211, 238, 0.2)", border: "#22d3ee", text: "#22d3ee" },
  { id: "purple", label: "Royal Violet", bg: "rgba(167, 139, 250, 0.2)", border: "#a78bfa", text: "#a78bfa" },
  { id: "emerald", label: "Jade Emerald", bg: "rgba(52, 211, 153, 0.2)", border: "#34d399", text: "#34d399" },
  { id: "rose", label: "Crimson Rose", bg: "rgba(251, 113, 133, 0.2)", border: "#fb7185", text: "#fb7185" },
];

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  profile,
  onUpdateProfile,
  isDark,
  onToggleTheme,
  isAuthenticated,
  totalQuestions = 0,
  mockAttemptsCount = 0,
  favoritesCount = 0,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("optimizer");
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Profile Form Local State
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(profile?.avatarColor || "amber");
  const [examTarget, setExamTarget] = useState<"professional" | "subprofessional">(
    profile?.examTarget || settings.examTarget || "professional"
  );
  const [examDate, setExamDate] = useState(profile?.targetExamDate || settings.targetExamDate || "2026-08-09");
  const [dailyGoal, setDailyGoal] = useState<number>(profile?.dailyStudyGoal || settings.dailyStudyGoal || 25);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useOverlayDialogA11y(isOpen, onClose, modalRef);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setSelectedColor(profile.avatarColor || "amber");
      if (profile.avatarUrl !== undefined) setAvatarUrl(profile.avatarUrl);
      if (profile.examTarget) setExamTarget(profile.examTarget);
      if (profile.targetExamDate) setExamDate(profile.targetExamDate);
      if (profile.dailyStudyGoal) setDailyGoal(profile.dailyStudyGoal);
    }
  }, [profile]);

  if (!isOpen) return null;

  // Calculate days remaining until target exam
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (PNG, JPG, or WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("File size is too large (maximum 8MB).");
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 256;
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Center cover crop into square avatar
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setAvatarUrl(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    setAvatarError(null);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const trimmedName = fullName.trim() || "Reviewer";
      if (onUpdateProfile) {
        await onUpdateProfile({
          fullName: trimmedName,
          avatarUrl,
          avatarColor: selectedColor,
          examTarget,
          targetExamDate: examDate,
          dailyStudyGoal: dailyGoal,
        });
      }

      onUpdateSettings({
        examTarget,
        targetExamDate: examDate,
        dailyStudyGoal: dailyGoal,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLocalCache = () => {
    if (window.confirm("Are you sure you want to refresh your reviewer local storage? This resets non-synced temporary drafts.")) {
      try {
        localStorage.removeItem("cse-qbank-cache-timestamp");
        window.location.reload();
      } catch {}
    }
  };

  const currentColorConfig = AVATAR_COLORS.find((c) => c.id === selectedColor) || AVATAR_COLORS[0];
  const initials = (fullName.trim() || "Reviewer")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "R";

  return (
    <div
      className="qb-settings-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="qb-settings-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="qb-settings-modal-header">
          <div className="qb-settings-modal-header-titles">
            <span className="qb-settings-modal-kicker">CONFIGURATION & OPTIMIZER</span>
            <h2 id={titleId} className="qb-settings-modal-title">
              Settings & Preferences
            </h2>
          </div>
          <button
            type="button"
            className="qb-settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
            title="Close settings (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="qb-settings-tabs-bar" role="tablist" aria-label="Settings categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "optimizer"}
            className={`qb-settings-tab-btn${activeTab === "optimizer" ? " is-active" : ""}`}
            onClick={() => setActiveTab("optimizer")}
          >
            <Zap size={15} className="qb-settings-tab-icon" />
            <span>Optimizer & Mode</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`qb-settings-tab-btn${activeTab === "profile" ? " is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={15} className="qb-settings-tab-icon" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "appearance"}
            className={`qb-settings-tab-btn${activeTab === "appearance" ? " is-active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <Sliders size={15} className="qb-settings-tab-icon" />
            <span>Theme & Visuals</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "storage"}
            className={`qb-settings-tab-btn${activeTab === "storage" ? " is-active" : ""}`}
            onClick={() => setActiveTab("storage")}
          >
            <Database size={15} className="qb-settings-tab-icon" />
            <span>Data & Storage</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="qb-settings-modal-body">
          {/* TAB 1: OPTIMIZER & PERFORMANCE */}
          {activeTab === "optimizer" && (
            <div className="qb-settings-tab-pane">
              {/* LITE / Power Saver Mode Card */}
              <div className={`qb-settings-card-block${settings.liteMode ? " is-highlighted" : ""}`}>
                <div className="qb-settings-card-lead">
                  <div className={`qb-settings-icon-badge${settings.liteMode ? " is-accent" : ""}`}>
                    <Zap size={18} />
                  </div>
                  <div className="qb-settings-card-content">
                    <div className="qb-settings-card-header-row">
                      <h3 className="qb-settings-card-title">LITE / Power Saver Mode</h3>
                      <span className={`qb-settings-state-tag${settings.liteMode ? " active" : ""}`}>
                        {settings.liteMode ? "Active" : "Standard"}
                      </span>
                    </div>
                    <p className="qb-settings-card-desc">
                      Optimizes GPU overhead, strips intensive glass blur filters, simplifies box shadows, and pauses non-essential background animations. Extends battery life on laptops and mobile phones.
                    </p>
                  </div>
                </div>

                <div className="qb-settings-card-footer">
                  <div className="qb-settings-footer-info">
                    <Activity size={13} />
                    <span>{settings.liteMode ? "Low GPU & Memory Footprint" : "Standard High-Fidelity Rendering"}</span>
                  </div>
                  <button
                    type="button"
                    className={`qb-toggle-switch${settings.liteMode ? " is-on" : ""}`}
                    onClick={() => onUpdateSettings({ liteMode: !settings.liteMode })}
                    aria-label="Toggle LITE / Power saver mode"
                    role="switch"
                    aria-checked={settings.liteMode}
                  >
                    <span className="qb-toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Animation Toggle Card */}
              <div className={`qb-settings-card-block${!settings.animationsEnabled ? " is-highlighted" : ""}`}>
                <div className="qb-settings-card-lead">
                  <div className="qb-settings-icon-badge">
                    <Sparkles size={18} />
                  </div>
                  <div className="qb-settings-card-content">
                    <div className="qb-settings-card-header-row">
                      <h3 className="qb-settings-card-title">Navigation & UI Animations</h3>
                      <span className={`qb-settings-state-tag${settings.animationsEnabled ? " active" : ""}`}>
                        {settings.animationsEnabled ? "Fluid Motion" : "Reduced"}
                      </span>
                    </div>
                    <p className="qb-settings-card-desc">
                      Controls smooth left-hand side panel navigation animations, active indicator glides, modal scale-ins, and button hover micro-interactions.
                    </p>
                  </div>
                </div>

                <div className="qb-settings-card-footer">
                  <div className="qb-settings-footer-info">
                    <Clock size={13} />
                    <span>
                      {settings.animationsEnabled
                        ? "Smooth spring settling (150ms–200ms)"
                        : "Instant zero-motion transitions"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`qb-toggle-switch${settings.animationsEnabled ? " is-on" : ""}`}
                    onClick={() => onUpdateSettings({ animationsEnabled: !settings.animationsEnabled })}
                    aria-label="Toggle UI animations"
                    role="switch"
                    aria-checked={settings.animationsEnabled}
                  >
                    <span className="qb-toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Sound & Haptic Feedback */}
              <div className="qb-settings-card-block">
                <div className="qb-settings-card-lead">
                  <div className="qb-settings-icon-badge">
                    <Target size={18} />
                  </div>
                  <div className="qb-settings-card-content">
                    <h3 className="qb-settings-card-title">Answer Confirmation Sound & Haptics</h3>
                    <p className="qb-settings-card-desc">
                      Plays a subtle acoustic chime and tactile tick when selecting multiple-choice answers during practice.
                    </p>
                  </div>
                </div>

                <div className="qb-settings-card-footer">
                  <div className="qb-settings-footer-info">
                    <span>{settings.soundEffects ? "Audio Cues Enabled" : "Silent Practice"}</span>
                  </div>
                  <button
                    type="button"
                    className={`qb-toggle-switch${settings.soundEffects ? " is-on" : ""}`}
                    onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
                    aria-label="Toggle answer sound effects"
                    role="switch"
                    aria-checked={settings.soundEffects}
                  >
                    <span className="qb-toggle-knob" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE & GOALS */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSave} className="qb-settings-tab-pane">
              {/* Profile Card Header with Live Avatar Preview & Image Controls */}
              <div className="qb-settings-profile-preview-card">
                <div
                  className="qb-settings-preview-avatar"
                  style={
                    avatarUrl
                      ? undefined
                      : {
                          backgroundColor: currentColorConfig.bg,
                          borderColor: currentColorConfig.border,
                          color: currentColorConfig.text,
                        }
                  }
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="qb-avatar-img" />
                  ) : (
                    initials
                  )}
                </div>

                <div className="qb-settings-preview-meta">
                  <div className="qb-settings-preview-header-line">
                    <span className="qb-settings-preview-name">{fullName.trim() || "Reviewer"}</span>
                    <span className="qb-settings-preview-target-badge">
                      {examTarget === "professional" ? "Professional (170 Qs)" : "Subprofessional (165 Qs)"}
                    </span>
                  </div>
                  <span className="qb-settings-preview-sub">
                    {isAuthenticated ? profile?.email || "Signed In" : "Local Reviewer Profile (Guest)"}
                  </span>

                  {/* Photo Actions Row */}
                  <div className="qb-settings-photo-actions-row">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handlePhotoSelect}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="qb-settings-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload custom profile picture"
                    >
                      <Camera size={13} />
                      <span>{avatarUrl ? "Change Photo" : "Upload Photo"}</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        className="qb-settings-photo-btn danger"
                        onClick={handleRemovePhoto}
                        title="Remove custom picture and use initials"
                      >
                        <RotateCcw size={13} />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                  {avatarError && <span className="qb-settings-field-error">{avatarError}</span>}
                </div>
              </div>

              {/* Display Name Field */}
              <div className="qb-settings-field">
                <label className="qb-settings-field-label" htmlFor="settings-full-name">
                  Full Name or Reviewer Nickname
                </label>
                <input
                  id="settings-full-name"
                  type="text"
                  className="qb-settings-text-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Santos or Juan"
                  maxLength={40}
                  required
                />
              </div>

              {/* Avatar Accent Color Picker */}
              <div className="qb-settings-field">
                <label className="qb-settings-field-label">Avatar Badge Color</label>
                <div className="qb-settings-color-palette" role="radiogroup" aria-label="Avatar Color">
                  {AVATAR_COLORS.map((color) => {
                    const isSelected = selectedColor === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`qb-settings-color-btn${isSelected ? " is-selected" : ""}`}
                        style={{
                          backgroundColor: color.bg,
                          borderColor: color.border,
                          color: color.text,
                        }}
                        onClick={() => setSelectedColor(color.id)}
                        title={color.label}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Examination Target Selection */}
              <div className="qb-settings-field">
                <label className="qb-settings-field-label">Target Civil Service Examination Level</label>
                <div className="qb-settings-choice-grid">
                  <button
                    type="button"
                    className={`qb-settings-choice-card${examTarget === "professional" ? " is-active" : ""}`}
                    onClick={() => setExamTarget("professional")}
                  >
                    <div className="qb-settings-choice-head">
                      <ShieldCheck size={16} className="qb-settings-choice-icon" />
                      <span className="qb-settings-choice-title">CSC Professional Level</span>
                    </div>
                    <p className="qb-settings-choice-desc">
                      170 questions · 3h 10m · Includes Numerical, Verbal, Gen Info, and Analytical Ability.
                    </p>
                  </button>

                  <button
                    type="button"
                    className={`qb-settings-choice-card${examTarget === "subprofessional" ? " is-active" : ""}`}
                    onClick={() => setExamTarget("subprofessional")}
                  >
                    <div className="qb-settings-choice-head">
                      <Layers size={16} className="qb-settings-choice-icon" />
                      <span className="qb-settings-choice-title">CSC Subprofessional Level</span>
                    </div>
                    <p className="qb-settings-choice-desc">
                      165 questions · 2h 40m · Includes Numerical, Verbal, Gen Info, and Clerical Operations.
                    </p>
                  </button>
                </div>
              </div>

              {/* Target Exam Date & Daily Goal */}
              <div className="qb-settings-two-col-grid">
                <div className="qb-settings-field">
                  <label className="qb-settings-field-label" htmlFor="settings-exam-date">
                    Scheduled Exam Date
                  </label>
                  <div className="qb-settings-input-with-icon">
                    <Calendar size={15} className="qb-settings-input-icon" />
                    <input
                      id="settings-exam-date"
                      type="date"
                      className="qb-settings-text-input pl-9"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                  {daysRemaining !== null && (
                    <span className="qb-settings-hint-text flex items-center gap-1.5">
                      {daysRemaining > 0 ? (
                        <>
                          <Clock size={12} className="text-amber-500 shrink-0" />
                          <span>{daysRemaining} days remaining until exam day</span>
                        </>
                      ) : daysRemaining === 0 ? (
                        <>
                          <Bell size={12} className="text-emerald-500 shrink-0" />
                          <span>Exam is today! Good luck!</span>
                        </>
                      ) : (
                        <span>Past target date</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="qb-settings-field">
                  <label className="qb-settings-field-label">Daily Practice Target</label>
                  <div className="qb-settings-pills-row">
                    {[10, 20, 25, 50].map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        className={`qb-settings-pill-btn${dailyGoal === goal ? " is-active" : ""}`}
                        onClick={() => setDailyGoal(goal)}
                      >
                        {goal} Qs/day
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button & Feedback */}
              <div className="qb-settings-form-actions">
                {saveSuccess && (
                  <div className="qb-settings-save-toast">
                    <Check size={14} />
                    <span>Profile & goals saved successfully!</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="qb-settings-submit-btn"
                >
                  <Check size={15} />
                  <span>{isSaving ? "Saving..." : "Save Profile Changes"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: THEME & VISUALS */}
          {activeTab === "appearance" && (
            <div className="qb-settings-tab-pane">
              <div className="qb-settings-field">
                <label className="qb-settings-field-label">Interface Color Theme</label>
                <div className="qb-settings-theme-grid">
                  <button
                    type="button"
                    className={`qb-settings-theme-card${isDark ? " is-active" : ""}`}
                    onClick={() => {
                      if (!isDark) onToggleTheme();
                    }}
                  >
                    <div className="qb-theme-card-preview dark-preview">
                      <div className="preview-nav-bar" />
                      <div className="preview-content-box" />
                    </div>
                    <div className="qb-theme-card-info">
                      <Moon size={16} />
                      <span className="font-semibold text-sm">Dark Theme (Default)</span>
                    </div>
                    <span className="qb-theme-card-sub">
                      Deep slate canvas with high-contrast amber accents. Easy on eyes during nighttime review.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`qb-settings-theme-card${!isDark ? " is-active" : ""}`}
                    onClick={() => {
                      if (isDark) onToggleTheme();
                    }}
                  >
                    <div className="qb-theme-card-preview light-preview">
                      <div className="preview-nav-bar light" />
                      <div className="preview-content-box light" />
                    </div>
                    <div className="qb-theme-card-info">
                      <Sun size={16} />
                      <span className="font-semibold text-sm">Light Theme</span>
                    </div>
                    <span className="qb-theme-card-sub">
                      Clean off-white canvas with crisp dark text and vivid accents. Ideal for bright daytime study.
                    </span>
                  </button>
                </div>
              </div>

              {/* Fast Theme Switch Button */}
              <div className="qb-settings-card-block">
                <div className="qb-settings-card-lead">
                  <div className="qb-settings-icon-badge">
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                  </div>
                  <div className="qb-settings-card-content">
                    <h3 className="qb-settings-card-title">Quick Theme Toggle</h3>
                    <p className="qb-settings-card-desc">
                      Currently using <strong>{isDark ? "Dark Mode" : "Light Mode"}</strong>.
                    </p>
                  </div>
                </div>
                <div className="qb-settings-card-footer">
                  <button
                    type="button"
                    className="qb-settings-action-btn"
                    onClick={onToggleTheme}
                  >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                    <span>Switch to {isDark ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA & STORAGE */}
          {activeTab === "storage" && (
            <div className="qb-settings-tab-pane">
              {/* Storage Overview Stats */}
              <div className="qb-settings-storage-stats-row">
                <div className="qb-storage-stat-box">
                  <span className="qb-storage-stat-num tabular-nums">{totalQuestions}</span>
                  <span className="qb-storage-stat-label">Practice Questions</span>
                </div>
                <div className="qb-storage-stat-box">
                  <span className="qb-storage-stat-num tabular-nums">{mockAttemptsCount}</span>
                  <span className="qb-storage-stat-label">Mock Attempts</span>
                </div>
                <div className="qb-storage-stat-box">
                  <span className="qb-storage-stat-num tabular-nums">{favoritesCount}</span>
                  <span className="qb-storage-stat-label">Starred Questions</span>
                </div>
              </div>

              {/* Sync Status Card */}
              <div className="qb-settings-card-block">
                <div className="qb-settings-card-lead">
                  <div className="qb-settings-icon-badge">
                    <Database size={18} />
                  </div>
                  <div className="qb-settings-card-content">
                    <h3 className="qb-settings-card-title">Storage & Cloud Sync Architecture</h3>
                    <p className="qb-settings-card-desc">
                      {isAuthenticated
                        ? `Connected with ${profile?.email || "your account"}. Progress and mock attempts synchronize with Supabase cloud database with local fallback.`
                        : "Offline-first local cache active. Questions, mock exam records, and custom study notes are stored securely inside your browser's persistent storage."}
                    </p>
                  </div>
                </div>
                <div className="qb-settings-card-footer">
                  <button
                    type="button"
                    className="qb-settings-action-btn danger"
                    onClick={handleClearLocalCache}
                  >
                    <Trash2 size={15} />
                    <span>Clear Local Cache & Refresh</span>
                  </button>
                </div>
              </div>

              {/* Factory Reset App Settings */}
              {onResetSettings && (
                <div className="qb-settings-reset-row">
                  <span className="text-xs text-slate-400">Want to revert to standard reviewer defaults?</span>
                  <button
                    type="button"
                    className="qb-settings-text-btn"
                    onClick={onResetSettings}
                  >
                    Restore Default Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
