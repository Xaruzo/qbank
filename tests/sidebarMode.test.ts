import { describe, it, expect } from "vitest";
import {
  getSidebarVariant,
  getInitialSidebarOpen,
  getDesktopRestoreOpen,
  getProfilePopoverWidth,
} from "../src/utils/sidebarMode";

describe("PolicyPulse sidebar architecture helpers", () => {
  it("uses overlay drawer only on mobile and keeps in-flow rail for tablet, compact, and desktop", () => {
    expect(getSidebarVariant(true)).toBe("overlay");
    expect(getSidebarVariant(false)).toBe("rail");
  });

  it("auto-collapses on tablet and reduced-width desktop while honoring persisted wide desktop state", () => {
    expect(getInitialSidebarOpen(375, "1")).toBe(false);
    expect(getInitialSidebarOpen(768, "1")).toBe(false);
    expect(getInitialSidebarOpen(1024, "1")).toBe(false);
    expect(getInitialSidebarOpen(1099, null)).toBe(false);

    expect(getInitialSidebarOpen(1100, null)).toBe(true);
    expect(getInitialSidebarOpen(1440, "1")).toBe(true);
    expect(getInitialSidebarOpen(1440, "0")).toBe(false);
  });

  it("restores expanded desktop state by default unless explicitly collapsed", () => {
    expect(getDesktopRestoreOpen(null)).toBe(true);
    expect(getDesktopRestoreOpen("1")).toBe(true);
    expect(getDesktopRestoreOpen("0")).toBe(false);
  });

  it("matches expanded sidebar width cleanly, floats at 288px from collapsed rail, and clamps on tiny screens", () => {
    // Compact expanded sidebar (228px anchor inside 252px rail) aligns neatly at 236px
    expect(getProfilePopoverWidth(228, 900)).toBe(236);
    // Wide desktop sidebar (251px anchor inside 275px rail) matches the 251px trigger width
    expect(getProfilePopoverWidth(251, 1440)).toBe(251);
    // Collapsed icon rail (anchorWidth = 0) floats as a sleek 288px flyout
    expect(getProfilePopoverWidth(0, 1024)).toBe(288);
    // Wider anchor (if ever > 236px) preserves anchor width
    expect(getProfilePopoverWidth(330, 1440)).toBe(330);
    // Small mobile screen clamps cleanly to viewport - 24px
    expect(getProfilePopoverWidth(0, 280)).toBe(256);
    expect(getProfilePopoverWidth(256, 320)).toBe(256);
  });
});
