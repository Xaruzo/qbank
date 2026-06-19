import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./views/components/Header";
import Stats from "./views/components/Stats";
import SearchAndFilter from "./views/components/SearchAndFilter";
import QuestionList from "./views/components/QuestionList";
import QuestionDetail from "./views/components/QuestionDetail";
import QuestionForm from "./views/components/QuestionForm";
import SideNav from "./views/components/SideNav";
import MockExam from "./views/components/MockExam";
import MockAttemptDetail from "./views/components/MockAttemptDetail";
import MockExamRunner from "./views/components/MockExamRunner";
import { useAuthController } from "./controllers/useAuthController";
import { useQuestionsController } from "./controllers/useQuestionsController";
import { useThemeController } from "./controllers/useThemeController";
import { storageModel } from "./models/storageModel";
import { buildMockExamAttempt, buildReviewExamFromAttempt } from "./utils/mockExamAnalytics";
import { ArrowDown, Home, ClipboardList } from "lucide-react";

const PRO_EXAM_DURATION_MS = (3 * 60 * 60 + 20 * 60) * 1000;
const PRO_EXAM_TOTAL = 170;

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

export default function App() {
  console.log('[App] Initializing, window.storage:', !!window.storage, typeof window?.storage?.get);
  // Clean up localStorage to free up space on load
  storageModel.cleanupLocalStorage();
  const { 
    qs, loading, search, setSearch, topicFilter, setTopicFilter, sortBy, setSortBy,
    saveQuestion, deleteQuestion, toggleFavorite, counts, filteredQuestions 
  } = useQuestionsController();
  
  const { isDark, toggleTheme } = useThemeController();
  const {
    authAvailable,
    isAuthLoading,
    isAuthenticated,
    user,
    profile,
    signInWithGoogle,
    signOut,
  } = useAuthController();

  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deepLinkShowSol, setDeepLinkShowSol] = useState(false);
  const [layersHostEl, setLayersHostEl] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [exam, setExam] = useState(null);
  const [mockHistory, setMockHistory] = useState([]);
  const [isMockHistoryLoading, setIsMockHistoryLoading] = useState(false);
  const [selectedMockAttemptId, setSelectedMockAttemptId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const mainRef = useRef(null);
  const qsRef = useRef(qs);
  const mockHistoryRef = useRef([]);
  const savedExamSessionsRef = useRef(new Set());
  const qMap = useMemo(() => new Map(qs.map(q => [q.id, q])), [qs]);
  const canManageQuestions = isAuthenticated || !authAvailable;

  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(max-width: 600px)").matches) setNavOpen(false);
  }, []);

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
    if (isMobile) setNavOpen(false);
  }, [isMobile]);

  useEffect(() => {
    qsRef.current = qs;
  }, [qs]);

  useEffect(() => {
    mockHistoryRef.current = mockHistory;
  }, [mockHistory]);

  useEffect(() => {
    let active = true;
    console.log('[App] Mock history effect triggered:', { isAuthenticated, user, isAuthLoading });

    const loadMockHistory = async () => {
      // If auth is still loading, wait
      if (isAuthLoading) return;

      setIsMockHistoryLoading(true);
      try {
        if (!isAuthenticated || !user?.id) {
          if (active) setMockHistory([]);
          return;
        }

        const history = await storageModel.getMockExamHistory(user.id);
        if (active) setMockHistory(Array.isArray(history) ? history : []);
      } catch (e) {
        console.error("[App] Failed to load mock exam history:", e);
      } finally {
        if (active) setIsMockHistoryLoading(false);
      }
    };

    loadMockHistory();
    
    // Subscribe to real-time mock exam attempt changes
    let unsubscribeRealTime = () => {};
    if (isAuthenticated && user?.id) {
      unsubscribeRealTime = storageModel.subscribeToMockExamAttempts(user.id, async () => {
        console.log('[App] Real-time mock exam attempt change detected, refreshing history');
        const history = await storageModel.getMockExamHistory(user.id);
        if (active) setMockHistory(Array.isArray(history) ? history : []);
      });
    }
    
    return () => {
      active = false;
      unsubscribeRealTime();
    };
  }, [isAuthenticated, user?.id, isAuthLoading]);

  useEffect(() => {
    if (loading) return;

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page");
      const id = params.get("q");
      const attemptId = params.get("attempt");
      const sol = params.get("sol") === "1";

      if (page === "mock") {
        setSelectedId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setView("mock");
        return;
      }

      if (page === "mock-run") {
        if (!isAuthenticated) {
          setSelectedId(null);
          setDeepLinkShowSol(false);
          setEditId(null);
          setExam(null);
          setView("mock");
          window.history.replaceState({}, "", `?page=mock`);
          return;
        }
        setSelectedId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setView("mockRun");
        return;
      }

      if (page === "mock-attempt") {
        if (!isAuthenticated) {
          setSelectedMockAttemptId(null);
          setSelectedId(null);
          setDeepLinkShowSol(false);
          setEditId(null);
          setExam(null);
          setView("mock");
          window.history.replaceState({}, "", `?page=mock`);
          return;
        }
        setSelectedMockAttemptId(attemptId || null);
        setSelectedId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setView("mockAttempt");
        return;
      }

      if (id && qsRef.current.some(q => q.id === id)) {
        setSelectedId(id);
        setSelectedMockAttemptId(null);
        setDeepLinkShowSol(sol);
        setEditId(null);
        setView("detail");
        return;
      }

      setSelectedMockAttemptId(null);
      setSelectedId(null);
      setDeepLinkShowSol(false);
      setView("list");
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [loading, isAuthenticated]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const updateScrollButton = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      setShowScrollBottom(view === "list" && !nearBottom);
    };

    updateScrollButton();
    el.addEventListener("scroll", updateScrollButton);
    window.addEventListener("resize", updateScrollButton);

    return () => {
      el.removeEventListener("scroll", updateScrollButton);
      window.removeEventListener("resize", updateScrollButton);
    };
  }, [view, filteredQuestions.length]);

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

  const handleGoAdd = () => {
    setEditId(null);
    setSelectedId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", window.location.pathname);
    setView("add");
  };

  const handleGoEdit = (q) => {
    setEditId(q.id);
    setSelectedId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", window.location.pathname);
    setView("add");
  };

  const handleSelectQuestion = (id) => {
    setSelectedId(id);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?q=${encodeURIComponent(id)}`);
    setView("detail");
  };

  const handleGoHome = () => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", window.location.pathname);
    setView("list");
  };

  const handleGoMockExam = () => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=mock`);
    setView("mock");
  };

  const handleOpenMockAttempt = (attemptId) => {
    if (!attemptId) return;
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(attemptId);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=mock-attempt&attempt=${encodeURIComponent(attemptId)}`);
    setView("mockAttempt");
  };

  const handleStartProfessional = () => {
    if (!isAuthenticated) {
      handleSignIn();
      return;
    }
    const ids = qs.map(q => q.id);
    const orderIds = shuffleIds(ids).slice(0, PRO_EXAM_TOTAL);
    const nextExam = {
      sessionId: `exam-${Date.now()}`,
      mode: "professional",
      startedAt: Date.now(),
      durationMs: PRO_EXAM_DURATION_MS,
      totalCount: PRO_EXAM_TOTAL,
      orderIds,
      answers: {},
      review: {},
      currentIndex: 0,
      finished: false,
      isReviewSession: false,
      historySaved: false,
    };
    setExam(nextExam);
    window.history.pushState({}, "", `?page=mock-run`);
    setView("mockRun");
  };

  const handleReviewAttempt = (attempt, questionId = null) => {
    if (!attempt) return;
    setEditId(null);
    setSelectedId(null);
    setDeepLinkShowSol(false);
    setExam(buildReviewExamFromAttempt(attempt, questionId));
    window.history.pushState({}, "", `?page=mock-run`);
    setView("mockRun");
  };

  const handleSave = async (formData) => {
    if (!canManageQuestions) return;
    await saveQuestion(formData, editId);
    handleGoHome();
  };

  const handleDelete = async (id) => {
    if (!canManageQuestions) return;
    await deleteQuestion(id);
    handleGoHome();
  };

  const handleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) console.error("Google sign-in failed:", error);
  };

  const handleAddQuestionAction = async () => {
    if (canManageQuestions) {
      handleGoAdd();
      return;
    }
    await handleSignIn();
  };

  const handleEditQuestionAction = async (question) => {
    if (canManageQuestions) {
      handleGoEdit(question);
      return;
    }
    await handleSignIn();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) console.error("Sign out failed:", error);
    if (view === "mockRun") handleGoMockExam();
  };

  const selectedQuestion = qs.find(q => q.id === selectedId);
  const selectedMockAttempt = mockHistory.find((attempt) => attempt.id === selectedMockAttemptId) || null;
  const selectedIndexInFiltered = filteredQuestions.findIndex(q => q.id === selectedId);
  const nextQuestion = selectedIndexInFiltered >= 0 ? filteredQuestions[selectedIndexInFiltered + 1] : null;

  const scrollToBottom = () => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    const el = mainRef.current;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view, selectedId, selectedMockAttemptId, editId]);

  return (
    <div className={`qb${isDark ? "" : " light"}`}>
      <div className="qb-wrap">
        <Header 
          isDark={isDark} 
          onToggleTheme={toggleTheme} 
          onHome={handleGoHome}
          showNavToggle={true}
          navOpen={navOpen}
          onToggleNav={() => setNavOpen(v => !v)}
          authAvailable={authAvailable}
          isAuthLoading={isAuthLoading}
          isAuthenticated={isAuthenticated}
          profile={profile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        {isMobile && navOpen && (
          <div className="qb-mnav-ov" onClick={() => setNavOpen(false)}>
            <div className="qb-mnav-card" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`qb-nav-item${view === "mock" || view === "mockRun" || view === "mockAttempt" ? "" : " on"}`}
                onClick={() => { setNavOpen(false); handleGoHome(); }}
              >
                <Home size={18} />
                <span>Home</span>
              </button>
              <button
                type="button"
                className={`qb-nav-item${view === "mock" || view === "mockRun" || view === "mockAttempt" ? " on" : ""}`}
                onClick={() => { setNavOpen(false); handleGoMockExam(); }}
              >
                <ClipboardList size={18} />
                <span>Mock Exam</span>
              </button>
            </div>
          </div>
        )}

        <div className="qb-shell">
          {!isMobile && (
            <SideNav
              open={navOpen}
              active={view === "mock" || view === "mockRun" || view === "mockAttempt" ? "mock" : "home"}
              onHome={handleGoHome}
              onMockExam={handleGoMockExam}
            />
          )}
          <main ref={mainRef} className={`qb-main${view === "mockRun" ? " qb-main-exam" : ""}`}>
            <div
              className={`qb-main-inner${
                view === "add" ? " qb-main-inner-wide" : view === "mockRun" ? " qb-main-inner-exam" : view === "mockAttempt" ? " qb-main-inner-mock-attempt" : ""
              }`}
            >
            {loading ? (
              <div className="qb-loading">
                <div className="qb-loading-spinner" aria-hidden="true" />
                <div className="qb-loading-text">Loading questions...</div>
              </div>
            ) : view === "list" ? (
              <div className="fu">
                <Stats total={qs.length} counts={counts} />
                <SearchAndFilter 
                  search={search} 
                  onSearchChange={setSearch} 
                  topicFilter={topicFilter} 
                  onTopicChange={setTopicFilter} 
                  total={qs.length} 
                  counts={counts} 
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
                  onAddQuestion={handleAddQuestionAction}
                />
              </div>
            ) : view === "detail" && selectedQuestion ? (
              <QuestionDetail 
                question={selectedQuestion} 
                onBack={handleGoHome} 
                onEdit={handleEditQuestionAction} 
                onDelete={handleDelete} 
                onToggleFavorite={toggleFavorite}
                forceShowSolution={deepLinkShowSol}
                hasNext={!!nextQuestion}
                canManageQuestions={canManageQuestions}
                onRequireAuth={handleSignIn}
                onNext={() => {
                  if (nextQuestion) handleSelectQuestion(nextQuestion.id);
                  else handleGoHome();
                }}
              />
            ) : view === "mock" ? (
              <MockExam
                totalQuestions={Math.min(qs.length, PRO_EXAM_TOTAL)}
                onStartProfessional={handleStartProfessional}
                history={mockHistory}
                isHistoryLoading={isMockHistoryLoading}
                onReviewAttempt={handleReviewAttempt}
                onOpenAttempt={handleOpenMockAttempt}
                isAuthenticated={isAuthenticated}
                authAvailable={authAvailable}
                onRequireAuth={handleSignIn}
              />
            ) : view === "mockAttempt" ? (
              selectedMockAttempt ? (
                <MockAttemptDetail
                  attempt={selectedMockAttempt}
                  onBack={handleGoMockExam}
                  onReviewAttempt={handleReviewAttempt}
                />
              ) : (
                <MockExam
                  totalQuestions={Math.min(qs.length, PRO_EXAM_TOTAL)}
                  onStartProfessional={handleStartProfessional}
                  history={mockHistory}
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
                />
              ) : (
                <MockExam
                  totalQuestions={qs.length}
                  onStartProfessional={handleStartProfessional}
                  history={mockHistory}
                  onReviewAttempt={handleReviewAttempt}
                  onOpenAttempt={handleOpenMockAttempt}
                  isAuthenticated={isAuthenticated}
                  authAvailable={authAvailable}
                  onRequireAuth={handleSignIn}
                />
              )
            ) : view === "add" ? (
              <div className="qb-editor">
                <div className="qb-editor-main">
                  <QuestionForm 
                    initialData={editId ? qs.find(q => q.id === editId) : null} 
                    onSave={handleSave} 
                    onCancel={handleGoHome} 
                    layersHost={layersHostEl}
                  />
                </div>
                <div className="qb-editor-side">
                  <div ref={setLayersHostEl} className="qb-layers-host" />
                </div>
              </div>
            ) : null}
            </div>
          </main>
        </div>
        {showScrollBottom && (
          <button
            type="button"
            className="qb-scroll-bottom"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <ArrowDown size={16} />
            Bottom
          </button>
        )}
      </div>
    </div>
  );
}
