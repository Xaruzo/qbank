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
  Upload,
  FileJson,
  EllipsisVertical,
  Ban,
  UserX,
  Trash,
  ShieldOff,
  Archive,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import type {
  AdminPermissionKey,
  AdminPermissions,
  SettingsPageProps,
  UserRole,
  UserRoleRecord,
  SelectOption,
} from "../../types";
import { useOverlayDialogA11y } from "../../controllers/useOverlayDialogA11y";
import AvatarStudio from "./AvatarStudio";
import CustomSelect from "./CustomSelect";
import ModernDatePicker from "./ModernDatePicker";
import ChangePasswordModal from "./ChangePasswordModal";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  ALL_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  rolesModel,
} from "../../models/rolesModel";
import { getDaysUntilExam } from "../../models/masteryModel";
import {
  exportQuestionsJson,
  parseImportedQuestions,
  type ImportParseResult,
} from "../../utils/questionImportExport";

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

const PERMISSION_CATEGORIES = [
  "Question Bank",
  "Moderation & Imports",
  "Administration",
] as const;

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
  canManageRoles = isSuperAdmin,
  canModerateUsers = isSuperAdmin || isQuestionAdmin,
  canBulkImport = isQuestionAdmin,
  totalQuestions = 0,
  mockAttemptsCount = 0,
  favoritesCount = 0,
  notesCount = 0,
  questions = [],
  onImportQuestions,
  onBackToMain,
}: SettingsPageProps) {
  const canViewRolesTab = Boolean(isSuperAdmin || canManageRoles || canModerateUsers);
  const canEditAdminTemplate = Boolean(isSuperAdmin || canManageRoles);
  const allowBulkImport = Boolean(isSuperAdmin || canBulkImport);

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState<string>(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (activeTab === "roles" && !canViewRolesTab) {
      setActiveTab("identity");
      onTabChange?.("identity");
    }
  }, [activeTab, canViewRolesTab, onTabChange]);

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
      const container = navContainerRef.current;
      if (currentItem && container) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = currentItem.getBoundingClientRect();
        setIndicatorStyle({
          top: itemRect.top - containerRect.top + container.scrollTop,
          left: itemRect.left - containerRect.left + container.scrollLeft,
          width: itemRect.width,
          height: itemRect.height,
        });
      }
    };

    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && navContainerRef.current
        ? new ResizeObserver(() => updateIndicator())
        : null;
    if (resizeObserver && navContainerRef.current) {
      resizeObserver.observe(navContainerRef.current);
    }
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateIndicator);
      resizeObserver?.disconnect();
    };
  }, [activeTab, isLiteMode, isSuperAdmin, isQuestionAdmin, canViewRolesTab]);

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
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportParseResult | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // User Roles Management State
  const [usersList, setUsersList] = useState<UserRoleRecord[]>(() => rolesModel.getAllUsers());
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "superadmin" | "admin" | "reviewer" | "banned" | "deleted"
  >("all");
  const [newRoleEmail, setNewRoleEmail] = useState("");
  const [newRoleSelect, setNewRoleSelect] = useState<UserRole>("admin");
  const [roleNotice, setRoleNotice] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Portaled Row Action Menu & Account Moderation Modal State
  const rosterScrollRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const moderationDialogRef = useRef<HTMLDivElement>(null);
  const [openActionMenu, setOpenActionMenu] = useState<{
    record: UserRoleRecord;
    top: number;
    left: number;
    placeAbove: boolean;
  } | null>(null);
  const [moderationTarget, setModerationTarget] = useState<{
    record: UserRoleRecord;
    action: "ban" | "soft-delete" | "permanent-delete";
  } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [isModerating, setIsModerating] = useState(false);

  // Discord-style Admin Role Permissions & Per-Admin Override Modal State
  const [defaultAdminPerms, setDefaultAdminPerms] = useState<AdminPermissions>(() =>
    rolesModel.getDefaultAdminPermissions()
  );
  const [isAdminTemplateExpanded, setIsAdminTemplateExpanded] = useState(false);
  const [permissionEditorTarget, setPermissionEditorTarget] = useState<UserRoleRecord | null>(null);
  const [draftUserPerms, setDraftUserPerms] = useState<AdminPermissions>(
    DEFAULT_ADMIN_PERMISSIONS
  );
  const [isSavingUserPerms, setIsSavingUserPerms] = useState(false);
  const permissionDialogRef = useRef<HTMLDivElement>(null);

  const closeModerationModal = () => {
    if (isModerating) return;
    setModerationTarget(null);
    setModerationReason("");
  };

  const closePermissionModal = () => {
    if (isSavingUserPerms) return;
    setPermissionEditorTarget(null);
  };

  useOverlayDialogA11y(!!moderationTarget, closeModerationModal, moderationDialogRef);
  useOverlayDialogA11y(!!permissionEditorTarget, closePermissionModal, permissionDialogRef);

  useEffect(() => {
    if (!openActionMenu) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        actionMenuRef.current?.contains(target) ||
        actionTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpenActionMenu(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenActionMenu(null);
        actionTriggerRef.current?.focus();
      }
    };

    const handleDismiss = () => setOpenActionMenu(null);
    const scrollEl = rosterScrollRef.current;

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleDismiss);
    scrollEl?.addEventListener("scroll", handleDismiss, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleDismiss);
      scrollEl?.removeEventListener("scroll", handleDismiss);
    };
  }, [openActionMenu]);

  const handleToggleActionMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    record: UserRoleRecord
  ) => {
    e.stopPropagation();
    const trigger = e.currentTarget;
    if (openActionMenu?.record.email === record.email) {
      setOpenActionMenu(null);
      return;
    }

    actionTriggerRef.current = trigger;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 228;
    const estimatedHeight = 176;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    const rawLeft = rect.right - menuWidth;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12));
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

    setOpenActionMenu({ record, top, left, placeAbove });
  };

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
    setDefaultAdminPerms(rolesModel.getDefaultAdminPermissions());
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

  const handleToggleDefaultAdminPerm = (key: AdminPermissionKey) => {
    if (!canEditAdminTemplate) return;
    const next: AdminPermissions = {
      ...defaultAdminPerms,
      [key]: !defaultAdminPerms[key],
    };
    const saved = rolesModel.saveDefaultAdminPermissions(next, false);
    setDefaultAdminPerms(saved);
    const label =
      ADMIN_PERMISSION_DEFINITIONS.find((d) => d.key === key)?.label || key;
    setRoleNotice({
      type: "success",
      message: `Default Admin permission "${label}" ${saved[key] ? "enabled" : "disabled"}.`,
    });
    setTimeout(() => setRoleNotice(null), 3500);
  };

  const handleResetDefaultAdminPerms = () => {
    if (!canEditAdminTemplate) return;
    const saved = rolesModel.saveDefaultAdminPermissions(DEFAULT_ADMIN_PERMISSIONS, false);
    setDefaultAdminPerms(saved);
    setRoleNotice({
      type: "success",
      message: "Default Admin permissions restored to recommended defaults.",
    });
    setTimeout(() => setRoleNotice(null), 3500);
  };

  const handleApplyDefaultPermsToAllAdmins = async () => {
    if (!canEditAdminTemplate) return;
    const saved = rolesModel.saveDefaultAdminPermissions(defaultAdminPerms, true);
    setDefaultAdminPerms(saved);
    await refreshUsersList();
    setRoleNotice({
      type: "success",
      message: "Default Admin permissions synced across all active Admin accounts.",
    });
    setTimeout(() => setRoleNotice(null), 4000);
  };

  const openUserPermissionsModal = (record: UserRoleRecord) => {
    if (!canEditAdminTemplate || record.role !== "admin") return;
    const summary = rolesModel.getPermissionSummary(record);
    setDraftUserPerms({ ...summary.resolved });
    setPermissionEditorTarget(record);
    setOpenActionMenu(null);
  };

  const handleSaveUserPermissions = async (permsToSave: AdminPermissions | null) => {
    if (!permissionEditorTarget || !canEditAdminTemplate || isSavingUserPerms) return;
    setIsSavingUserPerms(true);
    setRoleNotice(null);
    try {
      const res = await rolesModel.updateUserPermissions(
        permissionEditorTarget.email,
        permsToSave,
        { email: profile?.email, fullName: profile?.fullName },
        permissionEditorTarget.fullName
      );
      if (res.success) {
        setRoleNotice({
          type: res.warning ? "warning" : "success",
          message: res.warning
            ? `Permissions updated for ${permissionEditorTarget.email} (${res.warning})`
            : permsToSave === null
              ? `${permissionEditorTarget.email} reset to Admin Role defaults.`
              : `Saved granular permissions for ${permissionEditorTarget.email}.`,
        });
        await refreshUsersList();
        setPermissionEditorTarget(null);
        setTimeout(() => setRoleNotice(null), res.warning ? 8500 : 4000);
      } else {
        setRoleNotice({
          type: "error",
          message: res.error || "Failed to update permissions.",
        });
      }
    } finally {
      setIsSavingUserPerms(false);
    }
  };

  const handleAssignRole = async (targetEmail: string, roleToAssign: UserRole, targetName?: string) => {
    setRoleNotice(null);
    if (!canEditAdminTemplate) {
      setRoleNotice({ type: "error", message: "You do not have permission to assign roles." });
      return;
    }
    if (!isSuperAdmin && roleToAssign === "superadmin") {
      setRoleNotice({ type: "error", message: "Only a Superadmin can assign the Superadmin role." });
      return;
    }
    const existingTarget = usersList.find(
      (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
    );
    if (!isSuperAdmin && existingTarget?.role === "superadmin") {
      setRoleNotice({ type: "error", message: "Only a Superadmin can modify another Superadmin account." });
      return;
    }
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
    setOpenActionMenu(null);
    if (!canEditAdminTemplate) {
      setRoleNotice({ type: "error", message: "You do not have permission to revoke roles." });
      return;
    }
    const existingTarget = usersList.find(
      (u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase()
    );
    if (!isSuperAdmin && existingTarget?.role === "superadmin") {
      setRoleNotice({ type: "error", message: "Only a Superadmin can revoke another Superadmin role." });
      return;
    }
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

  const handleRestoreUser = async (record: UserRoleRecord) => {
    setRoleNotice(null);
    setOpenActionMenu(null);
    const res = await rolesModel.setUserStatus(
      record.email,
      "active",
      { email: profile?.email, fullName: profile?.fullName },
      undefined,
      record.fullName
    );
    if (res.success) {
      setRoleNotice({
        type: res.warning ? "warning" : "success",
        message: res.warning
          ? `Account restored for ${record.email} (${res.warning})`
          : `Account restored for ${record.email}. Standard Reviewer access is active.`,
      });
      await refreshUsersList();
      setTimeout(() => setRoleNotice(null), res.warning ? 9000 : 4000);
    } else {
      setRoleNotice({ type: "error", message: res.error || "Failed to restore account." });
    }
  };

  const handleConfirmModeration = async () => {
    if (!moderationTarget || isModerating) return;
    setIsModerating(true);
    setRoleNotice(null);
    const { record, action } = moderationTarget;
    const actor = { email: profile?.email, fullName: profile?.fullName };

    try {
      if (action === "permanent-delete") {
        const res = await rolesModel.permanentlyDeleteUser(record.email, actor);
        if (res.success) {
          setRoleNotice({
            type: res.warning ? "warning" : "success",
            message: res.warning
              ? `Account ${record.email} removed locally (${res.warning})`
              : `Account ${record.email} has been permanently deleted.`,
          });
          await refreshUsersList();
          setModerationTarget(null);
          setModerationReason("");
          setTimeout(() => setRoleNotice(null), res.warning ? 9000 : 4500);
        } else {
          setRoleNotice({ type: "error", message: res.error || "Failed to permanently delete user." });
        }
        return;
      }

      const nextStatus = action === "ban" ? "banned" : "deleted";
      const res = await rolesModel.setUserStatus(
        record.email,
        nextStatus,
        actor,
        moderationReason,
        record.fullName
      );
      if (res.success) {
        const baseMsg =
          action === "ban"
            ? `Account ${record.email} has been suspended and blocked from signing in.`
            : `Account ${record.email} was moved to Removed and can be restored anytime.`;
        setRoleNotice({
          type: res.warning ? "warning" : "success",
          message: res.warning ? `${baseMsg} (${res.warning})` : baseMsg,
        });
        await refreshUsersList();
        setModerationTarget(null);
        setModerationReason("");
        setTimeout(() => setRoleNotice(null), res.warning ? 9000 : 4500);
      } else {
        setRoleNotice({ type: "error", message: res.error || "Failed to update account status." });
      }
    } finally {
      setIsModerating(false);
    }
  };

  const bannedCount = usersList.filter((u) => (u.status || "active") === "banned").length;
  const removedCount = usersList.filter((u) => (u.status || "active") === "deleted").length;
  const activeOrBannedCount = usersList.length - removedCount;

  const filteredUsers = usersList.filter((u) => {
    const status = u.status || "active";
    if (roleFilter === "banned") {
      if (status !== "banned") return false;
    } else if (roleFilter === "deleted") {
      if (status !== "deleted") return false;
    } else {
      if (status === "deleted") return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
    }
    if (roleSearch.trim()) {
      const q = roleSearch.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      );
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

  const daysRemaining = getDaysUntilExam(examDate);

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

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportStatus(null);
    try {
      const text = await file.text();
      const parsed = parseImportedQuestions(text, file.name, questions);
      setImportFileName(file.name);
      setImportPreview(parsed);
    } catch (err) {
      setImportPreview(null);
      setImportFileName("");
      setImportStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Could not read selected file.",
      });
    }
  };

  const handleConfirmImport = async () => {
    if (!onImportQuestions || !importPreview || importPreview.valid.length === 0 || isImporting) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const result = await onImportQuestions(importPreview.valid);
      const importedCount = typeof result === "number" ? result : result?.added ?? importPreview.valid.length;
      const syncedCount = typeof result === "object" && result ? result.synced : 0;
      setImportStatus({
        type: "success",
        message: `Imported ${importedCount} question${importedCount === 1 ? "" : "s"} into the Question Bank${syncedCount > 0 ? ` (${syncedCount} synced to cloud)` : ""}.`,
      });
      setImportPreview(null);
      setImportFileName("");
    } catch (err) {
      setImportStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Bulk import failed.",
      });
    } finally {
      setIsImporting(false);
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

          {canViewRolesTab && (
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
                <span className="qb-settings-nav-item-sub">Role permissions & roster</span>
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
                  <ModernDatePicker
                    id="settings-exam-date"
                    value={examDate}
                    onChange={setExamDate}
                    placeholder="Select scheduled exam date"
                  />
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

              {/* Bulk Question Bank Import & Export */}
              <div className="qb-settings-bank-io-card">
                <div className="qb-settings-bank-io-head">
                  <div className="qb-settings-bank-io-title-group">
                    <FileJson size={18} className="qb-settings-bank-io-ico" />
                    <div>
                      <h4 className="font-semibold text-sm text-heading">Question Bank Import & Export</h4>
                      <p className="text-xs text-muted">
                        Export all <span className="tabular-nums">{questions.length}</span> bank items as JSON{allowBulkImport ? ", or bulk-import validated .json / .csv question sets." : "."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="qb-settings-storage-actions-row">
                  <button
                    type="button"
                    className="qb-settings-action-pill"
                    onClick={() => exportQuestionsJson(questions)}
                    disabled={questions.length === 0}
                  >
                    <Download size={14} />
                    <span>Export Question Bank (.json)</span>
                  </button>

                  {allowBulkImport && onImportQuestions && (
                    <>
                      <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".json,.csv,application/json,text/csv"
                        onChange={handleImportFileSelect}
                        style={{ display: "none" }}
                        aria-label="Import questions file"
                      />
                      <button
                        type="button"
                        className="qb-settings-action-pill"
                        onClick={() => importFileInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Import .json / .csv</span>
                      </button>
                    </>
                  )}
                </div>

                {allowBulkImport && onImportQuestions && (
                  <p className="qb-settings-bank-io-hint">
                    CSV columns: <code>topic, label, question, choiceA, choiceB, choiceC, choiceD, [choiceE], correct, [solution]</code> (<code>correct</code> accepts A–E or 0–4).
                  </p>
                )}

                {importStatus && (
                  <div className={`qb-settings-bank-io-notice ${importStatus.type}`}>
                    {importStatus.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{importStatus.message}</span>
                  </div>
                )}

                {importPreview && (
                  <div className="qb-settings-import-preview">
                    <div className="qb-settings-import-summary">
                      <div className="qb-settings-import-filename">{importFileName}</div>
                      <div className="qb-settings-import-counts">
                        <span className="is-valid tabular-nums">{importPreview.valid.length} ready</span>
                        {importPreview.duplicateCount > 0 && (
                          <span className="is-dup tabular-nums">{importPreview.duplicateCount} duplicate{importPreview.duplicateCount === 1 ? "" : "s"} skipped</span>
                        )}
                        {importPreview.errors.length > 0 && (
                          <span className="is-err tabular-nums">{importPreview.errors.length} error{importPreview.errors.length === 1 ? "" : "s"}</span>
                        )}
                      </div>
                    </div>

                    {importPreview.errors.length > 0 && (
                      <ul className="qb-settings-import-errors">
                        {importPreview.errors.slice(0, 5).map((errMsg, idx) => (
                          <li key={idx}>{errMsg}</li>
                        ))}
                        {importPreview.errors.length > 5 && (
                          <li>+{importPreview.errors.length - 5} more validation error(s)</li>
                        )}
                      </ul>
                    )}

                    <div className="qb-settings-import-actions">
                      <button
                        type="button"
                        className="qb-settings-footer-cancel-btn"
                        onClick={() => {
                          setImportPreview(null);
                          setImportFileName("");
                        }}
                        disabled={isImporting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="qb-settings-footer-save-btn"
                        onClick={handleConfirmImport}
                        disabled={importPreview.valid.length === 0 || isImporting}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <span>Import {importPreview.valid.length} Question{importPreview.valid.length === 1 ? "" : "s"}</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
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

          {/* TAB 5: ROLES & ACCESS CONTROL (SUPERADMIN / PERMITTED ADMIN) */}
          {activeTab === "roles" && canViewRolesTab && (
            <div className="qb-settings-panel-section">
              <div className="qb-settings-section-head">
                <div className="flex items-center gap-2">
                  <Crown size={22} className="text-amber-400" />
                  <h2 className="qb-settings-section-title">User Roles & Access Control</h2>
                </div>
                <p className="qb-settings-section-desc">
                  Assign Superadmin or Admin roles, choose granular Discord-style permissions for Admins, and moderate reviewer accounts.
                </p>
              </div>

              {roleNotice && (
                <div className={`qb-settings-role-notice ${roleNotice.type}`}>
                  {roleNotice.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{roleNotice.message}</span>
                </div>
              )}

              {/* Quick Role Assignment Card */}
              {canEditAdminTemplate && (
                <div className="qb-settings-role-grant-card">
                  <div className="qb-settings-role-grant-head">
                    <UserPlus size={18} className="text-amber-400" />
                    <div>
                      <h3 className="font-semibold text-sm text-heading">Grant or Assign User Role</h3>
                      <p className="text-xs text-muted">
                        Enter an account email to assign Admin privileges or configure their role tier.
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
                      options={
                        isSuperAdmin
                          ? ROLE_GRANT_OPTIONS
                          : ROLE_GRANT_OPTIONS.filter((opt) => opt.value !== "superadmin")
                      }
                      className="qb-settings-role-select-wrap"
                      showCheckmark
                      portal
                      minMenuWidth={320}
                    />
                    <button type="submit" className="qb-settings-role-grant-btn">
                      <UserPlus size={16} />
                      <span>Assign Role</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Discord-Style Default Admin Role Permissions Card */}
              {canEditAdminTemplate && (
                <div className="rounded-xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-400/30 bg-purple-400/12 text-purple-400 light:border-purple-600/25 light:bg-purple-50 light:text-purple-700">
                        <SlidersHorizontal size={17} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <h3 className="text-sm font-bold text-qb-heading">
                            Admin Role Permissions
                          </h3>
                          <span className="text-xs font-medium text-qb-muted tabular-nums">
                            {Object.values(defaultAdminPerms).filter(Boolean).length} /{" "}
                            {ADMIN_PERMISSION_DEFINITIONS.length} enabled by default
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-qb-muted">
                          Choose what standard Admins can do across the platform, or customize individual Admins in the roster below.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAdminTemplateExpanded((prev) => !prev)}
                      aria-expanded={isAdminTemplateExpanded}
                      aria-label={
                        isAdminTemplateExpanded
                          ? "Hide Admin role permissions"
                          : "Configure Admin role permissions"
                      }
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-qb-border bg-qb-input px-2.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer whitespace-nowrap"
                    >
                      <span>{isAdminTemplateExpanded ? "Hide" : "Configure"}</span>
                      {isAdminTemplateExpanded ? (
                        <ChevronUp size={14} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={14} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {isAdminTemplateExpanded && (
                    <div className="space-y-3 border-t border-qb-border pt-3.5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleResetDefaultAdminPerms}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-qb-border bg-qb-input px-3 py-1.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                          <span>Reset Defaults</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyDefaultPermsToAllAdmins}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-1.5 text-xs font-semibold text-amber-400 light:text-amber-700 transition-colors hover:bg-amber-500/20 cursor-pointer whitespace-nowrap"
                        >
                          <Check size={13} aria-hidden="true" />
                          <span>Apply to All Admins</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {PERMISSION_CATEGORIES.map((category) => {
                        const items = ADMIN_PERMISSION_DEFINITIONS.filter(
                          (d) => d.category === category
                        );
                        return (
                          <div
                            key={category}
                            className="rounded-xl border border-qb-border bg-qb-input p-3.5 space-y-2.5"
                          >
                            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-qb-muted pb-1 border-b border-qb-border">
                              {category}
                            </div>
                            <div className="divide-y divide-qb-border/70">
                              {items.map((perm) => {
                                const enabled = !!defaultAdminPerms[perm.key];
                                return (
                                  <div
                                    key={perm.key}
                                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0.5 last:pb-0.5"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-qb-heading">
                                          {perm.label}
                                        </span>
                                        {perm.sensitive && (
                                          <span className="text-[10px] font-semibold text-amber-400 light:text-amber-700">
                                            · Elevated
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-[11.5px] leading-snug text-qb-muted">
                                        {perm.description}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={enabled}
                                      aria-label={`Toggle default ${perm.label} permission`}
                                      onClick={() => handleToggleDefaultAdminPerm(perm.key)}
                                      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                                        enabled
                                          ? "border-emerald-500/60 bg-emerald-500 light:border-emerald-600 light:bg-emerald-600"
                                          : "border-qb-border bg-slate-700/70 light:bg-slate-300"
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                                          enabled ? "translate-x-[18px]" : "translate-x-[2px]"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    aria-label="Filter accounts by role or status"
                  >
                    {(
                      [
                        { id: "all", label: "All Accounts" },
                        { id: "superadmin", label: "Superadmin" },
                        { id: "admin", label: "Admin" },
                        { id: "reviewer", label: "Reviewer" },
                        { id: "banned", label: "Banned", count: bannedCount },
                        { id: "deleted", label: "Removed", count: removedCount },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={roleFilter === tab.id}
                        className={`qb-settings-roster-filter-chip${roleFilter === tab.id ? " active" : ""}${
                          tab.id === "banned" && tab.count > 0 ? " has-warning" : ""
                        }`}
                        onClick={() => setRoleFilter(tab.id)}
                      >
                        <span>{tab.label}</span>
                        {"count" in tab && tab.count > 0 && (
                          <span className="qb-filter-chip-count tabular-nums">{tab.count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="qb-settings-users-table-wrap min-[901px]:[--qb-roster-cols:minmax(195px,1.65fr)_minmax(128px,0.88fr)_minmax(130px,0.9fr)_minmax(268px,1.45fr)]"
                  role="table"
                  aria-label="Registered user accounts and role assignments"
                >
                  {/* Fixed Column Header (never overlapped by list scrollbar) */}
                  <div className="qb-roster-head" role="rowgroup">
                    <div className="qb-roster-head-row" role="row">
                      <div className="qb-roster-th" role="columnheader">USER ACCOUNT</div>
                      <div className="qb-roster-th" role="columnheader">ROLE &amp; STATUS</div>
                      <div className="qb-roster-th" role="columnheader">UPDATED</div>
                      <div className="qb-roster-th" role="columnheader">ACTIONS</div>
                    </div>
                  </div>

                  {/* Scrollable List Body (ONLY this region scrolls vertically) */}
                  <div ref={rosterScrollRef} className="qb-roster-list-scroll" role="rowgroup">
                    {!isUsersLoading &&
                      filteredUsers.map((uRecord) => {
                        const status = uRecord.status || "active";
                        const isRestricted = status === "banned" || status === "deleted";
                        const isRootSuper = uRecord.email.toLowerCase() === "xaruzowarlord@gmail.com";
                        const isTargetSuper = uRecord.role === "superadmin";
                        const canActorModifyTarget = isSuperAdmin || !isTargetSuper;
                        const isCurrentUser =
                          !!profile?.email &&
                          uRecord.email.toLowerCase() === profile.email.trim().toLowerCase();
                        const permSummary =
                          uRecord.role === "admin" && !isRestricted
                            ? rolesModel.getPermissionSummary(uRecord)
                            : null;
                        const hasPerAdminPermButton =
                          canEditAdminTemplate && uRecord.role === "admin" && !isRestricted;
                        const hasKebabActions =
                          !isRootSuper &&
                          canActorModifyTarget &&
                          ((canEditAdminTemplate && uRecord.role !== "reviewer" && !isRestricted) ||
                            (canModerateUsers && !isCurrentUser));
                        const dateIso = uRecord.statusUpdatedAt || uRecord.assignedAt;
                        const assignedDateText = new Date(dateIso).toLocaleDateString();
                        const assignedByText = `by ${
                          uRecord.statusUpdatedBy || uRecord.assignedBy || "System"
                        }`;
                        return (
                          <div
                            key={uRecord.email}
                            className={`qb-roster-row${isRestricted ? ` is-${status}` : ""}`}
                            role="row"
                          >
                            <div className="qb-roster-cell qb-roster-cell-user" role="cell">
                              <div className="qb-user-cell">
                                <div
                                  className={`qb-user-cell-avatar role-${uRecord.role}${
                                    isRestricted ? " is-muted" : ""
                                  }`}
                                >
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
                                  <div className="qb-user-cell-name-row">
                                    <span className="qb-user-cell-name" title={uRecord.fullName}>
                                      {uRecord.fullName}
                                    </span>
                                    {isCurrentUser && <span className="qb-user-you-tag">You</span>}
                                  </div>
                                  <span className="qb-user-cell-email" title={uRecord.email}>
                                    {uRecord.email}
                                  </span>
                                  {isRestricted && uRecord.statusReason && (
                                    <span
                                      className="qb-user-status-reason"
                                      title={uRecord.statusReason}
                                    >
                                      Reason: {uRecord.statusReason}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="qb-roster-cell qb-roster-cell-role" role="cell">
                              <div className="qb-role-status-stack">
                                <span
                                  className={`qb-role-pill role-${uRecord.role}${
                                    isRestricted ? " is-muted" : ""
                                  }`}
                                >
                                  {uRecord.role === "superadmin" && <Crown size={12} />}
                                  {uRecord.role === "admin" && <ShieldCheck size={12} />}
                                  <span>{uRecord.role.toUpperCase()}</span>
                                </span>
                                {status === "banned" && (
                                  <span className="qb-status-pill is-banned">
                                    <Ban size={11} />
                                    <span>Banned</span>
                                  </span>
                                )}
                                {status === "deleted" && (
                                  <span className="qb-status-pill is-deleted">
                                    <Archive size={11} />
                                    <span>Removed</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="qb-roster-cell qb-roster-cell-assigned" role="cell">
                              <div className="qb-user-assigned-cell">
                                <span className="qb-user-assigned-date tabular-nums">
                                  {assignedDateText}
                                </span>
                                <span className="qb-user-assigned-by" title={assignedByText}>
                                  {assignedByText}
                                </span>
                              </div>
                            </div>

                            <div className="qb-roster-cell qb-roster-cell-actions" role="cell">
                              {isRootSuper ? (
                                <span className="qb-root-superadmin-label">
                                  Primary Root Superadmin
                                </span>
                              ) : !canActorModifyTarget ? (
                                <span className="text-xs font-medium text-qb-muted">
                                  Superadmin Protected
                                </span>
                              ) : isRestricted ? (
                                <div className="qb-user-role-actions">
                                  {canModerateUsers ? (
                                    <button
                                      type="button"
                                      className="qb-user-restore-btn"
                                      onClick={() => handleRestoreUser(uRecord)}
                                    >
                                      <RotateCcw size={13} />
                                      <span>Restore</span>
                                    </button>
                                  ) : (
                                    <span className="qb-table-role-readonly text-xs font-semibold text-qb-muted px-2">
                                      {status === "banned" ? "BANNED" : "REMOVED"}
                                    </span>
                                  )}
                                  <span className="qb-user-perm-slot" aria-hidden="true" />
                                  <span className="qb-user-kebab-slot">
                                    {hasKebabActions && (
                                      <button
                                        type="button"
                                        className={`qb-user-kebab-btn${
                                          openActionMenu?.record.email === uRecord.email
                                            ? " is-open"
                                            : ""
                                        }`}
                                        aria-label={`More actions for ${uRecord.email}`}
                                        aria-haspopup="menu"
                                        aria-expanded={openActionMenu?.record.email === uRecord.email}
                                        onClick={(e) => handleToggleActionMenu(e, uRecord)}
                                      >
                                        <EllipsisVertical size={15} />
                                      </button>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="qb-user-role-actions">
                                  {canEditAdminTemplate ? (
                                    <CustomSelect
                                      value={uRecord.role}
                                      onChange={(val) =>
                                        handleAssignRole(uRecord.email, val as UserRole, uRecord.fullName)
                                      }
                                      options={
                                        isSuperAdmin
                                          ? QUICK_ROLE_OPTIONS
                                          : QUICK_ROLE_OPTIONS.filter(
                                              (opt) => opt.value !== "superadmin"
                                            )
                                      }
                                      className="qb-table-role-select"
                                      showCheckmark
                                      portal
                                      minMenuWidth={196}
                                    />
                                  ) : (
                                    <span className="qb-table-role-readonly text-xs font-semibold text-qb-mid px-2">
                                      {uRecord.role.toUpperCase()}
                                    </span>
                                  )}
                                  <span className="qb-user-perm-slot">
                                    {hasPerAdminPermButton && permSummary ? (
                                      <button
                                        type="button"
                                        onClick={() => openUserPermissionsModal(uRecord)}
                                        title={
                                          permSummary.isCustom
                                            ? `Custom Admin permissions (${permSummary.granted}/${permSummary.total})`
                                            : `Configure Admin permissions (${permSummary.granted}/${permSummary.total})`
                                        }
                                        aria-label={`Configure permissions for ${uRecord.email}`}
                                        className={`inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                                          permSummary.isCustom
                                            ? "border-amber-500/45 bg-amber-500/14 text-amber-400 light:border-amber-600/40 light:bg-amber-50 light:text-amber-700 hover:bg-amber-500/22"
                                            : "border-qb-border bg-qb-surface text-qb-mid hover:border-qb-border-hover hover:text-qb-heading"
                                        }`}
                                      >
                                        <SlidersHorizontal size={13} aria-hidden="true" />
                                        <span>
                                          {permSummary.granted}/{permSummary.total}
                                        </span>
                                      </button>
                                    ) : null}
                                  </span>
                                  <span className="qb-user-kebab-slot">
                                    {hasKebabActions && (
                                      <button
                                        type="button"
                                        className={`qb-user-kebab-btn${
                                          openActionMenu?.record.email === uRecord.email
                                            ? " is-open"
                                            : ""
                                        }`}
                                        aria-label={`Account actions for ${uRecord.email}`}
                                        aria-haspopup="menu"
                                        aria-expanded={openActionMenu?.record.email === uRecord.email}
                                        onClick={(e) => handleToggleActionMenu(e, uRecord)}
                                      >
                                        <EllipsisVertical size={15} />
                                      </button>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

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
                          {roleFilter === "banned" && !roleSearch.trim()
                            ? "No suspended accounts"
                            : roleFilter === "deleted" && !roleSearch.trim()
                              ? "No removed accounts"
                              : roleFilter !== "all" && !roleSearch.trim()
                                ? `No ${roleFilter.toUpperCase()} accounts found`
                                : "No matching accounts"}
                        </p>
                        <p className="qb-roster-state-desc">
                          {roleFilter === "banned"
                            ? "Accounts suspended via the account actions menu will appear here."
                            : roleFilter === "deleted"
                              ? "Soft-deleted accounts are archived here and can be restored anytime."
                              : roleFilter !== "all" || roleSearch.trim()
                                ? "Try adjusting your filter or search query to view other registered accounts."
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
                </div>

                <div className="qb-settings-roster-footer">
                  <span className="qb-settings-roster-count tabular-nums">
                    Showing {filteredUsers.length} of{" "}
                    {roleFilter === "deleted" ? removedCount : activeOrBannedCount}{" "}
                    {roleFilter === "deleted"
                      ? removedCount === 1
                        ? "removed account"
                        : "removed accounts"
                      : activeOrBannedCount === 1
                        ? "account"
                        : "accounts"}
                    {roleFilter !== "deleted" && removedCount > 0 && (
                      <span className="qb-roster-archived-hint"> · {removedCount} removed</span>
                    )}
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

      {/* Portaled Row Kebab Action Menu */}
      {openActionMenu &&
        createPortal(
          <div
            ref={actionMenuRef}
            role="menu"
            aria-label={`Actions for ${openActionMenu.record.email}`}
            className={`qb-user-action-menu${openActionMenu.placeAbove ? " is-above" : ""}`}
            style={{
              top: openActionMenu.top,
              left: openActionMenu.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const target = openActionMenu.record;
              const status = target.status || "active";
              const isSelf =
                !!profile?.email &&
                target.email.toLowerCase() === profile.email.trim().toLowerCase();

              if (status === "active") {
                return (
                  <>
                    {canEditAdminTemplate && target.role === "admin" && (
                      <button
                        type="button"
                        role="menuitem"
                        className="qb-user-action-item"
                        onClick={() => openUserPermissionsModal(target)}
                      >
                        <SlidersHorizontal size={14} />
                        <span>Configure Permissions</span>
                      </button>
                    )}
                    {canEditAdminTemplate && target.role !== "reviewer" && (
                      <button
                        type="button"
                        role="menuitem"
                        className="qb-user-action-item"
                        onClick={() => handleRevokeRole(target.email)}
                      >
                        <ShieldOff size={14} />
                        <span>Revoke Admin Access</span>
                      </button>
                    )}
                    {canModerateUsers && !isSelf && target.role !== "reviewer" && (
                      <div className="qb-user-action-divider" />
                    )}
                    {canModerateUsers && !isSelf && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className="qb-user-action-item is-warning"
                          onClick={() => {
                            setOpenActionMenu(null);
                            setModerationReason("");
                            setModerationTarget({ record: target, action: "ban" });
                          }}
                        >
                          <Ban size={14} />
                          <span>Suspend / Ban Account</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="qb-user-action-item is-danger"
                          onClick={() => {
                            setOpenActionMenu(null);
                            setModerationReason("");
                            setModerationTarget({ record: target, action: "soft-delete" });
                          }}
                        >
                          <UserX size={14} />
                          <span>Remove Account</span>
                        </button>
                      </>
                    )}
                  </>
                );
              }

              return (
                <>
                  {canModerateUsers && (
                    <button
                      type="button"
                      role="menuitem"
                      className="qb-user-action-item is-success"
                      onClick={() => handleRestoreUser(target)}
                    >
                      <RotateCcw size={14} />
                      <span>Restore Account</span>
                    </button>
                  )}
                  {canModerateUsers && !isSelf && status === "banned" && (
                    <button
                      type="button"
                      role="menuitem"
                      className="qb-user-action-item"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setModerationReason(target.statusReason || "");
                        setModerationTarget({ record: target, action: "soft-delete" });
                      }}
                    >
                      <Archive size={14} />
                      <span>Move to Removed</span>
                    </button>
                  )}
                  {canModerateUsers && !isSelf && status === "deleted" && (
                    <button
                      type="button"
                      role="menuitem"
                      className="qb-user-action-item is-warning"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setModerationReason(target.statusReason || "");
                        setModerationTarget({ record: target, action: "ban" });
                      }}
                    >
                      <Ban size={14} />
                      <span>Suspend / Ban Email</span>
                    </button>
                  )}
                  {canModerateUsers && !isSelf && (
                    <>
                      <div className="qb-user-action-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="qb-user-action-item is-danger"
                        onClick={() => {
                          setOpenActionMenu(null);
                          setModerationReason("");
                          setModerationTarget({ record: target, action: "permanent-delete" });
                        }}
                      >
                        <Trash size={14} />
                        <span>Delete Permanently</span>
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>,
          document.body
        )}

      {/* Account Moderation Confirmation Modal */}
      {moderationTarget &&
        createPortal(
          <div className="qb-modal-backdrop" onClick={closeModerationModal}>
            <div
              ref={moderationDialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="moderation-dialog-title"
              className="qb-mod-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="qb-mod-modal-head">
                <div className={`qb-mod-modal-icon is-${moderationTarget.action}`}>
                  {moderationTarget.action === "ban" && <Ban size={20} />}
                  {moderationTarget.action === "soft-delete" && <UserX size={20} />}
                  {moderationTarget.action === "permanent-delete" && <Trash size={20} />}
                </div>
                <div className="qb-mod-modal-copy">
                  <h3 id="moderation-dialog-title" className="qb-mod-modal-title">
                    {moderationTarget.action === "ban"
                      ? "Suspend & Ban Account?"
                      : moderationTarget.action === "soft-delete"
                        ? "Remove Account?"
                        : "Permanently Delete Account?"}
                  </h3>
                  <p className="qb-mod-modal-desc">
                    {moderationTarget.action === "ban"
                      ? "This user will be signed out immediately and blocked from signing in or re-registering with this email. You can restore access anytime."
                      : moderationTarget.action === "soft-delete"
                        ? "This account will be archived to the Removed tab, stripped of admin roles, and blocked from signing in. You can restore it later if needed."
                        : "This permanently deletes the user's role record, local credentials, and server auth profile when configured. This action cannot be undone."}
                  </p>
                </div>
              </div>

              <div className="qb-mod-user-strip">
                <div className="qb-user-cell-avatar">
                  <span>{moderationTarget.record.fullName.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="qb-user-cell-info">
                  <span className="qb-user-cell-name">{moderationTarget.record.fullName}</span>
                  <span className="qb-user-cell-email">{moderationTarget.record.email}</span>
                </div>
              </div>

              {moderationTarget.action !== "permanent-delete" && (
                <div className="qb-mod-reason-field">
                  <label htmlFor="qb-mod-reason-input" className="qb-mod-reason-label">
                    Reason (optional)
                  </label>
                  <input
                    id="qb-mod-reason-input"
                    type="text"
                    className="qb-mod-reason-input"
                    placeholder={
                      moderationTarget.action === "ban"
                        ? "e.g. Policy violation or suspicious activity"
                        : "e.g. Offboarded staff or inactive account"
                    }
                    value={moderationReason}
                    maxLength={140}
                    onChange={(e) => setModerationReason(e.target.value)}
                  />
                </div>
              )}

              <div className="qb-mod-modal-actions">
                <button
                  type="button"
                  className="qb-modal-btn qb-modal-btn-cancel"
                  onClick={closeModerationModal}
                  disabled={isModerating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`qb-mod-confirm-btn is-${moderationTarget.action}`}
                  onClick={handleConfirmModeration}
                  disabled={isModerating}
                >
                  {isModerating ? (
                    <>
                      <Loader2 size={14} className="qb-roster-spinner" />
                      <span>Processing...</span>
                    </>
                  ) : moderationTarget.action === "ban" ? (
                    <span>Suspend Account</span>
                  ) : moderationTarget.action === "soft-delete" ? (
                    <span>Remove Account</span>
                  ) : (
                    <span>Delete Permanently</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Discord-Style Per-Admin Granular Permissions Modal */}
      {permissionEditorTarget &&
        createPortal(
          <div className="qb-modal-backdrop" onClick={closePermissionModal}>
            <div
              ref={permissionDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-perms-dialog-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-qb-border bg-qb-surface shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-qb-border px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-purple-400/16 text-xs font-bold text-purple-400 light:text-purple-700">
                    {permissionEditorTarget.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="admin-perms-dialog-title"
                      className="text-base font-bold text-qb-heading truncate"
                    >
                      Admin Permissions — {permissionEditorTarget.fullName}
                    </h3>
                    <p className="text-xs text-qb-muted truncate">
                      {permissionEditorTarget.email}
                      <span aria-hidden="true"> · </span>
                      <span className="tabular-nums font-semibold text-qb-mid">
                        {Object.values(draftUserPerms).filter(Boolean).length} of{" "}
                        {ADMIN_PERMISSION_DEFINITIONS.length} enabled
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePermissionModal}
                  aria-label="Close permissions dialog"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-qb-border bg-qb-input text-qb-muted transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {PERMISSION_CATEGORIES.map((category) => {
                  const items = ADMIN_PERMISSION_DEFINITIONS.filter(
                    (d) => d.category === category
                  );
                  return (
                    <div
                      key={category}
                      className="rounded-xl border border-qb-border bg-qb-input p-3.5 space-y-2"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-qb-muted pb-1.5 border-b border-qb-border">
                        {category}
                      </div>
                      <div className="divide-y divide-qb-border/70">
                        {items.map((perm) => {
                          const enabled = !!draftUserPerms[perm.key];
                          return (
                            <div
                              key={perm.key}
                              className="flex items-start justify-between gap-4 py-2.5 first:pt-0.5 last:pb-0.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-qb-heading">
                                    {perm.label}
                                  </span>
                                  {perm.sensitive && (
                                    <span className="text-[11px] font-semibold text-amber-400 light:text-amber-700">
                                      · Elevated
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs leading-relaxed text-qb-muted">
                                  {perm.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                aria-label={`Toggle ${perm.label} for ${permissionEditorTarget.email}`}
                                onClick={() =>
                                  setDraftUserPerms((prev) => ({
                                    ...prev,
                                    [perm.key]: !prev[perm.key],
                                  }))
                                }
                                className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                                  enabled
                                    ? "border-emerald-500/60 bg-emerald-500 light:border-emerald-600 light:bg-emerald-600"
                                    : "border-qb-border bg-slate-700/70 light:bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                                    enabled ? "translate-x-[18px]" : "translate-x-[2px]"
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-qb-border bg-qb-input/60 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftUserPerms({ ...defaultAdminPerms })}
                    disabled={isSavingUserPerms}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Use Role Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftUserPerms({ ...ALL_ADMIN_PERMISSIONS })}
                    disabled={isSavingUserPerms}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer disabled:opacity-50"
                  >
                    <Check size={13} aria-hidden="true" />
                    <span>Grant All</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closePermissionModal}
                    disabled={isSavingUserPerms}
                    className="rounded-lg border border-qb-border bg-qb-surface px-3.5 py-2 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveUserPermissions(draftUserPerms)}
                    disabled={isSavingUserPerms}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingUserPerms ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        <span>Save Permissions</span>
                      </>
                    )}
                  </button>
                </div>
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
