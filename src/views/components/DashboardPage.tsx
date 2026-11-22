import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMeterReady } from "../../controllers/useMeterReady";
import {
  Flame,
  Target,
  Calendar,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  Layers,
  Timer,
  Calculator,
  BookOpen,
  Globe,
  BrainCircuit,
  ClipboardList,
  ChevronRight,
  Zap,
  SlidersHorizontal,
  BarChart3,
  Briefcase,
  GraduationCap,
  Trophy,
  History,
  Plus,
  Search,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import CountUp from "./CountUp";
import MarkdownText from "./MarkdownText";
import cseHubWorkbenchImg from "../../assets/images/cse_hub_workbench_1795232246631.jpg";
import {
  getMasterySummary,
  getStudyStreakSummary,
  getSubjectMasteryBreakdown,
  type SubjectMasteryRow,
} from "../../models/masteryModel";
import {
  formatRecentRelativeTime,
  type ResolvedRecentQuestion,
} from "../../models/recentQuestionsModel";
import type {
  MockExamAttempt,
  Question,
  QuestionMasteryRecord,
  TopicId,
  UserProfile,
} from "../../types";

interface DashboardPageProps {
  questions: Question[];
  masteryMap: Record<string, QuestionMasteryRecord>;
  userId?: string | null;
  profile?: UserProfile | null;
  examTarget: "professional" | "subprofessional";
  targetExamDate?: string;
  dailyStudyGoal: number;
  todayAnsweredCount: number;
  daysUntilExam: number | null;
  mockHistory: MockExamAttempt[];
  activeExam: any | null;
  isAuthenticated: boolean;
  onResumeActiveExam: () => void;
  onOpenAttempt: (attemptId: string) => void;
  onStartExam: (presetId: "professional" | "subprofessional") => void;
  onStartQuickPractice: (opts: {
    count: number;
    scope: "all" | "unseen" | "missed";
    topic: string;
    timed: boolean;
  }) => void;
  onOpenQuestionBank: (opts?: {
    topic?: TopicId | "all";
    mastery?: "all" | "unseen" | "missed" | "mastered";
    search?: string;
  }) => void;
  canCreateQuestions?: boolean;
  onAddQuestion?: () => void;
  onGoMockExam: () => void;
  onOpenSettings: (tab?: string) => void;
  onRequireAuth: () => void;
  recentQuestions?: ResolvedRecentQuestion[];
  onSelectQuestion?: (questionId: string) => void;
  onClearRecentQuestions?: () => void;
}

const SUBJECT_ICONS: Record<string, typeof Calculator> = {
  numerical: Calculator,
  verbal: BookOpen,
  general: Globe,
  analytical: BrainCircuit,
  clerical: ClipboardList,
};

const SUBJECT_ACCENT_STYLES: Record<string, { icon: string; bar: string }> = {
  numerical: {
    icon: "bg-amber-500/10 text-amber-400 light:bg-amber-50 light:text-amber-700",
    bar: "bg-amber-400 light:bg-amber-600",
  },
  verbal: {
    icon: "bg-sky-400/10 text-sky-400 light:bg-sky-50 light:text-sky-700",
    bar: "bg-sky-400 light:bg-sky-600",
  },
  general: {
    icon: "bg-violet-400/10 text-violet-400 light:bg-violet-50 light:text-violet-700",
    bar: "bg-violet-400 light:bg-violet-600",
  },
  analytical: {
    icon: "bg-emerald-400/10 text-emerald-400 light:bg-emerald-50 light:text-emerald-700",
    bar: "bg-emerald-400 light:bg-emerald-600",
  },
  clerical: {
    icon: "bg-rose-400/10 text-rose-400 light:bg-rose-50 light:text-rose-700",
    bar: "bg-rose-400 light:bg-rose-600",
  },
};

const formatDurationShort = (ms?: number) => {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalMins = Math.round(safeMs / 60_000);
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatRemainingClock = (activeExam: any) => {
  if (!activeExam || !activeExam.durationMs || !activeExam.startedAt) return null;
  const elapsed = Math.max(0, Date.now() - Number(activeExam.startedAt));
  const leftMs = Math.max(0, Number(activeExam.durationMs) - elapsed);
  const totalMins = Math.ceil(leftMs / 60_000);
  if (totalMins <= 0) return "Time elapsed";
  if (totalMins < 60) return `${totalMins}m left`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m left` : `${hrs}h left`;
};

const formatTargetDate = (iso?: string) => {
  if (!iso) return "No date set";
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatActivityDateLabel = (dateKey: string, isToday: boolean) => {
  const match = dateKey.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isToday ? "Today" : dateKey;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const shortDate = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return isToday
    ? `Today · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : shortDate;
};

const formatAttemptMode = (attempt: MockExamAttempt) => {
  if (attempt.title && attempt.title.trim()) return attempt.title.trim();
  if (attempt.mode === "professional") return "Professional Mock";
  if (attempt.mode === "subprofessional") return "Subprofessional Mock";
  if (attempt.mode === "drill") return "Mistake Drill";
  return "Quick Practice";
};

export default function DashboardPage({
  questions,
  masteryMap,
  userId,
  profile,
  examTarget,
  targetExamDate,
  dailyStudyGoal,
  todayAnsweredCount,
  daysUntilExam,
  mockHistory,
  activeExam,
  isAuthenticated,
  onResumeActiveExam,
  onOpenAttempt,
  onStartExam,
  onStartQuickPractice,
  onOpenQuestionBank,
  canCreateQuestions = false,
  onAddQuestion,
  onGoMockExam,
  onOpenSettings,
  onRequireAuth,
  recentQuestions = [],
  onSelectQuestion,
  onClearRecentQuestions,
}: DashboardPageProps) {
  const [hubQuery, setHubQuery] = useState("");
  const [hubImgError, setHubImgError] = useState(false);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const [pinnedDayKey, setPinnedDayKey] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ dayKey: string; idx: number }>({
    dayKey: "",
    idx: 6,
  });
  const activityCardRef = useRef<HTMLElement | null>(null);
  const metersReady = useMeterReady(true);

  const safeGoal = Math.max(1, Number(dailyStudyGoal) || 25);
  const masterySummary = useMemo(
    () => getMasterySummary(questions, masteryMap),
    [questions, masteryMap]
  );
  const streakSummary = useMemo(
    () => getStudyStreakSummary(userId, safeGoal),
    [userId, safeGoal, todayAnsweredCount]
  );
  const { subjects, weakAreas } = useMemo(
    () => getSubjectMasteryBreakdown(questions, masteryMap),
    [questions, masteryMap]
  );

  const todayCount = Math.max(todayAnsweredCount, streakSummary.todayCount);
  const dailyPct = Math.min(100, Math.round((todayCount / safeGoal) * 100));
  const dailyRemaining = Math.max(0, safeGoal - todayCount);
  const goalMet = todayCount >= safeGoal;

  const bankMasteryPct =
    questions.length > 0 ? Math.round((masterySummary.mastered / questions.length) * 100) : 0;

  const firstName = useMemo(() => {
    const raw = (profile?.fullName || "").trim();
    if (!raw || raw.toLowerCase() === "reviewer") return null;
    return raw.split(/\s+/)[0];
  }, [profile?.fullName]);

  const maxDayCount = useMemo(
    () => Math.max(safeGoal, ...streakSummary.last7Days.map((d) => d.count), 1),
    [safeGoal, streakSummary.last7Days]
  );
  const CHART_PLOT_MAX_PCT = 82;
  const goalLinePct = Math.round((safeGoal / maxDayCount) * CHART_PLOT_MAX_PCT);
  const weeklyAvgRaw = streakSummary.weeklyTotal / 7;
  const weeklyAvgLabel = Number.isInteger(weeklyAvgRaw)
    ? String(weeklyAvgRaw)
    : weeklyAvgRaw.toFixed(1);
  const daysMetCount = useMemo(
    () => streakSummary.last7Days.filter((d) => d.goalMet).length,
    [streakSummary.last7Days]
  );

  useEffect(() => {
    if (!pinnedDayKey) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        activityCardRef.current &&
        event.target instanceof Node &&
        !activityCardRef.current.contains(event.target)
      ) {
        setPinnedDayKey(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinnedDayKey(null);
        setHoveredDayKey(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pinnedDayKey]);

  const activeDayKey = hoveredDayKey ?? pinnedDayKey;
  const activeDayIdx = activeDayKey
    ? streakSummary.last7Days.findIndex((d) => d.dateKey === activeDayKey)
    : -1;
  const isTooltipOpen = activeDayIdx >= 0;
  const safeDisplayIdx =
    activeDayIdx >= 0
      ? activeDayIdx
      : Math.min(Math.max(tooltipAnchor.idx, 0), Math.max(streakSummary.last7Days.length - 1, 0));
  const tooltipDay = streakSummary.last7Days[safeDisplayIdx] || null;
  const totalChartDays = Math.max(streakSummary.last7Days.length, 1);
  const tooltipCenterPct = ((safeDisplayIdx + 0.5) / totalChartDays) * 100;
  const tooltipEdgeAnchorPct =
    totalChartDays > 1 ? (safeDisplayIdx / (totalChartDays - 1)) * 100 : 50;

  const hasResumableMock = Boolean(
    activeExam &&
      !activeExam.finished &&
      !activeExam.isReviewSession &&
      Array.isArray(activeExam.orderIds) &&
      activeExam.orderIds.length > 0
  );

  const activeAnsweredCount = hasResumableMock
    ? Object.keys(activeExam?.answers || {}).length
    : 0;
  const activeTotalCount = hasResumableMock ? activeExam.orderIds.length : 0;
  const activeProgressPct =
    activeTotalCount > 0 ? Math.round((activeAnsweredCount / activeTotalCount) * 100) : 0;
  const activeTimeLeftLabel = hasResumableMock ? formatRemainingClock(activeExam) : null;

  const recentAttempts = useMemo(() => (mockHistory || []).slice(0, 5), [mockHistory]);
  const recentOpenedItems = useMemo(() => (recentQuestions || []).slice(0, 5), [recentQuestions]);
  const primaryWeakArea: SubjectMasteryRow | null = weakAreas[0] || null;
  const trackLabel = examTarget === "subprofessional" ? "Subprofessional Track" : "Professional Track";

  const handlePrimaryAction = () => {
    if (hasResumableMock) {
      onResumeActiveExam();
      return;
    }
    if (masterySummary.missed > 0) {
      onStartQuickPractice({
        count: Math.min(20, Math.max(10, masterySummary.missed)),
        scope: "missed",
        topic: "all",
        timed: false,
      });
      return;
    }
    onStartQuickPractice({
      count: 15,
      scope: masterySummary.unseen > 0 ? "unseen" : "all",
      topic: "all",
      timed: true,
    });
  };

  const handleLaunchOfficialMock = (presetId: "professional" | "subprofessional") => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    onStartExam(presetId);
  };

  const handleHubSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    onOpenQuestionBank({
      topic: "all",
      mastery: "all",
      search: hubQuery.trim(),
    });
  };

  const topicQuickFilters: Array<{
    id: TopicId;
    label: string;
  }> = [
    { id: "numerical", label: "Numerical" },
    { id: "verbal", label: "Verbal" },
    { id: "general", label: "General Info" },
    { id: "analytical", label: "Analytical" },
  ];

  return (
    <div className="fu space-y-4 sm:space-y-5 pb-3 sm:pb-0">
      {/* Studio Command Hub: Clean Top Context Bar + Mobile-First Workflow Order + Desktop 2-Column Split */}
      <section
        className="relative overflow-hidden rounded-2xl border border-qb-border bg-qb-surface p-3.5 sm:p-6"
        aria-label="Study Command Hub"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.08),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(245,166,35,0.08),transparent_50%)] light:bg-[radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.05),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(217,119,6,0.06),transparent_50%)]"
          aria-hidden="true"
        />

        <div className="relative space-y-4 sm:space-y-5">
          {/* Full-Width Single-Row Header Bar (prevents wrapping/orphaning on mobile) */}
          <div className="flex items-center justify-between gap-2 border-b border-qb-border/75 pb-3">
            <div className="min-w-0 flex items-center gap-1.5 text-[11.5px] sm:text-xs font-semibold text-qb-muted">
              <span className="text-qb-accent shrink-0">Study Dashboard</span>
              <span aria-hidden="true">·</span>
              <span className="truncate tabular-nums">
                {daysUntilExam !== null && daysUntilExam >= 0
                  ? daysUntilExam === 0
                    ? "Exam day today"
                    : `${daysUntilExam}d until exam`
                  : "5 subjects"}
              </span>
            </div>

            {canCreateQuestions && onAddQuestion ? (
              <button
                type="button"
                onClick={onAddQuestion}
                className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-qb-border bg-qb-input px-3 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus size={13} className="text-qb-accent shrink-0" aria-hidden="true" />
                <span>Add Question</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenSettings("exam")}
                className="inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-qb-border bg-qb-input px-3 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal size={13} className="text-qb-accent shrink-0" aria-hidden="true" />
                <span>Exam Settings</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-7 items-stretch">
            {/* Workbench Showcase: Second on mobile (after greeting/search/actions), Left (5/12) on desktop */}
            <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-between overflow-hidden rounded-xl border border-qb-border bg-[#070d19] light:bg-slate-900">
              <div className="relative h-[156px] sm:h-[190px] lg:h-auto lg:flex-1 lg:min-h-[210px] w-full overflow-hidden">
                {!hubImgError ? (
                  <img
                    src={cseHubWorkbenchImg}
                    alt="Translucent architectural glass study plates displaying geometric grids, golden ratio arcs, and progress charts"
                    referrerPolicy="no-referrer"
                    onError={() => setHubImgError(true)}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] motion-reduce:transform-none"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0b1528] via-[#0e1b33] to-[#08101e] p-4 text-center"
                    aria-hidden="true"
                  >
                    <Layers size={28} className="text-amber-400/80" />
                    <span className="text-xs font-semibold text-slate-300">
                      CSE Study &amp; Readiness Workbench
                    </span>
                  </div>
                )}

                {/* Measured Scrim for Guaranteed AA Contrast over Artwork */}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050914] via-[#050914]/55 to-[#050914]/20"
                  aria-hidden="true"
                />

                {/* Top Track Metadata inside Media Frame */}
                <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-200">
                  <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                    <ShieldCheck size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{trackLabel}</span>
                  </span>
                  <span className="text-emerald-300 tabular-nums shrink-0">80% Pass Target</span>
                </div>

                {/* Bottom Mastery Readout anchored inside scrim */}
                <div className="absolute inset-x-3.5 bottom-3.5 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Bank Mastery Progress
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {bankMasteryPct}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ width: `${metersReady ? bankMasteryPct : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Clean Hairline Footer inside Workbench Frame */}
              <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#080f1d] px-3.5 py-2.5 text-xs">
                <span className="text-slate-300 tabular-nums">
                  <strong className="font-bold text-white">{masterySummary.mastered}</strong>
                  <span className="text-slate-400"> / {questions.length} mastered</span>
                </span>
                <button
                  type="button"
                  onClick={onGoMockExam}
                  className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 cursor-pointer whitespace-nowrap transition-colors"
                >
                  <span>Mock Center</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Primary Workspace Flow: First on mobile, Right (7/12) on desktop */}
            <div className="order-1 lg:order-2 lg:col-span-7 flex flex-col justify-between gap-4 sm:gap-5">
              {/* Balanced Headline + Context Line */}
              <div className="space-y-1.5">
                <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight text-qb-heading text-balance leading-[1.2]">
                  {firstName ? `Welcome back, ${firstName}` : "Civil Service Exam Readiness"}
                </h1>
                <p className="text-xs sm:text-sm text-qb-mid leading-relaxed max-w-2xl tabular-nums">
                  {todayCount}/{safeGoal} daily items completed
                  <span aria-hidden="true"> · </span>
                  {streakSummary.currentStreak}d study streak
                  {masterySummary.missed > 0 && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="text-rose-400 light:text-rose-700 font-semibold">
                        {masterySummary.missed} missed to review
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Integrated Single-Row Question Bank Search + 2x2 Mobile / Wrap Desktop Subject Quick Jumps */}
              <div className="space-y-3">
                <form
                  onSubmit={handleHubSearchSubmit}
                  className="flex items-center gap-1.5 rounded-xl border border-qb-border-hover bg-qb-input p-1.5 transition-colors focus-within:border-amber-500/60"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 pl-2">
                    <Search size={15} className="shrink-0 text-qb-muted" aria-hidden="true" />
                    <input
                      type="text"
                      value={hubQuery}
                      onChange={(e) => setHubQuery(e.target.value)}
                      placeholder="Search topics..."
                      aria-label="Search the CSE Question Bank"
                      className="w-full min-h-[38px] bg-transparent text-[13px] sm:text-sm text-qb-heading placeholder:text-qb-muted focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0 light:border-amber-300 light:bg-amber-50 light:text-amber-800 light:hover:bg-amber-100"
                  >
                    <span className="sm:hidden">Search</span>
                    <span className="hidden sm:inline">Search Bank</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                </form>

                <div className="space-y-1.5 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
                  <span className="block sm:inline text-[11px] font-semibold text-qb-muted sm:mr-1">
                    Jump to subject
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 sm:contents">
                    {topicQuickFilters.map((topicItem) => (
                      <button
                        key={topicItem.id}
                        type="button"
                        onClick={() => onOpenQuestionBank({ topic: topicItem.id, mastery: "all" })}
                        className="inline-flex min-h-[40px] sm:min-h-[32px] items-center justify-between sm:justify-center gap-1.5 rounded-lg border border-qb-border bg-qb-input/75 px-3 py-1.5 sm:px-2.5 sm:py-1 text-xs font-medium text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
                      >
                        <span className="truncate">{topicItem.label}</span>
                        <ChevronRight size={12} className="text-qb-muted shrink-0 sm:hidden" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Hairline Footer: Quiet Telemetry + Clean Equal-Width Mobile CTAs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-qb-border/75 pt-3.5 sm:pt-4">
                <div className="flex items-center gap-3.5 text-xs tabular-nums">
                  <div>
                    <span className="text-qb-muted">Daily Goal </span>
                    <strong className={goalMet ? "font-bold text-emerald-400 light:text-emerald-700" : "font-bold text-qb-heading"}>
                      {dailyPct}%
                    </strong>
                  </div>
                  <span className="text-qb-border" aria-hidden="true">·</span>
                  <div>
                    <span className="text-qb-muted">Unseen </span>
                    <strong className="font-bold text-qb-heading">{masterySummary.unseen}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenQuestionBank({ topic: "all", mastery: "all" })}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-qb-border bg-qb-input px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    <Layers size={15} className="text-qb-muted shrink-0" aria-hidden="true" />
                    <span>Question Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#070c18] shadow-[0_6px_20px_rgba(245,166,35,0.22)] transition-colors hover:bg-amber-400 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    {hasResumableMock ? (
                      <>
                        <PlayCircle size={15} aria-hidden="true" />
                        <span>Resume Mock</span>
                      </>
                    ) : masterySummary.missed > 0 ? (
                      <>
                        <Zap size={15} aria-hidden="true" />
                        <span className="tabular-nums">Drill {masterySummary.missed} Missed</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle size={15} aria-hidden="true" />
                        <span>Quick Practice</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Metric Telemetry Strip: 2x2 compact grid on mobile, 4-across on desktop */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5" aria-label="Study Metrics">
        {/* Daily Goal */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-3 sm:p-4 flex flex-col justify-between gap-2.5 transition-colors hover:border-qb-border-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-qb-muted">Daily Goal</span>
            <Target
              size={15}
              className={
                goalMet
                  ? "shrink-0 text-emerald-400 light:text-emerald-700"
                  : "shrink-0 text-qb-muted"
              }
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-1.5">
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-xl sm:text-2xl font-bold leading-none text-qb-heading tabular-nums">
                  <CountUp end={todayCount} duration={650} />
                </span>
                <span className="text-xs font-medium text-qb-muted tabular-nums">
                  /{safeGoal}
                </span>
              </div>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  goalMet ? "text-emerald-400 light:text-emerald-700" : "text-qb-accent"
                }`}
              >
                <CountUp end={dailyPct} duration={700} suffix="%" />
              </span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  goalMet ? "bg-emerald-400 light:bg-emerald-600" : "bg-amber-400 light:bg-amber-600"
                }`}
                style={{ width: `${metersReady ? dailyPct : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-qb-muted">
              <span className="tabular-nums">
                {goalMet ? "Target met" : `${dailyRemaining} left`}
              </span>
              <button
                type="button"
                onClick={() => onOpenSettings("exam")}
                className="font-semibold text-qb-accent hover:underline cursor-pointer shrink-0"
              >
                Adjust
              </button>
            </div>
          </div>
        </div>

        {/* Study Streak */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-3 sm:p-4 flex flex-col justify-between gap-2.5 transition-colors hover:border-qb-border-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-qb-muted">Study Streak</span>
            <Flame size={15} className="shrink-0 text-amber-400 light:text-amber-600" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold leading-none text-qb-heading tabular-nums">
                <CountUp end={streakSummary.currentStreak} duration={650} />
              </span>
              <span className="text-xs font-medium text-qb-muted">
                {streakSummary.currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
              Best {streakSummary.bestStreak}d · {streakSummary.totalDaysActive}d active
            </div>
          </div>
        </div>

        {/* Exam Countdown */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-3 sm:p-4 flex flex-col justify-between gap-2.5 transition-colors hover:border-qb-border-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-qb-muted">Exam Date</span>
            <Calendar size={15} className="shrink-0 text-qb-muted" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xl sm:text-2xl font-bold leading-none text-qb-heading tabular-nums">
              {daysUntilExam !== null
                ? daysUntilExam === 0
                  ? "Today"
                  : daysUntilExam > 0
                    ? `${daysUntilExam}d`
                    : "Passed"
                : "Unset"}
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-qb-muted leading-snug">
              <span className="tabular-nums">{formatTargetDate(targetExamDate)}</span>
              <button
                type="button"
                onClick={() => onOpenSettings("exam")}
                className="font-semibold text-qb-accent hover:underline cursor-pointer shrink-0"
              >
                {targetExamDate ? "Edit" : "Set"}
              </button>
            </div>
          </div>
        </div>

        {/* Bank Mastery */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-3 sm:p-4 flex flex-col justify-between gap-2.5 transition-colors hover:border-qb-border-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-qb-muted">Bank Mastery</span>
            <CheckCircle2
              size={15}
              className="shrink-0 text-emerald-400 light:text-emerald-700"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-bold leading-none text-qb-heading tabular-nums">
                <CountUp end={bankMasteryPct} duration={700} suffix="%" />
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-qb-muted tabular-nums">
                {masterySummary.mastered}/{questions.length}
              </span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-emerald-400 light:bg-emerald-600 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${metersReady ? bankMasteryPct : 0}%`,
                  transitionDelay: metersReady ? "80ms" : "0ms",
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-qb-muted tabular-nums">
              <span>{masterySummary.unseen} unseen</span>
              {masterySummary.missed > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenQuestionBank({ topic: "all", mastery: "missed" })}
                  className="font-semibold text-rose-400 light:text-rose-700 hover:underline cursor-pointer shrink-0"
                >
                  {masterySummary.missed} missed
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Single-Elevation Continuity or Weak-Area Priority Strip */}
      {hasResumableMock ? (
        <section
          className="rounded-2xl border border-amber-500/35 bg-qb-surface p-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          aria-label="Session in progress"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Timer size={18} className="mt-0.5 shrink-0 text-amber-400 light:text-amber-700" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-qb-heading">
                  {activeExam.title ||
                    (activeExam.mode === "subprofessional"
                      ? "Subprofessional Mock Exam"
                      : activeExam.mode === "professional"
                        ? "Professional Mock Exam"
                        : activeExam.mode === "drill"
                          ? "Mistake Drill Session"
                          : "Quick Practice Session")}
                </span>
                <span className="text-xs font-medium text-qb-muted tabular-nums">
                  {activeAnsweredCount}/{activeTotalCount} answered ({activeProgressPct}%)
                  {activeTimeLeftLabel ? ` · ${activeTimeLeftLabel}` : ""}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-amber-400 light:bg-amber-600 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${metersReady ? activeProgressPct : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResumeActiveExam}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer whitespace-nowrap"
            >
              <PlayCircle size={14} aria-hidden="true" />
              <span>Resume Session</span>
            </button>
            <button
              type="button"
              onClick={onGoMockExam}
              className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-qb-border bg-qb-surface px-3 py-2 text-xs font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
            >
              Mock Center
            </button>
          </div>
        </section>
      ) : primaryWeakArea ? (
        <section
          className="rounded-2xl border border-qb-border bg-qb-surface px-3.5 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-qb-border-hover"
          aria-label="Weak area priority"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-400 light:bg-amber-500/15 light:text-amber-700"
              aria-hidden="true"
            >
              <Target size={15} />
            </span>
            <div className="min-w-0 text-xs sm:text-sm leading-snug">
              <span className="font-bold text-qb-heading">
                Recommended focus: {primaryWeakArea.label}
              </span>
              <span className="text-qb-muted tabular-nums">
                {" · "}
                {primaryWeakArea.missed > 0
                  ? `${primaryWeakArea.missed} missed`
                  : "Below 80% target"}
                {primaryWeakArea.accuracyPercent !== null &&
                  ` · ${primaryWeakArea.accuracyPercent}% accuracy`}
                {weakAreas.length > 1 && ` · +${weakAreas.length - 1} more`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onStartQuickPractice({
                  count: 15,
                  scope: primaryWeakArea.missed > 0 ? "missed" : "all",
                  topic: primaryWeakArea.id,
                  timed: false,
                })
              }
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-500/12 px-3 py-1.5 text-xs font-semibold text-amber-300 light:border-amber-600/30 light:bg-amber-500/15 light:text-amber-800 transition-colors hover:bg-amber-500/20 cursor-pointer whitespace-nowrap"
            >
              <Zap size={13} aria-hidden="true" />
              <span>Drill {primaryWeakArea.short}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenQuestionBank({
                  topic: primaryWeakArea.id,
                  mastery: primaryWeakArea.missed > 0 ? "missed" : "all",
                })
              }
              className="inline-flex min-h-[36px] items-center rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
            >
              Review
            </button>
          </div>
        </section>
      ) : null}

      {/* Main 12-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (7/12): Subject Mastery & 7-Day Activity */}
        <div className="lg:col-span-7 space-y-4">
          {/* Subject Mastery */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface overflow-hidden"
            aria-label="Subject Mastery Breakdown"
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 sm:px-5 border-b border-qb-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="shrink-0 text-qb-accent" aria-hidden="true" />
                  <h2 className="text-sm sm:text-base font-bold text-qb-heading leading-tight">
                    Subject Mastery
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
                  5 CSE subjects · 80% passing benchmark
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenQuestionBank({ topic: "all", mastery: "all" })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-qb-accent hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>All items</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-qb-border">
              {subjects.map((subject, idx) => {
                const Icon = SUBJECT_ICONS[subject.id] || Layers;
                const styles = SUBJECT_ACCENT_STYLES[subject.id] || SUBJECT_ACCENT_STYLES.numerical;
                const accuracyTone =
                  subject.accuracyPercent === null
                    ? "text-qb-muted"
                    : subject.accuracyPercent >= 80
                      ? "text-emerald-400 light:text-emerald-700"
                      : subject.accuracyPercent >= 60
                        ? "text-amber-400 light:text-amber-700"
                        : "text-rose-400 light:text-rose-700";

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() =>
                      onOpenQuestionBank({
                        topic: subject.id,
                        mastery: subject.missed > 0 ? "missed" : "all",
                      })
                    }
                    className="group w-full min-h-[60px] flex items-center gap-3 px-3.5 py-3 sm:px-5 text-left transition-colors hover:bg-qb-surface-hover active:bg-qb-surface-hover cursor-pointer"
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
                    >
                      <Icon size={15} aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-[13px] sm:text-sm font-semibold text-qb-heading leading-snug">
                            {subject.label}
                          </span>
                          {subject.needsAttention && (
                            <span className="text-[11px] font-semibold text-rose-400 light:text-rose-700 shrink-0">
                              · Review
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-bold tabular-nums shrink-0 ${accuracyTone}`}>
                          {subject.accuracyPercent !== null
                            ? `${subject.accuracyPercent}%`
                            : "Unstarted"}
                        </span>
                      </div>

                      <div
                        className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
                        aria-hidden="true"
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${styles.bar}`}
                          style={{
                            width: `${metersReady ? subject.masteryPercent : 0}%`,
                            transitionDelay: metersReady ? `${idx * 55}ms` : "0ms",
                          }}
                        />
                        <span
                          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/30 light:bg-slate-900/20"
                          style={{ left: "80%" }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums">
                        <span>
                          {subject.mastered}/{subject.total} mastered
                        </span>
                        {subject.missed > 0 && (
                          <span className="text-rose-400 light:text-rose-700 font-semibold">
                            · {subject.missed} missed
                          </span>
                        )}
                        <span>· {subject.unseen} unseen</span>
                      </div>
                    </div>

                    <ChevronRight
                      size={15}
                      className="shrink-0 text-qb-muted transition-transform group-hover:translate-x-0.5 group-hover:text-qb-heading"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* 7-Day Study Activity (PolicyPulse Bar Telemetry + Gliding Tooltip) */}
          <section
            ref={activityCardRef}
            className="rounded-2xl border border-qb-border bg-qb-surface p-3.5 sm:p-5 space-y-3.5"
            aria-label="7-Day Study Activity"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BarChart3
                    size={15}
                    className="shrink-0 text-emerald-400 light:text-emerald-700"
                    aria-hidden="true"
                  />
                  <h2 className="text-sm sm:text-base font-bold text-qb-heading leading-tight">
                    7-Day Study Activity
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
                  Daily answered items vs {safeGoal}/day target
                </p>
              </div>

              <div className="flex items-center gap-3 pt-0.5 text-[11px] font-medium text-qb-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-xs bg-emerald-400 light:bg-emerald-600"
                    aria-hidden="true"
                  />
                  <span>Goal met</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-xs bg-amber-400 light:bg-amber-500"
                    aria-hidden="true"
                  />
                  <span>Active</span>
                </span>
              </div>
            </div>

            {/* Interactive Bar Chart Canvas */}
            <div className="pt-2">
              <div className="flex items-stretch gap-1.5 sm:gap-2">
                {/* Subtle Y-Axis Scale */}
                <div
                  className="flex h-36 sm:h-40 w-6 sm:w-7 shrink-0 flex-col justify-between pb-0.5 text-right text-[10px] font-medium text-qb-muted tabular-nums select-none"
                  aria-hidden="true"
                >
                  <span>{maxDayCount}</span>
                  <span>{Math.round(maxDayCount / 2)}</span>
                  <span>0</span>
                </div>

                {/* Plot Columns Wrapper */}
                <div
                  className="relative flex-1"
                  onPointerLeave={(e) => {
                    if (e.pointerType !== "touch") setHoveredDayKey(null);
                  }}
                >
                  {/* Plot Grid & Bars */}
                  <div className="relative h-40 sm:h-44 border-b border-qb-border">
                    {/* Subtle Horizontal Gridlines */}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-qb-border/60"
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-qb-border/50"
                      aria-hidden="true"
                    />

                    {/* Dashed Daily Goal Benchmark Line */}
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-end border-t border-dashed border-emerald-400/55 light:border-emerald-600/45"
                      style={{ bottom: `${goalLinePct}%` }}
                      aria-hidden="true"
                    >
                      <span className="-mt-4 rounded bg-qb-surface/95 px-1 text-[10px] font-semibold text-emerald-400 light:text-emerald-700 tabular-nums">
                        Goal {safeGoal}
                      </span>
                    </div>

                    {/* 7 Interactive Day Columns */}
                    <div className="relative z-20 grid h-full grid-cols-7 gap-1.5 sm:gap-2.5 items-end">
                      {streakSummary.last7Days.map((day, idx) => {
                        const barPct =
                          day.count > 0
                            ? Math.min(
                                92,
                                Math.max(9, Math.round((day.count / maxDayCount) * CHART_PLOT_MAX_PCT))
                              )
                            : 0;
                        const isActiveDay = activeDayKey === day.dateKey;
                        const isDimmed = activeDayKey !== null && !isActiveDay;

                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            onPointerEnter={(e) => {
                              if (e.pointerType !== "touch") {
                                setHoveredDayKey(day.dateKey);
                                setTooltipAnchor({ dayKey: day.dateKey, idx });
                              }
                            }}
                            onFocus={() => {
                              setHoveredDayKey(day.dateKey);
                              setTooltipAnchor({ dayKey: day.dateKey, idx });
                            }}
                            onBlur={() =>
                              setHoveredDayKey((prev) => (prev === day.dateKey ? null : prev))
                            }
                            onClick={() => {
                              setTooltipAnchor({ dayKey: day.dateKey, idx });
                              setPinnedDayKey((prev) => (prev === day.dateKey ? null : day.dateKey));
                            }}
                            aria-label={`${formatActivityDateLabel(day.dateKey, day.isToday)}: ${day.count} of ${safeGoal} answered`}
                            className={`group relative flex h-full w-full flex-col items-center justify-end rounded-lg px-0.5 transition-opacity duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 cursor-pointer ${
                              isDimmed ? "opacity-55" : "opacity-100"
                            }`}
                          >
                            {/* Subtle Full-Height Column Track */}
                            <div
                              className={`relative flex h-full w-full max-w-[32px] sm:max-w-[36px] flex-col items-center justify-end rounded-t-lg transition-colors duration-150 ${
                                isActiveDay
                                  ? "bg-slate-800/65 light:bg-slate-200/80"
                                  : "bg-slate-800/25 light:bg-slate-100/85 group-hover:bg-slate-800/45 light:group-hover:bg-slate-200/65"
                              }`}
                            >
                              <span
                                className={`mb-1 text-[10.5px] sm:text-[11px] font-semibold tabular-nums leading-none transition-colors duration-150 ${
                                  isActiveDay
                                    ? "text-qb-heading"
                                    : day.count > 0
                                      ? "text-qb-mid"
                                      : "text-qb-muted"
                                }`}
                              >
                                {day.count}
                              </span>

                              <div
                                className={`w-full rounded-t-md transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                                  day.count === 0
                                    ? "bg-slate-600/45 light:bg-slate-300"
                                    : day.goalMet
                                      ? "bg-gradient-to-t from-emerald-500 to-emerald-400 light:from-emerald-600 light:to-emerald-500"
                                      : "bg-gradient-to-t from-amber-500 to-amber-400 light:from-amber-600 light:to-amber-400"
                                } ${
                                  isActiveDay
                                    ? day.goalMet
                                      ? "ring-2 ring-emerald-400/50 light:ring-emerald-600/40 brightness-110"
                                      : "ring-2 ring-amber-400/50 light:ring-amber-600/40 brightness-110"
                                    : ""
                                }`}
                                style={{
                                  height: !metersReady
                                    ? "0%"
                                    : day.count === 0
                                      ? "4px"
                                      : `${barPct}%`,
                                  transitionDelay: metersReady ? `${idx * 45}ms` : "0ms",
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Animated Gliding PolicyPulse Tooltip (tracks bar horizontally & vertically inside plot) */}
                    {tooltipDay && (() => {
                      const activeBarPct =
                        tooltipDay.count > 0
                          ? Math.min(
                              92,
                              Math.max(9, Math.round((tooltipDay.count / maxDayCount) * CHART_PLOT_MAX_PCT))
                            )
                          : 0;
                      const tooltipBottomPct =
                        tooltipDay.count === 0 ? 18 : Math.min(46, activeBarPct + 16);
                      const dayPct = Math.min(
                        100,
                        Math.round((tooltipDay.count / safeGoal) * 100)
                      );
                      const remainingToGoal = Math.max(0, safeGoal - tooltipDay.count);
                      const barTone =
                        tooltipDay.count === 0
                          ? "bg-slate-500/60 light:bg-slate-400"
                          : tooltipDay.goalMet
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400 light:from-emerald-600 light:to-emerald-500"
                            : "bg-gradient-to-r from-amber-500 to-amber-400 light:from-amber-600 light:to-amber-500";
                      const statusTone =
                        tooltipDay.count === 0
                          ? "text-qb-muted"
                          : tooltipDay.goalMet
                            ? "text-emerald-400 light:text-emerald-700"
                            : "text-amber-400 light:text-amber-700";

                      return (
                        <div
                          role="tooltip"
                          aria-hidden={!isTooltipOpen}
                          className={`pointer-events-none absolute left-0 right-0 z-30 transition-[bottom,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                            isTooltipOpen ? "opacity-100" : "opacity-0"
                          }`}
                          style={{ bottom: `${tooltipBottomPct}%` }}
                        >
                          <div
                            className="relative w-[184px] sm:w-[200px] rounded-xl border border-qb-border-hover bg-[#0c1426] light:bg-white px-3 py-2.5 text-left shadow-[0_18px_38px_rgba(0,0,0,0.6),0_0_0_1px_rgba(245,166,35,0.12)] light:border-slate-300 light:shadow-[0_14px_30px_rgba(15,23,42,0.14)] transition-[left,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                            style={{
                              left: `${tooltipEdgeAnchorPct}%`,
                              transform: isTooltipOpen
                                ? `translateX(-${tooltipEdgeAnchorPct}%) translateY(0) scale(1)`
                                : `translateX(-${tooltipEdgeAnchorPct}%) translateY(6px) scale(0.95)`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] leading-none">
                              <span className="font-bold text-qb-heading whitespace-nowrap">
                                {formatActivityDateLabel(tooltipDay.dateKey, tooltipDay.isToday)}
                              </span>
                              <span className={`font-semibold whitespace-nowrap ${statusTone}`}>
                                {tooltipDay.goalMet
                                  ? "Goal met"
                                  : tooltipDay.count > 0
                                    ? "Active"
                                    : "Idle"}
                              </span>
                            </div>

                            <div className="mt-1.5 flex items-baseline justify-between gap-2 tabular-nums">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base font-bold leading-none text-qb-heading">
                                  {tooltipDay.count}
                                </span>
                                <span className="text-[11px] text-qb-muted">
                                  / {safeGoal} items
                                </span>
                              </div>
                              <span className={`text-[11px] font-bold ${statusTone}`}>
                                {dayPct}%
                              </span>
                            </div>

                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800 light:bg-slate-200">
                              <div
                                className={`h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${barTone}`}
                                style={{ width: `${dayPct}%` }}
                              />
                            </div>

                            <p className="mt-1.5 text-[10.5px] leading-snug text-qb-muted tabular-nums">
                              {tooltipDay.goalMet
                                ? "Daily study target reached"
                                : tooltipDay.count > 0
                                  ? `${remainingToGoal} more to hit daily goal`
                                  : "No study items logged"}
                            </p>
                          </div>

                          {/* Sliding Caret Pointer aligned directly over active bar */}
                          <div
                            className="absolute -bottom-[5px] h-2.5 w-2.5 rotate-45 border-r border-b border-qb-border-hover bg-[#0c1426] light:border-slate-300 light:bg-white transition-[left,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                            style={{
                              left: `${tooltipCenterPct}%`,
                              transform: isTooltipOpen
                                ? "translateX(-50%) translateY(0) scale(1)"
                                : "translateX(-50%) translateY(6px) scale(0.8)",
                            }}
                            aria-hidden="true"
                          />
                        </div>
                      );
                    })()}
                  </div>

                  {/* X-Axis Day Labels */}
                  <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2.5">
                    {streakSummary.last7Days.map((day, idx) => {
                      const isActiveDay = activeDayKey === day.dateKey;
                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => {
                            setTooltipAnchor({ dayKey: day.dateKey, idx });
                            setPinnedDayKey((prev) => (prev === day.dateKey ? null : day.dateKey));
                          }}
                          className={`text-center text-[11px] leading-none transition-colors cursor-pointer ${
                            isActiveDay
                              ? "text-qb-heading font-bold"
                              : day.isToday
                                ? "text-qb-accent font-bold"
                                : "text-qb-muted font-medium hover:text-qb-heading"
                          }`}
                        >
                          {day.dayLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Clean PolicyPulse Telemetry Summary Footer */}
            <div className="grid grid-cols-3 divide-x divide-qb-border border-t border-qb-border pt-3 text-center sm:text-left">
              <div className="pr-2 sm:pr-4">
                <div className="text-[11px] font-medium text-qb-muted">7-Day Total</div>
                <div className="mt-0.5 text-sm font-bold text-qb-heading tabular-nums">
                  <CountUp end={streakSummary.weeklyTotal} duration={650} /> items
                </div>
              </div>
              <div className="px-2 sm:px-4">
                <div className="text-[11px] font-medium text-qb-muted">Daily Avg</div>
                <div className="mt-0.5 text-sm font-bold text-qb-heading tabular-nums">
                  {weeklyAvgLabel} / day
                </div>
              </div>
              <div className="pl-2 sm:pl-4">
                <div className="text-[11px] font-medium text-qb-muted">Goal Met</div>
                <div className="mt-0.5 text-sm font-bold text-qb-heading tabular-nums">
                  {daysMetCount} / 7 days
                </div>
              </div>
            </div>

            {streakSummary.weeklyTotal === 0 && (
              <p className="text-xs text-qb-muted leading-relaxed">
                Answer your first question or run a Quick Practice set to populate your 7-day activity log.
              </p>
            )}
          </section>
        </div>

        {/* Right Column (5/12): Practice & Mock Simulators + Recent Scores */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Practice & Official Simulators */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface overflow-hidden"
            aria-label="Practice and Mock Simulators"
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 sm:px-5 border-b border-qb-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Timer size={15} className="shrink-0 text-sky-400 light:text-sky-700" aria-hidden="true" />
                  <h2 className="text-sm sm:text-base font-bold text-qb-heading leading-tight">
                    Practice & Mocks
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] sm:text-xs text-qb-muted leading-snug">
                  Timed sprints & CSC mocks
                </p>
              </div>
              <button
                type="button"
                onClick={onGoMockExam}
                className="inline-flex items-center gap-1 text-xs font-semibold text-qb-accent hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>Mock Center</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-qb-border">
              <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 sm:px-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 light:bg-amber-50 light:text-amber-700">
                    <Zap size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] sm:text-sm font-semibold text-qb-heading leading-snug">
                      15-Item Quick Sprint
                    </div>
                    <div className="mt-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
                      15m · Mixed subjects
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onStartQuickPractice({
                      count: 15,
                      scope: masterySummary.unseen > 0 ? "unseen" : "all",
                      topic: "all",
                      timed: true,
                    })
                  }
                  className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer whitespace-nowrap"
                >
                  <span>Start</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 sm:px-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400 light:bg-sky-50 light:text-sky-700">
                    <Briefcase size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] sm:text-sm font-semibold text-qb-heading leading-snug">
                      Professional CSC Mock
                    </div>
                    <div className="mt-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
                      170 Qs · 3h 10m · 80% pass
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchOfficialMock("professional")}
                  className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg border border-qb-border bg-qb-input px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
                >
                  <span>Start</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 sm:px-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-400 light:bg-violet-50 light:text-violet-700">
                    <GraduationCap size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] sm:text-sm font-semibold text-qb-heading leading-snug">
                      Subprofessional CSC Mock
                    </div>
                    <div className="mt-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
                      165 Qs · 2h 40m · 80% pass
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchOfficialMock("subprofessional")}
                  className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg border border-qb-border bg-qb-input px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
                >
                  <span>Start</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* Recent Mock Exam Scores */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface overflow-hidden"
            aria-label="Recent Mock Exam Scores"
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 sm:px-5 border-b border-qb-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <History size={15} className="shrink-0 text-qb-muted" aria-hidden="true" />
                  <h2 className="text-sm sm:text-base font-bold text-qb-heading leading-tight">
                    Recent Mock Exams
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] sm:text-xs text-qb-muted leading-snug">
                  Latest attempts & scores
                </p>
              </div>
              <button
                type="button"
                onClick={onGoMockExam}
                className="inline-flex items-center gap-1 text-xs font-semibold text-qb-accent hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>View all</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            {recentAttempts.length > 0 ? (
              <div className="divide-y divide-qb-border">
                {recentAttempts.map((attempt) => {
                  const passed = attempt.scorePercent >= 80;
                  const completedDate = attempt.completedAt
                    ? new Date(attempt.completedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Recent";

                  return (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => onOpenAttempt(attempt.id)}
                      className="group w-full min-h-[58px] flex items-center justify-between gap-2.5 px-3.5 py-3 sm:px-5 text-left transition-colors hover:bg-qb-surface-hover active:bg-qb-surface-hover cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] sm:text-sm font-semibold text-qb-heading leading-snug">
                          {formatAttemptMode(attempt)}
                        </div>
                        <div className="mt-0.5 text-[11px] sm:text-xs text-qb-muted tabular-nums leading-snug">
                          {completedDate}
                          <span aria-hidden="true"> · </span>
                          {formatDurationShort(attempt.timeSpentMs)}
                          <span aria-hidden="true"> · </span>
                          {attempt.correctCount}/{attempt.totalCount}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-sm font-bold tabular-nums ${
                              passed
                                ? "text-emerald-400 light:text-emerald-700"
                                : "text-amber-400 light:text-amber-700"
                            }`}
                          >
                            {attempt.scorePercent}%
                          </div>
                          <div className="text-[11px] font-medium text-qb-muted">
                            {passed ? "Passing" : "Below 80%"}
                          </div>
                        </div>
                        <ChevronRight
                          size={15}
                          className="text-qb-muted transition-transform group-hover:translate-x-0.5 group-hover:text-qb-heading"
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 sm:p-6 text-center space-y-2.5">
                <Trophy size={22} className="mx-auto text-qb-muted" aria-hidden="true" />
                <p className="text-xs font-semibold text-qb-heading">
                  No completed mock exams recorded yet.
                </p>
                <p className="text-xs text-qb-muted max-w-xs mx-auto leading-relaxed">
                  Complete a Quick Practice or CSC Mock Exam to track score progression toward the 80% target.
                </p>
                <button
                  type="button"
                  onClick={onGoMockExam}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-qb-border bg-qb-input px-3.5 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer"
                >
                  <SlidersHorizontal size={13} className="text-qb-accent" aria-hidden="true" />
                  <span>Open Mock Exam Center</span>
                </button>
              </div>
            )}
          </section>

          {/* Recently Checked / Opened Questions */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface overflow-hidden"
            aria-label="Recently Checked Questions"
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-3.5 sm:px-5 border-b border-qb-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <History size={15} className="shrink-0 text-amber-400 light:text-amber-600" aria-hidden="true" />
                  <h2 className="text-sm sm:text-base font-bold text-qb-heading leading-tight">
                    Recently Checked
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] sm:text-xs text-qb-muted leading-snug">
                  Last opened &amp; answered items
                </p>
              </div>
              {recentOpenedItems.length > 0 && onClearRecentQuestions ? (
                <button
                  type="button"
                  onClick={onClearRecentQuestions}
                  className="text-xs font-semibold text-qb-muted hover:text-qb-heading cursor-pointer shrink-0 whitespace-nowrap transition-colors"
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenQuestionBank({ topic: "all", mastery: "all" })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-qb-accent hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Browse</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {recentOpenedItems.length > 0 ? (
              <div className="divide-y divide-qb-border">
                {recentOpenedItems.map((item) => {
                  const Icon = SUBJECT_ICONS[item.question.topic] || Layers;
                  const styles =
                    SUBJECT_ACCENT_STYLES[item.question.topic] || SUBJECT_ACCENT_STYLES.numerical;
                  const statusLabel =
                    item.result === "correct"
                      ? "Correct"
                      : item.result === "wrong"
                        ? "Missed"
                        : "Opened";
                  const statusTone =
                    item.result === "correct"
                      ? "text-emerald-400 light:text-emerald-700"
                      : item.result === "wrong"
                        ? "text-rose-400 light:text-rose-700"
                        : "text-qb-muted";

                  return (
                    <button
                      key={item.question.id}
                      type="button"
                      onClick={() => onSelectQuestion?.(item.question.id)}
                      className="group w-full min-h-[58px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 sm:px-5 text-left transition-colors hover:bg-qb-surface-hover active:bg-qb-surface-hover cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
                        >
                          <Icon size={14} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-qb-heading leading-snug line-clamp-1">
                            <MarkdownText text={item.question.question} inline />
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-qb-muted tabular-nums leading-snug truncate">
                            <span className="truncate">{item.topicLabel}</span>
                            {item.question.label && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{item.question.label}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0">{formatRecentRelativeTime(item.openedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${statusTone}`}>
                          {item.result === "correct" && (
                            <CheckCircle2 size={12} aria-hidden="true" />
                          )}
                          {item.result === "wrong" && (
                            <AlertCircle size={12} aria-hidden="true" />
                          )}
                          <span>{statusLabel}</span>
                        </span>
                        <ChevronRight
                          size={15}
                          className="text-qb-muted transition-transform group-hover:translate-x-0.5 group-hover:text-qb-heading"
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 sm:p-6 text-center space-y-2.5">
                <BookOpen size={20} className="mx-auto text-qb-muted" aria-hidden="true" />
                <p className="text-xs font-semibold text-qb-heading">
                  No recently opened questions yet.
                </p>
                <p className="text-xs text-qb-muted max-w-xs mx-auto leading-relaxed">
                  Open or check any item in the Question Bank to keep a quick jump list here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
