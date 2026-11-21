export interface SelectPlacement {
  dir: "down" | "up";
  maxHeight: number;
}

export function computeSelectPlacement(
  rootEl: HTMLElement | null,
  preferredMaxHeight = 264
): SelectPlacement {
  if (!rootEl || typeof window === "undefined") {
    return { dir: "down", maxHeight: preferredMaxHeight };
  }

  const rect = rootEl.getBoundingClientRect();
  const scrollContainer = rootEl.closest(".qb-main, .qb-roster-list-scroll, .qb-settings-users-table-wrap");
  const containerRect = scrollContainer ? scrollContainer.getBoundingClientRect() : null;

  const topBound = containerRect ? Math.max(0, containerRect.top) : 0;
  const bottomBound = containerRect
    ? Math.min(window.innerHeight, containerRect.bottom)
    : window.innerHeight;

  const edgeMargin = 14;
  const spaceBelow = Math.max(0, bottomBound - rect.bottom - edgeMargin);
  const spaceAbove = Math.max(0, rect.top - topBound - edgeMargin);

  const menuEl = rootEl.querySelector<HTMLElement>(".qb-select-menu");
  const scrollEl = rootEl.querySelector<HTMLElement>(".qb-select-menu-scroll");
  let contentHeight = preferredMaxHeight;

  if (scrollEl && scrollEl.scrollHeight > 0) {
    contentHeight = scrollEl.scrollHeight + 10;
  } else if (menuEl && menuEl.scrollHeight > 0) {
    contentHeight = menuEl.scrollHeight;
  } else if (menuEl) {
    const itemCount = menuEl.querySelectorAll(".qb-select-item").length;
    if (itemCount > 0) {
      contentHeight = itemCount * 38 + 10;
    }
  }

  const neededHeight = Math.min(preferredMaxHeight, contentHeight);
  const dir: "down" | "up" =
    spaceBelow < neededHeight && spaceAbove > spaceBelow ? "up" : "down";

  const available = dir === "up" ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, Math.min(preferredMaxHeight, Math.floor(available)));

  return { dir, maxHeight };
}
