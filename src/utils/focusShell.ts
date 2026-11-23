/**
 * Views that use a distraction-free "Focus Shell" layout without global
 * top header chrome (profile avatar, notifications) or persistent side navigation.
 */
export function isFocusShellView(view: string): boolean {
  return view === "mockRun" || view === "detail";
}
