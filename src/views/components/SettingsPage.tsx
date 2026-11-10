import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  User,
  Sliders,
  Palette,
  Database,
  ArrowLeft,
  Check,
  Camera,
  Upload,
  Link as LinkIcon,
  Trash2,
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
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Landmark,
  Award,
  Bot,
  Gamepad2,
  FileText,
  Type,
  AlertTriangle,
  Activity,
  Cpu,
} from "lucide-react";
import type { SettingsPageProps, TopicId } from "../../types";

const AVATAR_PRESETS: Array<{
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}> = [
  { id: "initials", label: "Initials", icon: <Type size={14} /> },
  { id: "scholar", label: "Scholar", icon: <GraduationCap size={14} /> },
  { id: "servant", label: "Civil Officer", icon: <Landmark size={14} /> },
  { id: "topnotcher", label: "Top Ranker", icon: <Award size={14} /> },
  { id: "creative", label: "Creative", icon: <Palette size={14} /> },
  { id: "robot", label: "Smart Bot", icon: <Bot size={14} /> },
  { id: "gamer", label: "Gamer", icon: <Gamepad2 size={14} /> },
  { id: "notion", label: "Notionist", icon: <FileText size={14} /> },
  { id: "indigo", label: "Indigo", color: "#6366f1" },
  { id: "emerald", label: "Emerald", color: "#10b981" },
  { id: "rose", label: "Rose", color: "#f43f5e" },
  { id: "amber", label: "Amber", color: "#f5a623" },
];

export default function SettingsPage({
  initialTab = "identity",
  settings,
  onUpdateSettings,
  onResetSettings,
  profile,
  onUpdateProfile,
  isDark,
  onToggleTheme,
  isAuthenticated,
  isQuestionAdmin = false,
  totalQuestions = 0,
  mockAttemptsCount = 0,
  favoritesCount = 0,
  notesCount = 0,
  onBackToMain,
  onSignIn,
  onSignOut,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [email] = useState(profile?.email || (isAuthenticated ? "examinee@gmail.com" : "guest@offline.local"));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || null);
  const [avatarShape, setAvatarShape] = useState<"circle" | "badge">(profile?.avatarShape || "circle");
  const [selectedColor, setSelectedColor] = useState<string>(profile?.avatarColor || "amber");
  const [examTarget, setExamTarget] = useState<"professional" | "subprofessional">(
    profile?.examTarget || settings.examTarget || "professional"
  );
  const [examDate, setExamDate] = useState(profile?.targetExamDate || settings.targetExamDate || "2026-08-09");
  const [dailyGoal, setDailyGoal] = useState<number>(profile?.dailyStudyGoal || settings.dailyStudyGoal || 25);

  const [imageUrlPromptOpen, setImageUrlPromptOpen] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clearCacheConfirm, setClearCacheConfirm] = useState(false);

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

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      if (profile.avatarUrl !== undefined) setAvatarUrl(profile.avatarUrl);
      if (profile.avatarShape) setAvatarShape(profile.avatarShape);
      if (profile.avatarColor) setSelectedColor(profile.avatarColor);
      if (profile.examTarget) setExamTarget(profile.examTarget);
      if (profile.targetExamDate) setExamDate(profile.targetExamDate);
      if (profile.dailyStudyGoal) setDailyGoal(profile.dailyStudyGoal);
    }
  }, [profile]);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

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

  const handleShapeChange = (shape: "badge" | "circle") => {
    setAvatarShape(shape);
    if (onUpdateProfile) {
      onUpdateProfile({ avatarShape: shape });
    }
  };

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

  const handleApplyImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImageUrl.trim()) return;
    setAvatarUrl(customImageUrl.trim());
    setImageUrlPromptOpen(false);
    setCustomImageUrl("");
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
            onClick={onBackToMain}
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
        <nav className="qb-settings-page-nav" aria-label="Settings categories">
          <div className="qb-settings-page-nav-header">
            <span>SETTINGS MENU</span>
          </div>

          <button
            type="button"
            className={`qb-settings-nav-item${activeTab === "identity" ? " active" : ""}`}
            onClick={() => setActiveTab("identity")}
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
            type="button"
            className={`qb-settings-nav-item${activeTab === "persona" ? " active" : ""}`}
            onClick={() => setActiveTab("persona")}
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
            type="button"
            className={`qb-settings-nav-item${activeTab === "appearance" ? " active" : ""}`}
            onClick={() => setActiveTab("appearance")}
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
            type="button"
            className={`qb-settings-nav-item${activeTab === "storage" ? " active" : ""}`}
            onClick={() => setActiveTab("storage")}
          >
            <div className="qb-settings-nav-item-icon">
              <Database size={18} />
            </div>
            <div className="qb-settings-nav-item-text">
              <span className="qb-settings-nav-item-title">Security & Storage</span>
              <span className="qb-settings-nav-item-sub">Offline cache & data export</span>
            </div>
          </button>
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

              {/* Avatar Studio Card (Modeled after PolicyPulse style) */}
              <div className="qb-settings-avatar-studio-card">
                <div className="qb-settings-avatar-studio-top">
                  <div
                    className={`qb-settings-avatar-box shape-${avatarShape}`}
                    style={
                      avatarUrl
                        ? undefined
                        : {
                            backgroundColor: "rgba(245, 166, 35, 0.18)",
                            borderColor: "#f5a623",
                            color: "#f5a623",
                          }
                    }
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar Preview" className="qb-settings-avatar-img" />
                    ) : (
                      <span className="qb-settings-avatar-initials">{initials}</span>
                    )}
                  </div>

                  <div className="qb-settings-avatar-meta">
                    <div className="qb-settings-avatar-name-row">
                      <span className="qb-settings-avatar-name">{fullName.trim() || "Reviewer"}</span>
                      {isQuestionAdmin ? (
                        <span className="qb-settings-role-badge admin">ADMIN</span>
                      ) : isAuthenticated ? (
                        <span className="qb-settings-role-badge pro">EXAMINEE</span>
                      ) : (
                        <span className="qb-settings-role-badge guest">GUEST</span>
                      )}
                    </div>
                    <span className="qb-settings-avatar-email">{email}</span>
                    <span className="qb-settings-avatar-spec">
                      {avatarShape === "circle" ? "Circle Avatar · 256×256px" : "Shield Badge · 256×256px"}
                    </span>
                  </div>

                  {/* Circle vs Badge Shape Switcher with animated sliding glider */}
                  <div className="qb-settings-shape-toggle-group" data-shape={avatarShape}>
                    <div
                      className={`qb-settings-shape-glider ${avatarShape === "circle" ? "is-circle" : "is-badge"}`}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className={`qb-settings-shape-btn${avatarShape === "badge" ? " active" : ""}`}
                      onClick={() => handleShapeChange("badge")}
                      aria-pressed={avatarShape === "badge"}
                    >
                      <span className="shape-icon badge-shape" />
                      <span>Badge</span>
                    </button>
                    <button
                      type="button"
                      className={`qb-settings-shape-btn${avatarShape === "circle" ? " active" : ""}`}
                      onClick={() => handleShapeChange("circle")}
                      aria-pressed={avatarShape === "circle"}
                    >
                      <span className="shape-icon circle-shape" />
                      <span>Circle</span>
                    </button>
                  </div>
                </div>

                {/* Photo Actions Row */}
                <div className="qb-settings-photo-btn-bar">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handlePhotoSelect}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="qb-settings-media-btn primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    className="qb-settings-media-btn"
                    onClick={() => setImageUrlPromptOpen(true)}
                  >
                    <LinkIcon size={15} />
                    <span>Image URL</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      className="qb-settings-media-btn danger"
                      onClick={() => setAvatarUrl(null)}
                      title="Remove custom photo"
                    >
                      <Trash2 size={15} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {avatarError && (
                  <div className="qb-settings-error-alert" role="alert">
                    <AlertCircle size={15} />
                    <span>{avatarError}</span>
                  </div>
                )}

                {imageUrlPromptOpen && (
                  <form onSubmit={handleApplyImageUrl} className="qb-settings-url-input-row">
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      className="qb-settings-url-input"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="qb-settings-url-submit">
                      Apply
                    </button>
                    <button
                      type="button"
                      className="qb-settings-url-cancel"
                      onClick={() => setImageUrlPromptOpen(false)}
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {/* Quick Avatar Badge Style Presets */}
                <div className="qb-settings-presets-block">
                  <span className="qb-settings-presets-title">Or choose a quick badge style:</span>
                  <div className="qb-settings-presets-grid">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="qb-settings-preset-chip"
                        onClick={() => {
                          if (preset.color) {
                            setSelectedColor(preset.id);
                            setAvatarUrl(null);
                          } else {
                            // Emoji / avatar icon badge
                            setAvatarUrl(null);
                            setFullName((prev) => prev || "Reviewer");
                          }
                        }}
                      >
                        {preset.icon && <span className="preset-icon">{preset.icon}</span>}
                        {preset.color && (
                          <span
                            className="preset-dot"
                            style={{ backgroundColor: preset.color }}
                          />
                        )}
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Input Fields: Display Name & Email */}
              <div className="qb-settings-form-grid">
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
                </div>

                <div className="qb-settings-field">
                  <label htmlFor="settings-email" className="qb-settings-label">
                    Account Email
                  </label>
                  <div className="qb-settings-input-wrap readonly">
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
                onClick={onBackToMain}
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
    </div>
  );
}
