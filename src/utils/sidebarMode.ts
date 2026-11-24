export type SidebarVariant = "overlay" | "rail";

export const DESKTOP_SIDEBAR_MIN_WIDTH = 1100;
export const MOBILE_SIDEBAR_MAX_WIDTH = 600;
export const PROFILE_POPOVER_PREFERRED_WIDTH = 288;
export const PROFILE_POPOVER_MIN_EXPANDED_WIDTH = 236;

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
 * Computes the profile popover width:
 * - When opened from the collapsed icon rail (anchorWidth <= 0), uses a sleek 288px flyout.
 * - When opened from an expanded sidebar (anchorWidth > 0), matches the trigger/sidebar width
 *   (min 236px) so the menu aligns with the sidebar border instead of spilling over content.
 * - Always clamps safely within 12px horizontal viewport gutters.
 */
export function getProfilePopoverWidth(anchorWidth: number, viewportWidth: number): number {
  const safeViewportMax = Math.max(220, viewportWidth - 24);
  const targetWidth =
    anchorWidth > 0
      ? Math.max(anchorWidth, PROFILE_POPOVER_MIN_EXPANDED_WIDTH)
      : PROFILE_POPOVER_PREFERRED_WIDTH;
  return Math.min(targetWidth, safeViewportMax);
}
