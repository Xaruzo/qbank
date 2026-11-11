import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./views/components/Header";
import Stats from "./views/components/Stats";
import SearchAndFilter from "./views/components/SearchAndFilter";
import QuestionList from "./views/components/QuestionList";
import QuestionDetail from "./views/components/QuestionDetail";
import SideNav from "./views/components/SideNav";

// Route-level code splitting: heavy screens (drawing editor, mock exam runner,
// tips with canvas) are fetched on demand so the question bank paints fast.
const QuestionForm = lazy(() => import("./views/components/QuestionForm"));
const MockExam = lazy(() => import("./views/components/MockExam"));
const MockAttemptDetail = lazy(() => import("./views/components/MockAttemptDetail"));
const MockExamRunner = lazy(() => import("./views/components/MockExamRunner"));
const TipsPage = lazy(() => import("./views/components/TipsPage"));
const TipDetailPage = lazy(() => import("./views/components/TipDetailPage"));
const NotesPage = lazy(() => import("./views/components/NotesPage"));
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
import { storageModel } from "./models/storageModel";
import { tipsModel } from "./models/tipsModel";
import { favoritesModel } from "./models/favoritesModel";
import { rolesModel } from "./models/rolesModel";
import { buildMockExamAttempt, buildReviewExamFromAttempt, buildMistakeDrillExam } from "./utils/mockExamAnalytics";
import { Home, ClipboardList, Lightbulb, PlayCircle, ArrowRight, BookOpen, Plus, ShieldCheck } from "lucide-react";
import { QUESTION_ADMIN_UIDS, QUESTION_ADMIN_EMAILS, SUPERADMIN_UIDS, SUPERADMIN_EMAILS, EXAM_PRESETS } from "./constants/appConstants";
import type { TopicId } from "./types";

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
const PRO_EXAM_DURATION_MS = EXAM_PRESETS.professional.durationMs;
const PRO_EXAM_TOTAL = EXAM_PRESETS.professional.totalItems;
const SUBPRO_EXAM_DURATION_MS = EXAM_PRESETS.subprofessional.durationMs;
const SUBPRO_EXAM_TOTAL = EXAM_PRESETS.subprofessional.totalItems;

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
  
  const { isDark, themeMode, setThemeMode, toggleTheme } = useThemeController();
  const {
    settings,
    updateSettings,
    toggleLiteMode,
    toggleAnimations,
    resetSettings,
  } = useSettingsController();
  
  const { 
    qs, loading, refreshing, favoritesLoading, search, setSearch, topicFilter, setTopicFilter, labelFilter, setLabelFilter,
    favoriteOnly, setFavoriteOnly,
    sortBy, setSortBy, saveQuestion, deleteQuestion, ensureSolutionDraw, toggleFavorite, counts, labelOptions, filteredQuestions 
  } = useQuestionsController(user?.id, isAuthLoading);

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
    setSelectedNoteId,
    settingsTab,
    setSettingsTab,
    deepLinkShowSol,
    setDeepLinkShowSol,
    exam,
    setExam,
    navigateHome: handleGoHome,
    navigateLanding,
    navigateSignIn: handleSignIn,
    navigateMockExam: handleGoMockExam,
    navigateTips: handleGoTips,
    navigateNotes: handleGoNotes,
    navigateSettings,
    navigateQuestionDetail: goToQuestionDetail,
    navigateAddQuestion: handleGoAdd,
    navigateEditQuestion,
    navigateTipDetail: handleOpenTipDetail,
    navigateMockAttempt: handleOpenMockAttempt,
    navigateMockRun,
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

  const [layersHostEl, setLayersHostEl] = useState<HTMLElement | null>(null);
  const [editorAsideHostEl, setEditorAsideHostEl] = useState<HTMLElement | null>(null);

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
  const canManageQuestions = isQuestionAdmin;
  const favoriteCount = useMemo(() => qs.filter((q) => q.favorite).length, [qs]);
  const labeledCount = useMemo(() => qs.filter((q) => `${q.label || ""}`.trim().length > 0).length, [qs]);
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
        console.error("Failed to load mock exam history:", e);
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
        console.error("Failed to sync pending mock exam attempts:", e);
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
        console.error("Failed to sync pending tips:", e);
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
        console.error("Failed to sync pending favorites:", e);
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
        console.error("Failed to persist completed mock exam:", e);
      }
    };

    persistCompletedAttempt();
  }, [exam, isAuthenticated, qMap, user?.id]);

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
  };

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

  const handleBackToAttempt = (attemptId?: string) => {
    const targetId = attemptId || selectedMockAttemptId;
    if (targetId) {
      handleOpenMockAttempt(targetId);
    } else {
      handleGoMockExam();
    }
  };

  const handleSave = async (formData: any) => {
    if (!canManageQuestions) return;
    await saveQuestion(formData, editId);
    if (editId) goToQuestionDetail(editId);
    else handleGoHome();
  };

  const handleDelete = async (id: string) => {
    if (!canManageQuestions) return;
    await deleteQuestion(id);
    handleGoHome();
  };

  const handleAddQuestionAction = async () => {
    if (canManageQuestions) {
      handleGoAdd();
      return;
    }
    if (authAvailable && !isAuthenticated) await handleSignIn();
  };

  const handleEditQuestionAction = async (question) => {
    if (canManageQuestions) {
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
  const selectedMockAttempt = mockHistory.find((attempt) => attempt.id === selectedMockAttemptId) || null;
  const selectedIndexInFiltered = filteredQuestions.findIndex(q => q.id === selectedId);
  const nextQuestion = selectedIndexInFiltered >= 0 ? filteredQuestions[selectedIndexInFiltered + 1] : null;
  const prevQuestion = selectedIndexInFiltered > 0 ? filteredQuestions[selectedIndexInFiltered - 1] : null;
  const primaryView = view === "mock" || view === "mockRun" || view === "mockAttempt"
    ? "mock"
    : view === "tips" || view === "tipDetail"
      ? "tips"
      : view === "notes"
        ? "notes"
        : "home";
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
      badge: qs.length > 0 ? qs.length : null,
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
      id: "tips",
      label: "Study Tips",
      shortLabel: "Study Tips",
      icon: Lightbulb,
      onClick: () => {
        if (view === "tips") scrollMainToTop();
        else handleGoTips();
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
  ];
  const activeMobileTabIndex = Math.max(
    0,
    mobileNavItems.findIndex((item) => item.id === primaryView)
  );

  useEffect(() => {
    const el = mainRef.current;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (!el) return;
    if (view === "detail") {
      const card = el.querySelector(".qb-det-card");
      if (card) card.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      el.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [view, selectedId, selectedMockAttemptId, editId]);

  if (view === "landing") {
    return (
      <LandingPage
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onStartReview={() => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleGoHome();
        }}
        onSignIn={handleSignIn}
        onExploreGuest={() => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleGoHome();
        }}
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
          handleGoHome();
        }}
        onContinueAsGuest={() => {
          try { sessionStorage.setItem("qbank-session-active", "true"); } catch (_) {}
          handleGoHome();
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
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
          onUpdateProfile={updateProfile}
        />

        {/* Unified Overlay Navigation Drawer for Mobile & Tablet/Compact */}
        {(isMobile || isCompact) && (
          <SideNav
            variant="overlay"
            open={navOpen}
            active={primaryView}
            onHome={handleGoHome}
            onLanding={handleGoLanding}
            onMockExam={handleGoMockExam}
            onTips={handleGoTips}
            onNotes={handleGoNotes}
            onClose={() => setNavOpen(false)}
            totalQuestions={qs.length}
            starredCount={favoriteCount}
            onOpenHelp={handleOpenHelp}
            onOpenSettings={handleGoSettings}
            isAuthenticated={isAuthenticated}
            profile={profile}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            activeTopic={topicFilter as TopicId | "all"}
            onSelectTopic={(t) => {
              setTopicFilter(t);
              handleGoHome();
            }}
            topicCounts={counts}
            settings={settings}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            themeMode={themeMode}
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
              onHome={handleGoHome}
              onLanding={handleGoLanding}
              onMockExam={handleGoMockExam}
              onTips={handleGoTips}
              onNotes={handleGoNotes}
              onToggleNav={toggleNav}
              totalQuestions={qs.length}
              starredCount={favoriteCount}
              onOpenHelp={handleOpenHelp}
              onOpenSettings={handleGoSettings}
              isAuthenticated={isAuthenticated}
              profile={profile}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              activeTopic={topicFilter as TopicId | "all"}
              onSelectTopic={(t) => {
                setTopicFilter(t);
                handleGoHome();
              }}
              topicCounts={counts}
              settings={settings}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              themeMode={themeMode}
              onSetThemeMode={setThemeMode}
              isQuestionAdmin={isQuestionAdmin}
              isSuperAdmin={isSuperAdmin}
              userRole={userRole}
            />
          )}
          <main ref={mainRef} className={`qb-main${view === "mockRun" ? " qb-main-exam" : view === "detail" ? " qb-main-detail" : ""}`}>
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
                  : view === "settings"
                  ? " qb-main-inner-settings"
                  : ""
              }`}
            >
            {loading ? (
              <SkeletonLoader />
            ) : (
            <Suspense fallback={<PageLoader view={view} />}>
            {view === "list" ? (
              <div className="fu qb-dashboard">
                <section className="qb-list-hero" aria-label="Civil Service Reviewer Workspace">
                  <div className="qb-list-hero-main">
                    <div className="qb-hero-badge-wrap">
                      <span className="qb-hero-kicker-tag">
                        <ShieldCheck size={14} />
                        Philippine Civil Service Exam Reviewer
                      </span>
                    </div>
                    <h1 className="qb-list-hero-title">Master the Civil Service Exam with Confidence.</h1>
                    <p className="qb-list-hero-copy">
                      Practice with authentic multiple-choice questions, take realistic timed simulations matching official CSC specifications, and master concepts through step-by-step visual solutions.
                    </p>

                    <div className="qb-hero-stats-meta" aria-label="Question Bank Summary">
                      <span><strong><CountUp end={qs.length} duration={1200} /></strong> Total Questions</span>
                      <span className="qb-hero-stats-sep" aria-hidden="true">·</span>
                      <span><strong><CountUp end={activeTopicCount} duration={1000} /></strong> Subjects Active</span>
                      <span className="qb-hero-stats-sep" aria-hidden="true">·</span>
                      <span><strong><CountUp end={favoriteCount} duration={1000} /></strong> Starred Items</span>
                      {refreshing && (
                        <>
                          <span className="qb-hero-stats-sep" aria-hidden="true">·</span>
                          <span className="qb-sync-inline">
                            <span className="qb-sync-dot" />
                            Syncing questions
                          </span>
                        </>
                      )}
                    </div>

                    <div className="qb-hero-actions">
                      <button
                        type="button"
                        className="qb-hero-cta"
                        onClick={handleGoMockExam}
                      >
                        <PlayCircle size={18} />
                        Take Timed Mock Exam
                      </button>
                      <button
                        type="button"
                        className="qb-hero-secondary"
                        onClick={() => handleGoTips()}
                      >
                        <Lightbulb size={18} />
                        Study Tips & Methods
                      </button>
                      {canManageQuestions && (
                        <button
                          type="button"
                          className="qb-hero-ghost"
                          onClick={handleAddQuestionAction}
                          title="Add a new question to the bank"
                        >
                          <Plus size={15} className="qb-add-btn-icon" />
                          <span className="qb-add-btn-text">Add Question</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="qb-list-hero-side">
                    <div className="qb-hero-exam-hub">
                      <div className="qb-hero-hub-header">
                        <div>
                          <div className="qb-hero-hub-kicker">CSC Exam Presets</div>
                          <div className="qb-hero-hub-title">Official Test Formats</div>
                        </div>
                        <button
                          type="button"
                          className="qb-hero-hub-link"
                          onClick={handleGoMockExam}
                          title="Open Mock Exam Center"
                        >
                          View Center <ArrowRight size={13} />
                        </button>
                      </div>

                      <div className="qb-hero-preset-item">
                        <div className="qb-hero-preset-info">
                          <div className="qb-hero-preset-name">Professional Level</div>
                          <div className="qb-hero-preset-specs">170 items · 3h 10m · 80% passing</div>
                        </div>
                        <button
                          type="button"
                          className="qb-hero-preset-btn"
                          onClick={() => {
                            if (!isAuthenticated) {
                              handleSignIn();
                            } else {
                              handleStartExam("professional");
                            }
                          }}
                        >
                          Start <ArrowRight size={13} />
                        </button>
                      </div>

                      <div className="qb-hero-preset-item">
                        <div className="qb-hero-preset-info">
                          <div className="qb-hero-preset-name">Subprofessional Level</div>
                          <div className="qb-hero-preset-specs">165 items · 2h 40m · 80% passing</div>
                        </div>
                        <button
                          type="button"
                          className="qb-hero-preset-btn"
                          onClick={() => {
                            if (!isAuthenticated) {
                              handleSignIn();
                            } else {
                              handleStartExam("subprofessional");
                            }
                          }}
                        >
                          Start <ArrowRight size={13} />
                        </button>
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
                  onResetFilters={handleResetFilters}
                />

                <QuestionList 
                  questions={filteredQuestions} 
                  onSelect={handleSelectQuestion} 
                  onToggleFavorite={toggleFavorite}
                  totalInProject={qs.length} 
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  canManageQuestions={canManageQuestions}
                  authAvailable={authAvailable}
                  isAuthenticated={isAuthenticated}
                  onAddQuestion={handleAddQuestionAction}
                  onNavigateToTips={() => handleGoTips()}
                  resetKey={`${search}|${topicFilter}|${labelFilter}|${favoriteOnly}|${sortBy}`}
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
                canManageQuestions={canManageQuestions}
                questionIndex={selectedIndexInFiltered >= 0 ? selectedIndexInFiltered + 1 : undefined}
                totalQuestions={filteredQuestions.length > 0 ? filteredQuestions.length : qs.length}
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
            ) : view === "notes" ? (
              <NotesPage
                userId={user?.id || null}
                onBack={handleGoHome}
                initialNoteId={selectedNoteId}
              />
            ) : view === "mock" ? (
              isMockHistoryLoading || isActiveMockExamLoading ? (
                <MockSkeletonLoader />
              ) : (
                <MockExam
                  totalQuestions={Math.min(qs.length, PRO_EXAM_TOTAL)}
                  proQuestionsCount={proQuestionsCount}
                  subProQuestionsCount={subProQuestionsCount}
                  presets={EXAM_PRESETS}
                  onStartProfessional={handleStartProfessional}
                  onStartSubprofessional={handleStartSubprofessional}
                  onStartExam={handleStartExam}
                  activeExam={savedActiveMockExam}
                  isActiveExamLoading={isActiveMockExamLoading}
                  onResumeActiveExam={handleResumeActiveMockExam}
                  history={mockHistory}
                  isHistoryLoading={isMockHistoryLoading}
                  onReviewAttempt={handleReviewAttempt}
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
                  presets={EXAM_PRESETS}
                  onStartProfessional={handleStartProfessional}
                  onStartSubprofessional={handleStartSubprofessional}
                  onStartExam={handleStartExam}
                  activeExam={savedActiveMockExam}
                  isActiveExamLoading={isActiveMockExamLoading}
                  onResumeActiveExam={handleResumeActiveMockExam}
                  history={mockHistory}
                  isHistoryLoading={isMockHistoryLoading}
                  onReviewAttempt={handleReviewAttempt}
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
                  onExit={handleGoMockExam}
                  onBackToAttempt={handleBackToAttempt}
                  onStartDrillMistakes={handleStartDrillMistakes}
                />
              ) : isActiveMockExamLoading ? (
                <LoadingSpinner fullScreen text="Restoring active mock exam..." />
              ) : (
                <MockExam
                  totalQuestions={qs.length}
                  onStartProfessional={handleStartProfessional}
                  activeExam={savedActiveMockExam}
                  isActiveExamLoading={isActiveMockExamLoading}
                  onResumeActiveExam={handleResumeActiveMockExam}
                  history={mockHistory}
                  isHistoryLoading={isMockHistoryLoading}
                  onReviewAttempt={handleReviewAttempt}
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
                userRole={userRole}
                totalQuestions={qs.length}
                mockAttemptsCount={mockHistory.length}
                favoritesCount={favoriteCount}
                notesCount={0}
                onBackToMain={handleGoHome}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
              />
            ) : view === "add" ? (
              <div className="qb-editor-shell">
              <div className="qb-editor">
                <div className="qb-editor-main">
                  <QuestionForm 
                    initialData={editId ? qs.find(q => q.id === editId) : null} 
                    onSave={handleSave} 
                    onCancel={handleCancelEdit} 
                    layersHost={layersHostEl}
                    sideRailHost={editorAsideHostEl}
                  />
                </div>
                <div className="qb-editor-side">
                  <div ref={setEditorAsideHostEl} className="qb-editor-side-host" />
                  <div className="qb-editor-side-card qb-editor-side-card-layers">
                    <div className="qb-editor-side-card-head">
                      <span className="qb-editor-side-kicker">Visual Solutions</span>
                      <div className="qb-editor-side-title">Dedicated Whiteboard</div>
                      <p className="qb-editor-side-copy">
                        Draw math steps, fraction trees, and geometry figures in a focused, fullscreen canvas dialog without scrolling interference.
                      </p>
                    </div>
                  </div>
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
          <nav
            className="qb-mobile-tabbar"
            aria-label="Primary Bottom Navigation"
          >
            <div className="qb-mobile-tabbar-inner">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = primaryView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`qb-mobile-tab${isActive ? " on" : ""}`}
                    onClick={item.onClick}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.badge ? `${item.label} (${item.badge} items)` : item.label}
                  >
                    <span className="qb-mobile-tab-indicator" aria-hidden="true" />
                    <span className="qb-mobile-tab-surface">
                      <span className="qb-mobile-tab-icon-box" aria-hidden="true">
                        <Icon size={20} strokeWidth={isActive ? 2.4 : 1.85} />
                        {item.isLive && (
                          <span
                            className="qb-mobile-tab-live-dot"
                            title="Mock exam in progress"
                          />
                        )}
                        {item.badge != null && (
                          <span className="qb-mobile-tab-badge" title={`${item.badge} questions`}>
                            {item.badge}
                          </span>
                        )}
                      </span>
                      <span className="qb-mobile-tab-label">
                        {item.shortLabel || item.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
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
