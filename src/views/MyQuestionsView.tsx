import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import {
  Plus,
  Globe,
  Lock,
  Trash2,
  Edit3,
  Share2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  BookOpen,
  RefreshCw,
  ArrowLeft,
  Search,
  X,
  Upload,
  Play,
  Clock,
  Shuffle,
  Link2,
  Layers,
  Users,
  CheckSquare,
  Square,
  ShieldCheck,
  Check,
  XCircle,
  Send,
  Calculator,
  BrainCircuit,
  ClipboardList,
} from "lucide-react";
import { personalQuestionsModel, type PersonalQuestion } from "../models/personalQuestionsModel";
import {
  miniMocksModel,
  type PersonalMiniMock,
  type MiniMockQuestionSnapshot,
} from "../models/miniMocksModel";
import { buildMiniMockExamSession } from "../utils/mockExamAnalytics";
import { TOPICS, PROBLEM_LABELS, LETTERS } from "../constants/appConstants";
import { fileToImagePayload } from "../utils/questionImageImport";
import CustomSelect from "./components/CustomSelect";
import MarkdownText from "./components/MarkdownText";
import { MyQuestionsSkeletonLoader } from "./components/SkeletonLoader";
import type { SelectOption } from "../types";

interface MyQuestionsViewProps {
  currentUser: { id?: string; email?: string; full_name?: string } | null;
  isAdmin?: boolean;
  onNavigateHome: () => void;
  onStartMiniMock?: (miniExam: ReturnType<typeof buildMiniMockExamSession>) => void;
  initialMiniMockId?: string | null;
}

const DEFAULT_FORM = {
  topic: "numerical",
  question: "",
  choices: ["", "", "", ""],
  correct: 0,
  solution: "",
  label: "",
  is_public: false,
};

const TOPIC_ICON_MAP: Record<string, typeof Calculator> = {
  numerical: Calculator,
  verbal: BookOpen,
  general: Globe,
  analytical: BrainCircuit,
  clerical: ClipboardList,
};

const DEFAULT_MINI_MOCK_FORM = {
  title: "",
  description: "",
  selectedIds: [] as string[],
  timed: true,
  durationMinutes: 10,
  shuffleQuestions: true,
  isPublic: false,
};

function summarizeTopics(items: Array<{ topic?: string }>): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.topic || "numerical";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([topicId, count]) => {
      const def = TOPICS.find((t) => t.id === topicId);
      return `${def ? def.short : topicId.toUpperCase()} (${count})`;
    })
    .join(" · ");
}

export function MyQuestionsView({
  currentUser,
  isAdmin = false,
  onNavigateHome,
  onStartMiniMock,
  initialMiniMockId = null,
}: MyQuestionsViewProps) {
  const [questions, setQuestions] = useState<PersonalQuestion[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PersonalQuestion[]>([]);
  const [loadingPendingQueue, setLoadingPendingQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "private" | "published" | "mini-mocks" | "create" | "review"
  >(initialMiniMockId ? "mini-mocks" : "private");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  // Mini Mocks state
  const [myMiniMocks, setMyMiniMocks] = useState<PersonalMiniMock[]>([]);
  const [publicMiniMocks, setPublicMiniMocks] = useState<PersonalMiniMock[]>([]);
  const [loadingMocks, setLoadingMocks] = useState(true);
  const [showMiniMockBuilder, setShowMiniMockBuilder] = useState(false);
  const [editingMiniMockId, setEditingMiniMockId] = useState<string | null>(null);
  const [miniMockForm, setMiniMockForm] = useState(DEFAULT_MINI_MOCK_FORM);
  const [pickerSearch, setPickerSearch] = useState("");
  const [savingMiniMock, setSavingMiniMock] = useState(false);
  const [busyMiniMockId, setBusyMiniMockId] = useState<string | null>(null);
  const [deleteMiniMockTarget, setDeleteMiniMockTarget] = useState<PersonalMiniMock | null>(null);
  const [deletingMiniMock, setDeletingMiniMock] = useState(false);
  const [spotlightMiniMock, setSpotlightMiniMock] = useState<PersonalMiniMock | null>(null);
  const [miniMockSearch, setMiniMockSearch] = useState("");

  // Question Form state
  const [form, setForm] = useState(DEFAULT_FORM);

  // AI Scan state
  const [importImage, setImportImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [extractingImage, setExtractingImage] = useState(false);
  const [extractElapsedSec, setExtractElapsedSec] = useState(0);
  const [extractError, setExtractError] = useState("");
  const [extractSuccess, setExtractSuccess] = useState("");
  const extractAbortRef = useRef<AbortController | null>(null);
  const [includeAiSolution, setIncludeAiSolution] = useState(true);

  // Action & Feedback state (no window.alert / window.confirm)
  const [saving, setSaving] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PersonalQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PersonalQuestion | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const userId = currentUser?.id || currentUser?.email || "local_user";
  const userEmail = currentUser?.email || "user@example.com";
  const fullName = currentUser?.full_name || "Reviewer";

  const showToastSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    window.setTimeout(() => setSuccessMsg((curr) => (curr === msg ? "" : curr)), 4000);
  }, []);

  const topicOptions: SelectOption[] = useMemo(
    () =>
      TOPICS.map((t) => {
        const Icon = TOPIC_ICON_MAP[t.id] || BookOpen;
        return {
          value: t.id,
          label: t.label,
          icon: (
            <Icon
              size={15}
              className="qb-topic-icon"
              style={{ color: t.color, flexShrink: 0 }}
              data-colored="true"
            />
          ),
        };
      }),
    []
  );

  const filterTopicOptions: SelectOption[] = useMemo(
    () => [
      {
        value: "all",
        label: "All Topics",
        icon: (
          <Layers
            size={15}
            className="qb-topic-icon"
            style={{ color: "#f5a623", flexShrink: 0 }}
            data-colored="true"
          />
        ),
      },
      ...topicOptions,
    ],
    [topicOptions]
  );

  const loadPendingQueue = useCallback(async () => {
    if (!isAdmin) {
      setPendingQueue([]);
      return;
    }
    setLoadingPendingQueue(true);
    try {
      const data = await personalQuestionsModel.getPendingReviewQuestions();
      setPendingQueue(data);
    } catch (e) {
      console.error("Failed to load pending review queue:", e);
    } finally {
      setLoadingPendingQueue(false);
    }
  }, [isAdmin]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await personalQuestionsModel.getMyQuestions(userId, userEmail);
      setQuestions(data);
    } catch (e) {
      console.error("Failed to load personal questions:", e);
      setErrorMsg("Unable to load your personal questions right now.");
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  const loadMiniMocks = useCallback(async () => {
    setLoadingMocks(true);
    try {
      const [mine, pub] = await Promise.all([
        miniMocksModel.getMyMiniMocks(userId, userEmail),
        miniMocksModel.getPublicMiniMocks(),
      ]);
      setMyMiniMocks(mine);
      setPublicMiniMocks(pub);

      if (initialMiniMockId) {
        const direct =
          mine.find((m) => m.id === initialMiniMockId) ||
          pub.find((m) => m.id === initialMiniMockId) ||
          (await miniMocksModel.getMiniMockById(initialMiniMockId));
        if (direct) {
          setSpotlightMiniMock(direct);
          setActiveTab("mini-mocks");
        }
      }
    } catch (e) {
      console.error("Failed to load mini mocks:", e);
    } finally {
      setLoadingMocks(false);
    }
  }, [userId, userEmail, initialMiniMockId]);

  useEffect(() => {
    void loadQuestions();
    void loadMiniMocks();
    void loadPendingQueue();
  }, [loadQuestions, loadMiniMocks, loadPendingQueue]);

  useEffect(() => {
    if (initialMiniMockId) {
      setActiveTab("mini-mocks");
    }
  }, [initialMiniMockId]);

  // Elapsed timer during AI extraction
  useEffect(() => {
    if (!extractingImage) {
      setExtractElapsedSec(0);
      return;
    }
    const timer = window.setInterval(() => {
      setExtractElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [extractingImage]);

  const resetCreator = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setImportImage(null);
    setExtractError("");
    setExtractSuccess("");
    setErrorMsg("");
  };

  const openMiniMockBuilder = (existing?: PersonalMiniMock) => {
    setErrorMsg("");
    setPickerSearch("");
    if (existing) {
      setEditingMiniMockId(existing.id);
      const validIds = existing.question_ids.filter((id) => questions.some((q) => q.id === id));
      setMiniMockForm({
        title: existing.title,
        description: existing.description || "",
        selectedIds: validIds.length > 0 ? validIds : existing.question_ids,
        timed: existing.timed,
        durationMinutes: existing.duration_minutes || Math.max(1, existing.questions_snapshot.length),
        shuffleQuestions: existing.shuffle_questions,
        isPublic: existing.is_public,
      });
    } else {
      setEditingMiniMockId(null);
      const defaultSelected = questions.slice(0, 15).map((q) => q.id);
      setMiniMockForm({
        title: "",
        description: "",
        selectedIds: defaultSelected,
        timed: true,
        durationMinutes: Math.max(5, defaultSelected.length),
        shuffleQuestions: true,
        isPublic: false,
      });
    }
    setShowMiniMockBuilder(true);
    setActiveTab("mini-mocks");
  };

  const resetMiniMockBuilder = () => {
    setEditingMiniMockId(null);
    setShowMiniMockBuilder(false);
    setMiniMockForm(DEFAULT_MINI_MOCK_FORM);
    setPickerSearch("");
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const payload = await fileToImagePayload(file);
      setImportImage(payload);
      setExtractError("");
      setExtractSuccess("");
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "Failed to process image.");
    }
  };

  const handleExtractFromImage = async () => {
    if (!importImage || extractingImage) return;
    extractAbortRef.current?.abort("superseded");
    const controller = new AbortController();
    extractAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort("timeout");
    }, 60000);

    setExtractingImage(true);
    setExtractElapsedSec(0);
    setExtractError("");
    setExtractSuccess("");

    try {
      const response = await fetch("/api/questions/extract-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: importImage.base64,
          mimeType: importImage.mimeType,
          includeSolution: includeAiSolution,
        }),
      });
      const rawBody = await response.text();
      let data: {
        error?: string;
        extracted?: {
          question?: string;
          choices?: string[];
          topic?: string;
          label?: string;
          correctIndex?: number;
          solution?: string;
        };
      } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {};
      }
      if (!response.ok || !data?.extracted) {
        throw new Error(data?.error || `Image scan failed (HTTP ${response.status})`);
      }

      const ext = data.extracted;
      setForm((prev) => {
        const nextChoices =
          Array.isArray(ext.choices) && ext.choices.length >= 4
            ? ext.choices.slice(0, LETTERS.length)
            : prev.choices;
        const safeCorrect =
          typeof ext.correctIndex === "number" &&
          ext.correctIndex >= 0 &&
          ext.correctIndex < nextChoices.length
            ? ext.correctIndex
            : prev.correct;
        return {
          ...prev,
          question: ext.question || prev.question,
          choices: nextChoices,
          topic: ext.topic || prev.topic,
          label: ext.label || prev.label,
          correct: safeCorrect,
          solution: includeAiSolution && ext.solution ? ext.solution : prev.solution,
        };
      });
      setExtractSuccess("Question and choices extracted! Review the fields below before saving.");
    } catch (err: unknown) {
      if (timedOut) {
        setExtractError("Image scan timed out after 60s. Please try again.");
      } else if (err instanceof Error && (err.name === "AbortError" || controller.signal.aborted)) {
        setExtractError("Image scan cancelled.");
      } else {
        setExtractError(
          err instanceof Error ? err.message : "Failed to extract question from image."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setExtractingImage(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.question.trim()) {
      setErrorMsg("Please enter the question stem before saving.");
      return;
    }

    const cleanedChoices = form.choices.map((c) => c.trim());
    if (cleanedChoices.filter(Boolean).length < 2) {
      setErrorMsg("Please enter at least 2 answer choices.");
      return;
    }

    setSaving(true);
    try {
      const saved = await personalQuestionsModel.savePersonalQuestion(
        {
          id: editingId || undefined,
          topic: form.topic,
          question: form.question.trim(),
          choices: cleanedChoices,
          correct: Math.min(form.correct, cleanedChoices.length - 1),
          solution: form.solution.trim(),
          label: form.label.trim(),
          submitForReview: form.is_public,
        },
        userId,
        userEmail,
        fullName
      );

      showToastSuccess(
        saved.moderation_status === "pending"
          ? "Submitted for Admin Review! Your question stays pending until an admin approves it."
          : editingId
            ? "Question updated successfully!"
            : "Personal question saved to your Private Bank!"
      );
      resetCreator();
      await Promise.all([loadQuestions(), loadPendingQueue()]);
      setActiveTab(saved.moderation_status === "pending" ? "published" : "private");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (q: PersonalQuestion) => {
    setErrorMsg("");
    setEditingId(q.id);
    setForm({
      topic: q.topic || "numerical",
      question: q.question || "",
      choices: Array.isArray(q.choices) && q.choices.length >= 2 ? [...q.choices] : ["", "", "", ""],
      correct: typeof q.correct === "number" ? q.correct : 0,
      solution: q.solution || "",
      label: q.label || "",
      is_public: q.moderation_status === "pending" || q.moderation_status === "approved" || Boolean(q.is_public),
    });
    setImportImage(null);
    setExtractError("");
    setExtractSuccess("");
    setActiveTab("create");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      await personalQuestionsModel.deletePersonalQuestion(deleteTarget.id);
      setDeleteTarget(null);
      showToastSuccess("Personal question deleted.");
      await Promise.all([loadQuestions(), loadPendingQueue()]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete question.");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleShare = async (q: PersonalQuestion) => {
    const isSubmittedOrLive = q.moderation_status === "pending" || q.moderation_status === "approved" || q.is_public;
    setBusyQuestionId(q.id);
    setErrorMsg("");
    try {
      if (isSubmittedOrLive) {
        await personalQuestionsModel.makePrivate(q.id);
        showToastSuccess("Question moved back to your Private Bank.");
      } else {
        await personalQuestionsModel.submitForReview(q.id);
        showToastSuccess("Submitted for Admin Review! An admin will review it before public listing.");
      }
      await Promise.all([loadQuestions(), loadPendingQueue()]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update submission state.");
    } finally {
      setBusyQuestionId(null);
    }
  };

  const handleApproveSubmission = async (q: PersonalQuestion) => {
    setBusyQuestionId(q.id);
    setErrorMsg("");
    try {
      await personalQuestionsModel.approvePendingQuestion(q, userEmail || fullName);
      showToastSuccess("Submission approved and published to the Community Question Bank!");
      await Promise.all([loadQuestions(), loadPendingQueue()]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to approve submission.");
    } finally {
      setBusyQuestionId(null);
    }
  };

  const handleConfirmRejectSubmission = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    setErrorMsg("");
    try {
      await personalQuestionsModel.rejectPendingQuestion(
        rejectTarget,
        userEmail || fullName,
        rejectReason
      );
      setRejectTarget(null);
      setRejectReason("");
      showToastSuccess("Submission returned to author with feedback.");
      await Promise.all([loadQuestions(), loadPendingQueue()]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to return submission.");
    } finally {
      setRejecting(false);
    }
  };

  // Mini Mock Handlers
  const handleSaveMiniMock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!miniMockForm.title.trim()) {
      setErrorMsg("Please give your Mini Mock Exam a title.");
      return;
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const existingSet = editingMiniMockId
      ? myMiniMocks.find((m) => m.id === editingMiniMockId)
      : null;
    const existingSnapshotMap = new Map(
      (existingSet?.questions_snapshot || []).map((s) => [s.id, s])
    );

    const snapshots: MiniMockQuestionSnapshot[] = [];
    for (const qId of miniMockForm.selectedIds) {
      const live = questionMap.get(qId);
      if (live) {
        snapshots.push({
          id: live.id,
          topic: live.topic,
          label: live.label,
          question: live.question,
          choices: live.choices,
          correct: live.correct,
          solution: live.solution,
        });
      } else {
        const prevSnap = existingSnapshotMap.get(qId);
        if (prevSnap) snapshots.push(prevSnap);
      }
    }

    if (snapshots.length === 0) {
      setErrorMsg("Select at least 1 question for your Mini Mock Exam.");
      return;
    }

    setSavingMiniMock(true);
    try {
      await miniMocksModel.saveMiniMock(
        {
          id: editingMiniMockId || undefined,
          title: miniMockForm.title.trim(),
          description: miniMockForm.description.trim(),
          question_ids: snapshots.map((s) => s.id),
          questions_snapshot: snapshots,
          timed: miniMockForm.timed,
          duration_minutes: Math.max(1, Number(miniMockForm.durationMinutes) || snapshots.length),
          shuffle_questions: miniMockForm.shuffleQuestions,
          is_public: miniMockForm.isPublic,
          attempt_count: existingSet?.attempt_count || 0,
          created_at: existingSet?.created_at,
        },
        userId,
        userEmail,
        fullName
      );

      showToastSuccess(
        editingMiniMockId
          ? "Mini Mock updated!"
          : miniMockForm.isPublic
            ? "Mini Mock created and published for other reviewers!"
            : "Mini Mock saved to your deck!"
      );
      resetMiniMockBuilder();
      await loadMiniMocks();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save Mini Mock.");
    } finally {
      setSavingMiniMock(false);
    }
  };

  const handleLaunchSavedMiniMock = (miniMock: PersonalMiniMock) => {
    if (!onStartMiniMock || miniMock.questions_snapshot.length === 0) return;
    void miniMocksModel.recordAttempt(miniMock);
    setMyMiniMocks((prev) =>
      prev.map((m) => (m.id === miniMock.id ? { ...m, attempt_count: (m.attempt_count || 0) + 1 } : m))
    );
    setPublicMiniMocks((prev) =>
      prev.map((m) => (m.id === miniMock.id ? { ...m, attempt_count: (m.attempt_count || 0) + 1 } : m))
    );
    const session = buildMiniMockExamSession({
      miniMockId: miniMock.id,
      title: miniMock.full_name ? `${miniMock.title} · by ${miniMock.full_name}` : miniMock.title,
      questions: miniMock.questions_snapshot,
      timed: miniMock.timed,
      durationMinutes: miniMock.duration_minutes,
      shuffle: miniMock.shuffle_questions,
    });
    onStartMiniMock(session);
  };

  const handleLaunchQuickMiniMock = (sourceList: PersonalQuestion[], labelTitle: string) => {
    if (!onStartMiniMock || sourceList.length === 0) return;
    const session = buildMiniMockExamSession({
      title: labelTitle,
      questions: sourceList.map((q) => ({
        id: q.id,
        topic: q.topic,
        label: q.label,
        question: q.question,
        choices: q.choices,
        correct: q.correct,
        solution: q.solution,
      })),
      timed: true,
      durationMinutes: Math.max(1, sourceList.length),
      shuffle: true,
    });
    onStartMiniMock(session);
  };

  const handleToggleMiniMockShare = async (miniMock: PersonalMiniMock) => {
    setBusyMiniMockId(miniMock.id);
    setErrorMsg("");
    try {
      const nextPublic = !miniMock.is_public;
      await miniMocksModel.togglePublicShare(miniMock, nextPublic, userId, userEmail, fullName);
      showToastSuccess(
        nextPublic
          ? "Mini Mock published! Other reviewers can now try it."
          : "Mini Mock switched back to Private."
      );
      await loadMiniMocks();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update sharing setting.");
    } finally {
      setBusyMiniMockId(null);
    }
  };

  const handleCopyMiniMockLink = async (miniMock: PersonalMiniMock) => {
    const shareUrl = `${window.location.origin}/?page=my-questions&mock=${encodeURIComponent(miniMock.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToastSuccess("Share link copied! Anyone with this link can try this Mini Mock.");
    } catch {
      setErrorMsg(`Copy this link to share: ${shareUrl}`);
    }
  };

  const handleConfirmDeleteMiniMock = async () => {
    if (!deleteMiniMockTarget) return;
    setDeletingMiniMock(true);
    setErrorMsg("");
    try {
      await miniMocksModel.deleteMiniMock(deleteMiniMockTarget.id);
      if (spotlightMiniMock?.id === deleteMiniMockTarget.id) setSpotlightMiniMock(null);
      setDeleteMiniMockTarget(null);
      showToastSuccess("Mini Mock deleted.");
      await loadMiniMocks();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete Mini Mock.");
    } finally {
      setDeletingMiniMock(false);
    }
  };

  const privateQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.moderation_status === "private" || q.moderation_status === "rejected"
      ),
    [questions]
  );
  const submittedQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.moderation_status === "pending" || q.moderation_status === "approved" || q.is_public
      ),
    [questions]
  );
  const pendingOwnCount = useMemo(
    () => submittedQuestions.filter((q) => q.moderation_status === "pending").length,
    [submittedQuestions]
  );
  const tabSourceList =
    activeTab === "private"
      ? privateQuestions
      : activeTab === "review"
        ? pendingQueue
        : submittedQuestions;

  const visibleList = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return tabSourceList.filter((item) => {
      if (topicFilter !== "all" && item.topic !== topicFilter) return false;
      if (!qLower) return true;
      return (
        item.question.toLowerCase().includes(qLower) ||
        item.label.toLowerCase().includes(qLower) ||
        item.topic.toLowerCase().includes(qLower) ||
        item.choices.some((c) => c.toLowerCase().includes(qLower))
      );
    });
  }, [tabSourceList, topicFilter, searchQuery]);

  const pickerQuestions = useMemo(() => {
    const qLower = pickerSearch.trim().toLowerCase();
    if (!qLower) return questions;
    return questions.filter(
      (q) =>
        q.question.toLowerCase().includes(qLower) ||
        q.label.toLowerCase().includes(qLower) ||
        q.topic.toLowerCase().includes(qLower)
    );
  }, [questions, pickerSearch]);

  const filteredPublicMiniMocks = useMemo(() => {
    const qLower = miniMockSearch.trim().toLowerCase();
    if (!qLower) return publicMiniMocks;
    return publicMiniMocks.filter(
      (m) =>
        m.title.toLowerCase().includes(qLower) ||
        m.description.toLowerCase().includes(qLower) ||
        m.full_name.toLowerCase().includes(qLower)
    );
  }, [publicMiniMocks, miniMockSearch]);

  const activeTopicDef = (topicId: string) =>
    TOPICS.find((t) => t.id === topicId) || {
      id: topicId,
      label: topicId,
      short: topicId.toUpperCase(),
      color: "#f59e0b",
    };

  const hasActiveFilters = Boolean(searchQuery.trim() || topicFilter !== "all");

  const clearFilters = () => {
    setSearchQuery("");
    setTopicFilter("all");
  };

  const totalMiniMocksCount = myMiniMocks.length;

  // Motion tier & segmented tab glider animation (matches Mock Exam QuickSegControl;
  // strictly disabled in LITE / Power-Saver or prefers-reduced-motion)
  const [isMotionDisabled, setIsMotionDisabled] = useState<boolean>(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return false;
    const root = document.documentElement;
    const body = document.body;
    return (
      root.classList.contains("qb-lite-mode") ||
      root.classList.contains("qb-no-animations") ||
      Boolean(body?.classList.contains("qb-lite-mode")) ||
      Boolean(body?.classList.contains("qb-no-animations")) ||
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
    );
  });

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const checkMotionPref = () => {
      setIsMotionDisabled(
        root.classList.contains("qb-lite-mode") ||
          root.classList.contains("qb-no-animations") ||
          Boolean(body?.classList.contains("qb-lite-mode")) ||
          Boolean(body?.classList.contains("qb-no-animations")) ||
          Boolean(mq?.matches)
      );
    };

    checkMotionPref();
    const observer = new MutationObserver(checkMotionPref);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    if (body) {
      observer.observe(body, { attributes: true, attributeFilter: ["class"] });
    }
    if (mq?.addEventListener) {
      mq.addEventListener("change", checkMotionPref);
    }
    return () => {
      observer.disconnect();
      if (mq?.removeEventListener) {
        mq.removeEventListener("change", checkMotionPref);
      }
    };
  }, []);

  const tablistRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<
    Partial<Record<"private" | "published" | "mini-mocks" | "create" | "review", HTMLButtonElement | null>>
  >({});
  const [tabGliderReady, setTabGliderReady] = useState(false);
  const [tabGliderRect, setTabGliderRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const syncTabGlider = useCallback(() => {
    const btn = tabBtnRefs.current[activeTab];
    if (!btn || btn.offsetWidth === 0 || btn.offsetHeight === 0) return;
    setTabGliderRect({
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    });
  }, [activeTab]);

  useEffect(() => {
    if (isMotionDisabled) {
      setTabGliderReady(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setTabGliderReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [isMotionDisabled]);

  useLayoutEffect(() => {
    if (isMotionDisabled) {
      setTabGliderRect(null);
      return;
    }
    syncTabGlider();
    const container = tablistRef.current;
    const activeBtn = tabBtnRefs.current[activeTab];
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncTabGlider) : null;
    if (ro && container) ro.observe(container);
    if (ro && activeBtn) ro.observe(activeBtn);
    window.addEventListener("resize", syncTabGlider);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncTabGlider);
    };
  }, [
    isMotionDisabled,
    syncTabGlider,
    activeTab,
    isAdmin,
    loading,
    loadingMocks,
    loadingPendingQueue,
    editingId,
    privateQuestions.length,
    submittedQuestions.length,
    pendingOwnCount,
    totalMiniMocksCount,
    pendingQueue.length,
  ]);

  const showAnimatedTabGlider = !isMotionDisabled && tabGliderRect !== null;
  const tabButtonMotionClass = isMotionDisabled ? "transition-none" : "transition-colors duration-200";
  const getTabButtonClass = (isActive: boolean, extraClass = "") => {
    const stateClass = isActive
      ? showAnimatedTabGlider
        ? "border-transparent bg-transparent text-[#070c18] font-bold light:text-white"
        : "border-transparent bg-gradient-to-br from-amber-300 via-amber-500 to-orange-500 text-[#070c18] font-bold shadow-[0_4px_20px_rgba(245,158,11,0.45),inset_0_1px_0_rgba(255,255,255,0.38)] light:from-amber-500 light:via-amber-600 light:to-orange-600 light:text-white light:shadow-[0_4px_16px_rgba(217,119,6,0.32),inset_0_1px_0_rgba(255,255,255,0.28)]"
      : "border-white/[0.08] bg-[#070b15] text-qb-heading shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-white/[0.16] hover:bg-[#0b1122] light:border-slate-200/90 light:bg-white light:text-slate-700 light:shadow-[0_1px_2px_rgba(15,23,42,0.05)] light:hover:border-slate-300 light:hover:bg-slate-50 sm:border-transparent sm:bg-transparent sm:text-qb-mid sm:shadow-none sm:hover:bg-transparent sm:hover:text-qb-heading sm:light:bg-transparent sm:light:shadow-none";
    return `relative z-[2] inline-flex min-h-[38px] w-full shrink-0 cursor-pointer items-center justify-start gap-2 whitespace-nowrap rounded-xl border px-3 py-1.5 text-[11.5px] font-semibold sm:h-[31px] sm:min-h-0 sm:w-auto sm:justify-center sm:gap-1.5 sm:rounded-full sm:px-3 sm:py-0 ${tabButtonMotionClass} ${stateClass} ${extraClass}`.trim();
  };

  return (
    <div className="@container flex min-h-full w-full flex-col gap-5 px-3 pt-4 pb-22 text-qb-text sm:p-6 sm:pb-10 @xl:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-qb-border pb-5 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/12 text-amber-400 light:border-amber-300 light:bg-amber-50 light:text-amber-700">
              <BookOpen size={20} />
            </span>
            <h1 className="text-balance text-xl font-extrabold tracking-tight text-qb-heading @md:text-2xl">
              My Personal Question Bank
            </h1>
          </div>
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-qb-mid">
            Create private review questions, bundle them into timed Mini Mock Exams, and share
            them with other reviewers.
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2.5 @md:flex @md:items-center">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-qb-border bg-qb-surface px-4 text-sm font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <ArrowLeft size={16} />
            <span>Back to Bank</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetCreator();
              setActiveTab("create");
            }}
            className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/40 bg-amber-500 px-4 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
          >
            <Plus size={16} />
            <span>New Question</span>
          </button>
        </div>
      </header>

      {/* Inline Status / Error Banners */}
      {successMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm font-medium text-emerald-300 light:border-emerald-200 light:bg-emerald-50 light:text-emerald-800"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="break-words">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            aria-label="Dismiss notice"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-80 transition-opacity hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-500/12 px-4 py-3 text-sm font-medium text-rose-200 light:border-rose-200 light:bg-rose-50 light:text-rose-800"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span className="break-words">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            aria-label="Dismiss error"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-80 transition-opacity hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Workspace Navigation & Separate Search/Filter Toolbar (never squishes search input) */}
      <div className="flex flex-col gap-3">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Personal question bank sections"
          className="relative grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-qb-border bg-[#0e1526] light:bg-slate-200/75 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] light:shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] sm:inline-flex sm:w-fit sm:max-w-full sm:items-center sm:gap-0.5 sm:overflow-x-auto sm:rounded-full sm:bg-gradient-to-b sm:from-[#0f172a] sm:to-[#080e1a] sm:p-1 sm:light:from-slate-100 sm:light:to-slate-200/85 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {showAnimatedTabGlider && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-0 left-0 z-[1] box-border rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-500 shadow-[0_4px_20px_rgba(245,158,11,0.45),inset_0_1px_0_rgba(255,255,255,0.38)] light:from-amber-500 light:via-amber-600 light:to-orange-600 light:shadow-[0_4px_16px_rgba(217,119,6,0.32),inset_0_1px_0_rgba(255,255,255,0.28)] sm:rounded-full ${
                tabGliderReady
                  ? "will-change-[transform,width] transition-[transform,width,height] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  : "transition-none"
              }`}
              style={{
                width: `${tabGliderRect.width}px`,
                height: `${tabGliderRect.height}px`,
                transform: `translate3d(${tabGliderRect.left}px, ${tabGliderRect.top}px, 0)`,
              }}
            />
          )}

          <button
            ref={(el) => {
              tabBtnRefs.current.private = el;
            }}
            type="button"
            role="tab"
            aria-selected={activeTab === "private"}
            onClick={() => setActiveTab("private")}
            className={getTabButtonClass(activeTab === "private")}
          >
            <Lock
              size={13}
              className={`shrink-0 ${activeTab === "private" ? "text-current" : "text-sky-400 light:text-sky-600 sm:text-current"}`}
            />
            <span className="truncate">Private Bank</span>
            <span
              aria-hidden={loading}
              className={`ml-auto inline-flex h-[16px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums sm:ml-0 ${
                loading
                  ? `bg-qb-input/80 text-transparent ${isMotionDisabled ? "" : "animate-pulse"}`
                  : activeTab === "private"
                    ? "bg-[#070c18]/18 text-[#070c18] light:bg-white/25 light:text-white"
                    : "bg-white/[0.07] text-qb-mid light:bg-slate-200/80 light:text-slate-700"
              }`}
            >
              {loading ? "0" : privateQuestions.length}
            </span>
          </button>

          <button
            ref={(el) => {
              tabBtnRefs.current.published = el;
            }}
            type="button"
            role="tab"
            aria-selected={activeTab === "published"}
            onClick={() => setActiveTab("published")}
            title={
              pendingOwnCount > 0
                ? `${pendingOwnCount} awaiting admin review`
                : "Submitted & shared questions"
            }
            className={getTabButtonClass(activeTab === "published")}
          >
            <Globe
              size={13}
              className={`shrink-0 ${activeTab === "published" ? "text-current" : "text-emerald-400 light:text-emerald-600 sm:text-current"}`}
            />
            <span className="truncate">Submissions</span>
            <span
              aria-hidden={loading}
              className={`ml-auto inline-flex h-[16px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums sm:ml-0 ${
                loading
                  ? `bg-qb-input/80 text-transparent ${isMotionDisabled ? "" : "animate-pulse"}`
                  : activeTab === "published"
                    ? "bg-[#070c18]/18 text-[#070c18] light:bg-white/25 light:text-white"
                    : pendingOwnCount > 0
                      ? "bg-amber-500/20 text-amber-300 light:bg-amber-100 light:text-amber-800"
                      : "bg-white/[0.07] text-qb-mid light:bg-slate-200/80 light:text-slate-700"
              }`}
            >
              {loading ? "0" : submittedQuestions.length}
            </span>
          </button>

          <button
            ref={(el) => {
              tabBtnRefs.current["mini-mocks"] = el;
            }}
            type="button"
            role="tab"
            aria-selected={activeTab === "mini-mocks"}
            onClick={() => setActiveTab("mini-mocks")}
            className={getTabButtonClass(activeTab === "mini-mocks")}
          >
            <Layers
              size={13}
              className={`shrink-0 ${activeTab === "mini-mocks" ? "text-current" : "text-violet-400 light:text-violet-600 sm:text-current"}`}
            />
            <span className="truncate">Mini Mocks</span>
            <span
              aria-hidden={loadingMocks}
              className={`ml-auto inline-flex h-[16px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums sm:ml-0 ${
                loadingMocks
                  ? `bg-qb-input/80 text-transparent ${isMotionDisabled ? "" : "animate-pulse"}`
                  : activeTab === "mini-mocks"
                    ? "bg-[#070c18]/18 text-[#070c18] light:bg-white/25 light:text-white"
                    : "bg-white/[0.07] text-qb-mid light:bg-slate-200/80 light:text-slate-700"
              }`}
            >
              {loadingMocks ? "0" : totalMiniMocksCount}
            </span>
          </button>

          <button
            ref={(el) => {
              tabBtnRefs.current.create = el;
            }}
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            onClick={() => {
              if (!editingId) resetCreator();
              setActiveTab("create");
            }}
            className={getTabButtonClass(activeTab === "create")}
          >
            <Plus
              size={13}
              className={`shrink-0 ${activeTab === "create" ? "text-current" : "text-amber-400 light:text-amber-600 sm:text-current"}`}
            />
            <span className="truncate">{editingId ? "Edit Question" : "Creator"}</span>
          </button>

          {isAdmin && (
            <button
              ref={(el) => {
                tabBtnRefs.current.review = el;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === "review"}
              onClick={() => setActiveTab("review")}
              className={getTabButtonClass(activeTab === "review", "col-span-2 sm:col-span-1")}
            >
              <ShieldCheck
                size={13}
                className={`shrink-0 ${activeTab === "review" ? "text-current" : "text-emerald-400 light:text-emerald-600 sm:text-current"}`}
              />
              <span className="truncate">Review Queue</span>
              <span
                aria-hidden={loadingPendingQueue}
                className={`ml-auto inline-flex h-[16px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums sm:ml-0 ${
                  loadingPendingQueue
                    ? `bg-qb-input/80 text-transparent ${isMotionDisabled ? "" : "animate-pulse"}`
                    : activeTab === "review"
                      ? "bg-[#070c18]/18 text-[#070c18] light:bg-white/25 light:text-white"
                      : pendingQueue.length > 0
                        ? "bg-amber-500/20 text-amber-300 light:bg-amber-100 light:text-amber-800"
                        : "bg-white/[0.07] text-qb-mid light:bg-slate-200/80 light:text-slate-700"
                }`}
              >
                {loadingPendingQueue ? "0" : pendingQueue.length}
              </span>
            </button>
          )}
        </div>

        {(activeTab === "private" || activeTab === "published" || activeTab === "review") &&
          !(activeTab === "review" ? loadingPendingQueue : loading) &&
          tabSourceList.length > 0 && (
            <div className="flex w-full min-w-0 flex-col gap-2.5 @xl:flex-row @xl:items-center">
              <div className="relative flex min-w-0 flex-1 items-center">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 text-qb-muted"
                />
                <input
                  type="text"
                  placeholder="Search my questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[44px] w-full min-w-0 rounded-xl border border-qb-border bg-qb-input py-2 pl-10 pr-10 text-base text-qb-heading placeholder:text-qb-muted/75 focus:border-amber-500 focus:outline-none @md:text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-qb-muted hover:text-qb-heading"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2.5 @md:flex-row @md:items-center @xl:w-auto @xl:shrink-0">
                <div className="w-full min-w-0 @md:flex-1 @xl:w-[200px] @xl:flex-none">
                  <CustomSelect
                    value={topicFilter}
                    onChange={setTopicFilter}
                    options={filterTopicOptions}
                    className="w-full [&_.qb-select-btn]:min-h-[44px] [&_.qb-select-btn]:rounded-xl! [&_.qb-select-btn]:px-3.5!"
                    showCheckmark
                    portal
                    minMenuWidth={200}
                  />
                </div>

                {activeTab !== "review" && onStartMiniMock && visibleList.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchQuickMiniMock(
                        visibleList,
                        `${activeTab === "private" ? "Private Bank" : "Submissions"} Mini Mock · ${visibleList.length} Items`
                      )
                    }
                    className={`inline-flex min-h-[44px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-qb-border bg-qb-surface px-4 text-xs font-semibold text-qb-heading hover:border-amber-500/45 hover:bg-amber-500/[0.1] hover:text-amber-300 @md:w-auto light:hover:border-amber-400 light:hover:bg-amber-50 light:hover:text-amber-800 ${tabButtonMotionClass}`}
                  >
                    <Play size={14} className="shrink-0 text-amber-400 light:text-amber-600" />
                    <span>Quick Mini Mock ({visibleList.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Private, Submissions & Admin Review Lists */}
      {(activeTab === "private" || activeTab === "published" || activeTab === "review") && (
        <div>
          {(activeTab === "review" ? loadingPendingQueue : loading) ? (
            <MyQuestionsSkeletonLoader />
          ) : visibleList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-qb-border bg-qb-surface px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-qb-border bg-qb-input text-qb-mid">
                {activeTab === "review" ? <ShieldCheck size={24} /> : <BookOpen size={24} />}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-qb-heading">
                  {hasActiveFilters
                    ? "No matching questions"
                    : activeTab === "review"
                      ? "No submissions waiting for review"
                      : activeTab === "private"
                        ? "No private questions yet"
                        : "No submitted or shared questions yet"}
                </h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-qb-mid">
                  {hasActiveFilters
                    ? "Try adjusting your search keywords or resetting the topic filter."
                    : activeTab === "review"
                      ? "When reviewers submit personal questions for Community Bank publishing, they will appear here for approval."
                      : activeTab === "private"
                        ? "Create your own custom review questions or scan a screenshot to build an offline-ready personal deck."
                        : "Submit any of your private questions for admin review to share them with fellow reviewers."}
                </p>
              </div>
              <div className="pt-2">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-input px-4 text-sm font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover"
                  >
                    Clear Filters
                  </button>
                ) : activeTab !== "review" ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetCreator();
                      setActiveTab("create");
                    }}
                    className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/14 px-5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/22 light:border-amber-300 light:bg-amber-50 light:text-amber-800 light:hover:bg-amber-100"
                  >
                    <Plus size={16} />
                    <span>Create Your First Question</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleList.map((q) => {
                const topicDef = activeTopicDef(q.topic);
                const isBusy = busyQuestionId === q.id;
                const status = q.moderation_status || (q.is_public ? "approved" : "private");
                const isPending = status === "pending";
                const isApproved = status === "approved" || q.is_public;
                const isRejected = status === "rejected";

                return (
                  <article
                    key={q.id}
                    className="flex flex-col gap-4 rounded-2xl border border-qb-border bg-qb-surface p-4 transition-colors hover:border-qb-border-hover @sm:p-5 @2xl:p-6"
                  >
                    {/* Top Metadata & Actions */}
                    <div className="flex flex-col gap-3 border-b border-qb-border/70 pb-3.5 @2xl:flex-row @2xl:items-center @2xl:justify-between">
                      {/* Unboxed Editorial Metadata */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                        <span
                          className="font-bold uppercase tracking-wider"
                          style={{ color: topicDef.color }}
                        >
                          {topicDef.label}
                        </span>
                        {q.label && (
                          <>
                            <span aria-hidden="true" className="text-qb-muted">
                              ·
                            </span>
                            <span className="font-medium text-qb-mid">{q.label}</span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-qb-muted">
                          ·
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isApproved
                              ? "text-emerald-400 light:text-emerald-700"
                              : isPending
                                ? "text-amber-400 light:text-amber-700"
                                : isRejected
                                  ? "text-rose-400 light:text-rose-700"
                                  : "text-qb-muted"
                          }`}
                        >
                          {isApproved ? (
                            <Globe size={12} />
                          ) : isPending ? (
                            <Clock size={12} />
                          ) : isRejected ? (
                            <XCircle size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                          <span>
                            {isApproved
                              ? "Approved & Public"
                              : isPending
                                ? "Pending Admin Review"
                                : isRejected
                                  ? "Needs Revision"
                                  : "Private Only"}
                          </span>
                        </span>
                        {activeTab === "review" && (
                          <>
                            <span aria-hidden="true" className="text-qb-muted">
                              ·
                            </span>
                            <span className="font-medium text-qb-mid">
                              Submitted by {q.full_name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Card Action Controls */}
                      {activeTab === "review" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApproveSubmission(q)}
                            disabled={isBusy}
                            className="inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 @sm:flex-initial light:border-emerald-300 light:bg-emerald-50 light:text-emerald-800 light:hover:bg-emerald-100"
                          >
                            {isBusy ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>Approve & Publish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(q);
                              setRejectReason("");
                            }}
                            disabled={isBusy}
                            className="inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-500/30 bg-rose-500/12 px-3.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50 @sm:flex-initial light:border-rose-200 light:bg-rose-50 light:text-rose-700 light:hover:bg-rose-100"
                          >
                            <XCircle size={14} />
                            <span>Request Changes</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleShare(q)}
                            disabled={isBusy}
                            className={`inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 @sm:flex-initial ${
                              !isPending && !isApproved
                                ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20 light:border-emerald-200 light:bg-emerald-50 light:text-emerald-700 light:hover:bg-emerald-100"
                                : "border-qb-border bg-qb-input text-qb-mid hover:border-qb-border-hover hover:bg-qb-surface-hover hover:text-qb-heading"
                            }`}
                          >
                            {isBusy ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : isPending || isApproved ? (
                              <Lock size={13} />
                            ) : (
                              <Send size={13} />
                            )}
                            <span>
                              {isApproved
                                ? "Make Private"
                                : isPending
                                  ? "Withdraw Review"
                                  : isRejected
                                    ? "Resubmit for Review"
                                    : "Submit for Review"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(q)}
                            title="Edit question"
                            aria-label="Edit question"
                            className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-qb-border bg-qb-input px-3 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover hover:text-qb-heading"
                          >
                            <Edit3 size={14} />
                            <span className="hidden @sm:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(q)}
                            title="Delete question"
                            aria-label="Delete question"
                            className="inline-flex min-h-[38px] min-w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 text-rose-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300 light:border-rose-200 light:bg-rose-50 light:text-rose-700 light:hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Feedback Callouts for Pending / Rejected Submissions */}
                    {isPending && activeTab !== "review" && (
                      <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-200 light:border-amber-200 light:bg-amber-50 light:text-amber-900">
                        <Clock size={15} className="shrink-0 text-amber-400 light:text-amber-700" />
                        <span>
                          Awaiting admin approval before appearing in the public Community Question
                          Bank.
                        </span>
                      </div>
                    )}

                    {isRejected && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-200 light:border-rose-200 light:bg-rose-50 light:text-rose-800">
                        <AlertCircle
                          size={15}
                          className="mt-0.5 shrink-0 text-rose-400 light:text-rose-700"
                        />
                        <span>
                          Returned by reviewer
                          {q.rejection_reason ? `: "${q.rejection_reason}"` : ". "}
                          Edit and resubmit when ready.
                        </span>
                      </div>
                    )}

                    {/* Question Stem */}
                    <div className="break-words text-[15px] font-medium leading-relaxed text-qb-heading">
                      <MarkdownText text={q.question} />
                    </div>

                    {/* Answer Choices */}
                    <div className="grid grid-cols-1 gap-2.5 @xl:grid-cols-2">
                      {q.choices.map((choice, cIdx) => {
                        const isCorrect = cIdx === q.correct;
                        return (
                          <div
                            key={cIdx}
                            className={`flex min-w-0 items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
                              isCorrect
                                ? "border-emerald-500/35 bg-emerald-500/10 font-semibold text-emerald-300 light:border-emerald-300 light:bg-emerald-50 light:text-emerald-800"
                                : "border-qb-border bg-qb-input text-qb-mid"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                                  isCorrect
                                    ? "bg-emerald-500 text-slate-950 light:text-white"
                                    : "bg-qb-surface-hover text-qb-muted"
                                }`}
                              >
                                {LETTERS[cIdx]}
                              </span>
                              <span className="min-w-0 break-words">
                                {choice || `Option ${LETTERS[cIdx]}`}
                              </span>
                            </div>
                            {isCorrect && (
                              <CheckCircle2
                                size={15}
                                aria-label="Correct answer"
                                className="shrink-0 text-emerald-400 light:text-emerald-600"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Optional Step-by-Step Solution */}
                    {q.solution && (
                      <div className="rounded-xl border border-qb-border bg-qb-input p-3.5 text-[13.5px] leading-relaxed text-qb-mid">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-amber-400 light:text-amber-700">
                          Step-by-Step Solution
                        </span>
                        <MarkdownText text={q.solution} />
                      </div>
                    )}

                    {/* Quiet Card Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-qb-border/70 pt-3 text-xs tabular-nums text-qb-muted">
                      <span>Created {new Date(q.created_at).toLocaleDateString()}</span>
                      {q.is_public && (
                        <span className="truncate">
                          Attribution: {q.full_name} ({q.user_email})
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mini Mock Exams Studio & Community Catalog */}
      {activeTab === "mini-mocks" && (
        <div className="flex flex-col gap-6">
          {/* Shared Deep-Link Spotlight Card */}
          {spotlightMiniMock && (
            <section className="flex flex-col gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 @md:p-6 light:border-amber-300 light:bg-amber-50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300 light:text-amber-800">
                    <span>Shared Mini Mock</span>
                    <span aria-hidden="true">·</span>
                    <span>By {spotlightMiniMock.full_name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {spotlightMiniMock.questions_snapshot.length} items
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {spotlightMiniMock.timed
                        ? `${spotlightMiniMock.duration_minutes} min`
                        : "Untimed"}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-qb-heading @md:text-xl">
                    {spotlightMiniMock.title}
                  </h2>
                  {spotlightMiniMock.description && (
                    <p className="text-sm text-qb-mid">{spotlightMiniMock.description}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSpotlightMiniMock(null)}
                  aria-label="Dismiss shared preview"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-qb-mid hover:text-qb-heading"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-500/20 pt-3.5 light:border-amber-200">
                <span className="text-xs font-medium text-qb-mid">
                  Topics: {summarizeTopics(spotlightMiniMock.questions_snapshot)}
                </span>
                <button
                  type="button"
                  onClick={() => handleLaunchSavedMiniMock(spotlightMiniMock)}
                  className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-400 light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
                >
                  <Play size={15} />
                  <span>Start This Mini Mock</span>
                </button>
              </div>
            </section>
          )}

          {/* Top Studio Action Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-qb-border bg-qb-surface p-4 @sm:p-5 @2xl:flex-row @2xl:items-center @2xl:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-qb-heading @md:text-lg">
                Custom Mini Mock Exams
              </h2>
              <p className="text-xs leading-relaxed text-qb-mid @md:text-[13px]">
                Bundle your personal questions into timed or untimed practice quizzes and publish
                them so other reviewers can challenge themselves.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {onStartMiniMock && questions.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    handleLaunchQuickMiniMock(
                      questions,
                      `All Personal Questions · ${questions.length} Items`
                    )
                  }
                  className="inline-flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-qb-border bg-qb-input px-4 text-xs font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover @sm:flex-initial"
                >
                  <Play size={14} />
                  <span>Quick Quiz ({questions.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  showMiniMockBuilder ? resetMiniMockBuilder() : openMiniMockBuilder()
                }
                className="inline-flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/40 bg-amber-500 px-4 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-amber-400 @sm:flex-initial light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
              >
                <Plus size={15} />
                <span>{showMiniMockBuilder ? "Close Builder" : "Create Mini Mock"}</span>
              </button>
            </div>
          </div>

          {/* Inline Mini Mock Builder */}
          {showMiniMockBuilder && (
            <form
              onSubmit={handleSaveMiniMock}
              className="flex flex-col gap-5 rounded-2xl border border-qb-border bg-qb-surface p-4 @sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-qb-border pb-3.5">
                <h3 className="text-base font-bold text-qb-heading @md:text-lg">
                  {editingMiniMockId ? "Edit Mini Mock Exam" : "Build a Mini Mock Exam"}
                </h3>
                <button
                  type="button"
                  onClick={resetMiniMockBuilder}
                  className="cursor-pointer text-xs font-semibold text-qb-mid hover:text-qb-heading"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="mm-title-input"
                    className="text-xs font-bold uppercase tracking-wider text-qb-mid"
                  >
                    Mini Mock Title
                  </label>
                  <input
                    id="mm-title-input"
                    type="text"
                    value={miniMockForm.title}
                    onChange={(e) => setMiniMockForm({ ...miniMockForm, title: e.target.value })}
                    placeholder="e.g. Numerical Sprint"
                    className="min-h-[44px] w-full rounded-xl border border-qb-border bg-qb-input px-3.5 py-2 text-base text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none @md:text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="mm-desc-input"
                    className="text-xs font-bold uppercase tracking-wider text-qb-mid"
                  >
                    Short Description (Optional)
                  </label>
                  <input
                    id="mm-desc-input"
                    type="text"
                    value={miniMockForm.description}
                    onChange={(e) =>
                      setMiniMockForm({ ...miniMockForm, description: e.target.value })
                    }
                    placeholder="Optional notes or goal..."
                    className="min-h-[44px] w-full rounded-xl border border-qb-border bg-qb-input px-3.5 py-2 text-base text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none @md:text-sm"
                  />
                </div>
              </div>

              {/* Exam Settings Row */}
              <div className="grid grid-cols-1 gap-3 @xl:grid-cols-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-qb-heading">
                    <Clock size={15} className="text-amber-400 light:text-amber-700" />
                    <span>Timed Mode</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={miniMockForm.timed}
                    onClick={() =>
                      setMiniMockForm({ ...miniMockForm, timed: !miniMockForm.timed })
                    }
                    className={`min-h-[34px] cursor-pointer rounded-lg border px-3 text-xs font-bold transition-colors ${
                      miniMockForm.timed
                        ? "border-amber-500/40 bg-amber-500/18 text-amber-300 light:border-amber-400 light:bg-amber-100 light:text-amber-800"
                        : "border-qb-border bg-qb-surface text-qb-mid"
                    }`}
                  >
                    {miniMockForm.timed ? "Timed" : "Untimed"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5">
                  <label
                    htmlFor="mm-duration"
                    className="text-xs font-semibold text-qb-heading"
                  >
                    Minutes
                  </label>
                  <input
                    id="mm-duration"
                    type="number"
                    min={1}
                    max={180}
                    disabled={!miniMockForm.timed}
                    value={miniMockForm.durationMinutes}
                    onChange={(e) =>
                      setMiniMockForm({
                        ...miniMockForm,
                        durationMinutes: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-20 rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums text-qb-heading disabled:opacity-45"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-qb-heading">
                    <Shuffle size={15} className="text-amber-400 light:text-amber-700" />
                    <span>Question Order</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={miniMockForm.shuffleQuestions}
                    onClick={() =>
                      setMiniMockForm({
                        ...miniMockForm,
                        shuffleQuestions: !miniMockForm.shuffleQuestions,
                      })
                    }
                    className={`min-h-[34px] cursor-pointer rounded-lg border px-3 text-xs font-bold transition-colors ${
                      miniMockForm.shuffleQuestions
                        ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300 light:border-emerald-300 light:bg-emerald-50 light:text-emerald-700"
                        : "border-qb-border bg-qb-surface text-qb-mid"
                    }`}
                  >
                    {miniMockForm.shuffleQuestions ? "Shuffled" : "In Order"}
                  </button>
                </div>
              </div>

              {/* Question Picker */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-qb-mid">
                    Include Questions ({miniMockForm.selectedIds.length} selected)
                  </span>
                  {questions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMiniMockForm({
                            ...miniMockForm,
                            selectedIds: questions.map((q) => q.id),
                            durationMinutes: Math.max(1, questions.length),
                          })
                        }
                        className="min-h-[30px] cursor-pointer rounded-lg border border-qb-border bg-qb-input px-2.5 text-xs font-semibold text-qb-mid hover:text-qb-heading"
                      >
                        Select All ({questions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMiniMockForm({ ...miniMockForm, selectedIds: [] })
                        }
                        className="min-h-[30px] cursor-pointer rounded-lg border border-qb-border bg-qb-input px-2.5 text-xs font-semibold text-qb-mid hover:text-qb-heading"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-qb-border bg-qb-input p-6 text-center">
                    <p className="text-sm text-qb-mid">
                      You do not have any personal questions yet. Add at least 1 question first to
                      bundle a Mini Mock.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetMiniMockBuilder();
                        resetCreator();
                        setActiveTab("create");
                      }}
                      className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/14 px-3.5 text-xs font-semibold text-amber-300 light:border-amber-300 light:bg-amber-50 light:text-amber-800"
                    >
                      <Plus size={14} />
                      <span>Create a Question First</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {questions.length > 4 && (
                      <div className="relative flex items-center">
                        <Search
                          size={14}
                          className="pointer-events-none absolute left-3 text-qb-muted"
                        />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Filter questions..."
                          className="min-h-[38px] w-full rounded-xl border border-qb-border bg-qb-input py-1.5 pl-9 pr-3 text-sm text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                      {pickerQuestions.map((q) => {
                        const checked = miniMockForm.selectedIds.includes(q.id);
                        const topicDef = activeTopicDef(q.topic);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              const nextIds = checked
                                ? miniMockForm.selectedIds.filter((id) => id !== q.id)
                                : [...miniMockForm.selectedIds, q.id];
                              setMiniMockForm({
                                ...miniMockForm,
                                selectedIds: nextIds,
                                durationMinutes:
                                  miniMockForm.durationMinutes === miniMockForm.selectedIds.length
                                    ? Math.max(1, nextIds.length)
                                    : miniMockForm.durationMinutes,
                              });
                            }}
                            className={`flex min-h-[48px] w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                              checked
                                ? "border-amber-500/40 bg-amber-500/10 light:border-amber-300 light:bg-amber-50/70"
                                : "border-qb-border bg-qb-input hover:border-qb-border-hover"
                            }`}
                          >
                            <span className="mt-0.5 shrink-0 text-amber-400 light:text-amber-700">
                              {checked ? <CheckSquare size={17} /> : <Square size={17} className="text-qb-muted" />}
                            </span>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                                <span style={{ color: topicDef.color }}>{topicDef.label}</span>
                                {q.label && (
                                  <>
                                    <span className="text-qb-muted">·</span>
                                    <span className="font-medium normal-case text-qb-mid">
                                      {q.label}
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="line-clamp-2 text-sm text-qb-heading">{q.question}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Public Community Visibility Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={miniMockForm.isPublic}
                onClick={() =>
                  setMiniMockForm({ ...miniMockForm, isPublic: !miniMockForm.isPublic })
                }
                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                  miniMockForm.isPublic
                    ? "border-emerald-500/40 bg-emerald-500/[0.07] light:border-emerald-300 light:bg-emerald-50/70"
                    : "border-qb-border bg-qb-input hover:border-qb-border-hover"
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      miniMockForm.isPublic
                        ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-400 light:border-emerald-300 light:bg-emerald-100 light:text-emerald-700"
                        : "border-qb-border bg-qb-surface text-qb-muted"
                    }`}
                  >
                    {miniMockForm.isPublic ? <Globe size={16} /> : <Lock size={16} />}
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-semibold text-qb-heading">
                      Publish to Community Mini Mocks
                    </span>
                    <span className="block text-xs leading-relaxed text-qb-mid">
                      Allow other reviewers to discover this Mini Mock and take it via direct link (
                      {fullName}).
                    </span>
                  </span>
                </div>

                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                    miniMockForm.isPublic
                      ? "border-emerald-400 bg-emerald-500 light:border-emerald-600 light:bg-emerald-600"
                      : "border-qb-border bg-qb-surface-hover"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      miniMockForm.isPublic ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>

              <div className="flex flex-col-reverse gap-2.5 border-t border-qb-border pt-4 @md:flex-row @md:justify-end">
                <button
                  type="button"
                  onClick={resetMiniMockBuilder}
                  className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-qb-border bg-qb-input px-5 text-sm font-semibold text-qb-heading hover:bg-qb-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMiniMock || questions.length === 0}
                  className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow-xs hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
                >
                  {savingMiniMock ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>
                    {savingMiniMock
                      ? "Saving..."
                      : editingMiniMockId
                        ? "Update Mini Mock"
                        : "Save Mini Mock"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Section 1: My Created Mini Mocks */}
          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-qb-mid">
                Your Mini Mocks ({myMiniMocks.length})
              </h3>
            </div>

            {loadingMocks ? (
              <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 rounded-2xl border border-qb-border bg-qb-surface p-5"
                  >
                    <span className="qb-skel-bar h-3.5 w-40" />
                    <span className="qb-skel-bar h-5 w-3/4" />
                    <span className="qb-skel-bar h-3.5 w-full" />
                    <span className="qb-skel-bar h-9 w-36" />
                  </div>
                ))}
              </div>
            ) : myMiniMocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-qb-border bg-qb-surface px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-qb-border bg-qb-input text-qb-mid">
                  <Layers size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-qb-heading">No saved Mini Mocks yet</h4>
                  <p className="mx-auto max-w-md text-sm text-qb-mid">
                    Assemble any combination of your questions into a timed sprint or shareable
                    community quiz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openMiniMockBuilder()}
                  className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/14 px-4 text-xs font-semibold text-amber-300 hover:bg-amber-500/22 light:border-amber-300 light:bg-amber-50 light:text-amber-800"
                >
                  <Plus size={15} />
                  <span>Create Your First Mini Mock</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                {myMiniMocks.map((mm) => {
                  const isBusy = busyMiniMockId === mm.id;
                  const topicSummary = summarizeTopics(mm.questions_snapshot);
                  return (
                    <article
                      key={mm.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-qb-border bg-qb-surface p-4 transition-colors hover:border-qb-border-hover @sm:p-5"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
                          <span className="font-bold text-amber-400 light:text-amber-700">
                            {mm.questions_snapshot.length} items
                          </span>
                          <span className="text-qb-muted">·</span>
                          <span className="font-medium text-qb-mid">
                            {mm.timed ? `${mm.duration_minutes} min` : "Untimed"}
                          </span>
                          <span className="text-qb-muted">·</span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              mm.is_public
                                ? "text-emerald-400 light:text-emerald-700"
                                : "text-qb-muted"
                            }`}
                          >
                            {mm.is_public ? <Globe size={12} /> : <Lock size={12} />}
                            <span>{mm.is_public ? "Public" : "Private"}</span>
                          </span>
                          {mm.attempt_count > 0 && (
                            <>
                              <span className="text-qb-muted">·</span>
                              <span className="text-qb-muted">
                                {mm.attempt_count} {mm.attempt_count === 1 ? "attempt" : "attempts"}
                              </span>
                            </>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-qb-heading">{mm.title}</h4>
                        {mm.description && (
                          <p className="text-sm leading-relaxed text-qb-mid">{mm.description}</p>
                        )}
                        {topicSummary && (
                          <p className="text-xs font-medium text-qb-muted">{topicSummary}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-qb-border/70 pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleLaunchSavedMiniMock(mm)}
                          className="inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-400/40 bg-amber-500 px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 @sm:flex-initial light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
                        >
                          <Play size={13} />
                          <span>Start</span>
                        </button>

                        {mm.is_public && (
                          <button
                            type="button"
                            onClick={() => void handleCopyMiniMockLink(mm)}
                            className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-qb-border bg-qb-input px-3 text-xs font-semibold text-qb-heading hover:bg-qb-surface-hover"
                          >
                            <Link2 size={13} />
                            <span>Copy Link</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleMiniMockShare(mm)}
                          className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-qb-border bg-qb-input px-3 text-xs font-semibold text-qb-mid hover:text-qb-heading disabled:opacity-50"
                        >
                          {isBusy ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Share2 size={13} />
                          )}
                          <span>{mm.is_public ? "Make Private" : "Share"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openMiniMockBuilder(mm)}
                          aria-label="Edit mini mock"
                          className="inline-flex min-h-[38px] min-w-[38px] cursor-pointer items-center justify-center rounded-lg border border-qb-border bg-qb-input px-2.5 text-qb-mid hover:text-qb-heading"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteMiniMockTarget(mm)}
                          aria-label="Delete mini mock"
                          className="inline-flex min-h-[38px] min-w-[38px] cursor-pointer items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 text-rose-400 hover:bg-rose-500/20 light:border-rose-200 light:bg-rose-50 light:text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Community Mini Mocks Created by Reviewers */}
          <section className="flex flex-col gap-3.5 border-t border-qb-border pt-6">
            <div className="flex flex-col gap-2.5 @lg:flex-row @lg:items-center @lg:justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-400 light:text-emerald-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-qb-mid">
                  Community Mini Mocks ({publicMiniMocks.length})
                </h3>
              </div>

              {publicMiniMocks.length > 0 && (
                <div className="relative flex w-full items-center @lg:w-72">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 text-qb-muted"
                  />
                  <input
                    type="text"
                    value={miniMockSearch}
                    onChange={(e) => setMiniMockSearch(e.target.value)}
                    placeholder="Search mini mocks..."
                    className="min-h-[40px] w-full rounded-xl border border-qb-border bg-qb-input py-1.5 pl-9 pr-8 text-sm text-qb-heading placeholder:text-qb-muted/75 focus:border-amber-500 focus:outline-none"
                  />
                  {miniMockSearch && (
                    <button
                      type="button"
                      onClick={() => setMiniMockSearch("")}
                      aria-label="Clear search"
                      className="absolute right-1.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-qb-muted hover:text-qb-heading"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {filteredPublicMiniMocks.length === 0 ? (
              <div className="rounded-2xl border border-qb-border bg-qb-surface px-6 py-8 text-center">
                <p className="text-sm text-qb-mid">
                  {miniMockSearch.trim()
                    ? "No community Mini Mocks match your search."
                    : "No community Mini Mocks published yet. Publish one of yours above so other reviewers can try it!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                {filteredPublicMiniMocks.map((mm) => {
                  const topicSummary = summarizeTopics(mm.questions_snapshot);
                  return (
                    <article
                      key={mm.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-qb-border bg-qb-surface p-4 transition-colors hover:border-qb-border-hover @sm:p-5"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
                          <span className="font-bold text-emerald-400 light:text-emerald-700">
                            By {mm.full_name}
                          </span>
                          <span className="text-qb-muted">·</span>
                          <span className="font-semibold text-qb-heading">
                            {mm.questions_snapshot.length} items
                          </span>
                          <span className="text-qb-muted">·</span>
                          <span className="text-qb-mid">
                            {mm.timed ? `${mm.duration_minutes} min` : "Untimed"}
                          </span>
                          {mm.attempt_count > 0 && (
                            <>
                              <span className="text-qb-muted">·</span>
                              <span className="text-qb-muted">
                                {mm.attempt_count} {mm.attempt_count === 1 ? "attempt" : "attempts"}
                              </span>
                            </>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-qb-heading">{mm.title}</h4>
                        {mm.description && (
                          <p className="text-sm leading-relaxed text-qb-mid">{mm.description}</p>
                        )}
                        {topicSummary && (
                          <p className="text-xs font-medium text-qb-muted">{topicSummary}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-qb-border/70 pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleLaunchSavedMiniMock(mm)}
                          className="inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/35 bg-emerald-500/14 px-3.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/22 @sm:flex-initial light:border-emerald-300 light:bg-emerald-50 light:text-emerald-800 light:hover:bg-emerald-100"
                        >
                          <Play size={13} />
                          <span>Try Mini Mock</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyMiniMockLink(mm)}
                          className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-qb-border bg-qb-input px-3 text-xs font-semibold text-qb-mid hover:text-qb-heading"
                        >
                          <Link2 size={13} />
                          <span>Share Link</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Create / Edit Question Form */}
      {activeTab === "create" && (
        <div className="flex flex-col gap-6 rounded-2xl border border-qb-border bg-qb-surface p-4 @sm:p-6 @2xl:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-qb-border pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-qb-heading @md:text-xl">
                {editingId ? "Edit Personal Question" : "Create New Personal Question"}
              </h2>
              <p className="text-sm text-qb-mid">
                Fill out the fields below or upload a screenshot to extract automatically.
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetCreator();
                  setActiveTab("private");
                }}
                className="min-h-[36px] cursor-pointer rounded-lg px-2.5 text-sm font-semibold text-amber-400 hover:underline light:text-amber-700"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Optional Image Scan Assistant */}
          <div className="flex flex-col gap-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 @sm:p-5 light:border-amber-200 light:bg-amber-50/80">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-300 light:text-amber-800">
                <Sparkles size={15} className="shrink-0" />
                <span>Scan Question from Image (Optional Auto-Fill)</span>
              </h3>
              <p className="text-[13px] leading-relaxed text-qb-mid">
                Upload a screenshot of a reviewer problem to extract the question stem, choices,
                and solution into this form.
              </p>
            </div>

            <div className="flex flex-col gap-3 @md:flex-row @md:flex-wrap @md:items-center">
              <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/14 px-4 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/22 light:border-amber-300 light:bg-amber-100/80 light:text-amber-800 light:hover:bg-amber-200/70">
                <Upload size={15} />
                <span>{importImage ? "Replace Image" : "Upload Reviewer Screenshot"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                role="checkbox"
                aria-checked={includeAiSolution}
                onClick={() => setIncludeAiSolution((v) => !v)}
                className="inline-flex min-h-[36px] cursor-pointer items-center gap-2.5 text-xs font-medium text-qb-mid transition-colors hover:text-qb-heading"
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    includeAiSolution
                      ? "border-amber-400 bg-amber-500 text-slate-950 light:border-amber-600 light:bg-amber-600 light:text-white"
                      : "border-qb-border bg-qb-input text-transparent"
                  }`}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>Include step-by-step solution</span>
              </button>
            </div>

            {importImage && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <img
                  src={`data:${importImage.mimeType};base64,${importImage.base64}`}
                  alt="Uploaded reviewer screenshot preview"
                  className="h-14 w-14 rounded-lg border border-qb-border-hover object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleExtractFromImage()}
                  disabled={extractingImage}
                  className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500 px-4 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
                >
                  {extractingImage ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  <span>
                    {extractingImage
                      ? `Scanning${extractElapsedSec > 0 ? ` (${extractElapsedSec}s)` : "..."}`
                      : "Auto-Fill Question & Choices"}
                  </span>
                </button>
                {extractingImage ? (
                  <button
                    type="button"
                    onClick={() => extractAbortRef.current?.abort("user_cancelled")}
                    className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-qb-border bg-qb-surface px-3.5 text-xs font-semibold text-qb-heading hover:bg-qb-surface-hover"
                  >
                    Cancel Scan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setImportImage(null);
                      setExtractError("");
                      setExtractSuccess("");
                    }}
                    className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-qb-border bg-qb-surface px-3.5 text-xs font-semibold text-qb-heading hover:bg-qb-surface-hover"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            )}

            {extractError && (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-xl border border-rose-500/35 bg-rose-500/12 px-3.5 py-2.5 text-xs font-medium text-rose-200 light:border-rose-200 light:bg-rose-50 light:text-rose-800"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{extractError}</span>
              </div>
            )}
            {extractSuccess && (
              <div
                role="status"
                className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3.5 py-2.5 text-xs font-medium text-emerald-300 light:border-emerald-200 light:bg-emerald-50 light:text-emerald-800"
              >
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{extractSuccess}</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSaveQuestion} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-qb-mid">
                  Topic
                </label>
                <CustomSelect
                  value={form.topic}
                  onChange={(val) => setForm({ ...form, topic: val })}
                  options={topicOptions}
                  className="w-full [&_.qb-select-btn]:min-h-[44px] [&_.qb-select-btn]:rounded-xl! [&_.qb-select-btn]:px-3.5!"
                  showCheckmark
                  portal
                  minMenuWidth={220}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label
                  htmlFor="mq-label-input"
                  className="text-xs font-bold uppercase tracking-wider text-qb-mid"
                >
                  Problem Label / Tag
                </label>
                <input
                  id="mq-label-input"
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Ratio, Analogy"
                  className="min-h-[44px] w-full rounded-xl border border-qb-border bg-qb-input px-3.5 py-2 text-base text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none @md:text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {PROBLEM_LABELS.slice(0, 6).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm({ ...form, label: preset })}
                      className={`min-h-[30px] cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                        form.label === preset
                          ? "border-amber-500/45 bg-amber-500/15 text-amber-300 light:border-amber-400 light:bg-amber-50 light:text-amber-800"
                          : "border-qb-border bg-qb-input text-qb-mid hover:border-qb-border-hover hover:text-qb-heading"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="mq-question-stem"
                className="text-xs font-bold uppercase tracking-wider text-qb-mid"
              >
                Question Stem
              </label>
              <textarea
                id="mq-question-stem"
                rows={4}
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Type your question here (supports math formulas like $1/4$ or $x^2$)..."
                className="min-h-[112px] w-full resize-y rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5 text-base leading-relaxed text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none @md:text-sm"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-qb-mid">
                  Answer Choices (A – {LETTERS[form.choices.length - 1]})
                </label>
                {form.choices.length < 5 ? (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, choices: [...form.choices, ""] })}
                    className="min-h-[32px] cursor-pointer rounded-lg border border-qb-border bg-qb-input px-2.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading"
                  >
                    + Add Option E
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        choices: form.choices.slice(0, 4),
                        correct: Math.min(form.correct, 3),
                      })
                    }
                    className="min-h-[32px] cursor-pointer rounded-lg border border-qb-border bg-qb-input px-2.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading"
                  >
                    Remove Option E
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {form.choices.map((choice, idx) => {
                  const isCorrect = form.correct === idx;
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, correct: idx })}
                        title={
                          isCorrect
                            ? `Option ${LETTERS[idx]} is the correct answer`
                            : `Mark Option ${LETTERS[idx]} as correct answer`
                        }
                        aria-label={`Mark option ${LETTERS[idx]} as correct`}
                        aria-pressed={isCorrect}
                        className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold transition-colors ${
                          isCorrect
                            ? "border-emerald-500 bg-emerald-500 text-slate-950 shadow-sm light:text-white"
                            : "border-qb-border bg-qb-surface-hover text-qb-mid hover:border-qb-border-hover hover:text-qb-heading"
                        }`}
                      >
                        {LETTERS[idx]}
                      </button>
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => {
                          const next = [...form.choices];
                          next[idx] = e.target.value;
                          setForm({ ...form, choices: next });
                        }}
                        placeholder={`Option ${LETTERS[idx]}`}
                        className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2 text-base text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none @md:text-sm"
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-qb-muted">
                Tap a letter badge (A–{LETTERS[form.choices.length - 1]}) to mark the correct
                answer. Currently marked:{" "}
                <span className="font-semibold text-emerald-400 light:text-emerald-700">
                  Option {LETTERS[form.correct]}
                </span>
                .
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="mq-solution-input"
                className="text-xs font-bold uppercase tracking-wider text-qb-mid"
              >
                Step-by-Step Solution (Optional)
              </label>
              <textarea
                id="mq-solution-input"
                rows={3}
                value={form.solution}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
                placeholder="Explain the step-by-step solution..."
                className="min-h-[96px] w-full resize-y rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5 text-base leading-relaxed text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none @md:text-sm"
              />
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={form.is_public}
              onClick={() => setForm({ ...form, is_public: !form.is_public })}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                form.is_public
                  ? "border-amber-500/45 bg-amber-500/[0.08] light:border-amber-300 light:bg-amber-50/80"
                  : "border-qb-border bg-qb-input hover:border-qb-border-hover"
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    form.is_public
                      ? "border-amber-500/35 bg-amber-500/18 text-amber-400 light:border-amber-300 light:bg-amber-100 light:text-amber-700"
                      : "border-qb-border bg-qb-surface text-qb-muted"
                  }`}
                >
                  {form.is_public ? <Clock size={17} /> : <Lock size={17} />}
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-qb-heading">
                    <span>Submit to Community Bank</span>
                    <span
                      className={`text-xs font-bold ${
                        form.is_public
                          ? "text-amber-400 light:text-amber-700"
                          : "text-qb-muted"
                      }`}
                    >
                      · {form.is_public ? "Pending Admin Review" : "Private Only"}
                    </span>
                  </span>
                  <span className="block text-xs leading-relaxed text-qb-mid">
                    When enabled, your question enters the admin moderation queue and publishes
                    with your attribution ({fullName}) once approved.
                  </span>
                </span>
              </div>

              <span
                aria-hidden="true"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                  form.is_public
                    ? "border-amber-400 bg-amber-500 light:border-amber-600 light:bg-amber-600"
                    : "border-qb-border bg-qb-surface-hover"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    form.is_public ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </span>
            </button>

            <div className="flex flex-col-reverse gap-2.5 border-t border-qb-border pt-5 @md:flex-row @md:items-center @md:justify-end">
              <button
                type="button"
                onClick={() => {
                  resetCreator();
                  setActiveTab("private");
                }}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-qb-border bg-qb-input px-5 text-sm font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 light:border-amber-700 light:bg-amber-600 light:text-white light:hover:bg-amber-700"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : form.is_public ? (
                  <Send size={15} />
                ) : (
                  <Plus size={15} />
                )}
                <span>
                  {saving
                    ? "Saving..."
                    : form.is_public
                      ? "Submit for Admin Review"
                      : editingId
                        ? "Update Question"
                        : "Save Personal Question"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* In-App Delete Question Modal */}
      {deleteTarget && (
        <div className="qb-modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="qb-delete-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mq-del-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qb-delete-modal-header">
              <div className="qb-delete-modal-icon-badge">
                <Trash2 size={20} />
              </div>
              <div className="qb-delete-modal-headings">
                <h3 id="mq-del-title" className="qb-delete-modal-title">
                  Delete personal question?
                </h3>
                <p className="qb-delete-modal-desc">
                  This removes the question from your bank
                  {deleteTarget.is_public ? " and unpublishes it from the community pool" : ""}.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="qb-delete-modal-preview">
              <p className="qb-delete-modal-preview-text">{deleteTarget.question}</p>
            </div>

            <div className="qb-delete-modal-actions">
              <button
                type="button"
                className="qb-delete-modal-btn-cancel"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="qb-delete-modal-btn-delete"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
              >
                {deleting ? "Deleting..." : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Mini Mock Modal */}
      {deleteMiniMockTarget && (
        <div
          className="qb-modal-backdrop"
          onClick={() => !deletingMiniMock && setDeleteMiniMockTarget(null)}
        >
          <div
            className="qb-delete-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-del-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qb-delete-modal-header">
              <div className="qb-delete-modal-icon-badge">
                <Trash2 size={20} />
              </div>
              <div className="qb-delete-modal-headings">
                <h3 id="mm-del-title" className="qb-delete-modal-title">
                  Delete Mini Mock Exam?
                </h3>
                <p className="qb-delete-modal-desc">
                  This removes &ldquo;{deleteMiniMockTarget.title}&rdquo; from your Mini Mocks
                  {deleteMiniMockTarget.is_public ? " and from the Community directory" : ""}. Your
                  underlying personal questions stay intact.
                </p>
              </div>
            </div>

            <div className="qb-delete-modal-actions">
              <button
                type="button"
                className="qb-delete-modal-btn-cancel"
                disabled={deletingMiniMock}
                onClick={() => setDeleteMiniMockTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="qb-delete-modal-btn-delete"
                disabled={deletingMiniMock}
                onClick={() => void handleConfirmDeleteMiniMock()}
              >
                {deletingMiniMock ? "Deleting..." : "Delete Mini Mock"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* In-App Admin Request Changes Modal */}
      {rejectTarget && (
        <div
          className="qb-modal-backdrop"
          onClick={() => !rejecting && setRejectTarget(null)}
        >
          <div
            className="qb-delete-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mq-reject-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qb-delete-modal-header">
              <div className="qb-delete-modal-icon-badge">
                <XCircle size={20} />
              </div>
              <div className="qb-delete-modal-headings">
                <h3 id="mq-reject-title" className="qb-delete-modal-title">
                  Return submission for revision?
                </h3>
                <p className="qb-delete-modal-desc">
                  Add helpful feedback for {rejectTarget.full_name} so they know what to fix before
                  resubmitting to the Community Bank.
                </p>
              </div>
            </div>

            <div className="qb-delete-modal-preview">
              <p className="qb-delete-modal-preview-text">{rejectTarget.question}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="mq-reject-reason"
                className="text-xs font-bold uppercase tracking-wider text-qb-mid"
              >
                Reviewer Feedback (Optional)
              </label>
              <textarea
                id="mq-reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={rejecting}
                placeholder="e.g. Clarify the wording in Option C or include a brief step-by-step solution..."
                className="w-full resize-y rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-sm text-qb-heading placeholder:text-qb-muted/70 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="qb-delete-modal-actions">
              <button
                type="button"
                className="qb-delete-modal-btn-cancel"
                disabled={rejecting}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="qb-delete-modal-btn-delete"
                disabled={rejecting}
                onClick={() => void handleConfirmRejectSubmission()}
              >
                {rejecting ? "Returning..." : "Return to Author"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
