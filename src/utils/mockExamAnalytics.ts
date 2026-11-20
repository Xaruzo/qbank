import { TOPICS } from "../constants/appConstants";

const topicMetaMap = new Map<string, any>(TOPICS.map((topic) => [topic.id, topic]));

const toPercent = (value: number, total: number) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const createTopicBucket = (topicId: string) => {
  const topic = topicMetaMap.get(topicId) || {
    id: topicId || "other",
    label: "Other",
    color: "#94a3b8",
  };

  return {
    topicId: topic.id,
    label: topic.label,
    color: topic.color,
    total: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    unanswered: 0,
    accuracy: 0,
  };
};

export const formatExamDuration = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${m}m`;
};

export const formatAttemptDate = (value: any) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const buildQuestionLookup = (qMap: Map<string, any>, questionSnapshots: Record<string, any> = {}) => {
  const merged = new Map(qMap);
  Object.entries(questionSnapshots || {}).forEach(([id, question]) => {
    if (!merged.has(id) && question) merged.set(id, question);
  });
  return merged;
};

export const calculateExamMetrics = (exam: any, qMap: Map<string, any>, now = Date.now()) => {
  const questionLookup = buildQuestionLookup(qMap, exam?.questionSnapshots);
  const totalCount = Number.isFinite(exam?.totalCount) ? exam.totalCount : exam?.orderIds?.length || 0;
  const reviewMap = exam?.review || {};
  const answers = exam?.answers || {};
  const answeredCount = Object.keys(answers).length;
  const reviewCount = Object.keys(reviewMap).length;
  const isTimed = exam?.timed !== false;
  const explicitRemainingMs = Number.isFinite(exam?.timeLeftMs) ? exam.timeLeftMs : null;
  const remainingMs = !isTimed
    ? 0
    : explicitRemainingMs !== null
      ? Math.max(0, explicitRemainingMs)
      : Math.max(0, (exam?.startedAt || now) + (exam?.durationMs || 0) - now);

  let correctCount = 0;
  let wrongCount = 0;

  const topicBuckets = new Map<string, ReturnType<typeof createTopicBucket>>();

  for (const id of exam?.orderIds || []) {
    const question = questionLookup.get(id);
    const topicId = question?.topic || "other";
    if (!topicBuckets.has(topicId)) topicBuckets.set(topicId, createTopicBucket(topicId));

    const bucket = topicBuckets.get(topicId);
    bucket.total += 1;

    const userAnswer = answers[id];
    if (userAnswer === undefined) {
      bucket.unanswered += 1;
      continue;
    }

    bucket.answered += 1;
    if (userAnswer === question?.correct) {
      correctCount += 1;
      bucket.correct += 1;
    } else {
      wrongCount += 1;
      bucket.wrong += 1;
    }
  }

  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const scorePercent = toPercent(correctCount, totalCount);
  const explicitTimeSpentMs = Number.isFinite(exam?.timeSpentMs) ? exam.timeSpentMs : null;
  const timeSpentMs = explicitTimeSpentMs !== null
    ? Math.max(0, explicitTimeSpentMs)
    : !isTimed
      ? Math.max(0, now - (exam?.startedAt || now))
      : Math.max(0, (exam?.durationMs || 0) - remainingMs);
  const topicStats = Array.from(topicBuckets.values())
    .map((bucket) => ({
      ...bucket,
      accuracy: toPercent(bucket.correct, bucket.total),
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct || a.label.localeCompare(b.label));

  const strongestTopic = topicStats[0] || null;
  const weakestTopic = topicStats.length > 1 ? topicStats[topicStats.length - 1] : topicStats[0] || null;

  return {
    totalCount,
    answeredCount,
    reviewCount,
    correctCount,
    wrongCount,
    unansweredCount,
    scorePercent,
    remainingMs,
    timeSpentMs,
    topicStats,
    strongestTopic,
    weakestTopic,
    questionLookup,
  };
};

export const buildMockExamAttempt = (exam: any, qMap: Map<string, any>, completedAt = Date.now()) => {
  const completedAtIso = new Date(completedAt).toISOString();
  const metrics = calculateExamMetrics(exam, qMap, completedAt);
  const questions = (exam?.orderIds || []).map((id, index) => {
    const question = metrics.questionLookup.get(id);
    const userAnswer = exam?.answers?.[id];

    return {
      index,
      id,
      topic: question?.topic || "other",
      correct: Number.isInteger(question?.correct) ? question.correct : null,
      userAnswer: userAnswer ?? null,
      isCorrect: userAnswer !== undefined && userAnswer === question?.correct,
      wasAnswered: userAnswer !== undefined,
    };
  });

  return {
    id: exam?.sessionId || `attempt-${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: exam?.sessionId || null,
    mode: exam?.mode || "professional",
    ...(exam?.title ? { title: exam.title } : {}),
    timed: exam?.timed !== false,
    startedAt: exam?.startedAt || completedAt,
    completedAt: completedAtIso,
    durationMs: exam?.durationMs || 0,
    timeSpentMs: metrics.timeSpentMs,
    timeLeftMs: metrics.remainingMs,
    totalCount: metrics.totalCount,
    answeredCount: metrics.answeredCount,
    reviewCount: metrics.reviewCount,
    correctCount: metrics.correctCount,
    wrongCount: metrics.wrongCount,
    unansweredCount: metrics.unansweredCount,
    scorePercent: metrics.scorePercent,
    topicStats: metrics.topicStats,
    strongestTopic: metrics.strongestTopic,
    weakestTopic: metrics.weakestTopic,
    ...(exam?.miniMockId ? { miniMockId: exam.miniMockId } : {}),
    ...(exam?.mode === "mini-mock" && exam?.questionSnapshots
      ? { questionSnapshots: exam.questionSnapshots }
      : {}),
    questions,
  };
};

export const buildReviewExamFromAttempt = (attempt: any, qMap: Map<string, any>, startQuestionId: string | null = null) => {
  const orderIds = (attempt?.questions || []).map((question) => question.id);
  const answers = {};
  const questionSnapshots = {};
  const questionLookup = buildQuestionLookup(qMap, attempt?.questionSnapshots);

  (attempt?.questions || []).forEach((question) => {
    if (question?.userAnswer !== null && question?.userAnswer !== undefined) {
      answers[question.id] = question.userAnswer;
    }

    const liveQuestion = questionLookup.get(question.id);
    questionSnapshots[question.id] = {
      id: question.id,
      topic: liveQuestion?.topic || question.topic || "other",
      question: liveQuestion?.question || "Question text unavailable",
      choices: Array.isArray(liveQuestion?.choices) ? liveQuestion.choices : [],
      correct: Number.isInteger(liveQuestion?.correct) ? liveQuestion.correct : question.correct,
      solution: liveQuestion?.solution || "",
      solutionDraw: liveQuestion?.solutionDraw || null,
    };
  });

  const startIndex = startQuestionId ? Math.max(0, orderIds.indexOf(startQuestionId)) : 0;

  return {
    mode: attempt?.mode || "professional",
    ...(attempt?.title ? { title: attempt.title } : {}),
    timed: attempt?.timed !== false,
    sessionId: `review-${attempt?.id || Date.now()}`,
    startedAt: attempt?.startedAt || Date.now(),
    durationMs: attempt?.durationMs || 0,
    totalCount: attempt?.totalCount || orderIds.length,
    orderIds,
    answers,
    review: {},
    currentIndex: startIndex,
    finished: true,
    isReviewSession: true,
    archivedAttemptId: attempt?.id || null,
    timeSpentMs: attempt?.timeSpentMs || 0,
    timeLeftMs: attempt?.timeLeftMs || 0,
    questionSnapshots,
  };
};

export const buildMistakeDrillExam = (attempt: any, qMap: Map<string, any>) => {
  const questionLookup = buildQuestionLookup(qMap, attempt?.questionSnapshots);
  const missedQuestions = (attempt?.questions || []).filter((q) => !q.isCorrect);
  const orderIds = missedQuestions
    .map((q) => q.id)
    .filter((id) => questionLookup.has(id));

  const questionSnapshots: Record<string, any> = {};
  if (attempt?.questionSnapshots) {
    orderIds.forEach((id) => {
      if (attempt.questionSnapshots[id]) {
        questionSnapshots[id] = attempt.questionSnapshots[id];
      }
    });
  }

  const totalItems = orderIds.length;
  // 60s per question, minimum 3 minutes
  const durationMs = Math.max(3 * 60 * 1000, totalItems * 60 * 1000);

  return {
    sessionId: `drill-${Date.now()}`,
    mode: "drill",
    drillSourceAttemptId: attempt?.id || null,
    title: `Mistake Drill • ${totalItems} Items`,
    startedAt: Date.now(),
    durationMs,
    totalCount: totalItems,
    targetCount: totalItems,
    orderIds,
    answers: {},
    review: {},
    currentIndex: 0,
    finished: false,
    isReviewSession: false,
    historySaved: false,
    ...(Object.keys(questionSnapshots).length > 0 ? { questionSnapshots } : {}),
  };
};

export const buildMiniMockExamSession = ({
  miniMockId = null,
  title,
  questions = [],
  timed = true,
  durationMinutes = 10,
  shuffle = false,
}: {
  miniMockId?: string | null;
  title: string;
  questions: Array<{
    id: string;
    topic: string;
    label?: string;
    question: string;
    choices: string[];
    correct: number;
    solution?: string;
  }>;
  timed?: boolean;
  durationMinutes?: number;
  shuffle?: boolean;
}) => {
  const validQuestions = (questions || []).filter(
    (q) => q && typeof q.question === "string" && Array.isArray(q.choices) && q.choices.length >= 2
  );
  const questionSnapshots: Record<string, any> = {};
  const ids: string[] = [];

  validQuestions.forEach((q, idx) => {
    const safeId = q.id || `mmq_${Date.now()}_${idx}`;
    ids.push(safeId);
    questionSnapshots[safeId] = {
      id: safeId,
      topic: q.topic || "numerical",
      label: q.label || "",
      question: q.question,
      choices: q.choices,
      correct: typeof q.correct === "number" ? q.correct : 0,
      solution: q.solution || "",
    };
  });

  if (shuffle) {
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
    }
  }

  const totalItems = ids.length;
  const safeMinutes = Math.max(1, Number(durationMinutes) || Math.max(1, totalItems));
  const durationMs = timed ? safeMinutes * 60 * 1000 : 0;

  return {
    sessionId: `minimock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    mode: "mini-mock" as const,
    miniMockId: miniMockId || null,
    returnView: "my-questions" as const,
    timed,
    title: title || `Mini Mock • ${totalItems} Items`,
    startedAt: Date.now(),
    durationMs,
    totalCount: totalItems,
    targetCount: totalItems,
    orderIds: ids,
    answers: {},
    review: {},
    currentIndex: 0,
    finished: false,
    isReviewSession: false,
    historySaved: false,
    questionSnapshots,
  };
};

export const getAttemptModeLabel = (mode?: string) => {
  if (mode === "subprofessional") return "Subprofessional";
  if (mode === "drill") return "Mistake Drill";
  if (mode === "quick") return "Quick Practice";
  if (mode === "mini-mock") return "Mini Mock";
  return "Professional";
};

export const buildQuickPracticeExam = ({
  questions = [],
  masteryMap = {},
  scope = "all",
  topic = "all",
  count = 10,
  timed = true,
}: {
  questions: any[];
  masteryMap?: Record<string, any>;
  scope?: "all" | "unseen" | "missed";
  topic?: string;
  count?: number;
  timed?: boolean;
}) => {
  const candidates = (questions || []).filter((q) => {
    if (topic !== "all" && q?.topic !== topic) return false;
    const record = masteryMap?.[q?.id];
    if (scope === "unseen") return !record || !record.attempts;
    if (scope === "missed") return record?.lastResult === "wrong";
    return true;
  });

  const ids = candidates.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }

  const targetCount = Math.max(1, count || 10);
  const orderIds = ids.slice(0, targetCount);
  const totalItems = orderIds.length;
  const durationMs = timed ? Math.max(60 * 1000, totalItems * 60 * 1000) : 0;

  return {
    sessionId: `quick-${Date.now()}`,
    mode: "quick" as const,
    timed,
    title: `Quick Practice • ${totalItems} Items`,
    startedAt: Date.now(),
    durationMs,
    totalCount: totalItems,
    targetCount,
    orderIds,
    answers: {},
    review: {},
    currentIndex: 0,
    finished: false,
    isReviewSession: false,
    historySaved: false,
  };
};

export const calculatePacingStats = (timeSpentMs: number, totalCount: number, mode = "professional") => {
  const safeTotal = Math.max(1, totalCount || 1);
  const safeTimeMs = Math.max(0, timeSpentMs || 0);
  const secondsPerItem = Math.round(safeTimeMs / safeTotal / 1000);

  // CSC targets: Pro is 190 min / 170 items ~ 67s/item. Subpro is 160 min / 165 items ~ 58s/item.
  const targetSeconds = mode === "subprofessional" ? 58 : 67;

  let assessment = "Optimal Pace";
  let status = "good";
  if (secondsPerItem < 40) {
    assessment = "Rapid Pace";
    status = "fast";
  } else if (secondsPerItem > targetSeconds + 15) {
    assessment = "Time-Pressured";
    status = "slow";
  }

  return {
    secondsPerItem,
    targetSeconds,
    assessment,
    status,
    formattedPace: `${secondsPerItem}s / item`,
  };
};
