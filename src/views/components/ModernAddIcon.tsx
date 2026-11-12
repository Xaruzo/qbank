import React from "react";

export interface ModernAddIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

/**
 * ModernAddIcon
 * A modern, geometric add icon featuring an ambient optical backing,
 * precision micro-ring, rounded cross terminals, and optical center core.
 */
export const ModernAddIcon: React.FC<ModernAddIconProps> = ({
  size = 16,
  className = "",
  color = "currentColor",
  strokeWidth = 2.4,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`qb-modern-add-icon ${className}`.trim()}
      aria-hidden="true"
      {...props}
    >
      {/* Subtle modern circular ambient backdrop */}
      <circle
        cx="12"
        cy="12"
        r="10"
        className="qb-modern-add-bg"
        fill="currentColor"
        fillOpacity="0.14"
      />

      {/* Precision micro-ring with subtle tech accent */}
      <circle
        cx="12"
        cy="12"
        r="8.75"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeOpacity="0.32"
        strokeDasharray="2.5 2"
        className="qb-modern-add-ring"
      />

      {/* Modern geometric rounded cross with smooth terminals */}
      <path
        d="M12 7.25V16.75M7.25 12H16.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="qb-modern-add-cross"
      />

      {/* Center optical core dot */}
      <circle
        cx="12"
        cy="12"
        r="1.1"
        fill="currentColor"
        className="qb-modern-add-core"
      />
    </svg>
  );
};

export default ModernAddIcon;
