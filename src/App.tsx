// NOTE: Always design and style front-end UI in TypeScript (.tsx) with Tailwind CSS
// utility classes rather than writing new CSS files. Use CSS only when necessary for
// shared theme color tokens (dark mode / .light mode), global resets, or third-party styles.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./views/components/Header";
import Stats from "./views/components/Stats";
import SearchAndFilter from "./views/components/SearchAndFilter";
import QuestionList from "./views/components/QuestionList";
import QuestionDetail from "./views/components/QuestionDetail";
import SideNav from "./views/components/SideNav";
import MobileTabBar from "./views/components/MobileTabBar";
import { lazyWithRetry } from "./utils/lazyWithRetry";

import QuestionForm from "./views/components/QuestionForm";
// Route-level code splitting: heavy screens (mock exam runner,
// tips with canvas) are fetched on demand so the question bank paints fast.
const MockExam = lazyWithRetry(() => import("./views/components/MockExam"));
const MockAttemptDetail = lazyWithRetry(() => import("./views/components/MockAttemptDetail"));
const MockExamRunner = lazyWithRetry(() => import("./views/components/MockExamRunner"));
const TipsPage = lazyWithRetry(() => import("./views/components/TipsPage"));
const TipDetailPage = lazyWithRetry(() => import("./views/components/TipDetailPage"));
const NotesPage = lazyWithRetry(() => import("./views/components/NotesPage"));
const ReelsPage = lazyWithRetry(() => import("./views/components/ReelsPage"));
const DashboardPage = lazyWithRetry(() => import("./views/components/DashboardPage"));
import { MyQuestionsView } from "./views/MyQuestionsView";
import LoadingSpinner from "./views/components/LoadingSpinner";
import SkeletonLoader, { MockSkeletonLoader, TipsSkeletonLoader } from "./views/components/SkeletonLoader";
import HelpModal from "./views/components/HelpModal";
import AuthModal from "./views/components/AuthModal";
import SettingsPage from "./views/components/SettingsPage";
import TutorialGuide from "./views/components/TutorialGuide";
import LandingPage from "./views/components/LandingPage";
import SignInPage from "./views/components/SignInPage";
import CountUp from "./views/components/CountUp";
import { useAuthController } from "./controllers/useAuthController";
import { useQuestionsController } from "./controllers/useQuestionsController";
import { useThemeController } from "./controllers/useThemeController";
import { useSettingsController } from "./controllers/useSettingsController";
import { useViewRouter } from "./controllers/useViewRouter";
import { useMeterReady } from "./controllers/useMeterReady";
import { storageModel } from "./models/storageModel";
import { tipsModel } from "./models/tipsModel";
import { favoritesModel } from "./models/favoritesModel";
import { rolesModel } from "./models/rolesModel";
import { isNetworkOrFetchError } from "./utils/supabaseClient";
import {
  MASTERY_UPDATED_EVENT,
  readMasteryMap,
  recordQuestionOutcome,
  recordBatchQuestionOutcomes,
  getTodayAnsweredCount,
  getMasterySummary,
  getDaysUntilExam,
} from "./models/masteryModel";
import {
  RECENT_QUESTIONS_UPDATED_EVENT,
  readRecentQuestions,
  recordRecentQuestionOpen,
  recordRecentQuestionCheck,
  removeRecentQuestion,
  clearRecentQuestions,
  resolveRecentQuestions,
} from "./models/recentQuestionsModel";
import {
  buildMockExamAttempt,
  buildReviewExamFromAttempt,
  buildMistakeDrillExam,
  buildQuickPracticeExam,
} from "./utils/mockExamAnalytics";
import {
  Home,
  ClipboardList,
  Lightbulb,
  PlayCircle,
  ArrowRight,
  BookOpen,
  Plus,
  ShieldCheck,
  FileEdit,
  Layers,
  Flame,
  Star,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Clapperboard,
} from "lucide-react";
import { QUESTION_ADMIN_UIDS, QUESTION_ADMIN_EMAILS, EXAM_PRESETS } from "./constants/appConstants";

const PageLoader = ({ view }) => {
  if (view === "tips" || view === "tipDetail" || view === "notes") return <TipsSkeletonLoader />;
  if (view === "mock" || view === "mockAttempt" || view === "mockRun") return <MockSkeletonLoader />;
  return <SkeletonLoader />;
};

// Civil Service exam format — DO NOT TUNE DOWN.
// These mirror the official CSC Professional (170 items, 3h10m) and Subprofessional (165 items, 2h40m) formats.
// The target item count and time limits are fixed to the official specifications.
// A smaller bank temporarily yields a shorter paper — the target and time limit must never change,
// because this simulates the real civil service exam.
const PRO_EXAM_TOTAL = EXAM_PRESETS.professional.totalItems;

const shuffleIds = (ids) => {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
};

const isResumableMockExam = (candidate) => (
  !!candidate
  && !candidate.finished
  && !candidate.isReviewSession
  && !!candidate.sessionId
  && Array.isArray(candidate.orderIds)
  && candidate.orderIds.length > 0
);

export default function App() {
  const {
    authAvailable,
    isAuthLoading,
    isAuthenticated,
    user,
    profile,
    updateProfile,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  } = useAuthController();
  
  const { isDark, setThemeMode, toggleTheme } = useThemeController();
  const { settings, updateSettings, resetSettings } = useSettingsController();
  
  const [masteryVersion, setMasteryVersion] = useState(0);
  const [recentVersion, setRecentVersion] = useState(0);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine !== false : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const bumpMastery = () => setMasteryVersion((v) => v + 1);
    const bumpRecent = () => setRecentVersion((v) => v + 1);
    window.addEventListener(MASTERY_UPDATED_EVENT, bumpMastery);
    window.addEventListener(RECENT_QUESTIONS_UPDATED_EVENT, bumpRecent);
    window.addEventListener("storage", bumpMastery);
    window.addEventListener("storage", bumpRecent);
    return () => {
      window.removeEventListener(MASTERY_UPDATED_EVENT, bumpMastery);
      window.removeEventListener(RECENT_QUESTIONS_UPDATED_EVENT, bumpRecent);
      window.removeEventListener("storage", bumpMastery);
      window.removeEventListener("storage", bumpRecent);
    };
  }, []);

  const masteryMap = useMemo(() => {
    void masteryVersion;
    return readMasteryMap(user?.id);
  }, [user?.id, masteryVersion]);

  const recentEntries = useMemo(() => {
    void recentVersion;
    return readRecentQuestions(user?.id);
  }, [user?.id, recentVersion]);

  const { 
    qs, loading, refreshing, search, setSearch, topicFilter, setTopicFilter, labelFilter, setLabelFilter,
    favoriteOnly, setFavoriteOnly, masteryFilter, setMasteryFilter,
    sortBy, setSortBy, saveQuestion, importQuestionsBulk, deleteQuestion, ensureSolutionDraw, toggleFavorite, counts, labelOptions, filteredQuestions 
  } = useQuestionsController(user?.id, isAuthLoading, masteryMap);

  const {
    view,
    setView,
    selectedId,
    setSelectedId,
    editId,
    setEditId,
    selectedMockAttemptId,
    setSelectedMockAttemptId,
    selectedNoteId,
    selectedReelId,
    selectedMiniMockId,
    settingsTab,
    deepLinkShowSol,
    setDeepLinkShowSol,
    exam,
    setExam,
    navigateDashboard: handleGoDashboard,
    navigateHome: handleGoHome,
    navigateLanding,
    navigateSignIn: handleSignIn,
    navigateMockExam: handleGoMockExam,
    navigateTips: handleGoTips,
    navigateNotes: handleGoNotes,
    navigateReels: handleGoReels,
    navigateMyQuestions: handleGoMyQuestions,
    navigateSettings,
    navigateQuestionDetail: goToQuestionDetail,
    navigateAddQuestion: handleGoAdd,
    navigateEditQuestion,
    navigateTipDetail: handleOpenTipDetail,
    navigateMockAttempt: handleOpenMockAttempt,
  } = useViewRouter({
    qs,
    authAvailable,
    isAuthenticated,
    isAuthLoading,
  });

  const handleGoLanding = useCallback(() => {
    navigateLanding();
    setNavOpen(false);
  }, [navigateLanding]);

  const handleGoSettings = useCallback((tab: string = "identity") => {
    navigateSettings(tab);
    setNavOpen(false);
  }, [navigateSettings]);

  const handleGoEdit = useCallback((q: { id: string }) => {
    navigateEditQuestion(q.id);
  }, [navigateEditQuestion]);

  const handleSelectQuestion = goToQuestionDetail;

  const [editorAsideHostEl, setEditorAsideHostEl] = useState<HTMLElement | null>(null);
  const listMetersReady = useMeterReady(view === "list");

  // PolicyPulse sidebar logic: the collapsed rail width persists across
  // reloads, the desktop shell starts expanded by default, and the
  // tablet/compact breakpoint auto-collapses unless the user flipped it
  // manually during this session.
  const [navOpen, setNavOpen] = useState(() => {
    try {
      const stored = window.localStorage?.getItem("qbank-nav-open");
      if (stored === "1") return true;
      if (stored === "0") return false;
    } catch (error) {
      void error;
    }
    return !(window.matchMedia && (window.matchMedia("(max-width: 600px)").matches || window.matchMedia("(min-width: 601px) and (max-width: 1099px)").matches));
  });
  const navManualOverrideRef = useRef(false);
  const toggleNav = useCallback(() => {
    navManualOverrideRef.current = true; // PolicyPulse manual-override guard
    setNavOpen((prev) => {
      const next = !prev;
      // Persist the desktop rail policy only (the drawer is session-local).
      if (window.matchMedia && window.matchMedia("(min-width: 1100px)").matches) {
        try {
          window.localStorage?.setItem("qbank-nav-open", next ? "1" : "0");
        } catch (error) {
          void error;
        }
      }
      return next;
    });
  }, []);
  const [mockHistory, setMockHistory] = useState<any[]>([]);
  const [isMockHistoryLoading, setIsMockHistoryLoading] = useState(false);
  const [savedActiveMockExam, setSavedActiveMockExam] = useState<any | null>(null);
  const [isActiveMockExamLoading, setIsActiveMockExamLoading] = useState(false);
  const [hasLoadedActiveMockExam, setHasLoadedActiveMockExam] = useState(false);
  const [detailSessionResults, setDetailSessionResults] = useState<Record<string, "correct" | "wrong">>({});
  const [isMobile, setIsMobile] = useState(() => window.matchMedia ? window.matchMedia("(max-width: 600px)").matches : false);
  const [isCompact, setIsCompact] = useState(() => window.matchMedia ? window.matchMedia("(min-width: 601px) and (max-width: 1099px)").matches : false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [runGuide, setRunGuide] = useState(false);
  const mainRef = useRef(null);
  const qsRef = useRef(qs);
  const examRef = useRef(exam);
  const mockHistoryRef = useRef([]);
  const savedExamSessionsRef = useRef(new Set());
  const qMap = useMemo(() => new Map(qs.map((q) => [q.id, q])), [qs]);
  const [roleTick, setRoleTick] = useState(0);
  useEffect(() => {
    const handleRolesUpdate = () => setRoleTick((t) => t + 1);
    window.addEventListener("qbank-roles-updated", handleRolesUpdate);
    return () => window.removeEventListener("qbank-roles-updated", handleRolesUpdate);
  }, []);

  const userRole = useMemo(() => {
    void roleTick;
    return rolesModel.getUserRole(user);
  }, [user, roleTick]);

  const isSuperAdmin = userRole === "superadmin";
  const isQuestionAdmin =
    isSuperAdmin ||
    userRole === "admin" ||
    !authAvailable ||
    (isAuthenticated &&
      ((user?.id && QUESTION_ADMIN_UIDS.includes(user.id)) ||
        (user?.email && QUESTION_ADMIN_EMAILS.includes(user.email.toLowerCase()))));
  const adminPermissions = useMemo(() => {
    void roleTick;
    return rolesModel.getUserPermissions(
      user,
      isSuperAdmin ? "superadmin" : isQuestionAdmin ? "admin" : userRole
    );
  }, [user, userRole, isSuperAdmin, isQuestionAdmin, roleTick]);

  const canCreateQuestions =
    isSuperAdmin || !authAvailable || (isQuestionAdmin && adminPermissions.createQuestions);
  const canEditQuestions =
    isSuperAdmin || !authAvailable || (isQuestionAdmin && adminPermissions.editQuestions);
  const canDeleteQuestions =
    isSuperAdmin || !authAvailable || (isQuestionAdmin && adminPermissions.deleteQuestions);
  const canReviewSubmissions =
    isSuperAdmin || !authAvailable || (isQuestionAdmin && adminPermissions.reviewSubmissions);
  const canBulkImport =
    isSuperAdmin || !authAvailable || (isQuestionAdmin && adminPermissions.bulkImport);
  const canModerateUsers =
    isSuperAdmin || (isQuestionAdmin && adminPermissions.moderateUsers);
  const canManageRoles =
    isSuperAdmin || (isQuestionAdmin && adminPermissions.manageRoles);
  const canManageQuestions =
    canCreateQuestions || canEditQuestions || canDeleteQuestions;
  const favoriteCount = useMemo(() => qs.filter((q) => q.favorite).length, [qs]);
  const masteryCounts = useMemo(() => getMasterySummary(qs, masteryMap), [qs, masteryMap]);
  const todayAnsweredCount = useMemo(() => {
    void masteryVersion;
    return getTodayAnsweredCount(user?.id);
  }, [user?.id, masteryVersion]);
  const dailyStudyGoal = profile?.dailyStudyGoal || settings.dailyStudyGoal || 25;
  const daysUntilExam = useMemo(
    () => getDaysUntilExam(profile?.targetExamDate || settings.targetExamDate),
    [profile?.targetExamDate, settings.targetExamDate]
  );
  const proQuestionsCount = useMemo(() => qs.filter((q) => q.topic !== "clerical").length, [qs]);
  const subProQuestionsCount = useMemo(() => qs.filter((q) => q.topic !== "analytical").length, [qs]);
  const activeTopicCount = useMemo(
    () => Object.values(counts || {}).filter((value) => Number(value) > 0).length,
    [counts]
  );

  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(max-width: 600px)").matches) setNavOpen(false);
  }, []);

  useEffect(() => {
    if (view === "signIn" || view === "landing") {
      document.body.classList.add("qb-page-scrollable");
      document.documentElement.classList.add("qb-page-scrollable");
    } else {
      document.body.classList.remove("qb-page-scrollable");
      document.documentElement.classList.remove("qb-page-scrollable");
    }
    return () => {
      document.body.classList.remove("qb-page-scrollable");
      document.documentElement.classList.remove("qb-page-scrollable");
    };
  }, [view]);

  // Check if this is the user's first visit and show guide
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("qbank-guide-completed");
    if (!hasSeenGuide && !loading && view === "list" && qs.length > 0) {
      const timer = setTimeout(() => {
        setRunGuide(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, view, qs.length]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 600px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    if (mql.addEventListener) mql.addEventListener("change", apply);
    else mql.addListener(apply);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", apply);
      else mql.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 601px) and (max-width: 1099px)");
    const apply = () => setIsCompact(mql.matches);
    apply();
    if (mql.addEventListener) mql.addEventListener("change", apply);
    else mql.addListener(apply);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", apply);
      else mql.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    if (isMobile) setNavOpen(false);
  }, [isMobile]);

  useEffect(() => {
    // Entering compact width: never start with the drawer covering content.
    // PolicyPulse auto-collapse also resets the manual-override guard once
    // per breakpoint trip so a later desktop return restores the saved rail.
    if (isCompact) {
      navManualOverrideRef.current = false;
      setNavOpen(false);
    }
  }, [isCompact]);

  useEffect(() => {
    // PolicyPulse restore-on-desktop: returning to the desktop breakpoint
    // re-applies the persisted rail policy unless the user already made a
    // manual expand/collapse choice during this resize trip.
    if (!isMobile && !isCompact) {
      if (navManualOverrideRef.current) return;
      try {
        const stored = window.localStorage?.getItem("qbank-nav-open");
        if (stored === "1") setNavOpen((prev) => (prev ? prev : true));
        else if (stored === "0") setNavOpen((prev) => (prev ? false : prev));
      } catch (error) {
        void error;
      }
    }
  }, [isMobile, isCompact]);

  useEffect(() => {
    qsRef.current = qs;
  }, [qs]);

  useEffect(() => {
    if (view === "detail" && selectedId) {
      void ensureSolutionDraw(selectedId);
    } else if (view === "add" && editId) {
      void ensureSolutionDraw(editId);
    }
  }, [view, selectedId, editId, ensureSolutionDraw]);

  useEffect(() => {
    examRef.current = exam;
  }, [exam]);

  useEffect(() => {
    mockHistoryRef.current = mockHistory;
  }, [mockHistory]);

  useEffect(() => {
    let active = true;

    const loadActiveMockExam = async () => {
      try {
        if (isAuthLoading) return;
        if (!isAuthenticated || !user?.id) {
          if (active) {
            setSavedActiveMockExam(null);
            setHasLoadedActiveMockExam(true);
          }
          return;
        }

        if (active) setIsActiveMockExamLoading(true);
        const savedExam = await storageModel.getActiveMockExam(user.id);
        const resumableExam = isResumableMockExam(savedExam) ? savedExam : null;
        if (savedExam && !resumableExam) {
          await storageModel.clearActiveMockExam(user.id);
        }

        if (!active) return;

        setSavedActiveMockExam(resumableExam);
        setHasLoadedActiveMockExam(true);

        const page = new URLSearchParams(window.location.search).get("page");
        if (page === "mock-run" && resumableExam && !isResumableMockExam(examRef.current)) {
          setExam(resumableExam);
        }
      } catch (e) {
        console.error("Failed to load active mock exam:", e);
        if (active) setHasLoadedActiveMockExam(true);
      } finally {
        if (active) setIsActiveMockExamLoading(false);
      }
    };

    loadActiveMockExam();
    return () => {
      active = false;
    };
  }, [isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    let active = true;

    const loadMockHistory = async () => {
      try {
        if (isAuthLoading) return;
        if (!isAuthenticated || !user?.id) {
          if (active) setMockHistory([]);
          return;
        }
        if (active) setIsMockHistoryLoading(true);
        const history = await storageModel.getMockExamHistory(user.id);
        if (active) setMockHistory(Array.isArray(history) ? history : []);
      } catch (e) {
        if (isNetworkOrFetchError(e)) {
          console.warn("Could not load mock exam history (offline or network unreachable):", (e as any)?.message || e);
        } else {
          console.error("Failed to load mock exam history:", e);
        }
      } finally {
        if (active) setIsMockHistoryLoading(false);
      }
    };

    loadMockHistory();
    return () => {
      active = false;
    };
  }, [isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user?.id) return undefined;

    const syncMockHistory = async () => {
      try {
        const syncedAny = await storageModel.flushPendingMockExamAttempts(user.id);
        if (!syncedAny) return;
        const history = await storageModel.getMockExamHistory(user.id);
        setMockHistory(Array.isArray(history) ? history : []);
      } catch (e) {
        if (isNetworkOrFetchError(e)) {
          console.warn("Could not sync pending mock exam attempts (offline or network unreachable):", (e as any)?.message || e);
        } else {
          console.error("Failed to sync pending mock exam attempts:", e);
        }
      }
    };

    const onOnline = () => {
      syncMockHistory();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user?.id) return undefined;

    const syncTips = async () => {
      try {
        await tipsModel.flushPending(user.id);
      } catch (e) {
        if (isNetworkOrFetchError(e)) {
          console.warn("Could not sync pending tips (offline or network unreachable):", (e as any)?.message || e);
        } else {
          console.error("Failed to sync pending tips:", e);
        }
      }
    };

    syncTips();
    window.addEventListener("online", syncTips);
    return () => window.removeEventListener("online", syncTips);
  }, [isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user?.id) return undefined;

    const syncFavorites = async () => {
      try {
        await favoritesModel.flushPending(user.id);
      } catch (e) {
        if (isNetworkOrFetchError(e)) {
          console.warn("Could not sync pending favorites (offline or network unreachable):", (e as any)?.message || e);
        } else {
          console.error("Failed to sync pending favorites:", e);
        }
      }
    };

    syncFavorites();
    window.addEventListener("online", syncFavorites);
    return () => window.removeEventListener("online", syncFavorites);
  }, [isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user?.id || !hasLoadedActiveMockExam) return undefined;

    if (exam && exam.finished && !exam.isReviewSession) {
      setSavedActiveMockExam(null);
      storageModel.clearActiveMockExam(user.id).catch((e) => {
        console.error("Failed to clear active mock exam:", e);
      });
      return undefined;
    }

    if (!isResumableMockExam(exam)) return undefined;

    const timeoutId = window.setTimeout(() => {
      storageModel.setActiveMockExam(exam, user.id)
        .then(() => setSavedActiveMockExam(exam))
        .catch((e) => {
          console.error("Failed to autosave active mock exam:", e);
        });
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [exam, hasLoadedActiveMockExam, isAuthLoading, isAuthenticated, user?.id]);





  useEffect(() => {
    if (!exam || !exam.finished || exam.isReviewSession || !exam.sessionId) return;
    if (savedExamSessionsRef.current.has(exam.sessionId)) return;
    if (!isAuthenticated || !user?.id) return;

    savedExamSessionsRef.current.add(exam.sessionId);

    const persistCompletedAttempt = async () => {
      try {
        const attempt = buildMockExamAttempt(exam, qMap);
        const currentHistory = mockHistoryRef.current || [];
        const nextHistory = [attempt, ...currentHistory.filter((item) => item.id !== attempt.id)].slice(0, 12);
        setMockHistory(nextHistory);
        await storageModel.setMockExamHistory(nextHistory, user.id);
        setExam((prev) => (
          prev && prev.sessionId === exam.sessionId
            ? { ...prev, historySaved: true, archivedAttemptId: attempt.id }
            : prev
        ));
      } catch (e) {
        savedExamSessionsRef.current.delete(exam.sessionId);
        if (isNetworkOrFetchError(e)) {
          console.warn("Could not persist completed mock exam remotely (offline or network unreachable):", (e as any)?.message || e);
        } else {
          console.error("Failed to persist completed mock exam:", e);
        }
      }
    };

    persistCompletedAttempt();
  }, [exam, isAuthenticated, qMap, user?.id]);

  // Track online state & pending local sync queue for subtle Header status chip
  useEffect(() => {
    let active = true;
    const refreshPendingSync = async () => {
      try {
        const count = await storageModel.getPendingSyncCount(user?.id);
        if (active) setPendingSyncCount(count);
      } catch {
        // Ignore queue read failures
      }
    };
    const handleOnline = () => {
      setIsOnline(true);
      void refreshPendingSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      void refreshPendingSync();
    };
    const handleQueueUpdated = () => {
      void refreshPendingSync();
    };

    void refreshPendingSync();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("qbank-sync-queue-updated", handleQueueUpdated);
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("qbank-sync-queue-updated", handleQueueUpdated);
    };
  }, [user?.id, view]);

  // Guard against accidental tab/window close during an active unfinished exam
  useEffect(() => {
    const isExamActive = view === "mockRun" && !!exam && !exam.finished && !exam.isReviewSession;
    if (!isExamActive) return undefined;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [view, exam]);

  const handleCancelEdit = () => {
    if (editId) goToQuestionDetail(editId);
    else handleGoHome();
  };

  const handleStartExam = (presetId = "professional") => {
    if (!isAuthenticated) {
      handleSignIn();
      return;
    }
    const preset = EXAM_PRESETS[presetId] || EXAM_PRESETS.professional;
    // Filter out topics excluded in this preset (e.g. clerical for pro, analytical for subpro)
    const candidates = qs.filter((q) => !preset.excludedTopics?.includes(q.topic));
    const ids = candidates.map((q) => q.id);
    const orderIds = shuffleIds(ids).slice(0, preset.totalItems);
    const nextExam = {
      sessionId: `exam-${Date.now()}`,
      mode: preset.id,
      startedAt: Date.now(),
      durationMs: preset.durationMs,
      totalCount: orderIds.length,
      targetCount: preset.totalItems,
      orderIds,
      answers: {},
      review: {},
      currentIndex: 0,
      finished: false,
      isReviewSession: false,
      historySaved: false,
    };
    setExam(nextExam);
    setSavedActiveMockExam(nextExam);
    storageModel.setActiveMockExam(nextExam, user.id).catch((e) => {
      console.error("Failed to save active mock exam:", e);
    });
    window.history.pushState({}, "", `?page=mock-run`);
    setView("mockRun");
  };

  const handleStartProfessional = () => handleStartExam("professional");
  const handleStartSubprofessional = () => handleStartExam("subprofessional");

  const handleResetFilters = () => {
    setSearch("");
    setTopicFilter("all");
    setLabelFilter("all");
    setFavoriteOnly(false);
    setMasteryFilter("all");
  };

  const handleFilterMissed = useCallback(() => {
    setSearch("");
    setTopicFilter("all");
    setLabelFilter("all");
    setFavoriteOnly(false);
    setMasteryFilter("missed");
    handleGoHome();
    setTimeout(() => {
      const cards = document.getElementById("qb-question-cards") || document.getElementById("qb-question-feed");
      if (cards) cards.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, [handleGoHome, setLabelFilter, setFavoriteOnly, setMasteryFilter, setSearch, setTopicFilter]);

  const handleSelectTopic = (topicId) => {
    setTopicFilter(topicId);
    setTimeout(() => {
      const cards = document.getElementById("qb-question-cards") || document.getElementById("qb-question-feed");
      if (cards) {
        cards.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const handleResumeActiveMockExam = () => {
    if (!isResumableMockExam(savedActiveMockExam)) return;
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(savedActiveMockExam);
    window.history.pushState({}, "", `?page=mock-run`);
    setView("mockRun");
  };

  const handleReviewAttempt = (attempt, questionId = null) => {
    if (!attempt) return;
    setEditId(null);
    setSelectedId(null);
    setDeepLinkShowSol(false);
    setSelectedMockAttemptId(attempt.id);
    setExam(buildReviewExamFromAttempt(attempt, qMap, questionId));
    window.history.pushState({}, "", `?page=mock-run&attempt=${encodeURIComponent(attempt.id)}`);
    setView("mockRun");
  };

  const handleStartDrillMistakes = (attempt) => {
    if (!attempt) return;
    const drillExam = buildMistakeDrillExam(attempt, qMap);
    if (!drillExam || drillExam.totalCount === 0) return;
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(drillExam);
    setSavedActiveMockExam(drillExam);
    if (isAuthenticated && user?.id) {
      storageModel.setActiveMockExam(drillExam, user.id).catch((e) => {
        console.error("Failed to save active mock exam:", e);
      });
    }
    window.history.pushState({}, "", `?page=mock-run&drill=1`);
    setView("mockRun");
  };

  const handleStartQuickPractice = (opts: {
    count: number;
    scope: "all" | "unseen" | "missed";
    topic: string;
    timed: boolean;
  }) => {
    const quickExam = buildQuickPracticeExam({
      questions: qs,
      masteryMap,
      scope: opts.scope,
      topic: opts.topic,
      count: opts.count,
      timed: opts.timed,
    });
    if (!quickExam || quickExam.totalCount === 0) return;
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(quickExam);
    setSavedActiveMockExam(quickExam);
    if (isAuthenticated && user?.id) {
      storageModel.setActiveMockExam(quickExam, user.id).catch((e) => {
        console.error("Failed to save active quick practice:", e);
      });
    }
    window.history.pushState({}, "", `?page=mock-run&quick=1`);
    setView("mockRun");
  };

  const handleStartMiniMock = useCallback((miniExam: any) => {
    if (!miniExam || !miniExam.totalCount) return;
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(miniExam);
    setSavedActiveMockExam(miniExam);
    if (isAuthenticated && user?.id) {
      storageModel.setActiveMockExam(miniExam, user.id).catch((e) => {
        console.error("Failed to save active mini mock:", e);
      });
    }
    window.history.pushState({}, "", `?page=mock-run&mini=1`);
    setView("mockRun");
  }, [isAuthenticated, setDeepLinkShowSol, setEditId, setExam, setSelectedId, setSelectedMockAttemptId, setView, user?.id]);

  const handleBackToAttempt = (attemptId?: string) => {
    const targetId = attemptId || selectedMockAttemptId;
    if (targetId) {
      handleOpenMockAttempt(targetId);
    } else {
      handleGoMockExam();
    }
  };

  const handleSave = async (formData: any) => {
    if (editId ? !canEditQuestions : !canCreateQuestions) return;
    await saveQuestion(formData, editId);
    if (editId) goToQuestionDetail(editId);
    else handleGoHome();
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteQuestions) return;
    await deleteQuestion(id);
    removeRecentQuestion(id, user?.id);
    handleGoHome();
  };

  const handleAddQuestionAction = async () => {
    if (canCreateQuestions) {
      handleGoAdd();
      return;
    }
    if (authAvailable && !isAuthenticated) await handleSignIn();
  };

  const handleEditQuestionAction = async (question) => {
    if (canEditQuestions) {
      handleGoEdit(question);
      return;
    }
    if (authAvailable && !isAuthenticated) await handleSignIn();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) console.error("Sign out failed:", error);
    try { sessionStorage.removeItem("qbank-session-active"); } catch (_) {}
    handleGoLanding();
  };

  const handleOpenHelp = () => {
    setShowHelpModal(true);
  };

  const handleGuideFinish = () => {
    setRunGuide(false);
    localStorage.setItem("qbank-guide-completed", "true");
  };

  const handleRestartGuide = () => {
    setShowHelpModal(false);
    
    if (view !== 'list') {
      handleGoHome();
    }
    
    setRunGuide(false);
    setTimeout(() => {
      setRunGuide(true);
    }, 200);
  };

  const selectedQuestion = qs.find(q => q.id === selectedId);
  const recentQuestions = useMemo(
    () => resolveRecentQuestions(recentEntries, qs, masteryMap, 6),
    [recentEntries, qs, masteryMap]
  );

  useEffect(() => {
    if (view === "detail" && selectedQuestion?.id) {
      recordRecentQuestionOpen(selectedQuestion.id, user?.id);
    }
  }, [view, selectedQuestion?.id, user?.id]);

  const selectedMockAttempt = mockHistory.find((attempt) => attempt.id === selectedMockAttemptId) || null;
  const selectedIndexInFiltered = filteredQuestions.findIndex(q => q.id === selectedId);
  const nextQuestion = selectedIndexInFiltered >= 0 ? filteredQuestions[selectedIndexInFiltered + 1] : null;
  const prevQuestion = selectedIndexInFiltered > 0 ? filteredQuestions[selectedIndexInFiltered - 1] : null;
  const primaryView = view === "dashboard"
    ? "dashboard"
    : view === "mock" || view === "mockRun" || view === "mockAttempt"
      ? "mock"
      : view === "reels"
        ? "reels"
        : view === "tips" || view === "tipDetail"
          ? "tips"
          : view === "notes"
            ? "notes"
            : view === "my-questions"
              ? "my-questions"
              : "home";
  const SEEN_QUESTIONS_KEY = "qbank-seen-questions-total";
  const [seenQuestionsTotal, setSeenQuestionsTotal] = useState<number | null>(() => {
    try {
      const stored = window.localStorage?.getItem(SEEN_QUESTIONS_KEY);
      return stored == null || stored === "" ? null : Number(stored) || 0;
    } catch {
      return null;
    }
  });

  const isViewingQuestions = view === "list" || view === "detail";

  useEffect(() => {
    if (loading || qs.length <= 0) return;
    if (isViewingQuestions || (seenQuestionsTotal != null && qs.length < seenQuestionsTotal)) {
      setSeenQuestionsTotal((prev) => {
        if (prev === qs.length) return prev;
        try {
          window.localStorage?.setItem(SEEN_QUESTIONS_KEY, String(qs.length));
        } catch {
          // Ignore storage write errors
        }
        return qs.length;
      });
    }
  }, [loading, isViewingQuestions, qs.length, seenQuestionsTotal]);

  const unreadQuestionsBadge =
    primaryView === "home" || isViewingQuestions || loading || qs.length <= 0
      ? null
      : seenQuestionsTotal == null
        ? qs.length
        : qs.length > seenQuestionsTotal
          ? qs.length - seenQuestionsTotal
          : null;

  const hasResumableMock = isResumableMockExam(savedActiveMockExam);
  const scrollMainToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };
  const mobileNavItems = [
    {
      id: "home",
      label: "Question Bank",
      shortLabel: "Questions",
      icon: Home,
      badge: unreadQuestionsBadge,
      onClick: () => {
        if (view === "list") scrollMainToTop();
        else handleGoHome();
      },
    },
    {
      id: "mock",
      label: "Timed Mock Exam",
      shortLabel: "Mock Exam",
      icon: ClipboardList,
      isLive: hasResumableMock,
      onClick: () => {
        if (view === "mock") scrollMainToTop();
        else handleGoMockExam();
      },
    },
    {
      id: "reels",
      label: "Reels & Live Review",
      shortLabel: "Reels",
      icon: Clapperboard,
      onClick: () => {
        if (view === "reels") scrollMainToTop();
        else handleGoReels();
      },
    },
    {
      id: "notes",
      label: "Study Notes",
      shortLabel: "Notes",
      icon: BookOpen,
      onClick: () => {
        if (view === "notes") scrollMainToTop();
        else handleGoNotes();
      },
    },
    {
      id: "my-questions",
      label: "My Questions",
      shortLabel: "My Qs",
      icon: FileEdit,
      onClick: () => {
        if (view === "my-questions") scrollMainToTop();
        else handleGoMyQuestions();
      },
    },
  ];
  useEffect(() => {
    const el = mainRef.current;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view, selectedId, selectedMockAttemptId, editId]);

  if (view === "landing") {
    return (
      <LandingPage
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onStartReview={() => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleGoDashboard();
        }}
        onSignIn={handleSignIn}
        onStartMock={(presetId) => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleStartExam(presetId || "professional");
        }}
        onNavigateToTips={() => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleGoTips();
        }}
        totalQuestions={qs.length}
        isAuthenticated={isAuthenticated}
        profile={profile}
      />
    );
  }

  if (view === "signIn") {
    return (
      <SignInPage
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onBackToLanding={handleGoLanding}
        onSuccessLogin={() => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleGoDashboard();
        }}
        onSignInWithEmail={signInWithEmail}
        onSignInWithGoogle={signInWithGoogle}
        onGoHome={handleGoHome}
        onGoMockExam={handleGoMockExam}
        onGoTips={handleGoTips}
        onGoNotes={handleGoNotes}
      />
    );
  }


  return (
    <div className={`qb${isDark ? "" : " light"}`}>
      <div className="qb-wrap">
        <Header 
          isDark={isDark} 
          onToggleTheme={toggleTheme} 
          onDashboard={handleGoDashboard}
          onHome={handleGoHome}
          onLanding={handleGoLanding}
          currentView={view}
          showNavToggle={true}
          navOpen={navOpen}
          onToggleNav={toggleNav}
          authAvailable={authAvailable}
          isAuthLoading={isAuthLoading}
          isAuthenticated={isAuthenticated}
          profile={profile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onOpenHelp={handleOpenHelp}
          onOpenSettings={handleGoSettings}
          onMockExam={handleGoMockExam}
          onTips={handleGoTips}
          onNotes={handleGoNotes}
          onFilterMissed={handleFilterMissed}
          missedCount={masteryCounts.missed}
          unseenCount={masteryCounts.unseen}
          todayAnsweredCount={todayAnsweredCount}
          dailyStudyGoal={dailyStudyGoal}
          daysUntilExam={daysUntilExam}
          hasResumableMock={hasResumableMock}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
        />

        {/* Unified Overlay Navigation Drawer for Mobile & Tablet/Compact */}
        {(isMobile || isCompact) && (
          <SideNav
            variant="overlay"
            open={navOpen}
            active={primaryView}
            onDashboard={handleGoDashboard}
            onHome={handleGoHome}
            onLanding={handleGoLanding}
            onMockExam={handleGoMockExam}
            onReels={handleGoReels}
            onTips={handleGoTips}
            onNotes={handleGoNotes}
            onMyQuestions={handleGoMyQuestions}
            onClose={() => setNavOpen(false)}
            totalQuestions={qs.length}
            starredCount={favoriteCount}
            onOpenHelp={handleOpenHelp}
            onOpenSettings={handleGoSettings}
            isAuthenticated={isAuthenticated}
            profile={profile}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onSetThemeMode={setThemeMode}
            isQuestionAdmin={isQuestionAdmin}
            isSuperAdmin={isSuperAdmin}
            userRole={userRole}
          />
        )}

        <div className="qb-shell">
          {!isMobile && !isCompact && (
            <SideNav
              variant="rail"
              open={navOpen}
              active={primaryView}
              onDashboard={handleGoDashboard}
              onHome={handleGoHome}
              onLanding={handleGoLanding}
              onMockExam={handleGoMockExam}
              onReels={handleGoReels}
              onTips={handleGoTips}
              onNotes={handleGoNotes}
              onMyQuestions={handleGoMyQuestions}
              totalQuestions={qs.length}
              starredCount={favoriteCount}
              onOpenHelp={handleOpenHelp}
              onOpenSettings={handleGoSettings}
              isAuthenticated={isAuthenticated}
              profile={profile}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onSetThemeMode={setThemeMode}
              isQuestionAdmin={isQuestionAdmin}
              isSuperAdmin={isSuperAdmin}
              userRole={userRole}
            />
          )}
          <main ref={mainRef} className={`qb-main${view === "mockRun" ? " qb-main-exam" : view === "detail" ? " qb-main-detail" : view === "notes" ? " qb-main-notes" : ""}`}>
            <div
              className={`qb-main-inner${
                view === "add"
                  ? " qb-main-inner-editor"
                  : view === "notes"
                  ? " qb-main-inner-notes"
                  : view === "mockRun"
                  ? " qb-main-inner-exam"
                  : view === "mockAttempt"
                  ? " qb-main-inner-mock-attempt"
                  : view === "detail"
                  ? " qb-main-inner-detail"
                  : view === "settings" || view === "my-questions"
                  ? " qb-main-inner-settings"
                  : ""
              }`}
            >
            {loading ? (
              <SkeletonLoader />
            ) : (
            <Suspense fallback={<PageLoader view={view} />}>
            {view === "dashboard" ? (
              <DashboardPage
                questions={qs}
                masteryMap={masteryMap}
                userId={user?.id || null}
                profile={profile}
                examTarget={settings.examTarget || profile?.examTarget || "professional"}
                targetExamDate={profile?.targetExamDate || settings.targetExamDate}
                dailyStudyGoal={dailyStudyGoal}
                todayAnsweredCount={todayAnsweredCount}
                daysUntilExam={daysUntilExam}
                mockHistory={mockHistory}
                activeExam={savedActiveMockExam}
                isAuthenticated={isAuthenticated}
                onResumeActiveExam={handleResumeActiveMockExam}
                onOpenAttempt={handleOpenMockAttempt}
                onStartExam={handleStartExam}
                onStartQuickPractice={handleStartQuickPractice}
                onOpenQuestionBank={(opts) => {
                  setSearch(opts?.search ?? "");
                  setLabelFilter("all");
                  setFavoriteOnly(false);
                  setTopicFilter(opts?.topic || "all");
                  setMasteryFilter(opts?.mastery || "all");
                  handleGoHome();
                }}
                canCreateQuestions={canCreateQuestions}
                onAddQuestion={handleAddQuestionAction}
                onGoMockExam={handleGoMockExam}
                onOpenSettings={handleGoSettings}
                onRequireAuth={handleSignIn}
                recentQuestions={recentQuestions}
                onSelectQuestion={handleSelectQuestion}
                onClearRecentQuestions={() => clearRecentQuestions(user?.id)}
              />
            ) : view === "list" ? (
              <div className="fu space-y-5">
                {/* Structured Workspace Header & Bento Summary Hub */}
                <section className="space-y-4" aria-label="Civil Service Reviewer Workspace">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-qb-border">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/12 text-amber-400 light:border-amber-600/30 light:bg-amber-500/10 light:text-amber-700 mt-0.5">
                        <ShieldCheck size={20} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                          <span>Philippine Civil Service Exam Reviewer</span>
                          {refreshing && (
                            <>
                              <span className="text-qb-muted" aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-qb-muted normal-case tracking-normal font-semibold">
                                <RefreshCw size={11} className="animate-spin" aria-hidden="true" />
                                Syncing questions
                              </span>
                            </>
                          )}
                        </div>
                        <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-qb-heading leading-tight">
                          Question Bank Workspace
                        </h1>
                        <p className="mt-1 max-w-2xl text-xs sm:text-sm text-qb-muted leading-relaxed">
                          Practice authentic multiple-choice items, run official timed CSC simulations, and track subject mastery.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleGoMockExam}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer whitespace-nowrap"
                      >
                        <PlayCircle size={16} aria-hidden="true" />
                        <span>Take Timed Mock Exam</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGoTips()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-surface px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
                      >
                        <Lightbulb size={16} className="text-qb-accent" aria-hidden="true" />
                        <span>Study Tips</span>
                      </button>
                      {canCreateQuestions && (
                        <button
                          type="button"
                          onClick={handleAddQuestionAction}
                          title="Add a new question to the bank"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
                        >
                          <Plus size={15} className="text-qb-accent" aria-hidden="true" />
                          <span>Add Question</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bento Metric Tiles + Official CSC Exam Presets */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
                    <div className="xl:col-span-7 grid grid-cols-2 gap-3" aria-label="Question Bank Summary">
                      {/* Tile 1: Total Questions */}
                      <div className="relative overflow-hidden rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
                            Question Bank
                          </span>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/12 text-amber-400 light:text-amber-700">
                            <Layers size={14} aria-hidden="true" />
                          </span>
                        </div>
                        <div>
                          <div className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                            <CountUp end={qs.length} duration={1100} />
                          </div>
                          <div className="mt-1.5 text-xs font-medium text-qb-muted">
                            <span className="font-semibold text-qb-mid tabular-nums">{activeTopicCount}</span> of 5 subjects active
                          </div>
                        </div>
                      </div>

                      {/* Tile 2: Daily Study Goal */}
                      <div className="relative overflow-hidden rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
                            Today&apos;s Goal
                          </span>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/12 text-sky-400 light:text-sky-700">
                            <Flame size={14} aria-hidden="true" />
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                              <CountUp end={todayAnsweredCount} duration={700} />
                            </span>
                            <span className="text-sm font-semibold text-qb-muted tabular-nums">
                              / {dailyStudyGoal}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200" aria-hidden="true">
                            <div
                              className="h-full rounded-full bg-sky-400 light:bg-sky-600 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                              style={{
                                width: `${
                                  listMetersReady
                                    ? Math.min(100, Math.round((todayAnsweredCount / Math.max(dailyStudyGoal, 1)) * 100))
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tile 3: Interactive Starred Items */}
                      <button
                        type="button"
                        onClick={() => {
                          setFavoriteOnly(!favoriteOnly);
                          if (!favoriteOnly) {
                            setTimeout(() => {
                              const feed = document.getElementById("qb-question-feed");
                              if (feed) feed.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 50);
                          }
                        }}
                        aria-pressed={favoriteOnly}
                        className={`relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-between gap-2 text-left transition-colors cursor-pointer ${
                          favoriteOnly
                            ? "border-amber-500/60 bg-amber-500/[0.08] light:border-amber-600/55"
                            : "border-qb-border bg-qb-surface hover:border-qb-border-hover hover:bg-qb-surface-hover"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
                            Starred Items
                          </span>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/12 text-amber-400 light:text-amber-700">
                            <Star size={14} fill={favoriteOnly ? "currentColor" : "none"} aria-hidden="true" />
                          </span>
                        </div>
                        <div>
                          <div className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                            <CountUp end={favoriteCount} duration={950} />
                          </div>
                          <div className="mt-1.5 text-xs font-medium text-qb-muted">
                            {favoriteOnly ? "Filtering starred items" : "Click to focus starred"}
                          </div>
                        </div>
                      </button>

                      {/* Tile 4: Exam Countdown or Bank Mastery */}
                      <div className="relative overflow-hidden rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-2">
                        {daysUntilExam !== null && daysUntilExam >= 0 ? (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
                                Exam Countdown
                              </span>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/12 text-emerald-400 light:text-emerald-700">
                                <Calendar size={14} aria-hidden="true" />
                              </span>
                            </div>
                            <div>
                              <div className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                                {daysUntilExam === 0 ? "Today" : `${daysUntilExam}d`}
                              </div>
                              <div className="mt-1.5 text-xs font-medium text-qb-muted">
                                {daysUntilExam === 0 ? "Exam Day" : "Remaining"}
                                <span aria-hidden="true"> · </span>
                                <span className="tabular-nums">{masteryCounts.mastered}</span> mastered
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
                                Bank Mastery
                              </span>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/12 text-emerald-400 light:text-emerald-700">
                                <CheckCircle2 size={14} aria-hidden="true" />
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                                  <CountUp end={masteryCounts.mastered} duration={700} />
                                </span>
                                <span className="text-xs font-semibold text-qb-muted tabular-nums">
                                  / {qs.length} ({qs.length > 0 ? Math.round((masteryCounts.mastered / qs.length) * 100) : 0}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200" aria-hidden="true">
                                <div
                                  className="h-full rounded-full bg-emerald-400 light:bg-emerald-600 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                  style={{
                                    width: `${
                                      listMetersReady && qs.length > 0
                                        ? Math.min(100, Math.round((masteryCounts.mastered / qs.length) * 100))
                                        : 0
                                    }%`,
                                    transitionDelay: listMetersReady ? "75ms" : "0ms",
                                  }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Official CSC Exam Formats Bento Launcher */}
                    <div className="xl:col-span-5 relative overflow-hidden rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                            CSC Exam Presets
                          </div>
                          <h2 className="mt-0.5 text-base font-bold text-qb-heading">
                            Official Test Formats
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={handleGoMockExam}
                          title="Open Mock Exam Center"
                          className="inline-flex items-center gap-1 text-xs font-bold text-qb-accent hover:underline cursor-pointer shrink-0"
                        >
                          <span>View Center</span>
                          <ArrowRight size={13} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="divide-y divide-qb-border rounded-xl border border-qb-border bg-qb-input">
                        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-qb-heading">Professional Level</div>
                            <div className="mt-0.5 text-xs text-qb-muted tabular-nums">
                              170 items · 3h 10m · 80% passing
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isAuthenticated) {
                                handleSignIn();
                              } else {
                                handleStartExam("professional");
                              }
                            }}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer"
                          >
                            <span>Start</span>
                            <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-qb-heading">Subprofessional Level</div>
                            <div className="mt-0.5 text-xs text-qb-muted tabular-nums">
                              165 items · 2h 40m · 80% passing
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isAuthenticated) {
                                handleSignIn();
                              } else {
                                handleStartExam("subprofessional");
                              }
                            }}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-bold text-qb-heading transition-colors hover:border-amber-500/50 hover:bg-qb-surface-hover cursor-pointer"
                          >
                            <span>Start</span>
                            <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <Stats
                  total={qs.length}
                  counts={counts}
                  topicFilter={topicFilter}
                  onSelectTopic={handleSelectTopic}
                />

                <SearchAndFilter 
                  search={search} 
                  onSearchChange={setSearch} 
                  topicFilter={topicFilter} 
                  onTopicChange={setTopicFilter} 
                  labelFilter={labelFilter}
                  onLabelChange={setLabelFilter}
                  labelOptions={labelOptions}
                  total={qs.length} 
                  counts={counts} 
                  filteredCount={filteredQuestions.length}
                  favoriteCount={favoriteCount}
                  favoriteOnly={favoriteOnly}
                  onFavoriteOnlyChange={setFavoriteOnly}
                  masteryFilter={masteryFilter}
                  onMasteryChange={setMasteryFilter}
                  masteryCounts={masteryCounts}
                  onResetFilters={handleResetFilters}
                />

                <QuestionList 
                  questions={filteredQuestions} 
                  onSelect={handleSelectQuestion} 
                  onToggleFavorite={toggleFavorite}
                  totalInProject={qs.length} 
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  masteryMap={masteryMap}
                  canManageQuestions={canCreateQuestions}
                  authAvailable={authAvailable}
                  isAuthenticated={isAuthenticated}
                  onAddQuestion={handleAddQuestionAction}
                  onNavigateToTips={() => handleGoTips()}
                  recentQuestions={recentQuestions}
                  onClearRecentQuestions={() => clearRecentQuestions(user?.id)}
                  resetKey={`${search}|${topicFilter}|${labelFilter}|${favoriteOnly}|${masteryFilter}|${sortBy}`}
                />
              </div>
            ) : view === "detail" && selectedQuestion ? (
              <QuestionDetail 
                question={selectedQuestion} 
                onBack={handleGoHome} 
                onEdit={handleEditQuestionAction} 
                onDelete={handleDelete} 
                onToggleFavorite={toggleFavorite}
                onTips={() => handleOpenTipDetail(selectedQuestion.id)}
                forceShowSolution={deepLinkShowSol}
                hasPrev={!!prevQuestion}
                hasNext={!!nextQuestion}
                canManageQuestions={canEditQuestions || canDeleteQuestions}
                canEditQuestion={canEditQuestions}
                canDeleteQuestion={canDeleteQuestions}
                questionIndex={selectedIndexInFiltered >= 0 ? selectedIndexInFiltered + 1 : undefined}
                totalQuestions={filteredQuestions.length > 0 ? filteredQuestions.length : qs.length}
                queueQuestions={filteredQuestions.length > 0 ? filteredQuestions : qs}
                onSelectQuestion={handleSelectQuestion}
                sessionResults={detailSessionResults}
                onRecordResult={(id: string, isCorrect: boolean) => {
                  setDetailSessionResults((prev) => ({ ...prev, [id]: isCorrect ? "correct" : "wrong" }));
                  recordQuestionOutcome(id, isCorrect, user?.id);
                  recordRecentQuestionCheck(id, isCorrect, user?.id);
                }}
                onPrev={() => {
                  if (prevQuestion) handleSelectQuestion(prevQuestion.id);
                }}
                onNext={() => {
                  if (nextQuestion) handleSelectQuestion(nextQuestion.id);
                  else handleGoHome();
                }}
              />
            ) : view === "tips" ? (
              <TipsPage
                questions={qs}
                userId={user?.id || null}
                onBack={handleGoHome}
                onSelectQuestion={handleOpenTipDetail}
              />
            ) : view === "tipDetail" && selectedQuestion ? (
              <TipDetailPage
                question={selectedQuestion}
                userId={user?.id || null}
                onBack={handleGoTips}
                onOpenQuestion={handleSelectQuestion}
              />
            ) : view === "my-questions" ? (
              <MyQuestionsView
                currentUser={user}
                isAdmin={canReviewSubmissions}
                onNavigateHome={handleGoHome}
                onStartMiniMock={handleStartMiniMock}
                initialMiniMockId={selectedMiniMockId}
              />
            ) : view === "notes" ? (
              <NotesPage
                userId={user?.id || null}
                onBack={handleGoHome}
                initialNoteId={selectedNoteId}
              />
            ) : view === "reels" ? (
              <ReelsPage
                questions={qs}
                currentUser={user}
                userRole={userRole}
                isAdmin={isQuestionAdmin}
                initialReelId={selectedReelId}
                liteMode={settings.liteMode}
                onOpenQuestion={(qId) => goToQuestionDetail(qId)}
                onPracticeTopic={(tId) => {
                  setTopicFilter(tId);
                  handleGoHome();
                }}
              />
            ) : view === "mock" ? (
              isMockHistoryLoading || isActiveMockExamLoading ? (
                <MockSkeletonLoader />
              ) : (
                <MockExam
                  totalQuestions={Math.min(qs.length, PRO_EXAM_TOTAL)}
                  proQuestionsCount={proQuestionsCount}
                  subProQuestionsCount={subProQuestionsCount}
                  questions={qs}
                  masteryMap={masteryMap}
                  presets={EXAM_PRESETS}
                  onStartProfessional={handleStartProfessional}
                  onStartSubprofessional={handleStartSubprofessional}
                  onStartExam={handleStartExam}
                  onStartQuickPractice={handleStartQuickPractice}
                  activeExam={savedActiveMockExam}
                  isActiveExamLoading={isActiveMockExamLoading}
                  onResumeActiveExam={handleResumeActiveMockExam}
                  history={mockHistory}
                  isHistoryLoading={isMockHistoryLoading}
                  onOpenAttempt={handleOpenMockAttempt}
                  isAuthenticated={isAuthenticated}
                  authAvailable={authAvailable}
                  onRequireAuth={handleSignIn}
                />
              )
            ) : view === "mockAttempt" ? (
              selectedMockAttempt ? (
                <MockAttemptDetail
                  attempt={selectedMockAttempt}
                  qMap={qMap}
                  onBack={handleGoMockExam}
                  onReviewAttempt={handleReviewAttempt}
                  onStartDrillMistakes={handleStartDrillMistakes}
                />
              ) : (
                <MockExam
                  totalQuestions={Math.min(qs.length, PRO_EXAM_TOTAL)}
                  proQuestionsCount={proQuestionsCount}
                  subProQuestionsCount={subProQuestionsCount}
                  questions={qs}
                  masteryMap={masteryMap}
                  presets={EXAM_PRESETS}
                  onStartProfessional={handleStartProfessional}
                  onStartSubprofessional={handleStartSubprofessional}
                  onStartExam={handleStartExam}
                  onStartQuickPractice={handleStartQuickPractice}
                  activeExam={savedActiveMockExam}
                  isActiveExamLoading={isActiveMockExamLoading}
                  onResumeActiveExam={handleResumeActiveMockExam}
                  history={mockHistory}
                  isHistoryLoading={isMockHistoryLoading}
                  onOpenAttempt={handleOpenMockAttempt}
                  isAuthenticated={isAuthenticated}
                  authAvailable={authAvailable}
                  onRequireAuth={handleSignIn}
                />
              )
            ) : view === "mockRun" ? (
              exam ? (
                <MockExamRunner
                  exam={exam}
                  qMap={qMap}
                  onUpdateExam={setExam}
                  onExit={exam?.returnView === "my-questions" ? () => handleGoMyQuestions() : handleGoMockExam}
                  onBackToAttempt={handleBackToAttempt}
                  onStartDrillMistakes={handleStartDrillMistakes}
                  onRecordBatchMastery={(outcomes) => {
                    const bankOutcomes = outcomes.filter((o) => qMap.has(o.id));
                    if (bankOutcomes.length > 0) {
                      recordBatchQuestionOutcomes(bankOutcomes, user?.id);
                    }
                  }}
                />
              ) : isActiveMockExamLoading ? (
                <LoadingSpinner fullScreen text="Restoring active mock exam..." />
              ) : (
                <MockExam
                  totalQuestions={qs.length}
                  questions={qs}
                  masteryMap={masteryMap}
                  onStartProfessional={handleStartProfessional}
                  onStartQuickPractice={handleStartQuickPractice}
                  activeExam={savedActiveMockExam}
                  isActiveExamLoading={isActiveMockExamLoading}
                  onResumeActiveExam={handleResumeActiveMockExam}
                  history={mockHistory}
                  isHistoryLoading={isMockHistoryLoading}
                  onOpenAttempt={handleOpenMockAttempt}
                  isAuthenticated={isAuthenticated}
                  authAvailable={authAvailable}
                  onRequireAuth={handleSignIn}
                />
              )
            ) : view === "settings" ? (
              <SettingsPage
                initialTab={settingsTab}
                onTabChange={navigateSettings}
                settings={settings}
                onUpdateSettings={updateSettings}
                onResetSettings={resetSettings}
                profile={profile}
                onUpdateProfile={updateProfile}
                isDark={isDark}
                onToggleTheme={toggleTheme}
                isAuthenticated={isAuthenticated}
                isQuestionAdmin={isQuestionAdmin}
                isSuperAdmin={isSuperAdmin}
                canManageRoles={canManageRoles}
                canModerateUsers={canModerateUsers}
                canBulkImport={canBulkImport}
                totalQuestions={qs.length}
                mockAttemptsCount={mockHistory.length}
                favoritesCount={favoriteCount}
                notesCount={0}
                questions={qs}
                onImportQuestions={importQuestionsBulk}
                onBackToMain={handleGoHome}
              />
            ) : view === "add" ? (
              <div className="qb-editor-shell">
              <div className="qb-editor">
                <div className="qb-editor-main">
                  <QuestionForm 
                    initialData={editId ? qs.find(q => q.id === editId) : null} 
                    onSave={handleSave} 
                    onCancel={handleCancelEdit} 
                    sideRailHost={editorAsideHostEl}
                  />
                </div>
                <div className="qb-editor-side">
                  <div ref={setEditorAsideHostEl} className="qb-editor-side-host" />
                </div>
              </div>
              </div>
            ) : null}
            </Suspense>
            )}
            </div>
          </main>
        </div>
        {isMobile && view !== "mockRun" && view !== "detail" && view !== "add" && (
          <MobileTabBar items={mobileNavItems} activeId={primaryView} />
        )}
      </div>

      <TutorialGuide run={runGuide} onFinish={handleGuideFinish} isDark={isDark} />

      {showHelpModal && (
        <HelpModal
          isDark={isDark}
          onClose={() => setShowHelpModal(false)}
          onRestartTour={handleRestartGuide}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignInWithEmail={signInWithEmail}
        onSignInWithGoogle={signInWithGoogle}
        isDark={isDark}
      />
    </div>
  );
}
