export type ParsedVideoSource =
  | {
      valid: true;
      sourceType: "youtube";
      embedUrl: string;
      videoId: string;
      providerLabel: string;
    }
  | {
      valid: true;
      sourceType: "video";
      mediaUrl: string;
      providerLabel: string;
    }
  | {
      valid: false;
      sourceType: "invalid";
      error: string;
    };

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;

function normalizeUrlCandidate(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (/^(?:www\.)?(?:youtube\.com|m\.youtube\.com|youtube-nocookie\.com|youtu\.be)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = normalizeUrlCandidate(rawUrl);
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const vParam = parsed.searchParams.get("v");
    if (vParam && YOUTUBE_ID_RE.test(vParam)) return vParam;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (
      segments.length >= 2 &&
      (segments[0] === "shorts" ||
        segments[0] === "live" ||
        segments[0] === "embed" ||
        segments[0] === "v")
    ) {
      const id = segments[1];
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }
  }

  return null;
}

export function parseVideoSource(rawUrl: string): ParsedVideoSource {
  const trimmed = normalizeUrlCandidate(rawUrl);
  if (!trimmed) {
    return {
      valid: false,
      sourceType: "invalid",
      error: "Paste a YouTube, YouTube Shorts/Live, or direct .mp4/.webm video URL.",
    };
  }

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:video/")) {
    return {
      valid: true,
      sourceType: "video",
      mediaUrl: trimmed,
      providerLabel: "Uploaded Video",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      sourceType: "invalid",
      error: "Please enter a valid https:// video or stream URL.",
    };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      sourceType: "invalid",
      error: "Only http(s) video links are supported.",
    };
  }

  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    return {
      valid: true,
      sourceType: "youtube",
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`,
      providerLabel: parsed.pathname.includes("/shorts/")
        ? "YouTube Shorts"
        : parsed.pathname.includes("/live/")
          ? "YouTube Live"
          : "YouTube",
    };
  }

  const lowerPath = parsed.pathname.toLowerCase();
  if (
    lowerPath.endsWith(".mp4") ||
    lowerPath.endsWith(".webm") ||
    lowerPath.endsWith(".mov") ||
    lowerPath.endsWith(".m4v") ||
    lowerPath.endsWith(".ogg")
  ) {
    return {
      valid: true,
      sourceType: "video",
      mediaUrl: trimmed,
      providerLabel: "Direct Video",
    };
  }

  return {
    valid: false,
    sourceType: "invalid",
    error: "Use a YouTube / YouTube Shorts / YouTube Live link or a direct .mp4/.webm video URL.",
  };
}

export function formatReelDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatLiveSchedule(isoDate?: string | null): string {
  if (!isoDate) return "Scheduled";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Scheduled";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface ReelFilterable {
  id: string;
  kind: "short" | "live";
  topic: string;
  title: string;
  description: string;
  label?: string;
  creatorName: string;
  lessonSteps?: Array<{ heading?: string; board?: string; highlight?: string }>;
  quizCheck?: { prompt?: string } | null;
}

export function filterStudyReels<T extends ReelFilterable>(
  reels: T[],
  options: {
    feedMode: "all" | "shorts" | "live" | "saved";
    topicFilter: string;
    search: string;
    savedIds?: Set<string>;
  }
): T[] {
  const query = options.search.trim().toLowerCase();
  return reels.filter((item) => {
    if (options.feedMode === "shorts" && item.kind !== "short") return false;
    if (options.feedMode === "live" && item.kind !== "live") return false;
    if (options.feedMode === "saved" && !options.savedIds?.has(item.id)) return false;
    if (options.topicFilter !== "all" && item.topic !== options.topicFilter) return false;
    if (query) {
      const stepsText = (item.lessonSteps || [])
        .map((s) => `${s.heading || ""} ${s.board || ""} ${s.highlight || ""}`)
        .join(" ");
      const hay = `${item.title} ${item.description} ${item.label || ""} ${item.creatorName} ${item.topic} ${stepsText} ${item.quizCheck?.prompt || ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}
