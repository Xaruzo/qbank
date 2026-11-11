import { useCallback, useEffect, useState } from "react";
import type { Question } from "../types";

export type ViewType =
  | "landing"
  | "signIn"
  | "list"
  | "detail"
  | "add"
  | "mock"
  | "mockRun"
  | "mockAttempt"
  | "tips"
  | "tipDetail"
  | "notes"
  | "settings";

interface UseViewRouterOptions {
  qs: Question[];
  authAvailable: boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  canManageQuestions?: boolean;
  onBeforeLeave?: () => void;
}

export function useViewRouter({
  qs,
  authAvailable,
  isAuthenticated,
  isAuthLoading,
}: UseViewRouterOptions) {
  // Initialize view from URL query param or user's stored session
  const [view, setView] = useState<ViewType>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page");
      if (page === "landing") return "landing";
      if (page === "signin" || page === "login") return "signIn";
      if (page === "settings") return "settings";
      if (page) return "list";

      const hasEntered =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("qbank-session-active") === "true";
      const hasSystemUser =
        typeof localStorage !== "undefined" &&
        !!localStorage.getItem("cse-qbank-system-user-v1");
      const hasSupabaseToken =
        typeof localStorage !== "undefined" &&
        Object.keys(localStorage).some(
          (k) => k.startsWith("sb-") && k.includes("-auth-token")
        );

      return hasEntered || hasSystemUser || hasSupabaseToken ? "list" : "landing";
    } catch {
      return "landing";
    }
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedMockAttemptId, setSelectedMockAttemptId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("page") === "settings") {
        return params.get("tab") || "identity";
      }
    } catch {}
    return "identity";
  });
  const [deepLinkShowSol, setDeepLinkShowSol] = useState<boolean>(false);
  const [exam, setExam] = useState<any | null>(null);

  // Sync state when browser Back / Forward buttons are clicked or URL changes
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page");
      const id = params.get("q");
      const attemptId = params.get("attempt");
      const sol = params.get("sol") === "1";

      if (page === "landing") {
        setSelectedMockAttemptId(null);
        setSelectedId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setView("landing");
        return;
      }

      if (page === "signin" || page === "login") {
        setSelectedMockAttemptId(null);
        setSelectedId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setView("signIn");
        return;
      }

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

      if (page === "tips") {
        setSelectedMockAttemptId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setSelectedId(null);
        setSelectedNoteId(null);
        setView("tips");
        return;
      }

      if (page === "notes") {
        const noteId = params.get("note");
        setSelectedMockAttemptId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setSelectedId(null);
        setSelectedNoteId(noteId || null);
        setView("notes");
        return;
      }

      if (page === "settings") {
        const tab = params.get("tab") || "identity";
        setSelectedMockAttemptId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setSelectedId(null);
        setSelectedNoteId(null);
        setSettingsTab(tab);
        setView("settings");
        return;
      }

      if (page === "tip") {
        setSelectedMockAttemptId(null);
        setDeepLinkShowSol(false);
        setEditId(null);
        setExam(null);
        setSelectedNoteId(null);
        if (id && qs.some((q) => q.id === id)) {
          setSelectedId(id);
          setView("tipDetail");
          return;
        }
        setSelectedId(null);
        setView("tips");
        return;
      }

      if (page === "add") {
        const editParam = params.get("edit");
        setSelectedMockAttemptId(null);
        setDeepLinkShowSol(false);
        setExam(null);
        setSelectedId(null);
        const editQ = editParam && qs.some((q) => q.id === editParam) ? editParam : null;
        setEditId(editQ);
        setView("add");
        return;
      }

      if (id && qs.some((q) => q.id === id)) {
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
      const hasActiveSession =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("qbank-session-active") === "true";
      const hasStoredAuthToken =
        typeof localStorage !== "undefined" &&
        (!!localStorage.getItem("cse-qbank-system-user-v1") ||
          Object.keys(localStorage).some(
            (k) => k.startsWith("sb-") && k.includes("-auth-token")
          ));

      if (isAuthenticated) {
        try {
          sessionStorage.setItem("qbank-session-active", "true");
        } catch (_) {}
      }

      if (!isAuthenticated && !hasActiveSession && !hasStoredAuthToken && !isAuthLoading) {
        setView("landing");
      } else {
        setView("list");
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [authAvailable, isAuthLoading, isAuthenticated, qs]);

  // Typed Navigation Actions
  const navigateHome = useCallback(() => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setSelectedNoteId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    try {
      sessionStorage.setItem("qbank-session-active", "true");
    } catch (_) {}
    window.history.pushState({}, "", window.location.pathname);
    setView("list");
  }, []);

  const navigateLanding = useCallback(() => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setSelectedNoteId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=landing`);
    setView("landing");
  }, []);

  const navigateSignIn = useCallback(() => {
    window.history.pushState({}, "", `?page=signin`);
    setView("signIn");
  }, []);

  const navigateMockExam = useCallback(() => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=mock`);
    setView("mock");
  }, []);

  const navigateTips = useCallback((questionId?: string | null) => {
    setEditId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    setSelectedId(null);
    setSelectedNoteId(null);
    window.history.pushState({}, "", `?page=tips`);
    setView("tips");
  }, []);

  const navigateNotes = useCallback((noteId?: string | null) => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    setSelectedNoteId(noteId || null);
    const query = noteId ? `?page=notes&note=${encodeURIComponent(noteId)}` : `?page=notes`;
    window.history.pushState({}, "", query);
    setView("notes");
  }, []);

  const navigateSettings = useCallback((tab: string = "identity") => {
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(null);
    setSelectedNoteId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    setSettingsTab(tab);
    window.history.pushState({}, "", `?page=settings&tab=${encodeURIComponent(tab)}`);
    setView("settings");
  }, []);

  const navigateQuestionDetail = useCallback((id: string, showSolution: boolean = false) => {
    setEditId(null);
    setSelectedId(id);
    setDeepLinkShowSol(showSolution);
    setExam(null);
    const query = showSolution ? `?q=${encodeURIComponent(id)}&sol=1` : `?q=${encodeURIComponent(id)}`;
    window.history.pushState({}, "", query);
    setView("detail");
  }, []);

  const navigateAddQuestion = useCallback(() => {
    setEditId(null);
    setSelectedId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=add`);
    setView("add");
  }, []);

  const navigateEditQuestion = useCallback((id: string) => {
    setEditId(id);
    setSelectedId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=add&edit=${encodeURIComponent(id)}`);
    setView("add");
  }, []);

  const navigateTipDetail = useCallback((questionId: string) => {
    if (!questionId) return;
    setSelectedId(questionId);
    setEditId(null);
    setSelectedMockAttemptId(null);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=tip&q=${encodeURIComponent(questionId)}`);
    setView("tipDetail");
  }, []);

  const navigateMockAttempt = useCallback((attemptId: string) => {
    if (!attemptId) return;
    setEditId(null);
    setSelectedId(null);
    setSelectedMockAttemptId(attemptId);
    setDeepLinkShowSol(false);
    setExam(null);
    window.history.pushState({}, "", `?page=mock-attempt&attempt=${encodeURIComponent(attemptId)}`);
    setView("mockAttempt");
  }, []);

  const navigateMockRun = useCallback((newExamState?: any) => {
    if (newExamState) setExam(newExamState);
    window.history.pushState({}, "", `?page=mock-run`);
    setView("mockRun");
  }, []);

  return {
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
    navigateHome,
    navigateLanding,
    navigateSignIn,
    navigateMockExam,
    navigateTips,
    navigateNotes,
    navigateSettings,
    navigateQuestionDetail,
    navigateAddQuestion,
    navigateEditQuestion,
    navigateTipDetail,
    navigateMockAttempt,
    navigateMockRun,
  };
}
