export type SidebarVariant = "overlay" | "rail";

export const DESKTOP_SIDEBAR_MIN_WIDTH = 1100;
export const MOBILE_SIDEBAR_MAX_WIDTH = 600;
export const PROFILE_POPOVER_PREFERRED_WIDTH = 316;

/**
 * PolicyPulse sidebar architecture:
 * - True mobile (<= 600px) uses a slide-over drawer ("overlay") paired with the mobile tab bar.
 * - Tablet and reduced-width desktop (601px - 1099px) as well as full desktop (>= 1100px)
 *   keep the persistent in-flow left-hand sidebar ("rail"), auto-collapsing to icon-rail mode
 *   below 1100px instead of turning into a mobile modal overlay.
 */
export function getSidebarVariant(isMobile: boolean): SidebarVariant {
  return isMobile ? "overlay" : "rail";
}

export function getInitialSidebarOpen(
  viewportWidth: number,
  storedDesktopPref: string | null | undefined
): boolean {
  if (viewportWidth < DESKTOP_SIDEBAR_MIN_WIDTH) {
    return false;
  }
  if (storedDesktopPref === "0") return false;
  if (storedDesktopPref === "1") return true;
  return true;
}

export function getDesktopRestoreOpen(storedDesktopPref: string | null | undefined): boolean {
  return storedDesktopPref !== "0";
}

/**
 * Computes a comfortable floating popover width so the profile menu never shrinks
 * into a thin/cramped column inside narrower sidebars or drawers, while safely
 * clamping to the viewport with 12px horizontal gutters on each side.
 */
export function getProfilePopoverWidth(anchorWidth: number, viewportWidth: number): number {
  const safeViewportMax = Math.max(240, viewportWidth - 24);
  return Math.min(Math.max(anchorWidth, PROFILE_POPOVER_PREFERRED_WIDTH), safeViewportMax);
}
