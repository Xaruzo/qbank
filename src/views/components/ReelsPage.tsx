import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  ChevronUp,
  ChevronDown,
  Plus,
  Radio,
  Clapperboard,
  CheckCircle2,
  XCircle,
  Send,
  Bell,
  BellRing,
  ExternalLink,
  Search,
  X,
  Sparkles,
  Trash2,
  ArrowRight,
  Target,
  Clock,
  Upload,
  Link2,
  Layers,
  Check,
  Calendar,
} from "lucide-react";
import { TOPICS, LETTERS } from "../../constants/appConstants";
import {
  studyReelsModel,
  type StudyReel,
  type ReelComment,
  type ReelKind,
  type ReelSourceType,
  type LiveStatus,
} from "../../models/studyReelsModel";
import {
  parseVideoSource,
  formatReelDuration,
  formatLiveSchedule,
  filterStudyReels,
} from "../../utils/reelMedia";
import CustomSelect from "./CustomSelect";
import MarkdownText from "./MarkdownText";
import type { Question, TopicId } from "../../types";

interface ReelsPageProps {
  questions?: Question[];
  currentUser?: { id?: string; email?: string; full_name?: string } | null;
  userRole?: string;
  isAdmin?: boolean;
  initialReelId?: string | null;
  liteMode?: boolean;
  onOpenQuestion?: (questionId: string) => void;
  onPracticeTopic?: (topicId: string) => void;
}

type FeedMode = "all" | "shorts" | "live" | "saved";
type CompanionTab = "quiz" | "chat" | "queue";

function getTopicMeta(topicId: string) {
  return TOPICS.find((t) => t.id === topicId) || TOPICS[0];
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface ReelStageCardProps {
  reel: StudyReel;
  isActive: boolean;
  isMuted: boolean;
  playbackRate: 1 | 1.25 | 1.5;
  liked: boolean;
  bookmarked: boolean;
  reminded: boolean;
  commentCount: number;
  copiedId: string | null;
  canDelete: boolean;
  liteMode?: boolean;
  onToggleMute: () => void;
  onCycleRate: () => void;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onToggleReminder: () => void;
  onShare: () => void;
  onOpenCompanion: (tab: CompanionTab) => void;
  onDelete: () => void;
}

function ReelStageCard({
  reel,
  isActive,
  isMuted,
  playbackRate,
  liked,
  bookmarked,
  reminded,
  commentCount,
  copiedId,
  canDelete,
  liteMode = false,
  onToggleMute,
  onCycleRate,
  onToggleLike,
  onToggleBookmark,
  onToggleReminder,
  onShare,
  onOpenCompanion,
  onDelete,
}: ReelStageCardProps) {
  const topicMeta = getTopicMeta(reel.topic);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(isActive);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const parsedYouTube = useMemo(
    () => (reel.sourceType === "youtube" && reel.mediaUrl ? parseVideoSource(reel.mediaUrl) : null),
    [reel.sourceType, reel.mediaUrl]
  );

  const steps = reel.lessonSteps.length > 0
    ? reel.lessonSteps
    : [
        {
          heading: reel.title,
          board: reel.description || "Study clip ready.",
          highlight: `${topicMeta.label} · ${reel.label}`,
          durationSec: Math.max(10, reel.durationSec || 20),
        },
      ];

  const totalLessonSec = useMemo(
    () => Math.max(5, steps.reduce((acc, s) => acc + (Number(s.durationSec) || 6), 0)),
    [steps]
  );

  // Compute active slide and local step progress for interactive Micro-Lesson player
  const stepTimeline = useMemo(() => {
    let cursor = 0;
    return steps.map((s, idx) => {
      const len = Math.max(3, Number(s.durationSec) || 6);
      const start = cursor;
      const end = cursor + len;
      cursor = end;
      return { ...s, idx, start, end, len };
    });
  }, [steps]);

  const currentStep = useMemo(() => {
    const t = Math.min(totalLessonSec - 0.01, Math.max(0, elapsedSec));
    return stepTimeline.find((s) => t >= s.start && t < s.end) || stepTimeline[stepTimeline.length - 1];
  }, [elapsedSec, stepTimeline, totalLessonSec]);

  // Reset play state cleanly when slide becomes active / inactive
  useEffect(() => {
    setIsPlaying(isActive);
    setConfirmDelete(false);
    if (!isActive) {
      setElapsedSec(0);
    }
  }, [isActive, reel.id]);

  // Timer tick for interactive micro-lesson playback
  useEffect(() => {
    if (reel.sourceType !== "lesson" || !isActive || !isPlaying) return undefined;
    const tickMs = 150;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + (tickMs / 1000) * playbackRate;
        return next >= totalLessonSec ? 0 : next;
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [reel.sourceType, isActive, isPlaying, playbackRate, totalLessonSec]);

  // Optional browser speech synthesis narration when unmuted on lesson slides
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      reel.sourceType !== "lesson"
    ) {
      return undefined;
    }
    window.speechSynthesis.cancel();
    if (!isActive || !isPlaying || isMuted) return undefined;

    const cleanBoard = currentStep.board
      .replace(/[*_`>#$]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(`${currentStep.heading}. ${cleanBoard}`);
    utterance.rate = Math.min(1.5, playbackRate);
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isActive, isPlaying, isMuted, currentStep.idx, currentStep.heading, currentStep.board, playbackRate, reel.sourceType]);

  // Sync HTML5 video playback with active state, mute, and rate
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || reel.sourceType !== "video") return;
    vid.muted = isMuted;
    vid.playbackRate = playbackRate;
    if (isActive && isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isActive, isPlaying, isMuted, playbackRate, reel.sourceType]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSeekLesson = (sec: number) => {
    setElapsedSec(Math.max(0, Math.min(totalLessonSec, sec)));
  };

  const handleSeekVideo = (sec: number) => {
    setElapsedSec(sec);
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
    }
  };

  const likeTotal = reel.likesCount + (liked ? 1 : 0);
  const effectiveTotalSec =
    reel.sourceType === "video" && videoRef.current?.duration
      ? videoRef.current.duration
      : reel.sourceType === "lesson"
        ? totalLessonSec
        : reel.durationSec;

  const isLiveNow = reel.kind === "live" && reel.liveStatus === "live";
  const isUpcoming = reel.kind === "live" && reel.liveStatus === "upcoming";

  return (
    <article
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-qb-border bg-[#070b14] text-slate-100 select-none"
      aria-label={reel.title}
    >
      {/* Top Story-style Step Segments (for micro-lessons) */}
      {reel.sourceType === "lesson" && (
        <div className="pointer-events-auto absolute top-2.5 left-3 right-3 z-20 flex items-center gap-1.5">
          {stepTimeline.map((step) => {
            const pct =
              elapsedSec >= step.end
                ? 100
                : elapsedSec <= step.start
                  ? 0
                  : Math.min(100, ((elapsedSec - step.start) / step.len) * 100);
            return (
              <button
                key={step.idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeekLesson(step.start);
                  setIsPlaying(true);
                }}
                aria-label={`Jump to ${step.heading}`}
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/20 cursor-pointer"
              >
                <span
                  className="block h-full rounded-full bg-amber-400 transition-[width] duration-150"
                  style={{ width: `${pct}%` }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Top Metadata & Audio Controls Scrim */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-4 pt-6 pb-8">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-200">
            {isLiveNow && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white shrink-0">
                <Radio size={12} aria-hidden="true" />
                LIVE
              </span>
            )}
            {isUpcoming && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[11px] font-bold text-amber-300 shrink-0">
                <Calendar size={11} aria-hidden="true" />
                UPCOMING
              </span>
            )}
            <span className="font-semibold truncate" style={{ color: topicMeta.color }}>
              {topicMeta.label}
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="truncate text-slate-300">{reel.label}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {reel.sourceType !== "youtube" && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCycleRate();
                  }}
                  title="Playback speed"
                  className="inline-flex h-8 min-w-[38px] items-center justify-center rounded-lg bg-black/50 px-2 text-[11px] font-bold text-white/90 hover:bg-black/75 transition-colors tabular-nums cursor-pointer"
                >
                  {playbackRate}x
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute();
                  }}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  title={isMuted ? "Unmute voice / sound" : "Mute voice / sound"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white/90 hover:bg-black/75 transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Media Stage */}
      {reel.sourceType === "youtube" && parsedYouTube?.valid && parsedYouTube.sourceType === "youtube" ? (
        <div className="relative h-full w-full bg-black flex items-center justify-center">
          {isActive ? (
            <iframe
              key={reel.id}
              src={`${parsedYouTube.embedUrl}&mute=${isMuted ? 1 : 0}`}
              title={reel.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-300">
              <Clapperboard size={32} className="text-amber-400" />
              <p className="text-sm font-semibold">{reel.title}</p>
            </div>
          )}
          <a
            href={reel.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-16 left-4 z-20 inline-flex items-center gap-1 rounded-lg bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-black/85"
          >
            <ExternalLink size={11} />
            Open Stream
          </a>
        </div>
      ) : reel.sourceType === "video" && reel.mediaUrl ? (
        <div
          className="relative h-full w-full bg-black flex items-center justify-center cursor-pointer"
          onClick={handleTogglePlay}
        >
          <video
            ref={videoRef}
            src={reel.mediaUrl}
            className="h-full w-full object-contain"
            playsInline
            loop={reel.kind === "short"}
            muted={isMuted}
            onTimeUpdate={(e) => setElapsedSec(e.currentTarget.currentTime)}
            onEnded={() => {
              if (reel.kind === "live") setIsPlaying(false);
            }}
          />
          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white border border-white/20">
                <Play size={24} className="ml-0.5" />
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Interactive CSE Micro-Lesson Stage */
        <div
          onClick={handleTogglePlay}
          className="relative flex h-full w-full cursor-pointer flex-col justify-center px-5 pt-16 pb-32 sm:px-6"
          style={{
            background: `radial-gradient(circle at 20% 15%, ${topicMeta.color}22 0%, transparent 48%), linear-gradient(165deg, #0b1326 0%, #070b14 60%, #0a101f 100%)`,
          }}
        >
          <div
            key={`${reel.id}-${currentStep.idx}`}
            className={`mr-12 space-y-3 rounded-2xl border border-white/12 bg-slate-900/75 p-4 sm:p-5 backdrop-blur-sm ${
              liteMode ? "" : "transition-opacity duration-200"
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
              <span className="uppercase tracking-wider" style={{ color: topicMeta.color }}>
                Step {currentStep.idx + 1} of {stepTimeline.length}
              </span>
              <span className="tabular-nums">
                {formatReelDuration(elapsedSec)} / {formatReelDuration(totalLessonSec)}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold leading-snug text-white">
              {currentStep.heading}
            </h3>

            <div className="text-xs sm:text-sm leading-relaxed text-slate-200">
              <MarkdownText text={currentStep.board} />
            </div>

            {currentStep.highlight && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/12 px-3 py-2 text-xs font-bold text-amber-300">
                {currentStep.highlight}
              </div>
            )}
          </div>

          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/75 text-white border border-white/25">
                <Play size={24} className="ml-0.5" />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Right-Edge Shorts Action Rail (44px+ touch targets) */}
      <div
        className="absolute right-2.5 bottom-20 z-30 flex flex-col items-center gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike reel" : "Like reel"}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl bg-black/55 px-2 py-1.5 text-white hover:bg-black/75 transition-colors cursor-pointer"
        >
          <Heart
            size={19}
            className={liked ? "text-rose-400 fill-rose-400" : "text-white"}
          />
          <span className="text-[10px] font-bold tabular-nums">{likeTotal}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenCompanion("chat")}
          aria-label={`Open Q&A (${commentCount})`}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl bg-black/55 px-2 py-1.5 text-white hover:bg-black/75 transition-colors cursor-pointer"
        >
          <MessageCircle size={19} />
          <span className="text-[10px] font-bold tabular-nums">{commentCount}</span>
        </button>

        {reel.quizCheck && (
          <button
            type="button"
            onClick={() => onOpenCompanion("quiz")}
            aria-label="Quick recall quiz"
            title="Practice Quick Check"
            className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl bg-amber-500/90 px-2 py-1.5 text-[#070c18] hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <Target size={19} />
            <span className="text-[10px] font-extrabold">Quiz</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Remove from saved" : "Save reel"}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl bg-black/55 px-2 py-1.5 text-white hover:bg-black/75 transition-colors cursor-pointer"
        >
          <Bookmark
            size={19}
            className={bookmarked ? "text-amber-400 fill-amber-400" : "text-white"}
          />
          <span className="text-[10px] font-bold">{bookmarked ? "Saved" : "Save"}</span>
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label="Copy link to reel"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl bg-black/55 px-2 py-1.5 text-white hover:bg-black/75 transition-colors cursor-pointer"
        >
          {copiedId === reel.id ? (
            <Check size={18} className="text-emerald-400" />
          ) : (
            <Share2 size={18} />
          )}
          <span className="text-[10px] font-bold">
            {copiedId === reel.id ? "Copied" : "Share"}
          </span>
        </button>

        {canDelete && !reel.isStarter && (
          confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Confirm delete reel"
              className="flex min-h-[40px] min-w-[44px] items-center justify-center rounded-xl bg-rose-600 px-2 text-[10px] font-bold text-white cursor-pointer"
            >
              Delete?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete reel"
              title="Delete clip"
              className="flex min-h-[40px] min-w-[44px] items-center justify-center rounded-xl bg-black/55 text-slate-300 hover:text-rose-400 cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          )
        )}
      </div>

      {/* Bottom Scrim Metadata + Scrubber */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pt-10 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mr-14 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-white">{reel.creatorName}</span>
            <span aria-hidden="true">·</span>
            <span>{reel.creatorRole}</span>
            {isUpcoming && reel.scheduledAt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-semibold">
                  {formatLiveSchedule(reel.scheduledAt)}
                </span>
              </>
            )}
          </div>

          <h2 className="text-sm sm:text-base font-extrabold leading-snug text-white line-clamp-2">
            {reel.title}
          </h2>

          {reel.description && (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {reel.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isUpcoming && (
              <button
                type="button"
                onClick={onToggleReminder}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  reminded
                    ? "bg-emerald-500/25 border border-emerald-400/45 text-emerald-200"
                    : "bg-amber-500 text-[#070c18] hover:bg-amber-400"
                }`}
              >
                {reminded ? <BellRing size={13} /> : <Bell size={13} />}
                <span>{reminded ? "Reminder Set" : "Remind Me"}</span>
              </button>
            )}
            {reel.quizCheck && (
              <button
                type="button"
                onClick={() => onOpenCompanion("quiz")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Target size={13} className="text-amber-400" />
                <span>Try Quick Check</span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Scrubber for Lesson & Direct Video */}
        {reel.sourceType !== "youtube" && (
          <div className="mt-2.5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/10 cursor-pointer shrink-0"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(1, effectiveTotalSec)}
              step={0.5}
              value={Math.min(effectiveTotalSec, elapsedSec)}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (reel.sourceType === "video") handleSeekVideo(val);
                else handleSeekLesson(val);
              }}
              aria-label="Seek clip timeline"
              className="h-1 flex-1 cursor-pointer accent-amber-400"
            />
            <span className="text-[11px] font-medium text-slate-300 tabular-nums shrink-0">
              {formatReelDuration(elapsedSec)} / {formatReelDuration(effectiveTotalSec)}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ReelsPage({
  questions = [],
  currentUser = null,
  userRole = "reviewer",
  isAdmin = false,
  initialReelId = null,
  liteMode = false,
  onOpenQuestion,
  onPracticeTopic,
}: ReelsPageProps) {
  const [reels, setReels] = useState<StudyReel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedMode, setFeedMode] = useState<FeedMode>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5>(1);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => studyReelsModel.getLikedIds());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() =>
    studyReelsModel.getBookmarkedIds()
  );
  const [reminderIds, setReminderIds] = useState<Set<string>>(() =>
    studyReelsModel.getReminderIds()
  );
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelComment[]>>(() =>
    studyReelsModel.getCommentsForReels()
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Desktop companion & mobile bottom sheet
  const [companionTab, setCompanionTab] = useState<CompanionTab>("quiz");
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);

  // Quick check state keyed by reelId
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  // Live Q&A / comment input
  const [commentText, setCommentText] = useState<string>("");
  const [askHostFlag, setAskHostFlag] = useState<boolean>(false);

  // Post Clip / Go Live modal
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [postKind, setPostKind] = useState<ReelKind>("short");
  const [postSourceType, setPostSourceType] = useState<ReelSourceType>("youtube");
  const [postTitle, setPostTitle] = useState<string>("");
  const [postDescription, setPostDescription] = useState<string>("");
  const [postTopic, setPostTopic] = useState<TopicId>("analytical");
  const [postLabel, setPostLabel] = useState<string>("Word Analogy");
  const [postUrl, setPostUrl] = useState<string>("");
  const [postLiveStatus, setPostLiveStatus] = useState<LiveStatus>("live");
  const [postScheduledAt, setPostScheduledAt] = useState<string>("");
  const [postSlideText, setPostSlideText] = useState<string>(
    "State the main shortcut or rule first, then show a fast worked example."
  );
  const [postQuizPrompt, setPostQuizPrompt] = useState<string>("");
  const [postQuizChoices, setPostQuizChoices] = useState<string[]>(["", "", "", ""]);
  const [postQuizCorrect, setPostQuizCorrect] = useState<number>(0);
  const [postError, setPostError] = useState<string>("");
  const [posting, setPosting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    studyReelsModel.getReels().then((loaded) => {
      if (!active) return;
      setReels(loaded);
      setLoading(false);
      if (initialReelId) {
        const idx = loaded.findIndex((r) => r.id === initialReelId);
        if (idx >= 0) setActiveIndex(idx);
      }
    });
    return () => {
      active = false;
    };
  }, [initialReelId]);

  const filteredReels = useMemo(
    () =>
      filterStudyReels(reels, {
        feedMode,
        topicFilter,
        search,
        savedIds: bookmarkedIds,
      }),
    [reels, feedMode, topicFilter, search, bookmarkedIds]
  );

  // Keep activeIndex in bounds whenever filters change
  useEffect(() => {
    if (activeIndex >= filteredReels.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filteredReels.length]);

  const activeReel = filteredReels[activeIndex] || null;
  const liveNowCount = useMemo(
    () => reels.filter((r) => r.kind === "live" && r.liveStatus === "live").length,
    [reels]
  );

  const goPrev = useCallback(() => {
    setActiveIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((idx) => Math.min(Math.max(0, filteredReels.length - 1), idx + 1));
  }, [filteredReels.length]);

  // Keyboard navigation when not typing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        composerOpen ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "j") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "k") {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === "m") {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composerOpen, goNext, goPrev]);

  // Touch swipe vertical navigation on the stage
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = touchStartY.current - endY;
    touchStartY.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  const handleToggleLike = (reelId: string) => {
    const res = studyReelsModel.toggleLike(reelId);
    setLikedIds(new Set(res.likedIds));
  };

  const handleToggleBookmark = (reelId: string) => {
    const res = studyReelsModel.toggleBookmark(reelId);
    setBookmarkedIds(new Set(res.bookmarkedIds));
  };

  const handleToggleReminder = (reelId: string) => {
    const res = studyReelsModel.toggleReminder(reelId);
    setReminderIds(new Set(res.reminderIds));
  };

  const handleShareReel = async (reel: StudyReel) => {
    const url = `${window.location.origin}${window.location.pathname}?page=reels&reel=${encodeURIComponent(reel.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(reel.id);
      window.setTimeout(() => setCopiedId((prev) => (prev === reel.id ? null : prev)), 2000);
    } catch {
      setCopiedId(reel.id);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    await studyReelsModel.deleteReel(reelId);
    setReels((prev) => prev.filter((r) => r.id !== reelId));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReel || !commentText.trim()) return;
    const added = studyReelsModel.addComment({
      reelId: activeReel.id,
      userId: currentUser?.id || "local_user",
      authorName: currentUser?.full_name || currentUser?.email?.split("@")[0] || "Reviewer",
      authorRole: isAdmin ? "Admin" : userRole === "superadmin" ? "Superadmin" : "Reviewer",
      text: commentText.trim(),
      isQuestion: activeReel.kind === "live" ? askHostFlag : false,
    });
    setCommentsByReel((prev) => ({
      ...prev,
      [activeReel.id]: [...(prev[activeReel.id] || []), added],
    }));
    setCommentText("");
    setAskHostFlag(false);
  };

  const handleDeleteComment = (reelId: string, commentId: string) => {
    studyReelsModel.deleteComment(commentId);
    setCommentsByReel((prev) => ({
      ...prev,
      [reelId]: (prev[reelId] || []).filter((c) => c.id !== commentId),
    }));
  };

  const handleSelectVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setPostError("Please choose a valid .mp4 or .webm video file.");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setPostUrl(blobUrl);
    setPostError("");
    if (!postTitle.trim()) {
      setPostTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError("");

    const cleanTitle = postTitle.trim();
    if (!cleanTitle) {
      setPostError("Please enter a concise title for your review clip or live session.");
      return;
    }

    let finalSourceType: ReelSourceType = postSourceType;
    let finalMediaUrl: string | undefined;

    if (postSourceType === "youtube" || postSourceType === "video") {
      const parsed = parseVideoSource(postUrl);
      if (!parsed.valid) {
        setPostError(parsed.error);
        return;
      }
      finalSourceType = parsed.sourceType;
      finalMediaUrl = parsed.sourceType === "youtube" ? postUrl.trim() : parsed.mediaUrl;
    } else if (!postSlideText.trim()) {
      setPostError("Add study board notes for your micro-lesson clip.");
      return;
    }

    let quizCheck: StudyReel["quizCheck"] = null;
    if (postQuizPrompt.trim()) {
      const filledChoices = postQuizChoices.map((c) => c.trim()).filter(Boolean);
      if (filledChoices.length < 2) {
        setPostError("Quick Check requires at least 2 answer choices (or leave the quiz prompt blank).");
        return;
      }
      quizCheck = {
        prompt: postQuizPrompt.trim(),
        choices: filledChoices,
        correct: Math.min(postQuizCorrect, filledChoices.length - 1),
        explanation: postDescription.trim() || "Review the explanation in the clip above.",
      };
    }

    setPosting(true);
    try {
      const created = await studyReelsModel.createReel(
        {
          kind: postKind,
          sourceType: finalSourceType,
          title: cleanTitle,
          description: postDescription.trim(),
          topic: postTopic,
          label: postLabel.trim() || (postKind === "live" ? "Live Coaching" : "Quick Review"),
          mediaUrl: finalMediaUrl,
          liveStatus: postKind === "live" ? postLiveStatus : undefined,
          scheduledAt:
            postKind === "live" && postLiveStatus === "upcoming" && postScheduledAt
              ? new Date(postScheduledAt).toISOString()
              : null,
          durationSec: postKind === "live" ? 60 : 30,
          lessonSteps:
            finalSourceType === "lesson"
              ? [
                  {
                    heading: cleanTitle,
                    board: postSlideText.trim(),
                    highlight: `${getTopicMeta(postTopic).label} · ${postLabel.trim() || "Review"}`,
                    durationSec: 18,
                  },
                ]
              : [],
          quizCheck,
        },
        {
          id: currentUser?.id,
          email: currentUser?.email,
          fullName: currentUser?.full_name || currentUser?.email?.split("@")[0] || "Reviewer",
          roleLabel: isAdmin ? "Instructor / Admin" : "Reviewer",
        }
      );

      setReels((prev) => [created, ...prev]);
      setFeedMode("all");
      setTopicFilter("all");
      setSearch("");
      setActiveIndex(0);
      setComposerOpen(false);
      setPostTitle("");
      setPostDescription("");
      setPostUrl("");
      setPostQuizPrompt("");
      setPostQuizChoices(["", "", "", ""]);
    } finally {
      setPosting(false);
    }
  };

  const topicSelectOptions = useMemo(
    () => [
      { value: "all", label: "All Subjects" },
      ...TOPICS.map((t) => ({ value: t.id, label: t.label })),
    ],
    []
  );

  const activeComments = activeReel ? commentsByReel[activeReel.id] || [] : [];
  const activeQuizAnswer = activeReel ? quizAnswers[activeReel.id] : undefined;

  const renderCompanionContent = () => {
    if (!activeReel) return null;

    return (
      <div className="flex h-full flex-col">
        {/* Segmented Companion Tabs */}
        <div
          className="grid grid-cols-3 gap-1 rounded-xl border border-qb-border bg-qb-input p-1"
          role="tablist"
          aria-label="Reel companion panel"
        >
          <button
            type="button"
            role="tab"
            aria-selected={companionTab === "quiz"}
            onClick={() => setCompanionTab("quiz")}
            className={`rounded-lg px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              companionTab === "quiz"
                ? "bg-qb-surface text-qb-heading shadow-sm border border-qb-border"
                : "text-qb-muted hover:text-qb-heading"
            }`}
          >
            Quick Check
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={companionTab === "chat"}
            onClick={() => setCompanionTab("chat")}
            className={`rounded-lg px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              companionTab === "chat"
                ? "bg-qb-surface text-qb-heading shadow-sm border border-qb-border"
                : "text-qb-muted hover:text-qb-heading"
            }`}
          >
            Q&A ({activeComments.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={companionTab === "queue"}
            onClick={() => setCompanionTab("queue")}
            className={`rounded-lg px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              companionTab === "queue"
                ? "bg-qb-surface text-qb-heading shadow-sm border border-qb-border"
                : "text-qb-muted hover:text-qb-heading"
            }`}
          >
            Queue ({filteredReels.length})
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-0.5">
          {companionTab === "quiz" && (
            <div className="space-y-4">
              {activeReel.quizCheck ? (
                <div className="space-y-3 rounded-xl border border-qb-border bg-qb-input p-4">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-qb-muted">
                    <span className="inline-flex items-center gap-1.5 text-qb-accent font-bold">
                      <Target size={14} aria-hidden="true" />
                      Active Recall Check
                    </span>
                    <span>{getTopicMeta(activeReel.topic).label}</span>
                  </div>

                  <p className="text-sm font-bold leading-relaxed text-qb-heading">
                    {activeReel.quizCheck.prompt}
                  </p>

                  <div className="space-y-2">
                    {activeReel.quizCheck.choices.map((choice, cIdx) => {
                      const answered = typeof activeQuizAnswer === "number";
                      const isPicked = activeQuizAnswer === cIdx;
                      const isRight = activeReel.quizCheck?.correct === cIdx;

                      let btnStyle =
                        "border-qb-border bg-qb-surface text-qb-heading hover:border-qb-border-hover";
                      if (answered) {
                        if (isRight) {
                          btnStyle =
                            "border-emerald-500/60 bg-emerald-500/12 text-emerald-300 light:text-emerald-800";
                        } else if (isPicked) {
                          btnStyle =
                            "border-rose-500/60 bg-rose-500/12 text-rose-300 light:text-rose-800";
                        } else {
                          btnStyle = "border-qb-border bg-qb-surface text-qb-muted opacity-70";
                        }
                      }

                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() =>
                            setQuizAnswers((prev) => ({ ...prev, [activeReel.id]: cIdx }))
                          }
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[44px] ${btnStyle}`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/25 text-xs font-bold">
                              {LETTERS[cIdx] || cIdx + 1}
                            </span>
                            <span className="break-words">{choice}</span>
                          </span>
                          {answered && isRight && (
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-400 light:text-emerald-600" />
                          )}
                          {answered && isPicked && !isRight && (
                            <XCircle size={16} className="shrink-0 text-rose-400 light:text-rose-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {typeof activeQuizAnswer === "number" && (
                    <div className="space-y-2 rounded-xl border border-qb-border bg-qb-surface p-3.5 text-xs leading-relaxed text-qb-mid">
                      <div className="font-bold text-qb-heading">
                        {activeQuizAnswer === activeReel.quizCheck.correct
                          ? "Correct — concept locked in"
                          : `Answer: ${LETTERS[activeReel.quizCheck.correct]}. ${activeReel.quizCheck.choices[activeReel.quizCheck.correct]}`}
                      </div>
                      <p>{activeReel.quizCheck.explanation}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-qb-border bg-qb-input p-5 text-center space-y-2">
                  <Sparkles size={20} className="mx-auto text-qb-accent" />
                  <p className="text-sm font-bold text-qb-heading">No Quick Check attached yet</p>
                  <p className="text-xs text-qb-muted">
                    Use the Question Bank below to drill items for {getTopicMeta(activeReel.topic).label}.
                  </p>
                </div>
              )}

              {/* Direct Links into Bank / Practice */}
              <div className="flex flex-wrap items-center gap-2">
                {activeReel.quizCheck?.linkedQuestionId &&
                  questions.some((q) => q.id === activeReel.quizCheck?.linkedQuestionId) &&
                  onOpenQuestion && (
                    <button
                      type="button"
                      onClick={() => onOpenQuestion(activeReel.quizCheck!.linkedQuestionId!)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-[#070c18] hover:bg-amber-400 transition-colors cursor-pointer min-h-[42px]"
                    >
                      <span>Open Full Bank Item</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                {onPracticeTopic && (
                  <button
                    type="button"
                    onClick={() => onPracticeTopic(activeReel.topic)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-qb-border bg-qb-surface px-3.5 py-2.5 text-xs font-semibold text-qb-heading hover:border-qb-border-hover hover:bg-qb-surface-hover transition-colors cursor-pointer min-h-[42px]"
                  >
                    <Layers size={14} className="text-qb-accent" />
                    <span>Drill {getTopicMeta(activeReel.topic).label}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {companionTab === "chat" && (
            <div className="flex h-full flex-col gap-3">
              <div className="space-y-2.5 flex-1">
                {activeComments.length === 0 ? (
                  <div className="rounded-xl border border-qb-border bg-qb-input p-5 text-center text-xs text-qb-muted">
                    No notes or Q&A messages yet. Ask a question or share a memory shortcut below.
                  </div>
                ) : (
                  activeComments.map((c) => {
                    const isMine =
                      (currentUser?.id && c.userId === currentUser.id) || c.userId === "local_user";
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-qb-border bg-qb-input p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-qb-muted">
                          <span className="font-bold text-qb-heading">
                            {c.authorName}
                            <span className="font-normal text-qb-muted"> · {c.authorRole}</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.isQuestion && (
                              <span className="font-bold text-amber-400 light:text-amber-700">
                                Question
                              </span>
                            )}
                            <span>{formatRelativeTime(c.createdAt)}</span>
                            {isMine && !c.id.startsWith("rc-") && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(activeReel.id, c.id)}
                                aria-label="Delete comment"
                                className="text-qb-muted hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-qb-text">{c.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleAddComment} className="space-y-2 border-t border-qb-border pt-3">
                {activeReel.kind === "live" && (
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-qb-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={askHostFlag}
                      onChange={(e) => setAskHostFlag(e.target.checked)}
                      className="h-4 w-4 rounded accent-amber-500"
                    />
                    <span>Tag as Question for Live Host</span>
                  </label>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      activeReel.kind === "live"
                        ? "Ask a live review question..."
                        : "Add a mnemonic or study note..."
                    }
                    className="flex-1 rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[42px]"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    aria-label="Send message"
                    className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-amber-500 text-[#070c18] hover:bg-amber-400 disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {companionTab === "queue" && (
            <div className="space-y-2">
              {filteredReels.map((item, idx) => {
                const selected = idx === activeIndex;
                const topic = getTopicMeta(item.topic);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setMobileSheetOpen(false);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      selected
                        ? "border-amber-500/55 bg-amber-500/[0.08]"
                        : "border-qb-border bg-qb-input hover:border-qb-border-hover hover:bg-qb-surface-hover"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-qb-muted">
                        {item.kind === "live" && item.liveStatus === "live" && (
                          <span className="font-bold text-rose-400 light:text-rose-600">LIVE ·</span>
                        )}
                        {item.kind === "live" && item.liveStatus === "upcoming" && (
                          <span className="font-bold text-amber-400 light:text-amber-700">UPCOMING ·</span>
                        )}
                        <span style={{ color: topic.color }}>{topic.label}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{item.creatorName}</span>
                      </div>
                      <div className="text-xs font-bold text-qb-heading line-clamp-2">
                        {item.title}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-qb-muted tabular-nums">
                      {item.kind === "live" ? (item.liveStatus === "live" ? "Live" : "Sched") : formatReelDuration(item.durationSec)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fu space-y-4 pb-6">
      {/* Compact Workspace Header + Segmented Controls */}
      <div className="flex flex-col gap-3 border-b border-qb-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-qb-muted">
            <span className="font-bold text-qb-accent">Study Reels & Live Review</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{reels.length} review sessions</span>
            {liveNowCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-bold text-rose-400 light:text-rose-600 tabular-nums">
                  <Radio size={12} aria-hidden="true" />
                  {liveNowCount} Live Now
                </span>
              </>
            )}
          </div>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-qb-heading">
            Micro-Lessons & Live Coaching
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Feed Mode */}
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-qb-border bg-qb-input p-1"
            role="group"
            aria-label="Filter feed type"
          >
            {(
              [
                { id: "all", label: "All" },
                { id: "shorts", label: "Shorts" },
                { id: "live", label: "Live" },
                { id: "saved", label: "Saved" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFeedMode(tab.id);
                  setActiveIndex(0);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  feedMode === tab.id
                    ? "bg-qb-surface text-qb-heading shadow-sm border border-qb-border"
                    : "text-qb-muted hover:text-qb-heading"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-[150px]">
            <CustomSelect
              value={topicFilter}
              onChange={(val) => {
                setTopicFilter(val);
                setActiveIndex(0);
              }}
              options={topicSelectOptions}
              placeholder="All Subjects"
            />
          </div>

          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-qb-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search clips or live..."
              aria-label="Search clips or live streams"
              className="h-[38px] w-full rounded-xl border border-qb-border bg-qb-input pl-8 pr-3 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-bold text-[#070c18] hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Post Clip / Go Live</span>
          </button>
        </div>
      </div>

      {/* Main Theater + Companion Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-6 xl:col-span-7 flex justify-center">
            <div className="h-[min(74vh,680px)] w-full max-w-[390px] animate-pulse rounded-2xl border border-qb-border bg-qb-surface" />
          </div>
          <div className="hidden lg:block lg:col-span-6 xl:col-span-5 h-[min(74vh,680px)] animate-pulse rounded-2xl border border-qb-border bg-qb-surface" />
        </div>
      ) : filteredReels.length === 0 ? (
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-10 text-center space-y-3">
          <Clapperboard size={28} className="mx-auto text-qb-accent" />
          <h2 className="text-lg font-bold text-qb-heading">No matching clips or live sessions</h2>
          <p className="text-xs sm:text-sm text-qb-muted max-w-md mx-auto">
            Try switching back to All or post a review video / YouTube Live coaching link.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setFeedMode("all");
                setTopicFilter("all");
                setSearch("");
              }}
              className="rounded-xl border border-qb-border bg-qb-input px-4 py-2 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-[#070c18] hover:bg-amber-400 cursor-pointer"
            >
              Post Clip / Go Live
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left / Center: Vertical 9:16 Reels Stage + Up/Down Controls */}
          <div className="lg:col-span-6 xl:col-span-7 flex items-center justify-center gap-3">
            <div
              className="relative h-[min(72vh,680px)] w-full max-w-[400px] aspect-[9/16]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {activeReel && (
                <ReelStageCard
                  reel={activeReel}
                  isActive={true}
                  isMuted={isMuted}
                  playbackRate={playbackRate}
                  liked={likedIds.has(activeReel.id)}
                  bookmarked={bookmarkedIds.has(activeReel.id)}
                  reminded={reminderIds.has(activeReel.id)}
                  commentCount={(commentsByReel[activeReel.id] || []).length}
                  copiedId={copiedId}
                  canDelete={
                    !activeReel.isStarter &&
                    (isAdmin ||
                      (currentUser?.id && activeReel.userId === currentUser.id) ||
                      activeReel.userId === "local_user")
                  }
                  liteMode={liteMode}
                  onToggleMute={() => setIsMuted((m) => !m)}
                  onCycleRate={() =>
                    setPlaybackRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))
                  }
                  onToggleLike={() => handleToggleLike(activeReel.id)}
                  onToggleBookmark={() => handleToggleBookmark(activeReel.id)}
                  onToggleReminder={() => handleToggleReminder(activeReel.id)}
                  onShare={() => handleShareReel(activeReel)}
                  onOpenCompanion={(tab) => {
                    setCompanionTab(tab);
                    setMobileSheetOpen(true);
                  }}
                  onDelete={() => handleDeleteReel(activeReel.id)}
                />
              )}
            </div>

            {/* Vertical Reel Stepper Buttons */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={goPrev}
                disabled={activeIndex === 0}
                aria-label="Previous reel"
                title="Previous clip (Up arrow)"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-qb-border bg-qb-surface text-qb-heading hover:bg-qb-surface-hover disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronUp size={20} />
              </button>
              <span className="text-[11px] font-bold text-qb-muted tabular-nums">
                {activeIndex + 1}/{filteredReels.length}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={activeIndex >= filteredReels.length - 1}
                aria-label="Next reel"
                title="Next clip (Down arrow)"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-qb-border bg-qb-surface text-qb-heading hover:bg-qb-surface-hover disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Right Companion Panel (Desktop/Tablet Large) */}
          <aside
            className="hidden lg:flex lg:col-span-6 xl:col-span-5 h-[min(72vh,680px)] flex-col rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5"
            aria-label="Study companion and live Q&A"
          >
            {renderCompanionContent()}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Sheet for Quiz / Live Q&A / Queue */}
      {mobileSheetOpen && activeReel && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full max-h-[78vh] rounded-t-3xl border-t border-qb-border bg-qb-surface p-4 pb-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-qb-border" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-qb-heading truncate">
                {activeReel.title}
              </span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Close panel"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-qb-border bg-qb-input text-qb-heading cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderCompanionContent()}</div>
          </div>
        </div>
      )}

      {/* Post Review Clip / Go Live Modal */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setComposerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Post review clip or live stream"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-qb-border bg-qb-surface p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-qb-border pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-qb-heading">
                  Post Review Clip or Live Stream
                </h2>
                <p className="text-xs text-qb-muted">
                  Share a YouTube Short, direct video, live coaching link, or step-by-step micro-lesson.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close modal"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-qb-border bg-qb-input text-qb-heading cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateReel} className="space-y-4">
              {/* Format Toggle: Short vs Live */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPostKind("short")}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold cursor-pointer ${
                    postKind === "short"
                      ? "border-amber-500/60 bg-amber-500/12 text-qb-heading"
                      : "border-qb-border bg-qb-input text-qb-muted"
                  }`}
                >
                  <Clapperboard size={15} />
                  <span>Review Short</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostKind("live")}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold cursor-pointer ${
                    postKind === "live"
                      ? "border-rose-500/60 bg-rose-500/12 text-qb-heading"
                      : "border-qb-border bg-qb-input text-qb-muted"
                  }`}
                >
                  <Radio size={15} className="text-rose-400" />
                  <span>Live Review Stream</span>
                </button>
              </div>

              {/* Source Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-qb-heading">Media Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "youtube", label: "Video / Live URL", icon: Link2 },
                      { id: "video", label: "Upload Clip", icon: Upload },
                      { id: "lesson", label: "Lesson Board", icon: Layers },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setPostSourceType(opt.id);
                          setPostError("");
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold cursor-pointer ${
                          postSourceType === opt.id
                            ? "border-amber-500/60 bg-amber-500/12 text-qb-heading"
                            : "border-qb-border bg-qb-input text-qb-muted"
                        }`}
                      >
                        <Icon size={13} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {postSourceType === "youtube" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-qb-heading">
                    YouTube / Shorts / Live or .mp4 URL
                  </label>
                  <input
                    type="url"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://youtube.com/shorts/... or https://youtube.com/live/..."
                    className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              )}

              {postSourceType === "video" && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleSelectVideoFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-qb-border-hover bg-qb-input px-4 py-4 text-xs font-semibold text-qb-heading hover:border-amber-500/60 cursor-pointer"
                  >
                    <Upload size={15} className="text-qb-accent" />
                    <span>
                      {postUrl ? "Video clip ready — click to replace" : "Choose .mp4 or .webm review clip"}
                    </span>
                  </button>
                </div>
              )}

              {postSourceType === "lesson" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-qb-heading">
                    Micro-Lesson Board Content (Markdown & KaTeX supported)
                  </label>
                  <textarea
                    rows={4}
                    value={postSlideText}
                    onChange={(e) => setPostSlideText(e.target.value)}
                    className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-qb-heading">Title</label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="e.g. Double Word Analogy Shortcut"
                    className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-qb-heading">CSE Subject</label>
                  <CustomSelect
                    value={postTopic}
                    onChange={(val) => setPostTopic(val as TopicId)}
                    options={TOPICS.map((t) => ({ value: t.id, label: t.label }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-qb-heading">Sub-Topic Label</label>
                  <input
                    type="text"
                    value={postLabel}
                    onChange={(e) => setPostLabel(e.target.value)}
                    placeholder="e.g. Word Analogy, Ratio, RA 6713"
                    className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                {postKind === "live" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-qb-heading">Live Status</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPostLiveStatus("live")}
                        className={`rounded-lg border py-2 text-xs font-bold cursor-pointer ${
                          postLiveStatus === "live"
                            ? "border-rose-500/60 bg-rose-500/15 text-qb-heading"
                            : "border-qb-border bg-qb-input text-qb-muted"
                        }`}
                      >
                        Live Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostLiveStatus("upcoming")}
                        className={`rounded-lg border py-2 text-xs font-bold cursor-pointer ${
                          postLiveStatus === "upcoming"
                            ? "border-amber-500/60 bg-amber-500/15 text-qb-heading"
                            : "border-qb-border bg-qb-input text-qb-muted"
                        }`}
                      >
                        Schedule
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {postKind === "live" && postLiveStatus === "upcoming" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-qb-heading flex items-center gap-1.5">
                    <Clock size={13} />
                    <span>Scheduled Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={postScheduledAt}
                    onChange={(e) => setPostScheduledAt(e.target.value)}
                    className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-qb-heading">Short Caption</label>
                <input
                  type="text"
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Key takeaway viewers should remember..."
                  className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              {/* Optional Active Recall Quick Check */}
              <div className="space-y-2 rounded-xl border border-qb-border bg-qb-input p-3.5">
                <div className="text-xs font-bold text-qb-heading flex items-center gap-1.5">
                  <Target size={13} className="text-qb-accent" />
                  <span>Optional Quick Check Question (Recommended)</span>
                </div>
                <input
                  type="text"
                  value={postQuizPrompt}
                  onChange={(e) => setPostQuizPrompt(e.target.value)}
                  placeholder="Quick practice question tied to this clip..."
                  className="w-full rounded-lg border border-qb-border bg-qb-surface px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
                />
                {postQuizPrompt.trim() && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {postQuizChoices.map((ch, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPostQuizCorrect(idx)}
                          title="Mark as correct answer"
                          className={`h-7 w-7 shrink-0 rounded-md border text-xs font-bold cursor-pointer ${
                            postQuizCorrect === idx
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 light:text-emerald-700"
                              : "border-qb-border bg-qb-surface text-qb-muted"
                          }`}
                        >
                          {LETTERS[idx]}
                        </button>
                        <input
                          type="text"
                          value={ch}
                          onChange={(e) => {
                            const next = [...postQuizChoices];
                            next[idx] = e.target.value;
                            setPostQuizChoices(next);
                          }}
                          placeholder={`Choice ${LETTERS[idx]}`}
                          className="w-full rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs text-qb-heading placeholder:text-qb-muted focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {postError && (
                <p className="text-xs font-semibold text-rose-400 light:text-rose-600">
                  {postError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="rounded-xl border border-qb-border bg-qb-input px-4 py-2 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-[#070c18] hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {posting ? "Publishing..." : postKind === "live" ? "Publish Live Room" : "Publish Short"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
