import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
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
  Copy,
  Mail,
  Calculator,
  BookOpen,
  Globe,
  BrainCircuit,
  ClipboardList,
  HelpCircle,
  ArrowUp,
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
import {
  uploadReelVideo,
  loadLocalReelVideoUrl,
  isIndexedDbReelUrl,
} from "../../utils/reelStorage";
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

const TOPIC_ICON_MAP: Record<string, typeof Calculator> = {
  numerical: Calculator,
  verbal: BookOpen,
  general: Globe,
  analytical: BrainCircuit,
  clerical: ClipboardList,
};

function getTopicMeta(topicId: string) {
  return TOPICS.find((t) => t.id === topicId) || TOPICS[0];
}

function renderTopicIcon(topicId: string, color: string, size = 14) {
  const Icon = TOPIC_ICON_MAP[topicId] || Layers;
  return (
    <Icon
      size={size}
      data-colored="true"
      className="qb-topic-icon shrink-0"
      style={{ color }}
    />
  );
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

function getAuthorInitials(name: string): string {
  const parts = String(name || "R")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface ReelStageCardProps {
  reel: StudyReel;
  isActive: boolean;
  shouldMountMedia?: boolean;
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
  shouldMountMedia = true,
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
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string | null>(() =>
    reel.mediaUrl && !isIndexedDbReelUrl(reel.mediaUrl) ? reel.mediaUrl : null
  );
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [controlsRevealed, setControlsRevealed] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const revealTimerRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const revealTimelineTemporarily = useCallback(
    (durationMs = 4000) => {
      clearRevealTimer();
      setControlsRevealed(true);
      revealTimerRef.current = window.setTimeout(() => {
        setControlsRevealed(false);
        revealTimerRef.current = null;
      }, durationMs);
    },
    [clearRevealTimer]
  );

  useEffect(() => {
    return () => {
      clearRevealTimer();
      clearHoldTimer();
    };
  }, [clearRevealTimer, clearHoldTimer]);

  useEffect(() => {
    if (!isScrubbing) return undefined;
    const handleFinishScrub = () => {
      setIsScrubbing(false);
      if (!isHovering) revealTimelineTemporarily(3500);
    };
    window.addEventListener("pointerup", handleFinishScrub);
    window.addEventListener("pointercancel", handleFinishScrub);
    window.addEventListener("touchend", handleFinishScrub);
    window.addEventListener("touchcancel", handleFinishScrub);
    return () => {
      window.removeEventListener("pointerup", handleFinishScrub);
      window.removeEventListener("pointercancel", handleFinishScrub);
      window.removeEventListener("touchend", handleFinishScrub);
      window.removeEventListener("touchcancel", handleFinishScrub);
    };
  }, [isScrubbing, isHovering, revealTimelineTemporarily]);

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

  // Reset play state and elapsed progress cleanly whenever switching clips or toggling active state
  useEffect(() => {
    setIsPlaying(isActive);
    setIsHovering(false);
    setControlsRevealed(false);
    setIsScrubbing(false);
    clearRevealTimer();
    clearHoldTimer();
    longPressTriggeredRef.current = false;
    setElapsedSec(0);
    setVideoDurationSec(null);
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [isActive, reel.id, clearRevealTimer, clearHoldTimer]);

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
    try {
      window.speechSynthesis.cancel();
      if (!isActive || !isPlaying || isMuted) return undefined;

      const cleanBoard = currentStep.board
        .replace(/[*_`>#$]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const utterance = new SpeechSynthesisUtterance(`${currentStep.heading}. ${cleanBoard}`);
      utterance.rate = Math.min(1.5, playbackRate);
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore restricted browser WebView speech synthesis errors
    }

    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [isActive, isPlaying, isMuted, currentStep.idx, currentStep.heading, currentStep.board, playbackRate, reel.sourceType]);

  // Resolve persisted local IndexedDB clip URLs (idb-reel://...) into playable object URLs
  useEffect(() => {
    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    if (!shouldMountMedia || reel.sourceType !== "video" || !reel.mediaUrl) {
      setResolvedVideoSrc(null);
      return undefined;
    }

    if (!isIndexedDbReelUrl(reel.mediaUrl)) {
      setResolvedVideoSrc(reel.mediaUrl);
      return undefined;
    }

    setResolvedVideoSrc(null);
    loadLocalReelVideoUrl(reel.mediaUrl)
      .then((objUrl) => {
        if (cancelled) {
          if (objUrl && objUrl.startsWith("blob:")) URL.revokeObjectURL(objUrl);
          return;
        }
        if (objUrl) {
          objectUrlToRevoke = objUrl.startsWith("blob:") ? objUrl : null;
          setResolvedVideoSrc(objUrl);
        } else {
          setVideoError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setVideoError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [reel.id, reel.sourceType, reel.mediaUrl, shouldMountMedia]);

  // Sync HTML5 video playback with active state, mute, and rate
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || reel.sourceType !== "video" || !resolvedVideoSrc) return;
    vid.muted = isMuted;
    vid.playbackRate = playbackRate;
    if (isActive && isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isActive, isPlaying, isMuted, playbackRate, reel.sourceType, resolvedVideoSrc]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleStageMediaClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    handleTogglePlay();
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
    reel.sourceType === "video" && videoDurationSec
      ? videoDurationSec
      : reel.sourceType === "video" &&
          videoRef.current?.duration &&
          Number.isFinite(videoRef.current.duration)
        ? videoRef.current.duration
        : reel.sourceType === "lesson"
          ? totalLessonSec
          : reel.durationSec;

  const isLiveNow = reel.kind === "live" && reel.liveStatus === "live";
  const isUpcoming = reel.kind === "live" && reel.liveStatus === "upcoming";
  const showTimeline =
    reel.sourceType !== "youtube" && (isHovering || controlsRevealed || isScrubbing);

  return (
    <article
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-qb-border bg-[#070b14] text-slate-100 select-none"
      aria-label={reel.title}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setIsHovering(true);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse" && !isHovering) setIsHovering(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setIsHovering(false);
      }}
      onTouchStart={(e) => {
        if (reel.sourceType === "youtube") return;
        const targetEl = e.target as HTMLElement | null;
        if (targetEl?.closest("button, input, a")) return;
        const touch = e.touches[0];
        if (!touch) return;
        holdStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        longPressTriggeredRef.current = false;
        clearHoldTimer();
        holdTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          revealTimelineTemporarily(4000);
          holdTimerRef.current = null;
        }, 380);
      }}
      onTouchMove={(e) => {
        if (!holdStartPosRef.current) return;
        const touch = e.touches[0];
        if (!touch) return;
        const dx = Math.abs(touch.clientX - holdStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - holdStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          clearHoldTimer();
          holdStartPosRef.current = null;
        }
      }}
      onTouchEnd={() => {
        clearHoldTimer();
        holdStartPosRef.current = null;
        if (longPressTriggeredRef.current) {
          window.setTimeout(() => {
            longPressTriggeredRef.current = false;
          }, 120);
        }
      }}
      onTouchCancel={() => {
        clearHoldTimer();
        holdStartPosRef.current = null;
        longPressTriggeredRef.current = false;
      }}
      onContextMenu={(e) => {
        if (reel.sourceType !== "youtube") {
          e.preventDefault();
        }
      }}
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

          <div className="flex items-center gap-1 shrink-0 [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.85))]">
            {reel.sourceType !== "youtube" && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCycleRate();
                  }}
                  title="Playback speed"
                  className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-full px-1.5 text-xs font-extrabold text-white/95 hover:text-white active:scale-90 transition-all tabular-nums cursor-pointer"
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/95 hover:text-white active:scale-90 transition-all cursor-pointer"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Media Stage */}
      {reel.sourceType === "youtube" && parsedYouTube?.valid && parsedYouTube.sourceType === "youtube" ? (
        <div className="relative h-full w-full bg-black flex items-center justify-center">
          {isActive && shouldMountMedia ? (
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
            className="absolute top-14 left-4 z-20 inline-flex items-center gap-1 rounded-lg bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-black/85"
          >
            <ExternalLink size={11} />
            Open Stream
          </a>
        </div>
      ) : reel.sourceType === "video" && reel.mediaUrl ? (
        <div
          className="relative h-full w-full bg-black flex items-center justify-center cursor-pointer"
          onClick={handleStageMediaClick}
        >
          {!shouldMountMedia ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-300">
              <Clapperboard size={28} className="text-amber-400" />
              <p className="text-sm font-semibold text-white line-clamp-2">{reel.title}</p>
            </div>
          ) : videoError ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-300">
              <Clapperboard size={28} className="text-rose-400" />
              <p className="text-sm font-bold text-white">Video unavailable</p>
              <p className="text-xs text-slate-400">
                This clip could not be loaded or is in an unsupported format.
              </p>
            </div>
          ) : !resolvedVideoSrc ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-300">
              <Clapperboard size={24} className="animate-pulse text-amber-400" />
              <p className="text-xs font-medium text-slate-300">Loading video clip…</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={resolvedVideoSrc}
                preload="metadata"
                className="h-full w-full object-contain"
                playsInline
                loop={reel.kind === "short"}
                muted={isMuted}
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (Number.isFinite(dur) && dur > 0) {
                    setVideoDurationSec(dur);
                  }
                }}
                onTimeUpdate={(e) => setElapsedSec(e.currentTarget.currentTime)}
                onError={() => {
                  setVideoError(true);
                  setIsPlaying(false);
                }}
                onEnded={() => {
                  if (reel.kind === "live") setIsPlaying(false);
                }}
              />
              {!isPlaying && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
                  <Play
                    size={46}
                    className="ml-1 text-white/90 fill-white/85 [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.75))]"
                  />
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Interactive CSE Micro-Lesson Stage */
        <div
          onClick={handleStageMediaClick}
          className="qb-no-scrollbar relative flex h-full w-full cursor-pointer flex-col overflow-y-auto overscroll-y-auto px-3.5 pt-14 pb-48 sm:px-5 sm:pt-16 sm:pb-52"
          style={{
            background: `radial-gradient(circle at 20% 15%, ${topicMeta.color}22 0%, transparent 48%), linear-gradient(165deg, #0b1326 0%, #070b14 60%, #0a101f 100%)`,
          }}
        >
          <div
            key={`${reel.id}-${currentStep.idx}`}
            className={`mt-1 mb-auto mr-14 sm:mr-16 space-y-2 rounded-2xl border border-white/12 bg-slate-900/80 p-3.5 sm:p-4 backdrop-blur-sm ${
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
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
              <Play
                size={46}
                className="ml-1 text-white/90 fill-white/85 [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.75))]"
              />
            </div>
          )}
        </div>
      )}

      {/* Right-Edge Docked Action Rail (transparent industry-standard floating icons) */}
      <div
        className="absolute right-2 bottom-14 sm:right-2.5 sm:bottom-16 z-30 flex w-[48px] sm:w-[54px] flex-col items-center gap-3 sm:gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike reel" : "Like reel"}
          className="flex w-full flex-col items-center justify-center gap-0.5 bg-transparent py-0.5 text-white hover:opacity-90 active:scale-90 transition-all cursor-pointer [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.85))]"
        >
          <Heart
            size={23}
            strokeWidth={2.1}
            className={liked ? "text-rose-500 fill-rose-500" : "text-white"}
          />
          <span className="text-[11px] leading-none font-bold tabular-nums whitespace-nowrap">
            {likeTotal}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenCompanion("chat")}
          aria-label={`Open Q&A (${commentCount})`}
          className="flex w-full flex-col items-center justify-center gap-0.5 bg-transparent py-0.5 text-white hover:opacity-90 active:scale-90 transition-all cursor-pointer [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.85))]"
        >
          <MessageCircle size={23} strokeWidth={2.1} />
          <span className="text-[11px] leading-none font-bold tabular-nums whitespace-nowrap">
            {commentCount}
          </span>
        </button>

        {reel.quizCheck && (
          <button
            type="button"
            onClick={() => onOpenCompanion("quiz")}
            aria-label="Quick recall quiz"
            title="Practice Quick Check"
            className="flex w-full flex-col items-center justify-center gap-0.5 bg-transparent py-0.5 text-amber-400 hover:text-amber-300 active:scale-90 transition-all cursor-pointer [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.85))]"
          >
            <Target size={23} strokeWidth={2.2} />
            <span className="text-[11px] leading-none font-extrabold text-white whitespace-nowrap">Quiz</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Remove from saved" : "Save reel"}
          className="flex w-full flex-col items-center justify-center gap-0.5 bg-transparent py-0.5 text-white hover:opacity-90 active:scale-90 transition-all cursor-pointer [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.85))]"
        >
          <Bookmark
            size={23}
            strokeWidth={2.1}
            className={bookmarked ? "text-amber-400 fill-amber-400" : "text-white"}
          />
          <span
            className={`text-[11px] leading-none font-bold whitespace-nowrap ${
              bookmarked ? "text-amber-300" : "text-white"
            }`}
          >
            {bookmarked ? "Saved" : "Save"}
          </span>
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label="Share reel"
          className="flex w-full flex-col items-center justify-center gap-0.5 bg-transparent py-0.5 text-white hover:opacity-90 active:scale-90 transition-all cursor-pointer [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.85))]"
        >
          {copiedId === reel.id ? (
            <Check size={22} strokeWidth={2.2} className="text-emerald-400" />
          ) : (
            <Share2 size={22} strokeWidth={2.1} />
          )}
          <span
            className={`text-[11px] leading-none font-bold whitespace-nowrap ${
              copiedId === reel.id ? "text-emerald-300" : "text-white"
            }`}
          >
            {copiedId === reel.id ? "Copied" : "Share"}
          </span>
        </button>

        {canDelete && !reel.isStarter && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete reel"
            title="Delete clip"
            className="flex w-full items-center justify-center bg-transparent py-0.5 text-white/85 hover:text-rose-400 active:scale-90 transition-all cursor-pointer [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.85))]"
          >
            <Trash2 size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Bottom Scrim Metadata + Hover/Hold Scrubber */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3.5 pt-8 pb-2.5 sm:px-4 sm:pt-10 sm:pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mr-14 sm:mr-16 space-y-1 sm:space-y-1.5">
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

        {/* Interactive Scrubber for Lesson & Direct Video (hidden by default; reveals on hover or mobile hold) */}
        {reel.sourceType !== "youtube" && (
          <div
            aria-hidden={!showTimeline}
            className={`overflow-hidden transition-all duration-200 ease-out ${
              showTimeline
                ? "mt-2.5 max-h-12 opacity-100 translate-y-0 pointer-events-auto"
                : "mt-0 max-h-0 opacity-0 translate-y-1 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-2.5 py-0.5">
              <button
                type="button"
                onClick={() => {
                  handleTogglePlay();
                  if (!isHovering) revealTimelineTemporarily(3500);
                }}
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
                onPointerDown={() => {
                  setIsScrubbing(true);
                  clearRevealTimer();
                }}
                onPointerUp={() => {
                  setIsScrubbing(false);
                  if (!isHovering) revealTimelineTemporarily(3500);
                }}
                onPointerCancel={() => {
                  setIsScrubbing(false);
                }}
                onTouchStart={() => {
                  setIsScrubbing(true);
                  clearRevealTimer();
                }}
                onTouchEnd={() => {
                  setIsScrubbing(false);
                  revealTimelineTemporarily(3500);
                }}
                onBlur={() => {
                  setIsScrubbing(false);
                }}
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
  const [shareReel, setShareReel] = useState<StudyReel | null>(null);
  const [shareNoteCopied, setShareNoteCopied] = useState<boolean>(false);
  const [deleteTargetReel, setDeleteTargetReel] = useState<StudyReel | null>(null);
  const [deletingReel, setDeletingReel] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

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
  const [postVideoFile, setPostVideoFile] = useState<File | null>(null);
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

  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const programmaticTimerRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);
  const initialReelTargetRef = useRef<string | null>(initialReelId);

  useEffect(() => {
    let active = true;
    studyReelsModel.getReels().then((loaded) => {
      if (!active) return;
      setReels(loaded);
      setLoading(false);
      if (initialReelId) {
        const idx = loaded.findIndex((r) => r.id === initialReelId);
        if (idx >= 0) {
          setActiveIndex(idx);
          initialReelTargetRef.current = initialReelId;
        }
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

  const scrollToReelIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const clamped = Math.max(0, Math.min(Math.max(0, filteredReels.length - 1), idx));
      setActiveIndex(clamped);
      const el = feedScrollRef.current;
      if (!el) return;
      const slideHeight = el.clientHeight;
      if (slideHeight <= 0) return;
      if (programmaticTimerRef.current) {
        window.clearTimeout(programmaticTimerRef.current);
      }
      if (behavior === "smooth") {
        isProgrammaticScrollRef.current = true;
        programmaticTimerRef.current = window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 450);
      } else {
        isProgrammaticScrollRef.current = false;
      }
      el.scrollTo({ top: clamped * slideHeight, behavior });
    },
    [filteredReels.length]
  );

  // Jump immediately to initial deep-linked reel once feed container renders
  useEffect(() => {
    if (loading || !initialReelTargetRef.current) return;
    const targetId = initialReelTargetRef.current;
    const idx = filteredReels.findIndex((r) => r.id === targetId);
    initialReelTargetRef.current = null;
    if (idx > 0) {
      window.requestAnimationFrame(() => {
        scrollToReelIndex(idx, "auto");
      });
    }
  }, [loading, filteredReels, scrollToReelIndex]);

  const syncActiveIndexFromScroll = useCallback(() => {
    const el = feedScrollRef.current;
    if (!el || el.clientHeight <= 0 || filteredReels.length === 0) return;
    const nextIdx = Math.round(el.scrollTop / el.clientHeight);
    const clamped = Math.max(0, Math.min(filteredReels.length - 1, nextIdx));
    setActiveIndex((prev) => (prev === clamped ? prev : clamped));
  }, [filteredReels.length]);

  const handleFeedScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    if (scrollSettleTimerRef.current) {
      window.clearTimeout(scrollSettleTimerRef.current);
    }
    scrollSettleTimerRef.current = window.setTimeout(() => {
      syncActiveIndexFromScroll();
    }, 90);
  }, [syncActiveIndexFromScroll]);

  // Listen for native scrollend and preserve slide alignment on container resize
  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return undefined;

    const onScrollEnd = () => {
      if (programmaticTimerRef.current) {
        window.clearTimeout(programmaticTimerRef.current);
      }
      if (scrollSettleTimerRef.current) {
        window.clearTimeout(scrollSettleTimerRef.current);
      }
      isProgrammaticScrollRef.current = false;
      syncActiveIndexFromScroll();
    };

    el.addEventListener("scrollend", onScrollEnd);

    let lastHeight = el.clientHeight;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        const nextHeight = el.clientHeight;
        if (nextHeight > 0 && nextHeight !== lastHeight) {
          lastHeight = nextHeight;
          el.scrollTo({ top: activeIndex * nextHeight, behavior: "auto" });
        }
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scrollend", onScrollEnd);
      resizeObserver?.disconnect();
    };
  }, [activeIndex, syncActiveIndexFromScroll, loading, filteredReels.length]);

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
      if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current);
    };
  }, []);

  const activeReel = filteredReels[activeIndex] || null;
  const liveNowCount = useMemo(
    () => reels.filter((r) => r.kind === "live" && r.liveStatus === "live").length,
    [reels]
  );

  const goPrev = useCallback(() => {
    scrollToReelIndex(activeIndex - 1, "smooth");
  }, [activeIndex, scrollToReelIndex]);

  const goNext = useCallback(() => {
    scrollToReelIndex(activeIndex + 1, "smooth");
  }, [activeIndex, scrollToReelIndex]);

  // Keyboard navigation when not typing & Escape to close overlays
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteTargetReel && !deletingReel) {
          setDeleteTargetReel(null);
          return;
        }
        if (shareReel) {
          setShareReel(null);
          return;
        }
        if (composerOpen) {
          setComposerOpen(false);
          return;
        }
        if (mobileSheetOpen) {
          setMobileSheetOpen(false);
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        deleteTargetReel ||
        composerOpen ||
        shareReel ||
        mobileSheetOpen ||
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
  }, [composerOpen, deleteTargetReel, deletingReel, mobileSheetOpen, shareReel, goNext, goPrev]);

  // Lock background scroll while full-screen modal / bottom sheet is open
  useEffect(() => {
    if (!composerOpen && !mobileSheetOpen && !shareReel && !deleteTargetReel) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [composerOpen, mobileSheetOpen, shareReel, deleteTargetReel]);

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

  const buildShareUrl = useCallback((reel: StudyReel) => {
    return `${window.location.origin}${window.location.pathname}?page=reels&reel=${encodeURIComponent(reel.id)}`;
  }, []);

  const copyShareUrl = useCallback(
    async (reel: StudyReel) => {
      const url = buildShareUrl(reel);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Fallback ignored if clipboard permissions are restricted
      }
      setCopiedId(reel.id);
      window.setTimeout(() => setCopiedId((prev) => (prev === reel.id ? null : prev)), 2200);
    },
    [buildShareUrl]
  );

  const handleShareReel = (reel: StudyReel) => {
    setShareNoteCopied(false);
    setShareReel(reel);
  };

  const handleCopyStudyInvite = async (reel: StudyReel) => {
    const url = buildShareUrl(reel);
    const topicLabel = getTopicMeta(reel.topic).label;
    const summary = `${reel.kind === "live" ? "Live CSE Coaching" : "CSE Study Reel"}: ${reel.title} (${topicLabel} · ${reel.label})\n${url}`;
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // Ignore restricted clipboard
    }
    setShareNoteCopied(true);
    window.setTimeout(() => setShareNoteCopied(false), 2200);
  };

  const handleNativeShare = async (reel: StudyReel) => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    const url = buildShareUrl(reel);
    try {
      await navigator.share({
        title: reel.title,
        text: `${reel.title} — ${getTopicMeta(reel.topic).label} CSE Review`,
        url,
      });
    } catch {
      // User dismissed native share sheet
    }
  };

  const handleConfirmDeleteReel = async () => {
    if (!deleteTargetReel || deletingReel) return;
    setDeletingReel(true);
    try {
      await studyReelsModel.deleteReel(deleteTargetReel.id);
      setReels((prev) => prev.filter((r) => r.id !== deleteTargetReel.id));
      setDeleteTargetReel(null);
    } finally {
      setDeletingReel(false);
    }
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
      isQuestion: askHostFlag,
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
    if (postUrl.startsWith("blob:")) {
      URL.revokeObjectURL(postUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setPostVideoFile(file);
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

    if (postSourceType === "video") {
      if (!postVideoFile && !postUrl.trim()) {
        setPostError("Please choose a .mp4 or .webm video clip to upload.");
        return;
      }
    } else if (postSourceType === "youtube") {
      const parsed = parseVideoSource(postUrl);
      if (!parsed.valid) {
        setPostError(parsed.error);
        return;
      }
      finalSourceType = parsed.sourceType;
      if (parsed.sourceType === "youtube") {
        const rawTrimmed = postUrl.trim();
        finalMediaUrl = /^https?:\/\//i.test(rawTrimmed) ? rawTrimmed : `https://${rawTrimmed}`;
      } else {
        finalMediaUrl = parsed.mediaUrl;
      }
    } else if (!postSlideText.trim()) {
      setPostError("Add study board notes for your micro-lesson clip.");
      return;
    }

    let quizCheck: StudyReel["quizCheck"] = null;
    if (postQuizPrompt.trim()) {
      const indexedChoices = postQuizChoices
        .map((c, origIdx) => ({ text: c.trim(), origIdx }))
        .filter((item) => Boolean(item.text));
      if (indexedChoices.length < 2) {
        setPostError("Quick Check requires at least 2 answer choices (or leave the quiz prompt blank).");
        return;
      }
      const mappedCorrect = indexedChoices.findIndex((item) => item.origIdx === postQuizCorrect);
      if (mappedCorrect < 0) {
        setPostError(`Choice ${LETTERS[postQuizCorrect]} is marked correct but is currently empty.`);
        return;
      }
      quizCheck = {
        prompt: postQuizPrompt.trim(),
        choices: indexedChoices.map((item) => item.text),
        correct: mappedCorrect,
        explanation: postDescription.trim() || "Review the explanation in the clip above.",
      };
    }

    setPosting(true);
    try {
      if (postSourceType === "video") {
        if (postVideoFile) {
          const uploaded = await uploadReelVideo(postVideoFile, currentUser?.id);
          finalSourceType = "video";
          finalMediaUrl = uploaded.mediaUrl;
        } else {
          const parsed = parseVideoSource(postUrl);
          if (!parsed.valid || parsed.sourceType !== "video") {
            setPostError("Please choose a valid .mp4 or .webm video clip.");
            return;
          }
          finalSourceType = "video";
          finalMediaUrl = parsed.mediaUrl;
        }
      }

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

      if (postUrl.startsWith("blob:")) {
        URL.revokeObjectURL(postUrl);
      }
      setReels((prev) => [created, ...prev]);
      setFeedMode("all");
      setTopicFilter("all");
      setSearch("");
      scrollToReelIndex(0, "auto");
      setComposerOpen(false);
      setPostTitle("");
      setPostDescription("");
      setPostUrl("");
      setPostVideoFile(null);
      setPostQuizPrompt("");
      setPostQuizChoices(["", "", "", ""]);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Could not save your video clip.");
    } finally {
      setPosting(false);
    }
  };

  const composerTopicOptions = useMemo(
    () =>
      TOPICS.map((t) => ({
        value: t.id,
        label: t.label,
        icon: renderTopicIcon(t.id, t.color, 14),
      })),
    []
  );

  const topicSelectOptions = useMemo(
    () => [
      {
        value: "all",
        label: "All Subjects",
        icon: (
          <Layers
            size={14}
            data-colored="true"
            className="qb-topic-icon shrink-0 text-qb-accent"
          />
        ),
      },
      ...composerTopicOptions,
    ],
    [composerTopicOptions]
  );

  const activeComments = activeReel ? commentsByReel[activeReel.id] || [] : [];
  const activeQuizAnswer = activeReel ? quizAnswers[activeReel.id] : undefined;

  const renderCompanionContent = () => {
    if (!activeReel) return null;

    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* Segmented Companion Tabs */}
        <div
          className="shrink-0 grid grid-cols-3 gap-1 rounded-xl border border-qb-border bg-qb-input p-1"
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

        {/* Quick Check Tab (scrollable question body, docked bottom action bar) */}
        {companionTab === "quiz" && (
          <div className="relative mt-3 flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-6 space-y-4">
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
            </div>

            {/* Docked Quick Actions with Soft Top Fade */}
            <div className="relative shrink-0 pt-2">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-7 left-0 right-0 h-7"
                style={{
                  background:
                    "linear-gradient(to top, var(--surface) 18%, color-mix(in srgb, var(--surface) 82%, transparent) 58%, transparent 100%)",
                }}
              />
              <div className="relative z-10 flex flex-wrap items-center gap-2">
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
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-qb-border bg-qb-input px-3.5 py-2.5 text-xs font-semibold text-qb-heading hover:border-qb-border-hover hover:bg-qb-surface-hover transition-colors cursor-pointer min-h-[42px]"
                  >
                    <Layers size={14} className="text-qb-accent" />
                    <span>Drill {getTopicMeta(activeReel.topic).label}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Q&A Tab (Scroll ends cleanly on comment body, fading smoothly into docked modern composer) */}
        {companionTab === "chat" && (
          <div className="relative mt-3 flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-8 space-y-2.5">
              {activeComments.length === 0 ? (
                <div className="rounded-2xl border border-qb-border bg-qb-input/70 p-6 text-center space-y-1.5">
                  <MessageCircle size={20} className="mx-auto text-qb-accent" />
                  <p className="text-xs font-bold text-qb-heading">Start the study thread</p>
                  <p className="text-xs text-qb-muted">
                    Ask a question for the host or drop a quick memory shortcut below.
                  </p>
                </div>
              ) : (
                activeComments.map((c) => {
                  const isMine =
                    (currentUser?.id && c.userId === currentUser.id) || c.userId === "local_user";
                  const isHost = /host|instructor|admin|specialist/i.test(c.authorRole || "");
                  return (
                    <div
                      key={c.id}
                      className={`group rounded-2xl border p-3.5 space-y-1.5 transition-colors ${
                        c.isQuestion
                          ? "border-amber-500/30 bg-amber-500/[0.05]"
                          : "border-qb-border bg-qb-input/85 hover:border-qb-border-hover"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight ${
                              isHost
                                ? "bg-amber-500/20 text-amber-300 light:text-amber-700 border border-amber-500/35"
                                : "bg-qb-surface text-qb-heading border border-qb-border"
                            }`}
                          >
                            {getAuthorInitials(c.authorName)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
                              <span className="font-bold text-qb-heading truncate">
                                {c.authorName}
                              </span>
                              <span className="text-[11px] text-qb-muted truncate">
                                · {c.authorRole}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[11px] text-qb-muted">
                          {c.isQuestion && (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-400 light:text-amber-700">
                              <HelpCircle size={12} />
                              Question
                            </span>
                          )}
                          <span className="tabular-nums">{formatRelativeTime(c.createdAt)}</span>
                          {isMine && !c.id.startsWith("rc-") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(activeReel.id, c.id)}
                              aria-label="Delete comment"
                              title="Delete comment"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-qb-muted hover:bg-rose-500/15 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="pl-9 text-xs sm:text-[13px] leading-relaxed text-qb-text break-words">
                        {c.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Docked Floating-Style Composer with Top Fade Mask */}
            <div className="relative shrink-0 pt-2">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 left-0 right-0 h-10"
                style={{
                  background:
                    "linear-gradient(to top, var(--surface) 18%, color-mix(in srgb, var(--surface) 84%, transparent) 58%, transparent 100%)",
                }}
              />

              <form
                onSubmit={handleAddComment}
                className="relative z-10 rounded-2xl border border-qb-border bg-qb-input/95 shadow-[0_10px_28px_rgba(0,0,0,0.24)] focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/15 transition-all"
              >
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (commentText.trim()) {
                        e.currentTarget.form?.requestSubmit();
                      }
                    }
                  }}
                  placeholder={
                    activeReel.kind === "live"
                      ? "Ask a live review question or share a shortcut..."
                      : "Add a mnemonic, shortcut, or study note..."
                  }
                  aria-label={
                    activeReel.kind === "live"
                      ? "Ask a live review question"
                      : "Add a mnemonic or study note"
                  }
                  className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1.5 text-xs sm:text-[13px] leading-relaxed text-qb-heading placeholder:text-qb-muted focus:outline-none max-h-24"
                />

                <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAskHostFlag((prev) => !prev)}
                    aria-pressed={askHostFlag}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      askHostFlag
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-300 light:text-amber-700"
                        : "border-qb-border bg-qb-surface/80 text-qb-muted hover:border-qb-border-hover hover:text-qb-heading"
                    }`}
                  >
                    <HelpCircle
                      size={13}
                      className={askHostFlag ? "text-amber-400 light:text-amber-600 shrink-0" : "shrink-0"}
                    />
                    <span>
                      {activeReel.kind === "live" ? "Tag for Live Host" : "Mark as Question"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-[11px] text-qb-muted">
                      Enter to send
                    </span>
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      aria-label="Send message"
                      title="Send message"
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                        commentText.trim()
                          ? "bg-amber-500 text-[#070c18] hover:bg-amber-400 shadow-sm cursor-pointer"
                          : "bg-qb-surface text-qb-muted opacity-45 cursor-not-allowed"
                      }`}
                    >
                      <ArrowUp size={15} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Queue Tab (Scrollable list with soft bottom fade edge) */}
        {companionTab === "queue" && (
          <div className="relative mt-3 flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-8 space-y-2">
              {filteredReels.map((item, idx) => {
                const selected = idx === activeIndex;
                const topic = getTopicMeta(item.topic);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      scrollToReelIndex(idx, "smooth");
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
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
              style={{
                background:
                  "linear-gradient(to top, var(--surface) 10%, color-mix(in srgb, var(--surface) 75%, transparent) 55%, transparent 100%)",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const hasActiveSearchOrTopic = topicFilter !== "all" || search.trim().length > 0;

  return (
    <div className="fu relative flex h-full min-h-0 flex-col gap-1.5 sm:gap-2.5 overflow-hidden">
      {/* Compact Workspace Header + Toolbar */}
      <div className="shrink-0 relative z-30 flex flex-col gap-1.5 sm:gap-2 border-b border-qb-border pb-1 sm:pb-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="hidden sm:flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-qb-heading whitespace-nowrap">
            Micro-Lessons & Live Coaching
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-qb-muted whitespace-nowrap">
            <span className="tabular-nums">{reels.length} clips</span>
            {liveNowCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-bold text-rose-400 light:text-rose-600 tabular-nums">
                  <Radio size={11} aria-hidden="true" />
                  {liveNowCount} Live
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mobile Ultra-Compact Single-Row Top Bar */}
        <div className="flex sm:hidden items-center justify-between gap-2 h-8">
          <div
            className="flex items-center gap-3 min-w-0 overflow-x-auto qb-no-scrollbar"
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
            ).map((tab) => {
              const active = feedMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFeedMode(tab.id);
                    scrollToReelIndex(0, "auto");
                  }}
                  className={`relative flex h-8 items-center px-0.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    active ? "text-qb-heading" : "text-qb-muted hover:text-qb-heading"
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-amber-400"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              aria-label="Search and subject filter"
              title="Search & Filter"
              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                mobileFiltersOpen || hasActiveSearchOrTopic
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300 light:text-amber-700"
                  : "border-qb-border bg-qb-input text-qb-muted hover:text-qb-heading"
              }`}
            >
              {mobileFiltersOpen ? <X size={14} /> : <Search size={14} />}
              {hasActiveSearchOrTopic && !mobileFiltersOpen && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileFiltersOpen(false);
                setComposerOpen(true);
              }}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-amber-500 px-2.5 text-[11px] font-bold text-[#070c18] hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={13} />
              <span>Post</span>
            </button>
          </div>
        </div>

        {/* Mobile Floating Search & Subject Popover (takes 0px vertical space when closed) */}
        {mobileFiltersOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 mt-1.5 z-40 rounded-xl border border-qb-border bg-qb-surface/95 backdrop-blur-md p-2 shadow-xl space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-[132px] shrink-0 [&_.qb-select-btn]:!min-h-[34px] [&_.qb-select-btn]:!h-[34px] [&_.qb-select-btn]:!py-1 [&_.qb-select-btn]:!px-2.5 [&_.qb-select-btn]:!rounded-lg [&_.qb-select-btn]:!text-[11px]">
                <CustomSelect
                  value={topicFilter}
                  onChange={(val) => {
                    setTopicFilter(val);
                    scrollToReelIndex(0, "auto");
                  }}
                  options={topicSelectOptions}
                  placeholder="All Subjects"
                />
              </div>

              <div className="relative flex-1 min-w-0">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-qb-muted"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    scrollToReelIndex(0, "auto");
                  }}
                  placeholder="Search clips..."
                  aria-label="Search clips or live streams"
                  className="h-[34px] w-full rounded-lg border border-qb-border bg-qb-input pl-8 pr-2.5 text-[11px] text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              {hasActiveSearchOrTopic && (
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter("all");
                    setSearch("");
                    scrollToReelIndex(0, "auto");
                  }}
                  className="h-[34px] shrink-0 rounded-lg border border-qb-border bg-qb-input px-2 text-[11px] font-semibold text-qb-muted hover:text-qb-heading cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop / Tablet Full Toolbar */}
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          {/* Segmented Feed Mode */}
          <div
            className="inline-flex h-[36px] items-center gap-0.5 rounded-xl border border-qb-border bg-qb-input p-0.5"
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
                  scrollToReelIndex(0, "auto");
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  feedMode === tab.id
                    ? "bg-qb-surface text-qb-heading shadow-sm border border-qb-border"
                    : "text-qb-muted hover:text-qb-heading"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-[158px] shrink-0 [&_.qb-select-btn]:!min-h-[36px] [&_.qb-select-btn]:!h-[36px] [&_.qb-select-btn]:!py-1 [&_.qb-select-btn]:!px-2.5 [&_.qb-select-btn]:!rounded-xl [&_.qb-select-btn]:!text-xs">
            <CustomSelect
              value={topicFilter}
              onChange={(val) => {
                setTopicFilter(val);
                scrollToReelIndex(0, "auto");
              }}
              options={topicSelectOptions}
              placeholder="All Subjects"
            />
          </div>

          <div className="relative flex-initial w-44">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-qb-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                scrollToReelIndex(0, "auto");
              }}
              placeholder="Search clips..."
              aria-label="Search clips or live streams"
              className="h-[36px] w-full rounded-xl border border-qb-border bg-qb-input pl-8 pr-2.5 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex h-[36px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-bold text-[#070c18] hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span>Post Clip / Go Live</span>
          </button>
        </div>
      </div>

      {/* Main Theater + Companion Grid */}
      {loading ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-6 xl:col-span-7 flex h-full min-h-0 justify-center">
            <div className="h-full w-full max-w-[440px] lg:max-w-[410px] animate-pulse rounded-2xl border border-qb-border bg-qb-surface" />
          </div>
          <div className="hidden lg:block lg:col-span-6 xl:col-span-5 h-full animate-pulse rounded-2xl border border-qb-border bg-qb-surface" />
        </div>
      ) : filteredReels.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center rounded-2xl border border-qb-border bg-qb-surface p-8 sm:p-10 text-center space-y-3">
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
                scrollToReelIndex(0, "auto");
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
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
          {/* Left / Center: Native CSS Scroll-Snap Vertical Reels Stage */}
          <div className="lg:col-span-6 xl:col-span-7 flex h-full min-h-0 justify-center">
            <div
              ref={feedScrollRef}
              onScroll={handleFeedScroll}
              aria-label="Vertical study reels feed"
              className="qb-reels-snap-feed h-full w-full max-w-[440px] lg:max-w-[410px] min-h-0 overflow-y-auto overscroll-y-contain rounded-2xl"
            >
              {filteredReels.map((reel, idx) => (
                <div
                  key={reel.id}
                  className="h-full w-full shrink-0 snap-start snap-always"
                >
                  <ReelStageCard
                    reel={reel}
                    isActive={idx === activeIndex}
                    shouldMountMedia={Math.abs(idx - activeIndex) <= 1}
                    isMuted={isMuted}
                    playbackRate={playbackRate}
                    liked={likedIds.has(reel.id)}
                    bookmarked={bookmarkedIds.has(reel.id)}
                    reminded={reminderIds.has(reel.id)}
                    commentCount={(commentsByReel[reel.id] || []).length}
                    copiedId={copiedId}
                    canDelete={
                      !reel.isStarter &&
                      (isAdmin ||
                        (currentUser?.id && reel.userId === currentUser.id) ||
                        reel.userId === "local_user")
                    }
                    liteMode={liteMode}
                    onToggleMute={() => setIsMuted((m) => !m)}
                    onCycleRate={() =>
                      setPlaybackRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))
                    }
                    onToggleLike={() => handleToggleLike(reel.id)}
                    onToggleBookmark={() => handleToggleBookmark(reel.id)}
                    onToggleReminder={() => handleToggleReminder(reel.id)}
                    onShare={() => handleShareReel(reel)}
                    onOpenCompanion={(tab) => {
                      setCompanionTab(tab);
                      setMobileSheetOpen(true);
                    }}
                    onDelete={() => setDeleteTargetReel(reel)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Companion Panel (Desktop/Tablet Large) */}
          <aside
            className="hidden lg:flex lg:col-span-6 xl:col-span-5 h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5"
            aria-label="Study companion and live Q&A"
          >
            {renderCompanionContent()}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Sheet for Quiz / Live Q&A / Queue (Portaled to root so header/sidepanel dim & blur) */}
      {mobileSheetOpen &&
        activeReel &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[700] flex items-end lg:hidden ${
              liteMode ? "bg-black/80" : "bg-black/70 backdrop-blur-md"
            }`}
            onClick={() => setMobileSheetOpen(false)}
          >
            <div
              className="w-full h-[80dvh] max-h-[82dvh] rounded-t-3xl border-t border-qb-border bg-qb-surface p-4 pb-5 flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-qb-border" />
              <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-qb-heading truncate">
                  {activeReel.title}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  aria-label="Close panel"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-qb-border bg-qb-input text-qb-heading cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{renderCompanionContent()}</div>
            </div>
          </div>,
          document.querySelector(".qb") || document.body
        )}

      {/* Post Review Clip / Go Live Modal (Portaled to root so header & sidepanel dim & blur properly) */}
      {composerOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[700] flex items-center justify-center p-2.5 sm:p-5 ${
              liteMode ? "bg-black/80" : "bg-slate-950/75 backdrop-blur-md"
            }`}
            onClick={() => setComposerOpen(false)}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="reels-composer-title"
              onSubmit={handleCreateReel}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-[min(880px,calc(100vw-1.25rem))] sm:max-w-[min(880px,calc(100vw-2.5rem))] max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(92dvh,680px)] flex-col overflow-hidden rounded-2xl border border-qb-border bg-qb-surface shadow-[0_28px_75px_rgba(0,0,0,0.65)]"
            >
              {/* Fixed Modal Header */}
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-qb-border px-4 py-3 sm:px-6 sm:py-3.5">
                <div className="min-w-0">
                  <h2
                    id="reels-composer-title"
                    className="text-base sm:text-lg font-extrabold tracking-tight text-qb-heading"
                  >
                    Post Review Clip or Live Stream
                  </h2>
                  <p className="mt-0.5 text-xs text-qb-muted">
                    Share a YouTube Short, video clip, live coaching link, or interactive lesson board.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  aria-label="Close modal"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-qb-border bg-qb-input text-qb-muted hover:text-qb-heading hover:border-qb-border-hover transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Responsive Two-Column Body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-start">
                  {/* Left Column: Session Format, Media Source & Core Copy */}
                  <div className="md:col-span-7 space-y-3">
                    {/* Session Format Switch */}
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold text-qb-heading">Session Format</span>
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-qb-border bg-qb-input p-1">
                        <button
                          type="button"
                          onClick={() => setPostKind("short")}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                            postKind === "short"
                              ? "bg-qb-surface text-qb-heading border border-amber-500/55 shadow-sm"
                              : "text-qb-muted hover:text-qb-heading"
                          }`}
                        >
                          <Clapperboard size={14} className={postKind === "short" ? "text-amber-400 light:text-amber-600 shrink-0" : "shrink-0"} />
                          <span>Review Short</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostKind("live")}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                            postKind === "live"
                              ? "bg-qb-surface text-qb-heading border border-rose-500/55 shadow-sm"
                              : "text-qb-muted hover:text-qb-heading"
                          }`}
                        >
                          <Radio size={14} className="text-rose-400 light:text-rose-600 shrink-0" />
                          <span>Live Stream</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Live Timing Controls when Live Stream is selected */}
                    {postKind === "live" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-qb-border bg-qb-input/60 p-2.5">
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-qb-heading">Live Status</span>
                          <div className="grid grid-cols-2 gap-1 rounded-lg border border-qb-border bg-qb-surface p-0.5">
                            <button
                              type="button"
                              onClick={() => setPostLiveStatus("live")}
                              className={`rounded-md py-1.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                                postLiveStatus === "live"
                                  ? "bg-rose-500/18 text-rose-300 light:text-rose-700"
                                  : "text-qb-muted hover:text-qb-heading"
                              }`}
                            >
                              Live Now
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostLiveStatus("upcoming")}
                              className={`rounded-md py-1.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                                postLiveStatus === "upcoming"
                                  ? "bg-amber-500/18 text-amber-300 light:text-amber-700"
                                  : "text-qb-muted hover:text-qb-heading"
                              }`}
                            >
                              Schedule
                            </button>
                          </div>
                        </div>

                        {postLiveStatus === "upcoming" ? (
                          <div className="space-y-1">
                            <label
                              htmlFor="reel-scheduled-at"
                              className="text-xs font-bold text-qb-heading flex items-center gap-1.5"
                            >
                              <Clock size={12} className="text-qb-accent shrink-0" />
                              <span>Start Date & Time</span>
                            </label>
                            <input
                              id="reel-scheduled-at"
                              type="datetime-local"
                              value={postScheduledAt}
                              onChange={(e) => setPostScheduledAt(e.target.value)}
                              className="w-full rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs text-qb-heading focus:border-amber-500/60 focus:outline-none min-h-[34px]"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center text-xs leading-snug text-qb-muted">
                            Pinned near the top of the Reels & Live feed right away.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Segmented Media Source Picker */}
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold text-qb-heading">Media Source</span>
                      <div className="grid grid-cols-3 gap-1 rounded-xl border border-qb-border bg-qb-input p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (postUrl.startsWith("blob:")) {
                              URL.revokeObjectURL(postUrl);
                              setPostUrl("");
                            }
                            setPostVideoFile(null);
                            setPostSourceType("youtube");
                            setPostError("");
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                            postSourceType === "youtube"
                              ? "bg-qb-surface text-qb-heading border border-amber-500/55 shadow-sm"
                              : "text-qb-muted hover:text-qb-heading"
                          }`}
                        >
                          <Link2 size={13} className={postSourceType === "youtube" ? "text-qb-accent shrink-0" : "shrink-0"} />
                          <span>Video URL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (postUrl && !postUrl.startsWith("blob:")) {
                              setPostUrl("");
                            }
                            setPostSourceType("video");
                            setPostError("");
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                            postSourceType === "video"
                              ? "bg-qb-surface text-qb-heading border border-amber-500/55 shadow-sm"
                              : "text-qb-muted hover:text-qb-heading"
                          }`}
                        >
                          <Upload size={13} className={postSourceType === "video" ? "text-qb-accent shrink-0" : "shrink-0"} />
                          <span className="sm:hidden">Upload</span>
                          <span className="hidden sm:inline">Upload Clip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPostSourceType("lesson");
                            setPostError("");
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
                            postSourceType === "lesson"
                              ? "bg-qb-surface text-qb-heading border border-amber-500/55 shadow-sm"
                              : "text-qb-muted hover:text-qb-heading"
                          }`}
                        >
                          <Layers size={13} className={postSourceType === "lesson" ? "text-qb-accent shrink-0" : "shrink-0"} />
                          <span className="sm:hidden">Board</span>
                          <span className="hidden sm:inline">Lesson Board</span>
                        </button>
                      </div>

                      {postSourceType === "youtube" && (
                        <div className="space-y-1 pt-0.5">
                          <label htmlFor="reel-media-url" className="block text-xs font-semibold text-qb-muted">
                            YouTube / Shorts / Live or .mp4 URL
                          </label>
                          <input
                            id="reel-media-url"
                            type="url"
                            value={postUrl}
                            onChange={(e) => setPostUrl(e.target.value)}
                            placeholder="https://youtube.com/shorts/... or https://youtube.com/live/..."
                            className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[38px]"
                          />
                        </div>
                      )}

                      {postSourceType === "video" && (
                        <div className="pt-0.5">
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
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-qb-border-hover bg-qb-input px-4 py-2.5 text-xs font-semibold text-qb-heading hover:border-amber-500/60 transition-colors cursor-pointer min-h-[42px]"
                          >
                            <Upload size={15} className="text-qb-accent shrink-0" />
                            <span>
                              {postUrl ? "Video clip ready — click to replace" : "Choose .mp4 or .webm review clip"}
                            </span>
                          </button>
                        </div>
                      )}

                      {postSourceType === "lesson" && (
                        <div className="space-y-1 pt-0.5">
                          <label htmlFor="reel-lesson-board" className="block text-xs font-semibold text-qb-muted">
                            Micro-Lesson Board Content (Markdown & KaTeX supported)
                          </label>
                          <textarea
                            id="reel-lesson-board"
                            rows={2}
                            value={postSlideText}
                            onChange={(e) => setPostSlideText(e.target.value)}
                            className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading focus:border-amber-500/60 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Title & Short Caption */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2.5">
                      <div className="space-y-1">
                        <label htmlFor="reel-title" className="block text-xs font-bold text-qb-heading">
                          Title
                        </label>
                        <input
                          id="reel-title"
                          type="text"
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          placeholder="e.g. Double Word Analogy Shortcut"
                          className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[38px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="reel-caption" className="block text-xs font-bold text-qb-heading">
                          Short Caption
                        </label>
                        <input
                          id="reel-caption"
                          type="text"
                          value={postDescription}
                          onChange={(e) => setPostDescription(e.target.value)}
                          placeholder="Key takeaway viewers should remember..."
                          className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[38px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Classification & Active Recall Check */}
                  <div className="md:col-span-5 space-y-3 md:border-l md:border-qb-border md:pl-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                      <div className="space-y-1 [&_.qb-select-btn]:!min-h-[38px] [&_.qb-select-btn]:!rounded-xl [&_.qb-select-btn]:!text-xs">
                        <span className="block text-xs font-bold text-qb-heading">CSE Subject</span>
                        <CustomSelect
                          value={postTopic}
                          onChange={(val) => setPostTopic(val as TopicId)}
                          options={composerTopicOptions}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="reel-subtopic" className="block text-xs font-bold text-qb-heading">
                          Sub-Topic Label
                        </label>
                        <input
                          id="reel-subtopic"
                          type="text"
                          value={postLabel}
                          onChange={(e) => setPostLabel(e.target.value)}
                          placeholder="e.g. Word Analogy, Ratio, RA 6713"
                          className="w-full rounded-xl border border-qb-border bg-qb-input px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[38px]"
                        />
                      </div>
                    </div>

                    {/* Optional Active Recall Quick Check */}
                    <div className="space-y-2 rounded-xl border border-qb-border bg-qb-input/65 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-qb-heading">
                          <Target size={14} className="text-qb-accent shrink-0" />
                          <span>Optional Quick Check</span>
                        </div>
                        <span className="text-[11px] font-medium text-qb-muted">Recommended</span>
                      </div>
                      <input
                        type="text"
                        value={postQuizPrompt}
                        onChange={(e) => setPostQuizPrompt(e.target.value)}
                        placeholder="Quick practice question tied to this clip..."
                        aria-label="Quick check practice question"
                        className="w-full rounded-lg border border-qb-border bg-qb-surface px-3 py-2 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[38px]"
                      />
                      {postQuizPrompt.trim() ? (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="text-[11px] text-qb-muted">
                            Tap A–D to mark the correct answer:
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {postQuizChoices.map((ch, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPostQuizCorrect(idx)}
                                  title="Mark as correct answer"
                                  className={`h-8 w-8 shrink-0 rounded-lg border text-xs font-bold cursor-pointer ${
                                    postQuizCorrect === idx
                                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 light:text-emerald-700"
                                      : "border-qb-border bg-qb-surface text-qb-muted hover:text-qb-heading"
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
                                  className="w-full rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs text-qb-heading placeholder:text-qb-muted focus:border-amber-500/60 focus:outline-none min-h-[34px]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] leading-relaxed text-qb-muted">
                          Enter a question above to unlock A–D answer choices for active recall right beside your video.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer (Always Visible) */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-qb-border bg-qb-surface px-4 py-2.5 sm:px-6 sm:py-3">
                <div className="min-w-0 flex-1">
                  {postError ? (
                    <p className="text-xs font-semibold text-rose-400 light:text-rose-600">
                      {postError}
                    </p>
                  ) : (
                    <p className="text-xs text-qb-muted">
                      {postKind === "live"
                        ? "Live sessions prioritize near the top of the Review Reels feed."
                        : "Clips appear immediately in Study Reels & Live Review."}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="rounded-xl border border-qb-border bg-qb-input px-4 py-2 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover transition-colors cursor-pointer min-h-[38px] whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={posting}
                    className="rounded-xl bg-amber-500 px-4 sm:px-5 py-2 text-xs font-bold text-[#070c18] hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer min-h-[38px] whitespace-nowrap"
                  >
                    {posting ? "Publishing..." : postKind === "live" ? "Publish Live Room" : "Publish Short"}
                  </button>
                </div>
              </div>
            </form>
          </div>,
          document.querySelector(".qb") || document.body
        )}

      {/* Share Study Session Modal */}
      {shareReel &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[700] flex items-center justify-center p-4 ${
              liteMode ? "bg-black/80" : "bg-slate-950/75 backdrop-blur-md"
            }`}
            onClick={() => setShareReel(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-reel-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-qb-border bg-qb-surface shadow-[0_28px_75px_rgba(0,0,0,0.65)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-qb-border px-5 py-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Share2 size={16} className="text-qb-accent shrink-0" />
                  <h2 id="share-reel-title" className="text-base font-extrabold text-qb-heading truncate">
                    Share Review Session
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShareReel(null)}
                  aria-label="Close share dialog"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-qb-border bg-qb-input text-qb-muted hover:text-qb-heading cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-5">
                {/* Session Preview */}
                <div className="rounded-xl border border-qb-border bg-qb-input p-3.5 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-qb-muted">
                    {shareReel.kind === "live" && shareReel.liveStatus === "live" && (
                      <span className="font-bold text-rose-400 light:text-rose-600">LIVE ·</span>
                    )}
                    <span style={{ color: getTopicMeta(shareReel.topic).color }}>
                      {getTopicMeta(shareReel.topic).label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{shareReel.label}</span>
                  </div>
                  <div className="text-sm font-extrabold text-qb-heading leading-snug line-clamp-2">
                    {shareReel.title}
                  </div>
                  <div className="text-xs text-qb-muted">
                    by {shareReel.creatorName}
                  </div>
                </div>

                {/* Copy Direct Link Row */}
                <div className="space-y-1.5">
                  <label htmlFor="share-reel-url-input" className="block text-xs font-bold text-qb-heading">
                    Direct Session Link
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-qb-border bg-qb-input p-1.5">
                    <input
                      id="share-reel-url-input"
                      type="text"
                      readOnly
                      value={buildShareUrl(shareReel)}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 bg-transparent px-2 text-xs text-qb-heading focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyShareUrl(shareReel)}
                      className={`inline-flex h-9 w-[102px] shrink-0 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        copiedId === shareReel.id
                          ? "bg-emerald-500 text-[#071510]"
                          : "bg-amber-500 text-[#070c18] hover:bg-amber-400"
                      }`}
                    >
                      {copiedId === shareReel.id ? (
                        <>
                          <Check size={14} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Share Channels */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-qb-heading">Quick Share</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyStudyInvite(shareReel)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer min-h-[42px] whitespace-nowrap ${
                        shareNoteCopied
                          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 light:text-emerald-700"
                          : "border-qb-border bg-qb-input text-qb-heading hover:bg-qb-surface-hover"
                      }`}
                    >
                      {shareNoteCopied ? <Check size={14} /> : <Copy size={14} className="text-qb-accent" />}
                      <span>{shareNoteCopied ? "Invite Copied" : "Copy Study Invite"}</span>
                    </button>

                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(buildShareUrl(shareReel))}&text=${encodeURIComponent(shareReel.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover transition-colors min-h-[42px] whitespace-nowrap"
                    >
                      <Send size={14} className="text-sky-400 light:text-sky-600" />
                      <span>Telegram</span>
                    </a>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${shareReel.title} — ${buildShareUrl(shareReel)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover transition-colors min-h-[42px] whitespace-nowrap"
                    >
                      <MessageCircle size={14} className="text-emerald-400 light:text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={`mailto:?subject=${encodeURIComponent(`CSE Review: ${shareReel.title}`)}&body=${encodeURIComponent(`Check out this ${getTopicMeta(shareReel.topic).label} review session on CSE QBANK:\n\n${shareReel.title}\n${buildShareUrl(shareReel)}`)}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover transition-colors min-h-[42px] whitespace-nowrap"
                    >
                      <Mail size={14} className="text-qb-accent" />
                      <span>Email</span>
                    </a>
                  </div>

                  {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                    <button
                      type="button"
                      onClick={() => handleNativeShare(shareReel)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-qb-border bg-qb-input px-3 py-2.5 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover transition-colors cursor-pointer min-h-[42px]"
                    >
                      <Share2 size={14} className="text-qb-accent" />
                      <span>More Sharing Apps…</span>
                    </button>
                  )}

                  {shareReel.mediaUrl && !shareReel.mediaUrl.startsWith("blob:") && (
                    <a
                      href={shareReel.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs font-semibold text-qb-muted hover:text-qb-heading transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Open Original Video Source</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.querySelector(".qb") || document.body
        )}

      {/* Delete Clip Confirmation Modal */}
      {deleteTargetReel &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[720] flex items-center justify-center p-4 ${
              liteMode ? "bg-black/80" : "bg-slate-950/75 backdrop-blur-md"
            }`}
            onClick={() => {
              if (!deletingReel) setDeleteTargetReel(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-reel-modal-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-qb-border bg-qb-surface shadow-[0_28px_75px_rgba(0,0,0,0.65)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-qb-border px-5 py-3.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Trash2 size={16} className="text-rose-400 shrink-0" />
                  <h2 id="delete-reel-modal-title" className="text-sm sm:text-base font-extrabold text-qb-heading truncate">
                    Delete Study Clip
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={deletingReel}
                  onClick={() => setDeleteTargetReel(null)}
                  aria-label="Close delete dialog"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-qb-border bg-qb-input text-qb-muted hover:text-qb-heading disabled:opacity-50 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3.5 p-5">
                <div className="rounded-xl border border-qb-border bg-qb-input p-3 space-y-1">
                  <div className="text-[11px] font-semibold" style={{ color: getTopicMeta(deleteTargetReel.topic).color }}>
                    {getTopicMeta(deleteTargetReel.topic).label} · {deleteTargetReel.label}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-qb-heading line-clamp-2">
                    {deleteTargetReel.title}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-qb-muted">
                  Are you sure you want to permanently remove this clip from Study Reels? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={deletingReel}
                    onClick={() => setDeleteTargetReel(null)}
                    className="rounded-xl border border-qb-border bg-qb-input px-4 py-2 text-xs font-bold text-qb-heading hover:bg-qb-surface-hover disabled:opacity-50 transition-colors cursor-pointer min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deletingReel}
                    onClick={handleConfirmDeleteReel}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer min-h-[38px]"
                  >
                    {deletingReel ? "Deleting..." : "Delete Clip"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.querySelector(".qb") || document.body
        )}
    </div>
  );
}
