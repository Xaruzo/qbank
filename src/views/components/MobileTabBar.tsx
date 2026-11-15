import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface MobileTabItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  isLive?: boolean;
  badge?: number | null;
  onClick: () => void;
}

interface MobileTabBarProps {
  items: MobileTabItem[];
  activeId: string;
}

export default function MobileTabBar({ items, activeId }: MobileTabBarProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateGlider = () => {
    const container = innerRef.current;
    const activeEl = tabRefs.current[activeId];
    if (container && activeEl) {
      const cRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setGlider({
        left: elRect.left - cRect.left,
        width: elRect.width,
        ready: elRect.width > 0,
      });
    } else {
      setGlider((prev) => (prev.ready ? { ...prev, ready: false } : prev));
    }
  };

  useLayoutEffect(() => {
    updateGlider();
  }, [activeId, items.length]);

  useEffect(() => {
    const container = innerRef.current;
    window.addEventListener("resize", updateGlider);
    const observer =
      typeof ResizeObserver !== "undefined" && container
        ? new ResizeObserver(() => updateGlider())
        : null;
    if (observer && container) {
      observer.observe(container);
    }
    return () => {
      window.removeEventListener("resize", updateGlider);
      if (observer) observer.disconnect();
    };
  }, [activeId]);

  return (
    <nav className="qb-mobile-tabbar" aria-label="Primary Bottom Navigation">
      <div ref={innerRef} className="qb-mobile-tabbar-inner">
        {glider.ready && (
          <div
            className="qb-mobile-nav-glider"
            style={{
              transform: `translateX(${glider.left}px)`,
              width: `${glider.width}px`,
            }}
            aria-hidden="true"
          >
            <span className="qb-mobile-nav-glider-bar" />
            <span className="qb-mobile-nav-glider-pill" />
          </div>
        )}

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              type="button"
              className={`qb-mobile-tab${isActive ? " on" : ""}`}
              onClick={item.onClick}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.badge ? `${item.label} (${item.badge} new)` : item.label}
            >
              <span className="qb-mobile-tab-indicator" aria-hidden="true" />
              <span className="qb-mobile-tab-surface">
                <span className="qb-mobile-tab-icon-box" aria-hidden="true">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
                  {item.isLive && (
                    <span
                      className="qb-mobile-tab-live-dot"
                      title="Mock exam in progress"
                    />
                  )}
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className="qb-mobile-tab-badge"
                      title={`${item.badge} unread questions`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="qb-mobile-tab-label">
                  {item.shortLabel || item.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
