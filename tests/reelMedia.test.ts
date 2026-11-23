import { describe, it, expect } from "vitest";
import {
  extractYouTubeVideoId,
  parseVideoSource,
  formatReelDuration,
  filterStudyReels,
} from "../src/utils/reelMedia";
import { STARTER_STUDY_REELS } from "../src/models/studyReelsModel";

describe("reelMedia utilities", () => {
  it("parses YouTube watch, shorts, live, and youtu.be URLs into nocookie embed URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtube.com/shorts/AbCdEf12345?feature=share")).toBe("AbCdEf12345");
    expect(extractYouTubeVideoId("https://www.youtube.com/live/LiveId98765?si=1")).toBe("LiveId98765");
    expect(extractYouTubeVideoId("https://youtu.be/ShortLink99")).toBe("ShortLink99");

    const shorts = parseVideoSource("https://youtube.com/shorts/AbCdEf12345");
    expect(shorts.valid).toBe(true);
    if (shorts.valid && shorts.sourceType === "youtube") {
      expect(shorts.providerLabel).toBe("YouTube Shorts");
      expect(shorts.embedUrl).toContain("https://www.youtube-nocookie.com/embed/AbCdEf12345");
    }

    const live = parseVideoSource("https://www.youtube.com/live/LiveId98765");
    expect(live.valid).toBe(true);
    if (live.valid && live.sourceType === "youtube") {
      expect(live.providerLabel).toBe("YouTube Live");
    }
  });

  it("accepts direct video files and rejects invalid links cleanly", () => {
    const mp4 = parseVideoSource("https://cdn.example.com/review/analogy-clip.mp4");
    expect(mp4).toEqual({
      valid: true,
      sourceType: "video",
      mediaUrl: "https://cdn.example.com/review/analogy-clip.mp4",
      providerLabel: "Direct Video",
    });

    const invalid = parseVideoSource("not-a-url");
    expect(invalid.valid).toBe(false);
  });

  it("formats reel durations as m:ss", () => {
    expect(formatReelDuration(0)).toBe("0:00");
    expect(formatReelDuration(28)).toBe("0:28");
    expect(formatReelDuration(95)).toBe("1:35");
  });

  it("filters starter study reels by feed mode, topic, saved ids, and search", () => {
    const liveOnly = filterStudyReels(STARTER_STUDY_REELS, {
      feedMode: "live",
      topicFilter: "all",
      search: "",
    });
    expect(liveOnly.length).toBeGreaterThan(0);
    expect(liveOnly.every((r) => r.kind === "live")).toBe(true);

    const analyticalShorts = filterStudyReels(STARTER_STUDY_REELS, {
      feedMode: "shorts",
      topicFilter: "analytical",
      search: "zimbabwe",
    });
    expect(analyticalShorts.length).toBe(1);
    expect(analyticalShorts[0].id).toBe("reel-analogy-country-continent");

    const saved = filterStudyReels(STARTER_STUDY_REELS, {
      feedMode: "saved",
      topicFilter: "all",
      search: "",
      savedIds: new Set(["reel-numerical-percent-split"]),
    });
    expect(saved.map((r) => r.id)).toEqual(["reel-numerical-percent-split"]);
  });
});
