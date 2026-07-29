import React from "react";

export default function LoadingSpinner({ 
  size = "default", 
  text = "Loading...", 
  fullScreen = false,
  centered = false 
}) {
  const sizeClasses = {
    small: "qb-spinner-sm",
    default: "qb-spinner-md",
    large: "qb-spinner-lg",
  };

  const spinnerClass = sizeClasses[size] || sizeClasses.default;

  const content = (
    <div className={`qb-loading-container${centered ? " qb-loading-centered" : ""}`}>
      <div className={`qb-spinner ${spinnerClass}`} aria-hidden="true">
        <div className="qb-spinner-ring"></div>
        <div className="qb-spinner-ring"></div>
        <div className="qb-spinner-ring"></div>
      </div>
      {text && <div className="qb-loading-text">{text}</div>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="qb-loading-fullscreen">
        {content}
      </div>
    );
  }

  return content;
}
