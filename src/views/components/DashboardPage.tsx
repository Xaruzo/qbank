import { useMemo } from "react";
import {
  LayoutDashboard,
  Flame,
  Target,
  Calendar,
  CheckCircle2,
  AlertTriangle,
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
} from "lucide-react";
import CountUp from "./CountUp";
import {
  getMasterySummary,
  getStudyStreakSummary,
  getSubjectMasteryBreakdown,
  type SubjectMasteryRow,
} from "../../models/masteryModel";
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
  onOpenQuestionBank: (opts?: { topic?: TopicId | "all"; mastery?: "all" | "unseen" | "missed" | "mastered" }) => void;
  onGoMockExam: () => void;
  onOpenSettings: (tab?: string) => void;
  onRequireAuth: () => void;
}

const SUBJECT_ICONS: Record<string, typeof Calculator> = {
  numerical: Calculator,
  verbal: BookOpen,
  general: Globe,
  analytical: BrainCircuit,
  clerical: ClipboardList,
};

const SUBJECT_ACCENT_STYLES: Record<string, { iconBox: string; bar: string }> = {
  numerical: {
    iconBox:
      "border-amber-500/30 bg-amber-500/12 text-amber-400 light:border-amber-600/25 light:bg-amber-50 light:text-amber-700",
    bar: "bg-amber-400 light:bg-amber-600",
  },
  verbal: {
    iconBox:
      "border-sky-400/30 bg-sky-400/12 text-sky-400 light:border-sky-600/25 light:bg-sky-50 light:text-sky-700",
    bar: "bg-sky-400 light:bg-sky-600",
  },
  general: {
    iconBox:
      "border-violet-400/30 bg-violet-400/12 text-violet-400 light:border-violet-600/25 light:bg-violet-50 light:text-violet-700",
    bar: "bg-violet-400 light:bg-violet-600",
  },
  analytical: {
    iconBox:
      "border-emerald-400/30 bg-emerald-400/12 text-emerald-400 light:border-emerald-600/25 light:bg-emerald-50 light:text-emerald-700",
    bar: "bg-emerald-400 light:bg-emerald-600",
  },
  clerical: {
    iconBox:
      "border-rose-400/30 bg-rose-400/12 text-rose-400 light:border-rose-600/25 light:bg-rose-50 light:text-rose-700",
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
  if (!iso) return "Not scheduled";
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  onGoMockExam,
  onOpenSettings,
  onRequireAuth,
}: DashboardPageProps) {
  const safeGoal = Math.max(1, Number(dailyStudyGoal) || 25);
  const masterySummary = useMemo(
    () => getMasterySummary(questions, masteryMap),
    [questions, masteryMap]
  );
  const streakSummary = useMemo(
    () => getStudyStreakSummary(userId, safeGoal),
    // todayAnsweredCount ensures recomputation immediately after answering an item
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

  return (
    <div className="fu space-y-5">
      {/* Structured Workspace Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-qb-border">
        <div className="flex items-start gap-3.5 min-w-0">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/12 text-amber-400 light:border-amber-600/30 light:bg-amber-500/10 light:text-amber-700 mt-0.5">
            <LayoutDashboard size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
              <span>Study Dashboard</span>
              <span className="text-qb-muted" aria-hidden="true">·</span>
              <span className="text-qb-muted">{trackLabel}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-[26px] font-extrabold tracking-tight text-qb-heading text-balance leading-tight">
              {firstName ? `Welcome back, ${firstName}` : "CSE Readiness Overview"}
            </h1>
            <p className="mt-1 text-sm text-qb-mid leading-relaxed tabular-nums">
              {todayCount} of {safeGoal} daily items answered
              <span aria-hidden="true"> · </span>
              {streakSummary.currentStreak}d active streak
              <span aria-hidden="true"> · </span>
              {daysUntilExam !== null && daysUntilExam >= 0
                ? daysUntilExam === 0
                  ? "Exam Day today"
                  : `${daysUntilExam}d until exam`
                : "80% CSC passing target"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer whitespace-nowrap"
          >
            {hasResumableMock ? (
              <>
                <PlayCircle size={16} aria-hidden="true" />
                <span>Resume Active Mock</span>
              </>
            ) : masterySummary.missed > 0 ? (
              <>
                <Zap size={16} aria-hidden="true" />
                <span className="tabular-nums">Drill {masterySummary.missed} Missed</span>
              </>
            ) : (
              <>
                <PlayCircle size={16} aria-hidden="true" />
                <span>Start Quick Practice</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenQuestionBank({ topic: "all", mastery: "all" })}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-surface px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-qb-heading transition-colors hover:border-qb-border-hover hover:bg-qb-surface-hover cursor-pointer whitespace-nowrap"
          >
            <Layers size={15} className="text-qb-accent" aria-hidden="true" />
            <span>Open Question Bank</span>
          </button>
        </div>
      </header>

      {/* 4-Column Bento Telemetry Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5" aria-label="Study Metrics">
        {/* Card 1: Daily Study Goal */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
              Daily Study Goal
            </span>
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${
                goalMet
                  ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-400 light:border-emerald-600/30 light:bg-emerald-50 light:text-emerald-700"
                  : "border-amber-500/30 bg-amber-500/12 text-amber-400 light:border-amber-600/25 light:bg-amber-50 light:text-amber-700"
              }`}
            >
              <Target size={14} aria-hidden="true" />
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                  <CountUp end={todayCount} duration={700} />
                </span>
                <span className="text-xs font-semibold text-qb-muted tabular-nums">
                  / {safeGoal} items
                </span>
              </div>
              <span
                className={`text-xs font-bold tabular-nums ${
                  goalMet ? "text-emerald-400 light:text-emerald-700" : "text-qb-accent"
                }`}
              >
                {dailyPct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  goalMet ? "bg-emerald-400 light:bg-emerald-600" : "bg-amber-400 light:bg-amber-600"
                }`}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-qb-muted">
              <span>{goalMet ? "Daily target met" : `${dailyRemaining} left today`}</span>
              <button
                type="button"
                onClick={() => onOpenSettings("exam")}
                className="font-semibold text-qb-accent hover:underline cursor-pointer"
              >
                Adjust
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Study Streak */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
              Study Streak
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/12 text-amber-400 light:border-amber-600/25 light:bg-amber-50 light:text-amber-700">
              <Flame size={14} aria-hidden="true" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                <CountUp end={streakSummary.currentStreak} duration={700} />
              </span>
              <span className="text-xs font-semibold text-qb-muted">
                {streakSummary.currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="mt-2 text-xs font-medium text-qb-muted tabular-nums">
              Best streak: {streakSummary.bestStreak}d
              <span aria-hidden="true"> · </span>
              {streakSummary.totalDaysActive} active {streakSummary.totalDaysActive === 1 ? "day" : "days"}
            </div>
          </div>
        </div>

        {/* Card 3: Exam Countdown */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
              Exam Countdown
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/12 text-sky-400 light:border-sky-600/25 light:bg-sky-50 light:text-sky-700">
              <Calendar size={14} aria-hidden="true" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
              {daysUntilExam !== null
                ? daysUntilExam === 0
                  ? "Today"
                  : daysUntilExam > 0
                    ? `${daysUntilExam}d`
                    : "Passed"
                : "Unset"}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-qb-muted">
              <span className="truncate tabular-nums">{formatTargetDate(targetExamDate)}</span>
              <button
                type="button"
                onClick={() => onOpenSettings("exam")}
                className="font-semibold text-qb-accent hover:underline cursor-pointer shrink-0"
              >
                Edit date
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Overall Bank Mastery */}
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
              Bank Mastery
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/12 text-emerald-400 light:border-emerald-600/25 light:bg-emerald-50 light:text-emerald-700">
              <CheckCircle2 size={14} aria-hidden="true" />
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[28px] font-extrabold leading-none text-qb-heading tabular-nums">
                  {bankMasteryPct}%
                </span>
                <span className="text-xs font-semibold text-qb-muted tabular-nums">
                  ({masterySummary.mastered}/{questions.length})
                </span>
              </div>
              {masterySummary.missed > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenQuestionBank({ topic: "all", mastery: "missed" })}
                  className="text-xs font-semibold text-rose-400 light:text-rose-700 hover:underline cursor-pointer tabular-nums"
                >
                  {masterySummary.missed} missed
                </button>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200" aria-hidden="true">
              <div
                className="h-full rounded-full bg-emerald-400 light:bg-emerald-600 transition-all duration-300"
                style={{ width: `${bankMasteryPct}%` }}
              />
            </div>
            <div className="text-xs text-qb-muted tabular-nums">
              {masterySummary.attempted} attempted
              <span aria-hidden="true"> · </span>
              {masterySummary.unseen} unseen
            </div>
          </div>
        </div>
      </section>

      {/* Main 12-Column Tracking Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Column: Subject Mastery, Weak-Area Alerts & 7-Day Rhythm */}
        <div className="xl:col-span-7 space-y-4">
          {/* Subject Mastery & Weak-Area Alerts */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-4"
            aria-label="Subject Mastery and Weak Areas"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                  Subject Mastery
                </div>
                <h2 className="mt-0.5 text-base font-bold text-qb-heading">
                  CSE Topic Coverage & Weak-Area Alerts
                </h2>
              </div>
              <span className="text-xs font-medium text-qb-muted tabular-nums">
                5 subjects · 80% passing benchmark
              </span>
            </div>

            {primaryWeakArea ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-400/35 bg-rose-500/10 light:border-rose-600/25 light:bg-rose-50 px-4 py-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0 text-rose-400 light:text-rose-700"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-qb-heading">
                      Weak Area Detected: {primaryWeakArea.label}
                    </div>
                    <p className="mt-0.5 text-xs text-qb-mid tabular-nums">
                      {primaryWeakArea.missed > 0
                        ? `${primaryWeakArea.missed} missed ${primaryWeakArea.missed === 1 ? "item" : "items"}`
                        : "Accuracy below 80% benchmark"}
                      {primaryWeakArea.accuracyPercent !== null && (
                        <>
                          <span aria-hidden="true"> · </span>
                          {primaryWeakArea.accuracyPercent}% accuracy
                        </>
                      )}
                      {weakAreas.length > 1 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          +{weakAreas.length - 1} other {weakAreas.length - 1 === 1 ? "subject" : "subjects"} flagged
                        </>
                      )}
                    </p>
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
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-400 cursor-pointer whitespace-nowrap"
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
                    className="inline-flex items-center gap-1 rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-qb-border-hover cursor-pointer whitespace-nowrap"
                  >
                    <span>Review</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-qb-border bg-qb-input px-4 py-3">
                <div className="text-xs text-qb-mid">
                  {masterySummary.attempted === 0
                    ? "Start answering items across any of the 5 CSC topics to surface weak-area diagnostics."
                    : "No weak-area alerts right now — all attempted subjects are at or above the 80% target."}
                </div>
              </div>
            )}

            <div className="divide-y divide-qb-border rounded-xl border border-qb-border bg-qb-input">
              {subjects.map((subject) => {
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
                  <div
                    key={subject.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${styles.iconBox}`}
                      >
                        <Icon size={15} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-qb-heading truncate">
                              {subject.label}
                            </span>
                            {subject.needsAttention && (
                              <span className="text-[11px] font-semibold text-rose-400 light:text-rose-700 shrink-0">
                                · Needs review
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-bold tabular-nums shrink-0 ${accuracyTone}`}>
                            {subject.accuracyPercent !== null
                              ? `${subject.accuracyPercent}% acc`
                              : "Unstarted"}
                          </span>
                        </div>

                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
                          aria-hidden="true"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
                            style={{ width: `${subject.masteryPercent}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-qb-muted tabular-nums">
                          <span>
                            {subject.mastered}/{subject.total} mastered
                          </span>
                          {subject.missed > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-rose-400 light:text-rose-700 font-semibold">
                                {subject.missed} missed
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{subject.unseen} unseen</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenQuestionBank({
                            topic: subject.id,
                            mastery: subject.missed > 0 ? "missed" : "all",
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer whitespace-nowrap"
                      >
                        <span>{subject.missed > 0 ? "Fix Missed" : "Browse"}</span>
                        <ChevronRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 7-Day Study Activity Rhythm */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-4"
            aria-label="7-Day Study Rhythm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                  Consistency Log
                </div>
                <h2 className="mt-0.5 text-base font-bold text-qb-heading">
                  7-Day Study Activity
                </h2>
              </div>
              <div className="text-xs font-medium text-qb-muted tabular-nums">
                {streakSummary.weeklyTotal} answered this week
                <span aria-hidden="true"> · </span>
                Goal: {safeGoal}/day
              </div>
            </div>

            <div className="rounded-xl border border-qb-border bg-qb-input px-3.5 pt-4 pb-3">
              <div className="grid grid-cols-7 gap-2 items-end h-32">
                {streakSummary.last7Days.map((day) => {
                  const heightPct =
                    day.count > 0 ? Math.max(12, Math.round((day.count / maxDayCount) * 100)) : 6;
                  return (
                    <div
                      key={day.dateKey}
                      className="flex flex-col items-center justify-end gap-1.5 h-full"
                      title={`${day.dateKey}: ${day.count} answered`}
                    >
                      <span className="text-[11px] font-semibold text-qb-mid tabular-nums">
                        {day.count > 0 ? day.count : "0"}
                      </span>
                      <div className="w-full max-w-[34px] flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            day.count === 0
                              ? "bg-slate-700/40 light:bg-slate-200"
                              : day.goalMet
                                ? "bg-emerald-400 light:bg-emerald-600"
                                : "bg-amber-400 light:bg-amber-500"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          day.isToday ? "text-qb-accent font-bold" : "text-qb-muted"
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {streakSummary.weeklyTotal === 0 && (
              <p className="text-xs text-qb-muted">
                Answer your first question or run a Quick Practice set to populate your daily study streak and 7-day log.
              </p>
            )}
          </section>
        </div>

        {/* Right Column: Resume Mock / Quick Launch & Recent Mock Exam Scores */}
        <div className="xl:col-span-5 space-y-4">
          {/* Resume Active Mock or Official Exam Quick Launch */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-3.5"
            aria-label="Mock Exam Continuity"
          >
            {hasResumableMock ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-400 light:text-amber-700">
                      Session In Progress
                    </div>
                    <h2 className="mt-0.5 text-base font-bold text-qb-heading">
                      {activeExam.title ||
                        (activeExam.mode === "subprofessional"
                          ? "Subprofessional Mock Exam"
                          : activeExam.mode === "professional"
                            ? "Professional Mock Exam"
                            : activeExam.mode === "drill"
                              ? "Mistake Drill Session"
                              : "Quick Practice Session")}
                    </h2>
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/35 bg-amber-500/12 text-amber-400 light:text-amber-700">
                    <Timer size={16} aria-hidden="true" />
                  </span>
                </div>

                <div className="rounded-xl border border-qb-border bg-qb-input p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-qb-heading tabular-nums">
                      {activeAnsweredCount} of {activeTotalCount} answered ({activeProgressPct}%)
                    </span>
                    {activeTimeLeftLabel && (
                      <span className="text-qb-muted tabular-nums">{activeTimeLeftLabel}</span>
                    )}
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-amber-400 light:bg-amber-600 transition-all duration-300"
                      style={{ width: `${activeProgressPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onResumeActiveExam}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer whitespace-nowrap"
                  >
                    <PlayCircle size={15} aria-hidden="true" />
                    <span>Resume Session</span>
                  </button>
                  <button
                    type="button"
                    onClick={onGoMockExam}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5 text-xs font-semibold text-qb-heading transition-colors hover:border-qb-border-hover cursor-pointer whitespace-nowrap"
                  >
                    <span>Mock Center</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                      Exam Simulation
                    </div>
                    <h2 className="mt-0.5 text-base font-bold text-qb-heading">
                      Launch Practice or Mock Exam
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onGoMockExam}
                    className="inline-flex items-center gap-1 text-xs font-bold text-qb-accent hover:underline cursor-pointer shrink-0"
                  >
                    <span>Mock Center</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                </div>

                <div className="divide-y divide-qb-border rounded-xl border border-qb-border bg-qb-input">
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-qb-heading">15-Item Quick Sprint</div>
                      <div className="mt-0.5 text-xs text-qb-muted tabular-nums">
                        15 min · Mixed CSE subjects
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
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer"
                    >
                      <span>Start</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-qb-heading">Professional CSC Mock</div>
                      <div className="mt-0.5 text-xs text-qb-muted tabular-nums">
                        170 items · 3h 10m · 80% pass
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchOfficialMock("professional")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-bold text-qb-heading transition-colors hover:border-amber-500/45 cursor-pointer"
                    >
                      <span>Start</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-qb-heading">Subprofessional CSC Mock</div>
                      <div className="mt-0.5 text-xs text-qb-muted tabular-nums">
                        165 items · 2h 40m · 80% pass
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchOfficialMock("subprofessional")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-bold text-qb-heading transition-colors hover:border-amber-500/45 cursor-pointer"
                    >
                      <span>Start</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Recent Mock Exam Scores */}
          <section
            className="rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-3.5"
            aria-label="Recent Mock Exam Scores"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                  Score History
                </div>
                <h2 className="mt-0.5 text-base font-bold text-qb-heading">
                  Recent Mock Exams
                </h2>
              </div>
              <button
                type="button"
                onClick={onGoMockExam}
                className="inline-flex items-center gap-1 text-xs font-bold text-qb-accent hover:underline cursor-pointer shrink-0"
              >
                <span>View All</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            {recentAttempts.length > 0 ? (
              <div className="divide-y divide-qb-border rounded-xl border border-qb-border bg-qb-input">
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
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-qb-surface-hover cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-qb-heading truncate">
                          {formatAttemptMode(attempt)}
                        </div>
                        <div className="mt-0.5 text-xs text-qb-muted tabular-nums">
                          {completedDate}
                          <span aria-hidden="true"> · </span>
                          {formatDurationShort(attempt.timeSpentMs)}
                          <span aria-hidden="true"> · </span>
                          {attempt.correctCount}/{attempt.totalCount} correct
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-sm font-extrabold tabular-nums ${
                              passed
                                ? "text-emerald-400 light:text-emerald-700"
                                : "text-amber-400 light:text-amber-700"
                            }`}
                          >
                            {attempt.scorePercent}%
                          </div>
                          <div className="text-[10.5px] font-semibold text-qb-muted">
                            {passed ? "Passing" : "Below 80%"}
                          </div>
                        </div>
                        <ChevronRight size={15} className="text-qb-muted" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-qb-border bg-qb-input p-5 text-center space-y-2.5">
                <p className="text-xs font-medium text-qb-mid">
                  No completed mock exams recorded yet.
                </p>
                <p className="text-xs text-qb-muted">
                  Complete a Quick Practice or CSC Mock Exam to track score progression toward the 80% passing bar.
                </p>
                <button
                  type="button"
                  onClick={onGoMockExam}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-semibold text-qb-heading transition-colors hover:border-amber-500/45 cursor-pointer"
                >
                  <SlidersHorizontal size={13} className="text-qb-accent" aria-hidden="true" />
                  <span>Open Mock Exam Center</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
