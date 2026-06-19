import { TOPICS } from "../constants/appConstants";

const topicMetaMap = new Map(TOPICS.map((topic) => [topic.id, topic]));

const toPercent = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const createTopicBucket = (topicId) => {
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

export const formatExamDuration = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${m}m`;
};

export const formatAttemptDate = (value) => {
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

export const buildQuestionLookup = (qMap, questionSnapshots = {}) => {
  const merged = new Map(qMap);
  Object.entries(questionSnapshots || {}).forEach(([id, question]) => {
    if (!merged.has(id) && question) merged.set(id, question);
  });
  return merged;
};

export const calculateExamMetrics = (exam, qMap, now = Date.now()) => {
  const questionLookup = buildQuestionLookup(qMap, exam?.questionSnapshots);
  const totalCount = Number.isFinite(exam?.totalCount) ? exam.totalCount : exam?.orderIds?.length || 0;
  const reviewMap = exam?.review || {};
  const answers = exam?.answers || {};
  const answeredCount = Object.keys(answers).length;
  const reviewCount = Object.keys(reviewMap).length;
  const explicitRemainingMs = Number.isFinite(exam?.timeLeftMs) ? exam.timeLeftMs : null;
  const remainingMs = explicitRemainingMs !== null
    ? Math.max(0, explicitRemainingMs)
    : Math.max(0, (exam?.startedAt || now) + (exam?.durationMs || 0) - now);

  let correctCount = 0;
  let wrongCount = 0;

  const topicBuckets = new Map();

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

export const buildMockExamAttempt = (exam, qMap, completedAt = Date.now()) => {
  const completedAtIso = new Date(completedAt).toISOString();
  const metrics = calculateExamMetrics(exam, qMap, completedAt);
  const questions = (exam?.orderIds || []).map((id, index) => {
    const question = metrics.questionLookup.get(id);
    const userAnswer = exam?.answers?.[id];

    return {
      index,
      id,
      topic: question?.topic || "other",
      question: question?.question || "",
      choices: Array.isArray(question?.choices) ? question.choices : [],
      correct: Number.isInteger(question?.correct) ? question.correct : null,
      solution: question?.solution || "",
      solutionDraw: question?.solutionDraw || null,
      userAnswer: userAnswer ?? null,
      isCorrect: userAnswer !== undefined && userAnswer === question?.correct,
      wasAnswered: userAnswer !== undefined,
    };
  });

  return {
    id: exam?.sessionId || `attempt-${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: exam?.sessionId || null,
    mode: exam?.mode || "professional",
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
    questions,
  };
};

export const buildReviewExamFromAttempt = (attempt, startQuestionId = null) => {
  const orderIds = (attempt?.questions || []).map((question) => question.id);
  const answers = {};
  const questionSnapshots = {};

  (attempt?.questions || []).forEach((question) => {
    if (question?.userAnswer !== null && question?.userAnswer !== undefined) {
      answers[question.id] = question.userAnswer;
    }

    questionSnapshots[question.id] = {
      id: question.id,
      topic: question.topic,
      question: question.question,
      choices: question.choices,
      correct: question.correct,
      solution: question.solution,
      solutionDraw: question.solutionDraw,
    };
  });

  const startIndex = startQuestionId ? Math.max(0, orderIds.indexOf(startQuestionId)) : 0;

  return {
    mode: attempt?.mode || "professional",
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
