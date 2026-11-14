export interface Point2D {
  x: number;
  y: number;
}

export interface ShapeAnchors {
  top: Point2D;
  right: Point2D;
  bottom: Point2D;
  left: Point2D;
  center: Point2D;
}

export interface ConnectionPair {
  from: Point2D;
  to: Point2D;
  nameA: string;
  nameB: string;
}

export const toHighlighterColor = (hex?: string): string => {
  if (!hex || hex === "#1a2540" || hex === "#000000") {
    return "rgba(250, 204, 21, 0.44)";
  }
  const clean = hex.replace("#", "");
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `rgba(${r}, ${g}, ${b}, 0.36)`;
    }
  }
  return "rgba(250, 204, 21, 0.44)";
};

export const getShapeAnchors = (target: any): ShapeAnchors | null => {
  if (!target) return null;
  if (
    typeof target.calcTransformMatrix === "function" &&
    typeof (window as any).fabric !== "undefined" &&
    (window as any).fabric?.util?.transformPoint
  ) {
    const fabric = (window as any).fabric;
    const w = target.width || 0;
    const h = target.height || 0;
    const m = target.calcTransformMatrix();
    const halfW = w / 2;
    const halfH = h / 2;
    return {
      top: fabric.util.transformPoint(new fabric.Point(0, -halfH), m),
      right: fabric.util.transformPoint(new fabric.Point(halfW, 0), m),
      bottom: fabric.util.transformPoint(new fabric.Point(0, halfH), m),
      left: fabric.util.transformPoint(new fabric.Point(-halfW, 0), m),
      center: fabric.util.transformPoint(new fabric.Point(0, 0), m),
    };
  }
  const left = target.left || 0;
  const top = target.top || 0;
  const width = target.width || 0;
  const height = target.height || 0;
  return {
    top: { x: left + width / 2, y: top },
    right: { x: left + width, y: top + height / 2 },
    bottom: { x: left + width / 2, y: top + height },
    left: { x: left, y: top + height / 2 },
    center: { x: left + width / 2, y: top + height / 2 },
  };
};

export const getObjectAnchors = getShapeAnchors;

export const findBestConnection = (
  targetA: any,
  targetB: any
): ConnectionPair | null => {
  const anchorsA = getShapeAnchors(targetA);
  const anchorsB = getShapeAnchors(targetB);
  if (!anchorsA || !anchorsB) return null;
  let bestDist = Infinity;
  let bestPair: ConnectionPair | null = null;
  const ports: (keyof Omit<ShapeAnchors, "center">)[] = [
    "top",
    "right",
    "bottom",
    "left",
  ];
  for (const nameA of ports) {
    const ptA = anchorsA[nameA];
    for (const nameB of ports) {
      const ptB = anchorsB[nameB];
      const d = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y);
      if (d < bestDist) {
        bestDist = d;
        bestPair = { from: ptA, to: ptB, nameA, nameB };
      }
    }
  }
  return bestPair;
};

export const buildCurvedArrowPath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend: number = -35,
  head: string = "end"
) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  let d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  const headLen = 13;

  if (head === "end" || head === "both" || head === "circle-arrow") {
    const angleEnd = Math.atan2(y2 - cy, x2 - cx);
    const a1 = angleEnd - Math.PI / 6;
    const a2 = angleEnd + Math.PI / 6;
    d += ` M ${x2 - headLen * Math.cos(a1)} ${y2 - headLen * Math.sin(a1)} L ${x2} ${y2} L ${x2 - headLen * Math.cos(a2)} ${y2 - headLen * Math.sin(a2)}`;
  }
  if (head === "start" || head === "both") {
    const angleStart = Math.atan2(y1 - cy, x1 - cx);
    const a1 = angleStart - Math.PI / 6;
    const a2 = angleStart + Math.PI / 6;
    d += ` M ${x1 - headLen * Math.cos(a1)} ${y1 - headLen * Math.sin(a1)} L ${x1} ${y1} L ${x1 - headLen * Math.cos(a2)} ${y1 - headLen * Math.sin(a2)}`;
  } else if (head === "circle-arrow") {
    const r = 3.5;
    d += ` M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
  }
  return { d, cx, cy, x1, y1, x2, y2, bend, head };
};

export const buildElbowConnectorPath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  head: string = "end"
): string => {
  const mx = (x1 + x2) / 2;
  let d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
  const headLen = 13;

  if (head === "end" || head === "both" || head === "circle-arrow") {
    const angleEnd = Math.atan2(0, x2 - mx || (x2 >= x1 ? 1 : -1));
    const a1 = angleEnd - Math.PI / 6;
    const a2 = angleEnd + Math.PI / 6;
    d += ` M ${x2 - headLen * Math.cos(a1)} ${y2 - headLen * Math.sin(a1)} L ${x2} ${y2} L ${x2 - headLen * Math.cos(a2)} ${y2 - headLen * Math.sin(a2)}`;
  }
  if (head === "start" || head === "both") {
    const angleStart = Math.atan2(0, x1 - mx || (x1 >= x2 ? 1 : -1));
    const a1 = angleStart - Math.PI / 6;
    const a2 = angleStart + Math.PI / 6;
    d += ` M ${x1 - headLen * Math.cos(a1)} ${y1 - headLen * Math.sin(a1)} L ${x1} ${y1} L ${x1 - headLen * Math.cos(a2)} ${y1 - headLen * Math.sin(a2)}`;
  } else if (head === "circle-arrow") {
    const r = 3.5;
    d += ` M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
  }
  return d;
};

export const buildStraightArrowPath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  head: string = "end"
): string => {
  let d = `M ${x1} ${y1} L ${x2} ${y2}`;
  const headLen = 13;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  if (head === "end" || head === "both" || head === "circle-arrow") {
    const a1 = angle - Math.PI / 6;
    const a2 = angle + Math.PI / 6;
    d += ` M ${x2 - headLen * Math.cos(a1)} ${y2 - headLen * Math.sin(a1)} L ${x2} ${y2} L ${x2 - headLen * Math.cos(a2)} ${y2 - headLen * Math.sin(a2)}`;
  }
  if (head === "start" || head === "both") {
    const backAngle = angle + Math.PI;
    const a1 = backAngle - Math.PI / 6;
    const a2 = backAngle + Math.PI / 6;
    d += ` M ${x1 - headLen * Math.cos(a1)} ${y1 - headLen * Math.sin(a1)} L ${x1} ${y1} L ${x1 - headLen * Math.cos(a2)} ${y1 - headLen * Math.sin(a2)}`;
  } else if (head === "circle-arrow") {
    const r = 3.5;
    d += ` M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
  }
  return d;
};

export const getLocalCurvedPath = (
  w: number = 160,
  bend: number = -35,
  head: string = "end"
): string => {
  const x1 = 10;
  const y1 = Math.max(20, Math.abs(bend) + 10);
  const x2 = Math.max(x1 + 30, w - 10);
  const y2 = y1;
  const mx = (x1 + x2) / 2;
  const cx = mx;
  const cy = y1 + bend;
  let d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  const headLen = 13;

  if (head === "end" || head === "both" || head === "circle-arrow") {
    const angleEnd = Math.atan2(y2 - cy, x2 - cx);
    const a1 = angleEnd - Math.PI / 6;
    const a2 = angleEnd + Math.PI / 6;
    d += ` M ${x2 - headLen * Math.cos(a1)} ${y2 - headLen * Math.sin(a1)} L ${x2} ${y2} L ${x2 - headLen * Math.cos(a2)} ${y2 - headLen * Math.sin(a2)}`;
  }
  if (head === "start" || head === "both") {
    const angleStart = Math.atan2(y1 - cy, x1 - cx);
    const a1 = angleStart - Math.PI / 6;
    const a2 = angleStart + Math.PI / 6;
    d += ` M ${x1 - headLen * Math.cos(a1)} ${y1 - headLen * Math.sin(a1)} L ${x1} ${y1} L ${x1 - headLen * Math.cos(a2)} ${y1 - headLen * Math.sin(a2)}`;
  } else if (head === "circle-arrow") {
    const r = 3.5;
    d += ` M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
  }
  return d;
};

export const getLocalElbowPath = (
  w: number = 160,
  h: number = 80,
  head: string = "end"
): string => {
  const x1 = 10;
  const y1 = 10;
  const x2 = Math.max(x1 + 30, w - 10);
  const y2 = Math.max(y1 + 30, h - 10);
  const mx = (x1 + x2) / 2;
  let d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
  const headLen = 13;

  if (head === "end" || head === "both" || head === "circle-arrow") {
    const angleEnd = Math.atan2(0, x2 - mx || (x2 >= x1 ? 1 : -1));
    const a1 = angleEnd - Math.PI / 6;
    const a2 = angleEnd + Math.PI / 6;
    d += ` M ${x2 - headLen * Math.cos(a1)} ${y2 - headLen * Math.sin(a1)} L ${x2} ${y2} L ${x2 - headLen * Math.cos(a2)} ${y2 - headLen * Math.sin(a2)}`;
  }
  if (head === "start" || head === "both") {
    const angleStart = Math.atan2(0, x1 - mx || (x1 >= x2 ? 1 : -1));
    const a1 = angleStart - Math.PI / 6;
    const a2 = angleStart + Math.PI / 6;
    d += ` M ${x1 - headLen * Math.cos(a1)} ${y1 - headLen * Math.sin(a1)} L ${x1} ${y1} L ${x1 - headLen * Math.cos(a2)} ${y1 - headLen * Math.sin(a2)}`;
  } else if (head === "circle-arrow") {
    const r = 3.5;
    d += ` M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
  }
  return d;
};

export const getLocalStraightPath = (
  w: number = 160,
  head: string = "end"
): string => {
  const x1 = 10;
  const y1 = 15;
  const x2 = Math.max(x1 + 30, w - 10);
  const y2 = 15;
  let d = `M ${x1} ${y1} L ${x2} ${y2}`;
  const headLen = 13;

  if (head === "end" || head === "both" || head === "circle-arrow") {
    const a1 = -Math.PI / 6;
    const a2 = Math.PI / 6;
    d += ` M ${x2 - headLen * Math.cos(a1)} ${y2 - headLen * Math.sin(a1)} L ${x2} ${y2} L ${x2 - headLen * Math.cos(a2)} ${y2 - headLen * Math.sin(a2)}`;
  }
  if (head === "start" || head === "both") {
    const a1 = Math.PI - Math.PI / 6;
    const a2 = Math.PI + Math.PI / 6;
    d += ` M ${x1 - headLen * Math.cos(a1)} ${y1 - headLen * Math.sin(a1)} L ${x1} ${y1} L ${x1 - headLen * Math.cos(a2)} ${y1 - headLen * Math.sin(a2)}`;
  } else if (head === "circle-arrow") {
    const r = 3.5;
    d += ` M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
  }
  return d;
};

export const distToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
};

export const CUSTOM_FABRIC_PROPS: readonly string[] = [
  "layerId",
  "shapeKind",
  "boxHeight",
  "fractionId",
  "fractionRole",
  "longDivisionId",
  "longDivisionRole",
  "longDivisionWidth",
  "longDivisionHeight",
  "connectorKind",
  "arrowHead",
  "bend",
  "isSmartConnector",
  "connectedFromId",
  "connectedToId",
  "isStickyNote",
  "isStepBadge",
  "isHighlighter",
  "locked",
];

export const clampCanvasHeight = (
  value: number,
  minH: number = 500,
  maxH: number = 2400
): number => {
  const num = Number.isFinite(value) ? value : minH;
  return Math.max(minH, Math.min(maxH, Math.round(num)));
};

export interface ResponsiveBoardSize {
  logicalWidth: number;
  logicalHeight: number;
  displayWidth: number;
  displayHeight: number;
  scale: number;
}

export const computeResponsiveBoardSize = (
  containerInnerWidth: number,
  logicalWidth: number,
  logicalHeight: number
): ResponsiveBoardSize => {
  const safeLogicalW = Math.max(200, logicalWidth || 820);
  const safeLogicalH = Math.max(200, logicalHeight || 700);
  const availableW = Number.isFinite(containerInnerWidth) && containerInnerWidth > 0
    ? containerInnerWidth
    : safeLogicalW;
  const displayWidth = Math.max(240, Math.min(safeLogicalW, Math.floor(availableW)));
  const scale = displayWidth / safeLogicalW;
  const displayHeight = Math.max(160, Math.round(safeLogicalH * scale));
  return {
    logicalWidth: safeLogicalW,
    logicalHeight: safeLogicalH,
    displayWidth,
    displayHeight,
    scale,
  };
};

export interface FloatingBarInput {
  boundLeft: number;
  boundTop: number;
  boundWidth: number;
  boundHeight: number;
  scale?: number;
  artboardOffsetX?: number;
  artboardOffsetY?: number;
  hostWidth: number;
  hostHeight: number;
  barHeight?: number;
}

export interface FloatingBarPosition {
  left: number;
  top: number;
  width: number;
  height: number;
  isNearTop: boolean;
  openPopoverUpward: boolean;
}

export const computeFloatingBarPosition = ({
  boundLeft,
  boundTop,
  boundWidth,
  boundHeight,
  scale = 1,
  artboardOffsetX = 0,
  artboardOffsetY = 0,
  hostWidth,
  hostHeight,
  barHeight,
}: FloatingBarInput): FloatingBarPosition => {
  const s = scale > 0 ? scale : 1;
  const leftPx = artboardOffsetX + boundLeft * s;
  const topPx = artboardOffsetY + boundTop * s;
  const widthPx = boundWidth * s;
  const heightPx = boundHeight * s;

  const safeHostW = Math.max(260, hostWidth || 820);
  const safeHostH = Math.max(200, hostHeight || 500);
  const centerX = leftPx + widthPx / 2;
  const safeEdge = Math.min(220, Math.max(40, Math.floor(safeHostW / 2) - 8));
  const clampedX =
    safeHostW <= 560
      ? Math.round(safeHostW / 2)
      : Math.max(safeEdge, Math.min(safeHostW - safeEdge, centerX));

  const barEstH = barHeight && barHeight > 0 ? barHeight : (safeHostW < 640 ? 70 : 38);
  const clearanceAbove = 22;
  const clearanceBelow = 48;
  const isNearTop = topPx < barEstH + clearanceAbove + 8;
  const rawTop = isNearTop
    ? topPx + heightPx + clearanceBelow
    : Math.max(8, topPx - barEstH - clearanceAbove);
  const topPos = Math.max(8, Math.min(safeHostH - barEstH - 8, rawTop));
  const openPopoverUpward = topPos > safeHostH - 220;

  return {
    left: Math.round(clampedX),
    top: Math.round(topPos),
    width: Math.round(widthPx),
    height: Math.round(heightPx),
    isNearTop,
    openPopoverUpward,
  };
};

export const computeViewportInsertPoint = (
  canvasWidth: number,
  canvasHeight: number,
  viewportTransform?: number[] | null,
  staggerIndex: number = 0
): Point2D => {
  const vpt = Array.isArray(viewportTransform) && viewportTransform.length >= 6
    ? viewportTransform
    : [1, 0, 0, 1, 0, 0];
  const zoom = vpt[0] || 1;
  const panX = vpt[4] || 0;
  const panY = vpt[5] || 0;
  const screenCenterX = (canvasWidth || 820) / 2;
  const screenCenterY = Math.min(canvasHeight || 700, 620) / 2;
  const sceneX = (screenCenterX - panX) / zoom;
  const sceneY = (screenCenterY - panY) / zoom;
  const step = (staggerIndex % 5) - 2;
  return {
    x: Math.round(Math.max(40, Math.min((canvasWidth || 820) - 40, sceneX + step * 16))),
    y: Math.round(Math.max(40, Math.min((canvasHeight || 700) - 40, sceneY + step * 14))),
  };
};
