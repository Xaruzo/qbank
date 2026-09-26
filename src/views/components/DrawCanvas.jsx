import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { fabric } from "fabric";
import { 
  Pencil, 
  MousePointer2, 
  Type, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Grid,
  Magnet,
  Eraser, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Minus, 
  Trash2, 
  Undo2, 
  Redo2,
  RotateCcw,
  Square,
  Divide,
  X,
  ZoomIn,
  ZoomOut,
  Copy,
  ClipboardPaste,
  CopyPlus,
  Layers,
  Ungroup,
  Palette,
  Ruler,
  Bold,
  Italic,
  Underline,
  Sliders,
  ArrowRight,
  StickyNote,
  Download,
  Check,
  Lock,
  Unlock,
  Layers2,
  CircleDot
} from "lucide-react";

const CANVA_FONTS = [
  { name: "Modern", value: "DM Sans, sans-serif" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Math", value: "JetBrains Mono, monospace" },
  { name: "Hand", value: "Caveat, Comic Sans MS, cursive" }
];

const FILL_PALETTE = [
  { name: "Transparent", value: "transparent" },
  { name: "White", value: "#ffffff" },
  { name: "Dark", value: "#1a2540" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Peach", value: "#fed7aa" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Solid Red", value: "#ef4444" },
  { name: "Solid Blue", value: "#3b82f6" },
  { name: "Solid Green", value: "#10b981" },
  { name: "Solid Amber", value: "#f59e0b" },
];

const STICKY_PRESETS = [
  { label: "Yellow Note", bg: "#fef08a", text: "#713f12" },
  { label: "Green Note", bg: "#bbf7d0", text: "#14532d" },
  { label: "Blue Note", bg: "#bfdbfe", text: "#1e3a8a" },
  { label: "Pink Note", bg: "#fbcfe8", text: "#831843" },
  { label: "Peach Note", bg: "#fed7aa", text: "#7c2d12" },
];

const CALLOUT_PRESETS = [
  { id: "final", label: "✅ Final Answer Box", defaultText: "∴ Final Answer: ", bg: "#dcfce7", border: "#16a34a", text: "#14532d" },
  { id: "formula", label: "💡 Formula / Shortcut", defaultText: "💡 Shortcut / Formula:\n", bg: "#fef3c7", border: "#d97706", text: "#78350f" },
  { id: "trap", label: "⚠️ Common Exam Trap", defaultText: "⚠️ Watch Out:\n", bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d" },
];

const EXTRA_MATH_SYMBOLS = [
  { sym: "≠", title: "Not Equal" },
  { sym: "≈", title: "Approximately Equal" },
  { sym: "≤", title: "Less Than or Equal" },
  { sym: "≥", title: "Greater Than or Equal" },
  { sym: "±", title: "Plus or Minus" },
  { sym: "%", title: "Percent" },
  { sym: "√", title: "Square Root" },
  { sym: "π", title: "Pi" },
  { sym: "∴", title: "Therefore" },
  { sym: "∵", title: "Because" },
  { sym: "°", title: "Degree" },
  { sym: "x²", title: "Squared" },
  { sym: "x³", title: "Cubed" },
  { sym: "½", title: "One Half" },
  { sym: "¼", title: "One Quarter" },
  { sym: "¾", title: "Three Quarters" },
  { sym: "₱", title: "Peso" },
  { sym: ":", title: "Ratio" },
];

const STEP_CIRCLES = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];

const toHighlighterColor = (hex) => {
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

const getShapeAnchors = (target) => {
  if (!target) return null;
  if (typeof target.calcTransformMatrix === "function" && typeof fabric !== "undefined" && fabric?.util?.transformPoint) {
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
      center: fabric.util.transformPoint(new fabric.Point(0, 0), m)
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
    center: { x: left + width / 2, y: top + height / 2 }
  };
};

const getObjectAnchors = getShapeAnchors;

const findBestConnection = (targetA, targetB) => {
  const anchorsA = getShapeAnchors(targetA);
  const anchorsB = getShapeAnchors(targetB);
  if (!anchorsA || !anchorsB) return null;
  let bestDist = Infinity;
  let bestPair = null;
  const ports = ["top", "right", "bottom", "left"];
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

const buildCurvedArrowPath = (x1, y1, x2, y2, bend = -35, head = "end") => {
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

const buildElbowConnectorPath = (x1, y1, x2, y2, head = "end") => {
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

const buildStraightArrowPath = (x1, y1, x2, y2, head = "end") => {
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

const getLocalCurvedPath = (w = 160, bend = -35, head = "end") => {
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

const getLocalElbowPath = (w = 160, h = 80, head = "end") => {
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

const getLocalStraightPath = (w = 160, head = "end") => {
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

const distToSegment = (px, py, x1, y1, x2, y2) => {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
};

const isObjectHitByEraser = (obj, px, py, r) => {
  if (!obj || obj.isGuide || obj.locked || (obj.lockMovementX && obj.lockMovementY)) {
    return false;
  }

  // 1. Quick AABB bounding box check with radius margin
  const b = obj.getBoundingRect ? obj.getBoundingRect(true, true) : null;
  if (b) {
    if (
      px < b.left - r ||
      px > b.left + b.width + r ||
      py < b.top - r ||
      py > b.top + b.height + r
    ) {
      return false;
    }
  }

  const p = new fabric.Point(px, py);

  // 2. Direct point-in-polygon containment
  if (typeof obj.containsPoint === "function" && obj.containsPoint(p)) {
    return true;
  }

  // 3. Test circle perimeter points
  const testAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
  for (let i = 0; i < testAngles.length; i++) {
    const angle = testAngles[i];
    const testP = new fabric.Point(px + Math.cos(angle) * r, py + Math.sin(angle) * r);
    if (typeof obj.containsPoint === "function" && obj.containsPoint(testP)) {
      return true;
    }
  }

  // 4. For fabric.Line
  if (obj.type === "line" || (obj.x1 != null && obj.y1 != null)) {
    const m = obj.calcTransformMatrix ? obj.calcTransformMatrix() : [1, 0, 0, 1, 0, 0];
    const p1 = fabric.util.transformPoint(new fabric.Point(obj.x1, obj.y1), m);
    const p2 = fabric.util.transformPoint(new fabric.Point(obj.x2, obj.y2), m);
    const dist = distToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
    const strokeW = (obj.strokeWidth || 2) * (obj.scaleX || 1);
    if (dist <= r + strokeW / 2) return true;
  }

  // 5. For fabric.Path
  if (obj.type === "path" && Array.isArray(obj.path)) {
    const m = obj.calcTransformMatrix ? obj.calcTransformMatrix() : [1, 0, 0, 1, 0, 0];
    const strokeW = ((obj.strokeWidth || 2) / 2) * Math.max(obj.scaleX || 1, obj.scaleY || 1);
    const threshold = r + strokeW;
    const thresholdSq = threshold * threshold;
    const offX = obj.pathOffset?.x || 0;
    const offY = obj.pathOffset?.y || 0;

    const path = obj.path;
    let prevPt = null;
    const step = path.length > 250 ? 2 : 1;

    for (let i = 0; i < path.length; i += step) {
      const cmd = path[i];
      if (!cmd) continue;
      const rawX = cmd[cmd.length - 2];
      const rawY = cmd[cmd.length - 1];
      if (typeof rawX === "number" && typeof rawY === "number") {
        const pt = fabric.util.transformPoint(new fabric.Point(rawX - offX, rawY - offY), m);
        const dx = px - pt.x;
        const dy = py - pt.y;
        if (dx * dx + dy * dy <= thresholdSq) {
          return true;
        }
        if (prevPt) {
          const segDist = distToSegment(px, py, prevPt.x, prevPt.y, pt.x, pt.y);
          if (segDist <= threshold) {
            return true;
          }
        }
        prevPt = pt;
      }
    }
  }

  // 6. For Groups
  if (obj.type === "group" && typeof obj.getObjects === "function") {
    const subObjects = obj.getObjects();
    for (let i = 0; i < subObjects.length; i++) {
      if (isObjectHitByEraser(subObjects[i], px, py, r)) {
        return true;
      }
    }
  }

  return false;
};

export default function DrawCanvas({ value, onChange, layersHost }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const menuHostRef = useRef(null);
  const canvasHostRef = useRef(null);
  const fabricRef = useRef(null);
  const fontSizeInputRef = useRef(null);
  const layerIdSeq = useRef(1);
  const lastPointer = useRef(null);
  const toolRef = useRef("move");
  const spaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panLastRef = useRef({ x: 0, y: 0 });
  const isErasingRef = useRef(false);
  const erasedInCurrentDragRef = useRef(false);
  const lastErasePointerRef = useRef(null);
  const resizeScrollRef = useRef({ lastH: 0, active: false, lastChange: 0, raf: 0 });
  const resizeAutoScrollGuardRef = useRef({ skipUntil: 0 });
  const fontCommitTimer = useRef(null);
  const textLiveTimer = useRef(null);
  const textExportTimer = useRef(null);
  const changeCommitTimer = useRef(null);
  const keyboardMoveCommitTimer = useRef(null);
  const [tool, setTool] = useState("move");
  const [color, setColor] = useState("#1a2540");
  const [size, setSize] = useState(2);
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);
  const [height, setHeight] = useState(360);
  const [layersVersion, setLayersVersion] = useState(0);
  const [activeLayerIds, setActiveLayerIds] = useState([]);
  const [fontSize, setFontSize] = useState(24);
  const [fontSizeInput, setFontSizeInput] = useState("24");
  const [isNarrow, setIsNarrow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [hexInput, setHexInput] = useState("#1a2540");
  const [snapping, setSnapping] = useState(true);
  const snappingRef = useRef(true);
  const [gridMode, setGridMode] = useState("none"); // "none" | "dots" | "grid"
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [activeObjProps, setActiveObjProps] = useState(null);
  const [floatingPopover, setFloatingPopover] = useState(null);
  const [stickyNoteMenuOpen, setStickyNoteMenuOpen] = useState(false);
  const [flowchartMenuOpen, setFlowchartMenuOpen] = useState(false);
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [mathMenuOpen, setMathMenuOpen] = useState(false);
  const flowchartMenuRef = useRef(null);
  const shapesMenuRef = useRef(null);
  const mathMenuRef = useRef(null);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);
  const stickyNoteMenuRef = useRef(null);

  const closeAllToolbarMenus = useCallback(() => {
    setStickyNoteMenuOpen(false);
    setFlowchartMenuOpen(false);
    setShapesMenuOpen(false);
    setMathMenuOpen(false);
    setColorPickerOpen(false);
    setAlignMenuOpen(false);
  }, []);

  const toggleToolbarMenu = useCallback((menu) => {
    setFloatingPopover(null);
    setStickyNoteMenuOpen(prev => menu === "sticky" ? !prev : false);
    setFlowchartMenuOpen(prev => menu === "flow" ? !prev : false);
    setShapesMenuOpen(prev => menu === "shapes" ? !prev : false);
    setMathMenuOpen(prev => menu === "math" ? !prev : false);
    setColorPickerOpen(prev => menu === "color" ? !prev : false);
    setAlignMenuOpen(prev => menu === "align" ? !prev : false);
  }, []);

  const ensureLayerId = useCallback((obj) => {
    if (!obj || obj.isGuide) return null;
    if (!obj.layerId) {
      obj.layerId = `layer-${layerIdSeq.current++}`;
    }
    return obj.layerId;
  }, []);

  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }, []);
  const ctxMenuRef = useRef(null);
  const colorPickerRef = useRef(null);
  const alignMenuRef = useRef(null);
  const layerDragRef = useRef(null);
  const dragJustEndedRef = useRef(false);
  const MIN_H = 260;
  const MAX_H = 2000;
  const BASE_W = 820;
  const HR_LINE_THICKNESS = 2;
  const FONT_SIZE_MIN = 8;
  const FONT_SIZE_MAX = 120;
  const LONG_DIVISION_PRESET_WIDTH = 58;
  const LONG_DIVISION_PRESET_HEIGHT = 66;
  const LONG_DIVISION_DEFAULT_WIDTH = 50;
  const LONG_DIVISION_DEFAULT_HEIGHT = 36;
  const LONG_DIVISION_MIN_AUTO_WIDTH = 50;
  const LONG_DIVISION_MIN_AUTO_HEIGHT = 36;
  
  // History for undo/redo
  const history = useRef([]);
  const redoStack = useRef([]);
  const isInternalChange = useRef(false);
  const clipboard = useRef(null);
  const clipboardClone = useRef(null);
  const clipboardMeta = useRef({ type: null });
  const clipboardData = useRef(null);

  const isTextObj = (obj) => !!obj && (obj.type === "i-text" || obj.type === "textbox");
  const isHrLine = (obj) => !!obj && (
    obj.shapeKind === "hrLine" ||
    obj.shapeKind === "vrLine" ||
    (obj.type === "line" && obj.fractionRole === "line")
  );
  const isLongDivisionBracket = (obj) => !!obj && obj.type === "path" && obj.shapeKind === "longDivision";
  const isLongDivisionPart = (obj) => !!obj && !!obj.longDivisionId;
  const sanitizeIntegerInput = (value) => String(value ?? "").replace(/[^\d]/g, "");
  const clampFontSizeValue = (value) => Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(value)));
  const clampLongDivisionWidth = (value) => Math.max(48, Math.min(420, Math.round(value || 0)));
  const clampLongDivisionHeight = (value) => Math.max(36, Math.min(420, Math.round(value || 0)));
  const buildLongDivisionPath = (rawWidth, rawHeight) => {
    const width = clampLongDivisionWidth(rawWidth);
    const height = clampLongDivisionHeight(rawHeight);
    const startX = Math.max(8, Math.min(14, width * 0.14));
    const topY = Math.max(4, Math.min(10, height * 0.08));
    const curveDepth = Math.max(10, Math.min(20, height * 0.16, width * 0.22));
    const cp1Y = topY + Math.max(8, height * 0.16);
    const cp2Y = topY + Math.max(18, height * 0.56);
    const endY = Math.max(topY + 24, height - 6);
    return {
      width,
      height,
      path: `M ${startX} ${topY} H ${width - 8} M ${startX} ${topY} C ${startX + curveDepth} ${cp1Y} ${startX + curveDepth} ${cp2Y} ${startX} ${endY}`,
    };
  };
  const configureLongDivisionBracket = (obj) => {
    if (!isLongDivisionBracket(obj)) return;
    obj.set({
      strokeUniform: true,
      scaleX: 1,
      scaleY: 1,
      lockScalingFlip: true,
      centeredScaling: false,
      uniformScaling: false,
      lockRotation: true,
      objectCaching: false,
    });
    obj.hasRotatingPoint = false;
    if (typeof obj.setControlsVisibility === "function") {
      obj.setControlsVisibility({
        tl: false, tr: false, bl: false, br: false,
        ml: true, mr: true,
        mt: true, mb: true,
        mtr: false,
      });
    }
  };
  const applyLongDivisionGeometry = (obj, rawWidth, rawHeight, anchor) => {
    if (!obj || !fabricRef.current) return;
    const geometry = buildLongDivisionPath(rawWidth, rawHeight);
    const template = new fabric.Path(geometry.path);
    obj.set({
      path: template.path,
      pathOffset: template.pathOffset,
      width: template.width,
      height: template.height,
      scaleX: 1,
      scaleY: 1,
      dirty: true,
    });
    obj.longDivisionWidth = geometry.width;
    obj.longDivisionHeight = geometry.height;
    configureLongDivisionBracket(obj);
    if (anchor) {
      obj.setPositionByOrigin(anchor.point, anchor.originX, anchor.originY);
    }
    obj.setCoords();
  };
  const configureHrLine = (obj) => {
    if (!isHrLine(obj)) return;
    if (obj.type === "line") {
      obj.set({
        strokeWidth: HR_LINE_THICKNESS,
        strokeUniform: true,
        scaleX: 1,
        scaleY: 1,
      });
    }
    obj.lockScalingY = obj.shapeKind === "hrLine";
    obj.lockScalingX = obj.shapeKind === "vrLine";
    obj.lockRotation = false;
    obj.uniformScaling = false;
    obj.hasRotatingPoint = true;
    obj.centeredScaling = false;
    if (typeof obj.setControlsVisibility === "function") {
      obj.setControlsVisibility({
        tl: false, tr: false, bl: false, br: false,
        ml: obj.shapeKind === "hrLine", mr: obj.shapeKind === "hrLine",
        mt: obj.shapeKind === "vrLine", mb: obj.shapeKind === "vrLine",
        mtr: true,
      });
    }
  };
  const configureTextObj = (obj) => {
    if (!obj || obj.type !== "textbox") return;
    obj.centeredScaling = false;
    obj.lockScalingFlip = true;
    if (typeof obj.setControlsVisibility === "function") {
      obj.setControlsVisibility({
        tl: true, tr: true, bl: true, br: true,
        ml: true, mr: true,
        mt: true, mb: true,
        mtr: true,
      });
    }
    const sx = Math.abs(obj.scaleX || 1);
    const sy = Math.abs(obj.scaleY || 1);
    if ((sx > 1.001 || sx < 0.999) || (sy > 1.001 || sy < 0.999)) {
      const center = typeof obj.getCenterPoint === "function" ? obj.getCenterPoint() : null;
      const baseW = obj.width || 0;
      const nextW = baseW ? Math.max(10, baseW * sx) : baseW;
      const baseBoxH = Number.isFinite(obj.boxHeight) ? obj.boxHeight : (obj.height || 0);
      const nextBoxH = baseBoxH ? Math.max(10, baseBoxH * sy) : baseBoxH;
      obj.set({ scaleX: 1, scaleY: 1 });
      if (Number.isFinite(nextW) && nextW > 0) obj.set("width", nextW);
      if (typeof obj.initDimensions === "function") obj.initDimensions();
      const computedH = obj.height || 0;
      const finalBoxH = Math.max(computedH, nextBoxH || 0);
      obj.boxHeight = finalBoxH;
      if (finalBoxH > 0) obj.set("height", finalBoxH);
      if (center) obj.setPositionByOrigin(center, "center", "center");
      obj.setCoords?.();
    } else {
      const baseBoxH = Number.isFinite(obj.boxHeight) ? obj.boxHeight : 0;
      const computedH = obj.height || 0;
      const finalBoxH = Math.max(baseBoxH, computedH);
      if (finalBoxH > 0) {
        obj.boxHeight = finalBoxH;
        obj.set("height", finalBoxH);
      }
    }
  };

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasHostRef.current) return;
    canvasHostRef.current.innerHTML = "";
    const canvasEl = document.createElement("canvas");
    canvasHostRef.current.appendChild(canvasEl);
    const canvas = new fabric.Canvas(canvasEl, {
      width: BASE_W,
      height: height,
      backgroundColor: "#ffffff",
      isDrawingMode: false,
    });
    canvas.uniformScaling = true;

    // Canva-style selection handles
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = '#f5a623';
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.cornerSize = 10;
    fabric.Object.prototype.borderColor = '#f5a623';
    fabric.Object.prototype.padding = 5;
    fabric.Object.prototype.hasRotatingPoint = true;
    fabric.Object.prototype.rotatingPointOffset = 24;
    fabric.Object.prototype.lockRotation = false;
    fabric.Object.prototype.centeredScaling = false;
    fabric.Object.prototype.lockScalingFlip = true;

    const renderRotateIcon = (ctx, left, top) => {
      const r = 9;
      ctx.save();
      ctx.translate(left, top);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f5a623";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, Math.PI * 0.15, Math.PI * 1.65);
      ctx.stroke();
      const a = Math.PI * 1.65;
      const ax = 5.5 * Math.cos(a);
      const ay = 5.5 * Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 4, ay - 1.5);
      ctx.lineTo(ax - 1.2, ay - 5);
      ctx.closePath();
      ctx.fillStyle = "#f5a623";
      ctx.fill();
      ctx.restore();
    };

    if (fabric.Object?.prototype?.controls?.mtr) {
      const mtr = fabric.Object.prototype.controls.mtr;
      mtr.x = 0;
      mtr.y = 0.5;
      mtr.offsetX = 0;
      mtr.offsetY = 32;
      mtr.sizeX = 22;
      mtr.sizeY = 22;
      mtr.render = renderRotateIcon;
    }

    fabricRef.current = canvas;

    if (!fabric.Object.prototype.__cseShapeKindToObject) {
      const origObjectToObject = fabric.Object.prototype.toObject;
      fabric.Object.prototype.toObject = function(...args) {
        const o = origObjectToObject.apply(this, args);
        return this.shapeKind ? { ...o, shapeKind: this.shapeKind } : o;
      };
      fabric.Object.prototype.__cseShapeKindToObject = true;
    }

    if (!fabric.Textbox.prototype.__cseBoxHeightToObject) {
      const origToObject = fabric.Textbox.prototype.toObject;
      fabric.Textbox.prototype.toObject = function(...args) {
        const o = origToObject.apply(this, args);
        return {
          ...o,
          boxHeight: this.boxHeight,
          ...(this.shapeKind ? { shapeKind: this.shapeKind } : {})
        };
      };
      fabric.Textbox.prototype.__cseBoxHeightToObject = true;
    }
    if (typeof window !== "undefined" && import.meta?.env?.DEV) {
      window.__cseFabric = fabric;
      window.__cseCanvas = canvas;
    }

    const cornerToOrigin = (corner) => {
      if (corner === "tl") return { originX: "left", originY: "top" };
      if (corner === "tr") return { originX: "right", originY: "top" };
      if (corner === "bl") return { originX: "left", originY: "bottom" };
      if (corner === "br") return { originX: "right", originY: "bottom" };
      if (corner === "ml") return { originX: "left", originY: "center" };
      if (corner === "mr") return { originX: "right", originY: "center" };
      if (corner === "mt") return { originX: "center", originY: "top" };
      if (corner === "mb") return { originX: "center", originY: "bottom" };
      return { originX: "center", originY: "center" };
    };

    const oppositeCorner = (corner) => {
      if (corner === "tl") return "br";
      if (corner === "tr") return "bl";
      if (corner === "bl") return "tr";
      if (corner === "br") return "tl";
      if (corner === "ml") return "mr";
      if (corner === "mr") return "ml";
      if (corner === "mt") return "mb";
      if (corner === "mb") return "mt";
      return null;
    };

    const clampScale = (obj) => {
      const baseW = obj.width || 1;
      const baseH = obj.height || 1;
      const minPx = 18;
      const maxW = canvas.getWidth() * 3;
      const maxH = canvas.getHeight() * 3;
      let sx = Math.abs(obj.scaleX || 1);
      let sy = Math.abs(obj.scaleY || 1);
      const w = baseW * sx;
      const h = baseH * sy;
      if (w < minPx) sx = minPx / baseW;
      if (h < minPx) sy = minPx / baseH;
      if (w > maxW) sx = maxW / baseW;
      if (h > maxH) sy = maxH / baseH;
      if (sx !== obj.scaleX || sy !== obj.scaleY) obj.set({ scaleX: sx, scaleY: sy });
    };

    const getClientPoint = (ev) => {
      const touches = ev?.touches;
      if (touches && touches.length) {
        let x = 0;
        let y = 0;
        const n = touches.length;
        for (let i = 0; i < n; i++) {
          x += touches[i].clientX;
          y += touches[i].clientY;
        }
        return { x: x / n, y: y / n };
      }
      const cx = ev?.clientX;
      const cy = ev?.clientY;
      return { x: typeof cx === "number" ? cx : 0, y: typeof cy === "number" ? cy : 0 };
    };

    const eraseAt = (p, directTarget) => {
      if (!p) return;
      const eraserRadius = Math.max(10, Math.min(36, (sizeRef.current || 2) * 4));
      const objects = canvas.getObjects();
      const toRemove = [];

      if (directTarget && !directTarget.isGuide && !directTarget.locked && !(directTarget.lockMovementX && directTarget.lockMovementY)) {
        toRemove.push(directTarget);
      }

      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (toRemove.includes(obj)) continue;
        if (isObjectHitByEraser(obj, p.x, p.y, eraserRadius)) {
          toRemove.push(obj);
        }
      }

      if (toRemove.length > 0) {
        erasedInCurrentDragRef.current = true;
        toRemove.forEach((obj) => {
          canvas.remove(obj);
        });
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        refreshUI();
      }
    };

    const eraseBetween = (p1, p2) => {
      if (!p1 || !p2) {
        eraseAt(p2 || p1);
        return;
      }
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const step = 8;
      if (dist <= step) {
        eraseAt(p2);
        return;
      }
      const numSteps = Math.ceil(dist / step);
      for (let i = 1; i <= numSteps; i++) {
        const t = i / numSteps;
        eraseAt({ x: p1.x + dx * t, y: p1.y + dy * t });
      }
    };

    canvas.on("mouse:down", (opt) => {
      const ev = opt?.e;
      if (!ev) return;
      if ((toolRef.current === "pan" || spaceDownRef.current) && (ev.button === 0 || ev.button == null)) {
        isPanningRef.current = true;
        panLastRef.current = getClientPoint(ev);
        canvas.selection = false;
        canvas.skipTargetFind = true;
        canvas.defaultCursor = "grabbing";
        try {
          ev.preventDefault();
        } catch {}
        return;
      }
      if (toolRef.current === "eraser" && (ev.button === 0 || ev.button == null)) {
        isErasingRef.current = true;
        erasedInCurrentDragRef.current = false;
        canvas.selection = false;
        canvas.skipTargetFind = true;
        canvas.discardActiveObject();
        const p = canvas.getPointer(ev);
        lastErasePointerRef.current = p;
        eraseAt(p, opt?.target);
        try {
          ev.preventDefault();
        } catch {}
        return;
      }
      lastPointer.current = canvas.getPointer(ev);
    });
    canvas.on("mouse:move", (opt) => {
      const ev = opt?.e;
      if (!ev) return;
      if (isPanningRef.current) {
        const p = getClientPoint(ev);
        const dx = p.x - panLastRef.current.x;
        const dy = p.y - panLastRef.current.y;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += dx;
          vpt[5] += dy;
          canvas.requestRenderAll();
        }
        panLastRef.current = p;
        try {
          ev.preventDefault();
        } catch {}
        return;
      }
      if (isErasingRef.current && toolRef.current === "eraser") {
        const p = canvas.getPointer(ev);
        eraseBetween(lastErasePointerRef.current || p, p);
        lastErasePointerRef.current = p;
        try {
          ev.preventDefault();
        } catch {}
        return;
      }
      lastPointer.current = canvas.getPointer(ev);
    });
    canvas.on("mouse:up", () => {
      if (isErasingRef.current) {
        isErasingRef.current = false;
        lastErasePointerRef.current = null;
        if (erasedInCurrentDragRef.current) {
          erasedInCurrentDragRef.current = false;
          scheduleCommitChange();
        }
        return;
      }
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      const isPan = toolRef.current === "pan";
      canvas.skipTargetFind = isPan ? true : false;
      canvas.selection = (!canvas.isDrawingMode && toolRef.current === "move");
      if (canvas.isDrawingMode) canvas.defaultCursor = "crosshair";
      else if (isPan) canvas.defaultCursor = "grab";
      else canvas.defaultCursor = "default";
      canvas.requestRenderAll();
    });

    const clampZoom = (z) => Math.max(0.2, Math.min(4, z));
    const zoomToPoint = (point, nextZoom) => {
      const z = clampZoom(nextZoom);
      canvas.zoomToPoint(point, z);
      canvas.requestRenderAll();
      setZoomPercent(Math.round(z * 100));
    };

    const handleWheelZoom = (opt) => {
      const ev = opt?.e;
      if (!ev) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? ev.metaKey : ev.ctrlKey;
      if (!ctrlKey) return;
      try {
        ev.preventDefault();
        ev.stopPropagation();
      } catch {}
      const delta = ev.deltaY || 0;
      const factor = Math.pow(0.999, delta);
      const point = new fabric.Point(ev.offsetX, ev.offsetY);
      zoomToPoint(point, canvas.getZoom() * factor);
    };
    canvas.on("mouse:wheel", handleWheelZoom);

    const openContextMenuAt = (clientX, clientY, sourceEv) => {
      try {
        const p = canvas.getPointer(sourceEv);
        lastPointer.current = p;
      } catch {}
      let target = null;
      try {
        target = canvas.findTarget(sourceEv, true);
      } catch {}
      if (target && !target.isGuide) {
        const cur = canvas.getActiveObjects?.() || [];
        if (!cur.includes(target)) {
          canvas.discardActiveObject();
          canvas.setActiveObject(target);
          canvas.requestRenderAll();
          refreshUI();
        }
      } else {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        refreshUI();
      }
      const rect = menuHostRef.current?.getBoundingClientRect?.();
      const x = rect ? clientX - rect.left : clientX;
      const y = rect ? clientY - rect.top : clientY;
      setCtxMenu({ x: Math.max(8, x), y: Math.max(8, y) });
    };

    const handleContextMenu = (ev) => {
      try {
        ev.preventDefault();
        ev.stopPropagation?.();
      } catch {}
      const p = getClientPoint(ev);
      openContextMenuAt(p.x, p.y, ev);
    };

    const ctxEl = canvas.upperCanvasEl || canvasEl;
    ctxEl?.addEventListener?.("contextmenu", handleContextMenu);

    // Long-press opens the context menu on touch devices (mobile "right-click")
    let longPressTimer = null;
    let longPressStartPoint = null;

    const clearLongPressTimer = () => {
      if (longPressTimer) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onCanvasTouchStart = (ev) => {
      clearLongPressTimer();
      const touches = ev?.touches;
      if (!touches || touches.length !== 1) return;
      const t = touches[0];
      longPressStartPoint = { x: t.clientX, y: t.clientY };
      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        const point = longPressStartPoint;
        longPressStartPoint = null;
        if (!point) return;
        try {
          ev.preventDefault();
        } catch {}
        openContextMenuAt(point.x, point.y, {
          clientX: point.x,
          clientY: point.y,
          touches: [{ clientX: point.x, clientY: point.y }],
        });
      }, 520);
    };

    const onCanvasTouchMove = (ev) => {
      if (!longPressTimer || !longPressStartPoint) return;
      const t = ev?.touches?.[0];
      if (!t) return;
      const dx = t.clientX - longPressStartPoint.x;
      const dy = t.clientY - longPressStartPoint.y;
      if (dx * dx + dy * dy > 36) clearLongPressTimer();
    };

    const onCanvasTouchEnd = () => {
      clearLongPressTimer();
      longPressStartPoint = null;
    };

    ctxEl?.addEventListener?.("touchstart", onCanvasTouchStart, { passive: true });
    ctxEl?.addEventListener?.("touchmove", onCanvasTouchMove, { passive: true });
    ctxEl?.addEventListener?.("touchend", onCanvasTouchEnd, { passive: true });
    ctxEl?.addEventListener?.("touchcancel", onCanvasTouchEnd, { passive: true });

    const ensureLayerId = (obj) => {
      if (!obj || obj.isGuide) return;
      configureTextObj(obj);
      configureHrLine(obj);
      configureLongDivisionBracket(obj);
      if (obj.type === "i-text") {
        const sx = Math.abs(obj.scaleX || 1);
        const sy = Math.abs(obj.scaleY || 1);
        if ((sx > 1.001 || sx < 0.999) || (sy > 1.001 || sy < 0.999)) {
        const center = typeof obj.getCenterPoint === "function" ? obj.getCenterPoint() : null;
          const baseFontSize = Number(obj.fontSize || 24) || 24;
          const scaleFont = Math.max(sx, sy);
          obj.set({ scaleX: 1, scaleY: 1, fontSize: Math.max(8, Math.min(120, Math.round(baseFontSize * scaleFont))) });
          obj.initDimensions?.();
        if (center) obj.setPositionByOrigin(center, "center", "center");
          obj.setCoords?.();
        }
      }
      if (!obj.layerId) obj.layerId = `layer-${layerIdSeq.current++}`;
    };

    const convertLegacyITextToTextbox = (obj) => {
      if (!obj || obj.type !== "i-text") return null;
      if (obj.fractionId || obj.longDivisionId) return null;
      const originX = obj.originX || "left";
      const originY = obj.originY || "top";
      const anchorPoint = typeof obj.getPointByOrigin === "function"
        ? obj.getPointByOrigin(originX, originY)
        : new fabric.Point(obj.left || 0, obj.top || 0);
      const o = typeof obj.toObject === "function" ? obj.toObject() : {};
      const text = obj.text ?? "";
      const layerId = obj.layerId;
      const opts = { ...o };
      delete opts.type;
      delete opts.version;
      delete opts.text;
      const tb = new fabric.Textbox(text, opts);
      if (layerId) tb.layerId = layerId;
      if (Number.isFinite(o.height)) tb.boxHeight = o.height;
      configureTextObj(tb);
      if (anchorPoint) {
        tb.setPositionByOrigin(anchorPoint, originX, originY);
        tb.setCoords?.();
      }
      return tb;
    };

    const migrateLegacyTextOnCanvas = () => {
      const objects = canvas.getObjects().slice();
      objects.forEach((obj) => {
        const tb = convertLegacyITextToTextbox(obj);
        if (!tb) return;
        const idx = canvas.getObjects().indexOf(obj);
        canvas.remove(obj);
        if (typeof canvas.insertAt === "function" && idx >= 0) canvas.insertAt(tb, idx, false);
        else canvas.add(tb);
      });
    };

    const updateFloatingCoords = (activeTarget) => {
      const active = activeTarget ?? canvas.getActiveObject();
      if (!active || active.isGuide) {
        setSelectionBounds(null);
        setActiveObjProps(null);
        return;
      }
      const bound = active.getBoundingRect(true, true);
      const boardW = boardRef.current ? boardRef.current.clientWidth : 820;
      const centerX = bound.left + bound.width / 2;
      const safeEdge = Math.min(210, Math.floor(boardW / 2));
      const clampedX = boardW <= 560
        ? Math.round(boardW / 2)
        : Math.max(safeEdge, Math.min(boardW - safeEdge, centerX));
      const isNearTop = bound.top < 64;
      const topPos = isNearTop ? bound.top + bound.height + 10 : Math.max(8, bound.top - 48);

      setSelectionBounds({
        left: Math.round(clampedX),
        top: Math.round(topPos),
        width: Math.round(bound.width),
        height: Math.round(bound.height),
        isNearTop,
      });

      const activeObjects = canvas.getActiveObjects?.() || (active ? [active] : []);
      const multiSelectCount = activeObjects.filter(o => o && !o.isGuide).length;

      const isText = isTextObj(active);
      const isShape = ["rect", "circle", "triangle", "polygon"].includes(active.type) ||
        active.shapeKind === "process" ||
        active.shapeKind === "decision" ||
        active.shapeKind === "terminator" ||
        active.shapeKind === "dataNode";
      const isArrow = active.shapeKind === "arrow" ||
        active.shapeKind === "curvedArrow" ||
        active.shapeKind === "elbowArrow";
      const isLine = active.type === "line" ||
        active.shapeKind === "hrLine" ||
        active.shapeKind === "vrLine" ||
        isArrow;
      const isFlowchartShape = ["process", "decision", "terminator", "dataNode"].includes(active.shapeKind) ||
        !!active.isStickyNote ||
        isShape;

      setActiveObjProps({
        fill: active.fill || "transparent",
        stroke: active.stroke || "transparent",
        strokeWidth: active.strokeWidth || 0,
        strokeDashArray: active.strokeDashArray || null,
        opacity: Math.round((active.opacity != null ? active.opacity : 1) * 100),
        fontFamily: active.fontFamily || "DM Sans, sans-serif",
        fontSize: Math.round(active.fontSize || 24),
        fontWeight: active.fontWeight || "normal",
        fontStyle: active.fontStyle || "normal",
        underline: !!active.underline,
        textAlign: active.textAlign || "left",
        isLocked: !!(active.lockMovementX && active.lockMovementY),
        isText,
        isShape,
        isLine,
        isArrow,
        isFlowchartShape,
        multiSelectCount,
        connectorKind: active.connectorKind || (active.shapeKind === "curvedArrow" ? "curved" : active.shapeKind === "elbowArrow" ? "elbow" : active.shapeKind === "arrow" ? "straight" : null),
        arrowHead: active.arrowHead || "end",
        bend: active.bend != null ? active.bend : -35,
        isSmartConnector: !!active.isSmartConnector,
        connectedFromId: active.connectedFromId || null,
        connectedToId: active.connectedToId || null,
        type: active.type,
        rx: active.rx || 0,
      });
    };

    const updateConnectedArrowsForObject = (target) => {
      if (!target || !canvas) return;
      const targets = target.type === "activeSelection" ? target.getObjects() : [target];
      const targetIds = new Set(targets.map(t => t.layerId).filter(Boolean));
      if (targetIds.size === 0) return;

      const allObjects = canvas.getObjects();
      const connectors = allObjects.filter(o =>
        o &&
        (o.shapeKind === "arrow" || o.shapeKind === "curvedArrow" || o.shapeKind === "elbowArrow") &&
        (targetIds.has(o.connectedFromId) || targetIds.has(o.connectedToId))
      );

      if (connectors.length === 0) return;

      let changed = false;
      connectors.forEach(arrow => {
        const fromId = arrow.connectedFromId;
        const toId = arrow.connectedToId;
        const fromObj = allObjects.find(o => o.layerId === fromId);
        const toObj = allObjects.find(o => o.layerId === toId);
        if (!fromObj || !toObj) return;

        const conn = findBestConnection(fromObj, toObj);
        if (!conn) return;

        const kind = arrow.connectorKind || (arrow.shapeKind === "curvedArrow" ? "curved" : arrow.shapeKind === "elbowArrow" ? "elbow" : "straight");
        const bend = arrow.bend != null ? arrow.bend : -35;
        const head = arrow.arrowHead || "end";

        let pathD;
        if (kind === "curved") {
          pathD = buildCurvedArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, bend, head).d;
        } else if (kind === "elbow") {
          pathD = buildElbowConnectorPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, head);
        } else {
          pathD = buildStraightArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, head);
        }

        const prevStroke = arrow.stroke;
        const prevStrokeWidth = arrow.strokeWidth;
        const prevStrokeDash = arrow.strokeDashArray;
        const prevOpacity = arrow.opacity;
        const prevLayerId = arrow.layerId;
        const isCurActive = canvas.getActiveObject() === arrow;

        const newArrow = new fabric.Path(pathD, {
          stroke: prevStroke,
          strokeWidth: prevStrokeWidth,
          strokeDashArray: prevStrokeDash,
          opacity: prevOpacity,
          fill: "transparent",
          strokeLineCap: "round",
          strokeLineJoin: "round",
          objectCaching: false
        });
        newArrow.layerId = prevLayerId;
        newArrow.shapeKind = kind === "curved" ? "curvedArrow" : kind === "elbow" ? "elbowArrow" : "arrow";
        newArrow.connectorKind = kind;
        newArrow.arrowHead = head;
        newArrow.bend = bend;
        newArrow.isSmartConnector = true;
        newArrow.connectedFromId = fromId;
        newArrow.connectedToId = toId;

        const idx = canvas._objects.indexOf(arrow);
        canvas.remove(arrow);
        if (idx >= 0 && idx < canvas._objects.length) {
          canvas.insertAt(newArrow, idx, false);
        } else {
          canvas.add(newArrow);
        }
        if (isCurActive) {
          canvas.setActiveObject(newArrow);
        }
        changed = true;
      });

      if (changed) {
        canvas.requestRenderAll();
      }
    };

    const refreshUI = () => {
      setLayersVersion(v => v + 1);
      const active = canvas.getActiveObject();
      const activeObjects = canvas.getActiveObjects?.() || (active ? [active] : []);
      const ids = activeObjects.map(o => o?.layerId).filter(Boolean);
      setActiveLayerIds(ids);
      if (isTextObj(active)) {
        const next = Math.round(active.fontSize || 24);
        setFontSize(next);
        if (document.activeElement !== fontSizeInputRef.current) setFontSizeInput(String(next));
      }
      updateFloatingCoords(active);
    };

    const normalizeTextboxDuringScaling = (obj, anchorOrigin, anchorPoint) => {
      if (!obj || obj.isGuide || obj.type !== "textbox") return;
      const sx = Math.abs(obj.scaleX || 1);
      const sy = Math.abs(obj.scaleY || 1);
      if (sx > 0.999 && sx < 1.001 && sy > 0.999 && sy < 1.001) return;
      const baseW = obj.width || 0;
      if (!baseW) return;
      const nextW = Math.max(10, baseW * sx);
      const baseBoxH = Number.isFinite(obj.boxHeight) ? obj.boxHeight : (obj.height || 0);
      const nextBoxH = baseBoxH ? Math.max(10, baseBoxH * sy) : baseBoxH;
      obj.set({ scaleX: 1, scaleY: 1, width: nextW });
      obj.initDimensions();
      const computedH = obj.height || 0;
      const finalBoxH = Math.max(computedH, nextBoxH || 0);
      if (finalBoxH > 0) {
        obj.boxHeight = finalBoxH;
        obj.set("height", finalBoxH);
      }
      if (anchorPoint && anchorOrigin) obj.setPositionByOrigin(anchorPoint, anchorOrigin.originX, anchorOrigin.originY);
      obj.setCoords();
    };

    // Load initial value if exists
    if (value) {
      const savedZoom = value.zoom || null;
      const savedVpt = value.vpt || null;
      const data = typeof value === "string" ? value : JSON.stringify(value.state || value);
      try {
        if (data.startsWith("data:image")) {
          isInternalChange.current = true;
          fabric.Image.fromURL(data, (img) => {
            canvas.add(img);
            ensureLayerId(img);
            canvas.renderAll();
            isInternalChange.current = false;
            saveHistory();
            refreshUI();
          });
        } else {
          isInternalChange.current = true;
          canvas.loadFromJSON(data, () => {
            migrateLegacyTextOnCanvas();
            canvas.getObjects().forEach(ensureLayerId);
            if (savedVpt) canvas.setViewportTransform(savedVpt);
            else if (savedZoom) canvas.setZoom(savedZoom);
            canvas.renderAll();
            isInternalChange.current = false;
            saveHistory();
            refreshUI();
          });
        }
      } catch (e) {
        console.error("Failed to load canvas data", e);
      }
    }

    // A brand-new canvas still needs one history entry: without it the very
    // first stroke has no prior snapshot to restore, so Ctrl+Z (or the Undo
    // toolbar button) is a no-op and can never remove the first thing drawn.
    // This also covers the edge case where a saved value fails to load.
    if (history.current.length === 0) {
      history.current.push(JSON.stringify(canvas.toJSON()));
    }

    function saveHistory() {
      if (isInternalChange.current) return;
      history.current.push(JSON.stringify(canvas.toJSON()));
      if (history.current.length > 50) history.current.shift();
      redoStack.current = []; // Clear redo on new action
    }

    const exportDataURL = () => {
      const currentWidth = typeof canvas.getWidth === "function" ? canvas.getWidth() : BASE_W;
      // Cap the multiplier so narrow/tall canvases don't rasterize huge images on every change.
      const multiplier = Math.min(2.5, Math.max(2, (BASE_W / (currentWidth || BASE_W)) * 2));
      const prevBg = canvas.backgroundColor;
      canvas.backgroundColor = "#ffffff";
      canvas.renderAll();
      const url = canvas.toDataURL({ format: "png", quality: 0.8, multiplier });
      canvas.backgroundColor = prevBg;
      canvas.renderAll();
      return url;
    };

    const handleChange = () => {
      saveHistory();
      const guides = canvas.getObjects().filter(o => o.isGuide);
      if (guides.length) {
        guides.forEach(g => canvas.remove(g));
        canvas.renderAll();
      }
      const state = canvas.toJSON();
      const dataURL = exportDataURL();
      onChange({ state, dataURL, zoom: canvas.getZoom(), vpt: [...canvas.viewportTransform] });
    };

    const removeStrayGuides = () => {
      const guides = canvas.getObjects().filter(o => o.isGuide);
      if (guides.length) {
        guides.forEach(g => canvas.remove(g));
        canvas.renderAll();
      }
    };

    // Cheap push used while typing: serializes state only, no PNG rasterization.
    const handleLiveState = () => {
      if (isInternalChange.current) return;
      removeStrayGuides();
      const state = canvas.toJSON();
      onChange({ state, zoom: canvas.getZoom(), vpt: [...canvas.viewportTransform] });
    };

    // Full push including the PNG preview. Fired once the user pauses typing,
    // so the expensive dataURL export never runs in a per-keystroke loop.
    const handleLiveExport = () => {
      if (isInternalChange.current) return;
      removeStrayGuides();
      const state = canvas.toJSON();
      const dataURL = exportDataURL();
      onChange({ state, dataURL, zoom: canvas.getZoom(), vpt: [...canvas.viewportTransform] });
    };

    const scheduleLiveChange = () => {
      if (textLiveTimer.current) window.clearTimeout(textLiveTimer.current);
      textLiveTimer.current = window.setTimeout(() => {
        textLiveTimer.current = null;
        handleLiveState();
      }, 160);
    };

    const scheduleLiveExport = () => {
      if (textExportTimer.current) window.clearTimeout(textExportTimer.current);
      textExportTimer.current = window.setTimeout(() => {
        textExportTimer.current = null;
        handleLiveExport();
      }, 600);
    };

    const scheduleCommitChange = () => {
      if (isInternalChange.current) return;
      if (changeCommitTimer.current) window.clearTimeout(changeCommitTimer.current);
      changeCommitTimer.current = window.setTimeout(() => {
        changeCommitTimer.current = null;
        handleChange();
      }, 0);
    };

    canvas.on("object:added", (e) => {
      ensureLayerId(e.target);
      refreshUI();
      if (!e.target._fromUndo && !e.target.isGuide) scheduleCommitChange();
    });
    canvas.on("object:removed", (e) => {
      refreshUI();
      if (!e.target._fromUndo && !e.target.isGuide) {
        if (!isErasingRef.current) scheduleCommitChange();
      }
    });
    canvas.on("object:modified", (e) => {
      const t = e.target;
      updateConnectedArrowsForObject(t);
      if (isLongDivisionBracket(t) && !t.isGuide) {
        const sx = Math.abs(t.scaleX || 1);
        const sy = Math.abs(t.scaleY || 1);
        if (sx > 1.001 || sy > 1.001 || sx < 0.999 || sy < 0.999) {
          const ox = t.__resizeAnchor?.originX || t.originX || "center";
          const oy = t.__resizeAnchor?.originY || t.originY || "center";
          const anchorPoint = t.__resizeAnchor
            ? new fabric.Point(t.__resizeAnchor.x, t.__resizeAnchor.y)
            : t.getPointByOrigin(ox, oy);
          applyLongDivisionGeometry(
            t,
            (t.longDivisionWidth || t.width || LONG_DIVISION_DEFAULT_WIDTH) * sx,
            (t.longDivisionHeight || t.height || LONG_DIVISION_DEFAULT_HEIGHT) * sy,
            { point: anchorPoint, originX: ox, originY: oy },
          );
        } else {
          t.set({ scaleX: 1, scaleY: 1 });
          configureLongDivisionBracket(t);
          t.setCoords();
        }
        delete t.__resizeAnchor;
        delete t.__scaleCorner;
      }
      if (isTextObj(t) && !t.isGuide) {
        const sx = Math.abs(t.scaleX || 1);
        const sy = Math.abs(t.scaleY || 1);
        if ((sx > 1.001 || sy > 1.001 || sx < 0.999 || sy < 0.999) && !t.__normalizingTextScale) {
          t.__normalizingTextScale = true;
          const corner = t.__scaleCorner || t.__resizeAnchor?.corner || "";
          const ox = t.__resizeAnchor?.originX || t.originX || "left";
          const oy = t.__resizeAnchor?.originY || t.originY || "top";
          const anchor = t.__resizeAnchor ? new fabric.Point(t.__resizeAnchor.x, t.__resizeAnchor.y) : t.getPointByOrigin(ox, oy);
          if (t.type === "textbox") {
            const nextW = Math.max(10, (t.width || 0) * sx);
            const baseBoxH = Number.isFinite(t.boxHeight) ? t.boxHeight : (t.height || 0);
            const nextBoxH = baseBoxH ? Math.max(10, baseBoxH * sy) : baseBoxH;
            t.set({ scaleX: 1, scaleY: 1, width: nextW });
            t.initDimensions();
            const computedH = t.height || 0;
            const finalBoxH = Math.max(computedH, nextBoxH || 0);
            if (finalBoxH > 0) {
              t.boxHeight = finalBoxH;
              t.set("height", finalBoxH);
            }
          } else {
            const baseFontSize = Number(t.fontSize || 24) || 24;
            const scaleFont = Math.max(sx, sy);
            const nextFontSize = Math.max(8, Math.min(120, Math.round(baseFontSize * scaleFont)));
            t.set({ scaleX: 1, scaleY: 1 });
            t.set("fontSize", nextFontSize);
            t.initDimensions();
          }
          t.setPositionByOrigin(anchor, ox, oy);
          t.setCoords();
          delete t.__resizeAnchor;
          delete t.__scaleCorner;
          delete t.__normalizingTextScale;
        }
      }
      if (isTextObj(t)) {
        delete t.__resizeAnchor;
        delete t.__scaleCorner;
      }
      if (isHrLine(t)) {
        if (t.type === "line") {
          if (t.shapeKind === "hrLine") {
            const sx = Math.abs(t.scaleX || 1);
            if (sx > 1.001 || sx < 0.999) {
              const corner = t.__scaleCorner || t.__resizeAnchor?.corner || "";
              const anchorOriginX = corner.includes("l") || corner === "ml" ? "right" : "left";
              const anchor = t.getPointByOrigin(anchorOriginX, "center");
              const baseLen = Math.abs((t.x2 || 0) - (t.x1 || 0));
              const nextLen = Math.max(20, baseLen * sx);
              t.set({ x1: 0, y1: 0, x2: nextLen, y2: 0, scaleX: 1, scaleY: 1 });
              t.setPositionByOrigin(anchor, anchorOriginX, "center");
              t.setCoords();
            } else {
              t.set({ scaleX: 1, scaleY: 1 });
            }
          } else if (t.shapeKind === "vrLine") {
            const sy = Math.abs(t.scaleY || 1);
            if (sy > 1.001 || sy < 0.999) {
              const corner = t.__scaleCorner || t.__resizeAnchor?.corner || "";
              const anchorOriginY = corner.includes("t") || corner === "mt" ? "bottom" : "top";
              const anchor = t.getPointByOrigin("center", anchorOriginY);
              const baseLen = Math.abs((t.y2 || 0) - (t.y1 || 0));
              const nextLen = Math.max(20, baseLen * sy);
              t.set({ x1: 0, y1: 0, x2: 0, y2: nextLen, scaleX: 1, scaleY: 1 });
              t.setPositionByOrigin(anchor, "center", anchorOriginY);
              t.setCoords();
            } else {
              t.set({ scaleX: 1, scaleY: 1 });
            }
          }
        }
        delete t.__resizeAnchor;
        delete t.__scaleCorner;
        configureHrLine(t);
      }
      if (t?.fractionId) syncFraction(t);
      if (t?.longDivisionId) syncLongDivision(t);
      refreshUI();
      if (!t?.isGuide) scheduleCommitChange();
    });
    const logHrLineSelection = (e) => {
      const t = e?.selected?.[0] ?? canvas.getActiveObject();
      if (!isHrLine(t)) return;
      configureHrLine(t);
      t.setCoords();
      canvas.requestRenderAll();
    };
    const logLongDivisionSelection = (e) => {
      const t = e?.selected?.[0] ?? canvas.getActiveObject();
      if (!isLongDivisionBracket(t)) return;
      configureLongDivisionBracket(t);
      t.setCoords();
      canvas.requestRenderAll();
    };
    canvas.on("selection:created", (e) => { logHrLineSelection(e); logLongDivisionSelection(e); refreshUI(); });
    canvas.on("selection:updated", (e) => { logHrLineSelection(e); logLongDivisionSelection(e); refreshUI(); });
    canvas.on("selection:cleared", refreshUI);
    canvas.on("path:created", (e) => {
      const path = e.path;
      path.selectable = (tool === "move");
      ensureLayerId(path);
      scheduleCommitChange();
      canvas.requestRenderAll();
      refreshUI();
    });

    // Smart Alignment (Snapping) with Visual Guides
    const SNAP_TOLERANCE = () => 10 / (canvas.getZoom() || 1);
    const MEASURE_TOLERANCE = 2;
    const guideObjects = [];

    const createGuideLine = (type, pos) => {
      const line = new fabric.Line(
        type === 'v' ? [pos, 0, pos, canvas.height] : [0, pos, canvas.width, pos],
        {
          stroke: '#a855f7',
          strokeWidth: 2,
          selectable: false,
          evented: false,
          opacity: 0.8,
          strokeDashArray: [4, 4],
          excludeFromExport: true,
          isGuide: true
        }
      );
      canvas.add(line);
      guideObjects.push(line);
      return line;
    };

    const createMeasureLine = (x1, y1, x2, y2, stroke) => {
      const line = new fabric.Line([x1, y1, x2, y2], {
        stroke,
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
        opacity: 0.9,
        strokeDashArray: [3, 3],
        excludeFromExport: true,
        isGuide: true
      });
      canvas.add(line);
      guideObjects.push(line);
      return line;
    };

    const createMeasureTag = (text, x, y, fill) => {
      const label = new fabric.Text(String(text), {
        fontFamily: "DM Sans",
        fontSize: 12,
        fill: "#ffffff",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });

      const paddingX = 8;
      const paddingY = 5;
      const bg = new fabric.Rect({
        width: label.width + paddingX * 2,
        height: label.height + paddingY * 2,
        fill,
        rx: 8,
        ry: 8,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });

      const group = new fabric.Group([bg, label], {
        left: x,
        top: y,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isGuide: true
      });

      canvas.add(group);
      guideObjects.push(group);
      return group;
    };

    const clearGuides = () => {
      while (guideObjects.length) canvas.remove(guideObjects.pop());
    };

    const clearTransientTransformState = (obj) => {
      if (!obj) return;
      delete obj.__resizeAnchor;
      delete obj.__scaleCorner;
      delete obj.__normalizingTextScale;
      if (Array.isArray(obj._objects)) obj._objects.forEach(clearTransientTransformState);
    };

    const applyMoveGuides = (obj, nativeEvent, moveIntent = null) => {
      if (!obj) return;
      clearGuides();

      // Ensure compound math presets stay together during movement
      if (obj.fractionId) {
        syncFraction(obj);
      }
      if (obj.longDivisionId) {
        syncLongDivision(obj);
      }

      if (!snappingRef.current || nativeEvent?.altKey || nativeEvent?.ctrlKey || nativeEvent?.metaKey) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const w = obj.getScaledWidth();
      const h = obj.getScaledHeight();
      let center = obj.getCenterPoint();

      const setCenter = (cx, cy) => {
        center = new fabric.Point(Math.round(cx), Math.round(cy));
        obj.setPositionByOrigin(center, "center", "center");
        obj.setCoords();
        // If part of a math preset, sync the other parts after snapping
        if (obj.fractionId) syncFraction(obj);
        if (obj.longDivisionId) syncLongDivision(obj);
      };

      const edgesFromCenter = () => ({
        centerX: center.x,
        centerY: center.y,
        left: center.x - w / 2,
        right: center.x + w / 2,
        top: center.y - h / 2,
        bottom: center.y + h / 2,
      });

      let p = edgesFromCenter();

      // Grid snapping when grid is active
      if (gridMode !== "none") {
        const gridStep = 20;
        const gridTol = 5;
        const nearX = Math.round(center.x / gridStep) * gridStep;
        const nearY = Math.round(center.y / gridStep) * gridStep;
        let snapX = center.x;
        let snapY = center.y;
        if (Math.abs(center.x - nearX) <= gridTol) snapX = nearX;
        if (Math.abs(center.y - nearY) <= gridTol) snapY = nearY;
        if (snapX !== center.x || snapY !== center.y) {
          setCenter(snapX, snapY);
          p = edgesFromCenter();
        }
      }
      const prevEdges = moveIntent?.prevCenter
        ? {
            centerX: moveIntent.prevCenter.x,
            centerY: moveIntent.prevCenter.y,
            left: moveIntent.prevCenter.x - w / 2,
            right: moveIntent.prevCenter.x + w / 2,
            top: moveIntent.prevCenter.y - h / 2,
            bottom: moveIntent.prevCenter.y + h / 2,
          }
        : null;
      const shouldGuide = (edge, value) => Math.abs(p[edge] - value) < SNAP_TOLERANCE();
      const shouldSnap = (axis, edge, value) => {
        if (!shouldGuide(edge, value)) return false;
        if (!prevEdges) return true;
        const delta = axis === "x" ? Number(moveIntent?.dx || 0) : Number(moveIntent?.dy || 0);
        if (!delta) return true;
        const prevDist = Math.abs(prevEdges[edge] - value);
        const nextDist = Math.abs(p[edge] - value);
        return nextDist + 0.001 < prevDist;
      };

      let snappedV = false;
      let snappedH = false;

      const snapHrToX = (x) => {
        if (!isHrLine(obj)) return false;
        const tol = SNAP_TOLERANCE();
        const leftPt = obj.getPointByOrigin("left", "center");
        const rightPt = obj.getPointByOrigin("right", "center");
        const c = obj.getCenterPoint();
        const dL = Math.abs(leftPt.x - x);
        const dR = Math.abs(rightPt.x - x);
        const dC = Math.abs(c.x - x);
        const best = Math.min(dL, dR, dC);
        if (best >= tol) return false;
        const dx = best === dL ? (x - leftPt.x) : (best === dR ? (x - rightPt.x) : (x - c.x));
        if (prevEdges && moveIntent && Number(moveIntent.dx)) {
          const prevL = leftPt.x - Number(moveIntent.dx);
          const prevR = rightPt.x - Number(moveIntent.dx);
          const prevC = c.x - Number(moveIntent.dx);
          const prevBest = Math.min(Math.abs(prevL - x), Math.abs(prevR - x), Math.abs(prevC - x));
          if (best + 0.001 >= prevBest) return false;
        }
        setCenter(p.centerX + dx, p.centerY);
        p = edgesFromCenter();
        createGuideLine("v", x);
        return true;
      };
      const snapHrToY = (y) => {
        if (!isHrLine(obj)) return false;
        const tol = SNAP_TOLERANCE();
        const leftPt = obj.getPointByOrigin("left", "center");
        const rightPt = obj.getPointByOrigin("right", "center");
        const c = obj.getCenterPoint();
        const dL = Math.abs(leftPt.y - y);
        const dR = Math.abs(rightPt.y - y);
        const dC = Math.abs(c.y - y);
        const best = Math.min(dL, dR, dC);
        if (best >= tol) return false;
        const dy = best === dL ? (y - leftPt.y) : (best === dR ? (y - rightPt.y) : (y - c.y));
        if (prevEdges && moveIntent && Number(moveIntent.dy)) {
          const prevL = leftPt.y - Number(moveIntent.dy);
          const prevR = rightPt.y - Number(moveIntent.dy);
          const prevC = c.y - Number(moveIntent.dy);
          const prevBest = Math.min(Math.abs(prevL - y), Math.abs(prevR - y), Math.abs(prevC - y));
          if (best + 0.001 >= prevBest) return false;
        }
        setCenter(p.centerX, p.centerY + dy);
        p = edgesFromCenter();
        createGuideLine("h", y);
        return true;
      };

      // 1. Snap/show guides near canvas centers
      if (!snappedV) {
        if (snapHrToX(canvasWidth / 2)) snappedV = true;
        else if (shouldGuide("centerX", canvasWidth / 2)) {
          if (shouldSnap("x", "centerX", canvasWidth / 2)) {
            setCenter(canvasWidth / 2, p.centerY);
            p = edgesFromCenter();
          }
          createGuideLine('v', canvasWidth / 2);
          snappedV = true;
        }
      }
      if (!snappedH) {
        if (snapHrToY(canvasHeight / 2)) snappedH = true;
        else if (shouldGuide("centerY", canvasHeight / 2)) {
          if (shouldSnap("y", "centerY", canvasHeight / 2)) {
            setCenter(p.centerX, canvasHeight / 2);
            p = edgesFromCenter();
          }
          createGuideLine('h', canvasHeight / 2);
          snappedH = true;
        }
      }

      // 2. Snap/show guides near other objects (edges and centers)
      canvas.forEachObject((other) => {
        if (other === obj || other.isGuide) return;
        if (obj.fractionId && other.fractionId === obj.fractionId) return;
        if (obj.longDivisionId && other.longDivisionId === obj.longDivisionId) return;
        if (!other.visible) return;

        const otherCenter = other.getCenterPoint();
        const ow = other.getScaledWidth();
        const oh = other.getScaledHeight();
        const q = {
          centerX: otherCenter.x,
          centerY: otherCenter.y,
          left: otherCenter.x - ow / 2,
          right: otherCenter.x + ow / 2,
          top: otherCenter.y - oh / 2,
          bottom: otherCenter.y + oh / 2,
        };

        // Vertical Snapping (X-axis)
        if (!snappedV) {
          if (snapHrToX(q.left) || snapHrToX(q.centerX) || snapHrToX(q.right)) {
            snappedV = true;
          } else if (shouldGuide("left", q.left)) {
            if (shouldSnap("x", "left", q.left)) {
              setCenter(q.left + w / 2, p.centerY);
              p = edgesFromCenter();
            }
            createGuideLine('v', q.left);
            snappedV = true;
          } else if (shouldGuide("centerX", q.centerX)) {
            if (shouldSnap("x", "centerX", q.centerX)) {
              setCenter(q.centerX, p.centerY);
              p = edgesFromCenter();
            }
            createGuideLine('v', q.centerX);
            snappedV = true;
          } else if (shouldGuide("right", q.right)) {
            if (shouldSnap("x", "right", q.right)) {
              setCenter(q.right - w / 2, p.centerY);
              p = edgesFromCenter();
            }
            createGuideLine('v', q.right);
            snappedV = true;
          } else if (shouldGuide("left", q.right)) {
            if (shouldSnap("x", "left", q.right)) {
              setCenter(q.right + w / 2, p.centerY);
              p = edgesFromCenter();
            }
            createGuideLine('v', q.right);
            snappedV = true;
          } else if (shouldGuide("right", q.left)) {
            if (shouldSnap("x", "right", q.left)) {
              setCenter(q.left - w / 2, p.centerY);
              p = edgesFromCenter();
            }
            createGuideLine('v', q.left);
            snappedV = true;
          }
        }

        // Horizontal Snapping (Y-axis)
        if (!snappedH) {
          if (snapHrToY(q.top) || snapHrToY(q.centerY) || snapHrToY(q.bottom)) {
            snappedH = true;
          } else if (shouldGuide("top", q.top)) {
            if (shouldSnap("y", "top", q.top)) {
              setCenter(p.centerX, q.top + h / 2);
              p = edgesFromCenter();
            }
            createGuideLine('h', q.top);
            snappedH = true;
          } else if (shouldGuide("centerY", q.centerY)) {
            if (shouldSnap("y", "centerY", q.centerY)) {
              setCenter(p.centerX, q.centerY);
              p = edgesFromCenter();
            }
            createGuideLine('h', q.centerY);
            snappedH = true;
          } else if (shouldGuide("bottom", q.bottom)) {
            if (shouldSnap("y", "bottom", q.bottom)) {
              setCenter(p.centerX, q.bottom - h / 2);
              p = edgesFromCenter();
            }
            createGuideLine('h', q.bottom);
            snappedH = true;
          } else if (shouldGuide("top", q.bottom)) {
            if (shouldSnap("y", "top", q.bottom)) {
              setCenter(p.centerX, q.bottom + h / 2);
              p = edgesFromCenter();
            }
            createGuideLine('h', q.bottom);
            snappedH = true;
          } else if (shouldGuide("bottom", q.top)) {
            if (shouldSnap("y", "bottom", q.top)) {
              setCenter(p.centerX, q.top - h / 2);
              p = edgesFromCenter();
            }
            createGuideLine('h', q.top);
            snappedH = true;
          }
        }
      });

      const objects = canvas.getObjects();
      const candidates = [];
      objects.forEach((other) => {
        if (other === obj || other.isGuide) return;
        if (obj.fractionId && other.fractionId === obj.fractionId) return;
        if (obj.longDivisionId && other.longDivisionId === obj.longDivisionId) return;
        if (!other.visible) return;

        const c = other.getCenterPoint();
        const ow = other.getScaledWidth();
        const oh = other.getScaledHeight();
        candidates.push({
          obj: other,
          centerX: c.x,
          centerY: c.y,
          left: c.x - ow / 2,
          right: c.x + ow / 2,
          top: c.y - oh / 2,
          bottom: c.y + oh / 2,
          w: ow,
          h: oh,
        });
      });

      const overlapY = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const overlapX = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left);

      let leftNeighbor = null;
      let rightNeighbor = null;
      let topNeighbor = null;
      let bottomNeighbor = null;

      candidates.forEach((q) => {
        const oy = overlapY(p, q);
        if (oy > Math.min(h, q.h) * 0.3) {
          if (q.right <= p.left) {
            const d = p.left - q.right;
            if (!leftNeighbor || d < leftNeighbor.d) leftNeighbor = { ...q, d };
          }
          if (q.left >= p.right) {
            const d = q.left - p.right;
            if (!rightNeighbor || d < rightNeighbor.d) rightNeighbor = { ...q, d };
          }
        }

        const ox = overlapX(p, q);
        if (ox > Math.min(w, q.w) * 0.3) {
          if (q.bottom <= p.top) {
            const d = p.top - q.bottom;
            if (!topNeighbor || d < topNeighbor.d) topNeighbor = { ...q, d };
          }
          if (q.top >= p.bottom) {
            const d = q.top - p.bottom;
            if (!bottomNeighbor || d < bottomNeighbor.d) bottomNeighbor = { ...q, d };
          }
        }
      });

      const baseColor = "#a855f7";
      const okColor = "#22c55e";

      if (leftNeighbor) {
        const y = (Math.max(p.top, leftNeighbor.top) + Math.min(p.bottom, leftNeighbor.bottom)) / 2;
        createMeasureLine(leftNeighbor.right, y, p.left, y, baseColor);
        createMeasureTag(Math.round(leftNeighbor.d), (leftNeighbor.right + p.left) / 2, y, baseColor);
      }
      if (rightNeighbor) {
        const y = (Math.max(p.top, rightNeighbor.top) + Math.min(p.bottom, rightNeighbor.bottom)) / 2;
        createMeasureLine(p.right, y, rightNeighbor.left, y, baseColor);
        createMeasureTag(Math.round(rightNeighbor.d), (p.right + rightNeighbor.left) / 2, y, baseColor);
      }

      if (leftNeighbor && rightNeighbor && Math.abs(leftNeighbor.d - rightNeighbor.d) <= MEASURE_TOLERANCE) {
        const yL = (Math.max(p.top, leftNeighbor.top) + Math.min(p.bottom, leftNeighbor.bottom)) / 2;
        const yR = (Math.max(p.top, rightNeighbor.top) + Math.min(p.bottom, rightNeighbor.bottom)) / 2;
        createMeasureLine(leftNeighbor.right, yL, p.left, yL, okColor);
        createMeasureTag(Math.round(leftNeighbor.d), (leftNeighbor.right + p.left) / 2, yL, okColor);
        createMeasureLine(p.right, yR, rightNeighbor.left, yR, okColor);
        createMeasureTag(Math.round(rightNeighbor.d), (p.right + rightNeighbor.left) / 2, yR, okColor);
      }

      if (topNeighbor) {
        const x = (Math.max(p.left, topNeighbor.left) + Math.min(p.right, topNeighbor.right)) / 2;
        createMeasureLine(x, topNeighbor.bottom, x, p.top, baseColor);
        createMeasureTag(Math.round(topNeighbor.d), x, (topNeighbor.bottom + p.top) / 2, baseColor);
      }
      if (bottomNeighbor) {
        const x = (Math.max(p.left, bottomNeighbor.left) + Math.min(p.right, bottomNeighbor.right)) / 2;
        createMeasureLine(x, p.bottom, x, bottomNeighbor.top, baseColor);
        createMeasureTag(Math.round(bottomNeighbor.d), x, (p.bottom + bottomNeighbor.top) / 2, baseColor);
      }

      if (topNeighbor && bottomNeighbor && Math.abs(topNeighbor.d - bottomNeighbor.d) <= MEASURE_TOLERANCE) {
        const xT = (Math.max(p.left, topNeighbor.left) + Math.min(p.right, topNeighbor.right)) / 2;
        const xB = (Math.max(p.left, bottomNeighbor.left) + Math.min(p.right, bottomNeighbor.right)) / 2;
        createMeasureLine(xT, topNeighbor.bottom, xT, p.top, okColor);
        createMeasureTag(Math.round(topNeighbor.d), xT, (topNeighbor.bottom + p.top) / 2, okColor);
        createMeasureLine(xB, p.bottom, xB, bottomNeighbor.top, okColor);
        createMeasureTag(Math.round(bottomNeighbor.d), xB, (p.bottom + bottomNeighbor.top) / 2, okColor);
      }
    };

    const scheduleKeyboardMoveCommit = () => {
      if (keyboardMoveCommitTimer.current) window.clearTimeout(keyboardMoveCommitTimer.current);
      keyboardMoveCommitTimer.current = window.setTimeout(() => {
        keyboardMoveCommitTimer.current = null;
        clearGuides();
        handleChange();
      }, 140);
    };

    const nudgeSelection = (dx, dy, nativeEvent) => {
      const active = canvas.getActiveObject();
      if (!active || active.isGuide) return false;
      clearTransientTransformState(active);
      const center = active.getCenterPoint();
      active.setPositionByOrigin(
        new fabric.Point(center.x + dx, center.y + dy),
        "center",
        "center"
      );
      active.setCoords();
      applyMoveGuides(active, nativeEvent, { dx, dy, prevCenter: center });
      updateConnectedArrowsForObject(active);
      canvas.requestRenderAll();
      refreshUI();
      scheduleKeyboardMoveCommit();
      return true;
    };

    canvas.on("object:moving", (options) => {
      applyMoveGuides(options.target, options?.e);
      updateFloatingCoords(options.target);
      updateConnectedArrowsForObject(options.target);
    });
    canvas.on("object:rotating", (options) => {
      updateFloatingCoords(options.target);
      updateConnectedArrowsForObject(options.target);
    });

    canvas.on("object:scaling", (options) => {
      const obj = options.target;
      clearGuides();
      updateConnectedArrowsForObject(obj);

      if (!snappingRef.current || options?.e?.altKey) return;

      const corner = options?.transform?.corner || "";
      const isTextbox = obj?.type === "textbox" && !obj.isGuide;
      if ((isTextObj(obj) || isHrLine(obj) || isLongDivisionBracket(obj)) && !obj.isGuide) obj.__scaleCorner = corner;
      if (isLongDivisionBracket(obj) && !obj.isGuide) {
        const anchorCorner = corner ? oppositeCorner(corner) : null;
        const anchorOrigin = anchorCorner ? cornerToOrigin(anchorCorner) : null;
        const anchorPoint = anchorOrigin ? obj.getPointByOrigin(anchorOrigin.originX, anchorOrigin.originY) : null;
        if (anchorOrigin && anchorPoint) {
          obj.__resizeAnchor = { corner, originX: anchorOrigin.originX, originY: anchorOrigin.originY, x: anchorPoint.x, y: anchorPoint.y };
        }
        applyLongDivisionGeometry(
          obj,
          (obj.longDivisionWidth || obj.width || LONG_DIVISION_DEFAULT_WIDTH) * Math.abs(obj.scaleX || 1),
          (obj.longDivisionHeight || obj.height || LONG_DIVISION_DEFAULT_HEIGHT) * Math.abs(obj.scaleY || 1),
          anchorOrigin && anchorPoint
            ? { point: anchorPoint, originX: anchorOrigin.originX, originY: anchorOrigin.originY }
            : null,
        );
        refreshUI();
        return;
      }
      if (isHrLine(obj) && obj.type === "line" && !obj.isGuide) {
        if (obj.shapeKind === "hrLine") {
          obj.set({ scaleY: 1 });
          const sx = Math.abs(obj.scaleX || 1);
          if (sx > 1.001 || sx < 0.999) {
            const anchorOriginX = corner.includes("l") || corner === "ml" ? "right" : "left";
            const anchor = obj.getPointByOrigin(anchorOriginX, "center");
            const baseLen = Math.abs((obj.x2 || 0) - (obj.x1 || 0));
            const nextLen = Math.max(20, baseLen * sx);
            obj.set({ x1: 0, y1: 0, x2: nextLen, y2: 0, scaleX: 1, scaleY: 1 });
            obj.setPositionByOrigin(anchor, anchorOriginX, "center");
            obj.setCoords();
          } else {
            obj.set({ scaleX: 1, scaleY: 1 });
          }
        } else if (obj.shapeKind === "vrLine") {
          obj.set({ scaleX: 1 });
          const sy = Math.abs(obj.scaleY || 1);
          if (sy > 1.001 || sy < 0.999) {
            const anchorOriginY = corner.includes("t") || corner === "mt" ? "bottom" : "top";
            const anchor = obj.getPointByOrigin("center", anchorOriginY);
            const baseLen = Math.abs((obj.y2 || 0) - (obj.y1 || 0));
            const nextLen = Math.max(20, baseLen * sy);
            obj.set({ x1: 0, y1: 0, x2: 0, y2: nextLen, scaleX: 1, scaleY: 1 });
            obj.setPositionByOrigin(anchor, "center", anchorOriginY);
            obj.setCoords();
          } else {
            obj.set({ scaleX: 1, scaleY: 1 });
          }
        }
        configureHrLine(obj);
        refreshUI();
        return;
      }
      if (isHrLine(obj) && obj.shapeKind === "hrLine") obj.set({ scaleY: 1 });
      if (isHrLine(obj) && obj.shapeKind === "vrLine") obj.set({ scaleX: 1 });
      const snapRight = corner.includes("r") || corner === "mr";
      const snapLeft = corner.includes("l") || corner === "ml";
      const snapBottom = !isTextbox && (corner.includes("b") || corner === "mb");
      const snapTop = !isTextbox && (corner.includes("t") || corner === "mt");

      const baseW = obj.width || 0;
      const baseH = obj.height || 0;
      if (!baseW || !baseH) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const dragOrigin = cornerToOrigin(corner);
      const anchorCorner = corner ? oppositeCorner(corner) : null;
      const anchorOrigin = anchorCorner ? cornerToOrigin(anchorCorner) : null;
      const anchorPoint = anchorOrigin ? obj.getPointByOrigin(anchorOrigin.originX, anchorOrigin.originY) : null;

      obj.lockScalingFlip = true;
      obj.centeredScaling = false;
      if (anchorOrigin && anchorPoint && (isTextObj(obj) || isHrLine(obj) || isLongDivisionBracket(obj)) && !obj.isGuide) {
        obj.__resizeAnchor = { corner, originX: anchorOrigin.originX, originY: anchorOrigin.originY, x: anchorPoint.x, y: anchorPoint.y };
      }
      const resizeAnchorPoint = (anchorOrigin && (isTextObj(obj) || isHrLine(obj) || isLongDivisionBracket(obj)) && obj.__resizeAnchor)
        ? new fabric.Point(obj.__resizeAnchor.x, obj.__resizeAnchor.y)
        : anchorPoint;

      const candidates = [];
      canvas.getObjects().forEach((other) => {
        if (other === obj || other.isGuide) return;
        if (obj.fractionId && other.fractionId === obj.fractionId) return;
        if (obj.longDivisionId && other.longDivisionId === obj.longDivisionId) return;
        if (!other.visible) return;

        const c = other.getCenterPoint();
        const ow = other.getScaledWidth();
        const oh = other.getScaledHeight();
        candidates.push({
          centerX: c.x,
          centerY: c.y,
          left: c.x - ow / 2,
          right: c.x + ow / 2,
          top: c.y - oh / 2,
          bottom: c.y + oh / 2,
          w: ow,
          h: oh,
        });
      });

      if (snapRight || snapLeft) {
        const movePoint = obj.getPointByOrigin(dragOrigin.originX, dragOrigin.originY);
        const edge = movePoint.x;
        let best = null;
        let bestDist = SNAP_TOLERANCE();

        const consider = (x) => {
          const d = Math.abs(edge - x);
          if (d < bestDist) {
            bestDist = d;
            best = x;
          }
        };

        consider(canvasWidth / 2);
        candidates.forEach((q) => {
          consider(q.left);
          consider(q.centerX);
          consider(q.right);
        });

        if (best != null) {
          const ax = resizeAnchorPoint ? resizeAnchorPoint.x : (anchorPoint ? anchorPoint.x : movePoint.x);
          const nextW = Math.max(5, Math.abs(best - ax));
          obj.set("scaleX", nextW / baseW);
          clampScale(obj);
          if (resizeAnchorPoint && anchorOrigin) obj.setPositionByOrigin(resizeAnchorPoint, anchorOrigin.originX, anchorOrigin.originY);
          else if (anchorPoint && anchorOrigin) obj.setPositionByOrigin(anchorPoint, anchorOrigin.originX, anchorOrigin.originY);
          obj.setCoords();
          createGuideLine("v", best);
        }
      }

      if (snapBottom || snapTop) {
        const movePoint = obj.getPointByOrigin(dragOrigin.originX, dragOrigin.originY);
        const edge = movePoint.y;
        let best = null;
        let bestDist = SNAP_TOLERANCE();

        const consider = (y) => {
          const d = Math.abs(edge - y);
          if (d < bestDist) {
            bestDist = d;
            best = y;
          }
        };

        consider(canvasHeight / 2);
        candidates.forEach((q) => {
          consider(q.top);
          consider(q.centerY);
          consider(q.bottom);
        });

        if (best != null) {
          const ay = anchorPoint ? anchorPoint.y : movePoint.y;
          const nextH = Math.max(5, Math.abs(best - ay));
          obj.set("scaleY", nextH / baseH);
          clampScale(obj);
          if (anchorPoint && anchorOrigin) obj.setPositionByOrigin(anchorPoint, anchorOrigin.originX, anchorOrigin.originY);
          obj.setCoords();
          createGuideLine("h", best);
        }
      }

      clampScale(obj);
      if (resizeAnchorPoint && anchorOrigin) obj.setPositionByOrigin(resizeAnchorPoint, anchorOrigin.originX, anchorOrigin.originY);
      else if (anchorPoint && anchorOrigin) obj.setPositionByOrigin(anchorPoint, anchorOrigin.originX, anchorOrigin.originY);
      obj.setCoords();

      normalizeTextboxDuringScaling(obj, anchorOrigin, anchorPoint);

      const center = obj.getCenterPoint();
      const w = obj.getScaledWidth();
      const h = obj.getScaledHeight();
      const p = {
        centerX: center.x,
        centerY: center.y,
        left: center.x - w / 2,
        right: center.x + w / 2,
        top: center.y - h / 2,
        bottom: center.y + h / 2,
      };

      const overlapY = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const overlapX = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left);

      let leftNeighbor = null;
      let rightNeighbor = null;
      let topNeighbor = null;
      let bottomNeighbor = null;

      candidates.forEach((q) => {
        const oy = overlapY(p, q);
        if (oy > Math.min(h, q.h) * 0.3) {
          if (q.right <= p.left) {
            const d = p.left - q.right;
            if (!leftNeighbor || d < leftNeighbor.d) leftNeighbor = { ...q, d };
          }
          if (q.left >= p.right) {
            const d = q.left - p.right;
            if (!rightNeighbor || d < rightNeighbor.d) rightNeighbor = { ...q, d };
          }
        }

        const ox = overlapX(p, q);
        if (ox > Math.min(w, q.w) * 0.3) {
          if (q.bottom <= p.top) {
            const d = p.top - q.bottom;
            if (!topNeighbor || d < topNeighbor.d) topNeighbor = { ...q, d };
          }
          if (q.top >= p.bottom) {
            const d = q.top - p.bottom;
            if (!bottomNeighbor || d < bottomNeighbor.d) bottomNeighbor = { ...q, d };
          }
        }
      });

      const baseColor = "#a855f7";
      const okColor = "#22c55e";

      if (leftNeighbor) {
        const y = (Math.max(p.top, leftNeighbor.top) + Math.min(p.bottom, leftNeighbor.bottom)) / 2;
        createMeasureLine(leftNeighbor.right, y, p.left, y, baseColor);
        createMeasureTag(Math.round(leftNeighbor.d), (leftNeighbor.right + p.left) / 2, y, baseColor);
      }
      if (rightNeighbor) {
        const y = (Math.max(p.top, rightNeighbor.top) + Math.min(p.bottom, rightNeighbor.bottom)) / 2;
        createMeasureLine(p.right, y, rightNeighbor.left, y, baseColor);
        createMeasureTag(Math.round(rightNeighbor.d), (p.right + rightNeighbor.left) / 2, y, baseColor);
      }

      if (leftNeighbor && rightNeighbor && Math.abs(leftNeighbor.d - rightNeighbor.d) <= MEASURE_TOLERANCE) {
        const yL = (Math.max(p.top, leftNeighbor.top) + Math.min(p.bottom, leftNeighbor.bottom)) / 2;
        const yR = (Math.max(p.top, rightNeighbor.top) + Math.min(p.bottom, rightNeighbor.bottom)) / 2;
        createMeasureLine(leftNeighbor.right, yL, p.left, yL, okColor);
        createMeasureTag(Math.round(leftNeighbor.d), (leftNeighbor.right + p.left) / 2, yL, okColor);
        createMeasureLine(p.right, yR, rightNeighbor.left, yR, okColor);
        createMeasureTag(Math.round(rightNeighbor.d), (p.right + rightNeighbor.left) / 2, yR, okColor);
      }

      if (topNeighbor) {
        const x = (Math.max(p.left, topNeighbor.left) + Math.min(p.right, topNeighbor.right)) / 2;
        createMeasureLine(x, topNeighbor.bottom, x, p.top, baseColor);
        createMeasureTag(Math.round(topNeighbor.d), x, (topNeighbor.bottom + p.top) / 2, baseColor);
      }
      if (bottomNeighbor) {
        const x = (Math.max(p.left, bottomNeighbor.left) + Math.min(p.right, bottomNeighbor.right)) / 2;
        createMeasureLine(x, p.bottom, x, bottomNeighbor.top, baseColor);
        createMeasureTag(Math.round(bottomNeighbor.d), x, (p.bottom + bottomNeighbor.top) / 2, baseColor);
      }

      if (topNeighbor && bottomNeighbor && Math.abs(topNeighbor.d - bottomNeighbor.d) <= MEASURE_TOLERANCE) {
        const xT = (Math.max(p.left, topNeighbor.left) + Math.min(p.right, topNeighbor.right)) / 2;
        const xB = (Math.max(p.left, bottomNeighbor.left) + Math.min(p.right, bottomNeighbor.right)) / 2;
        createMeasureLine(xT, topNeighbor.bottom, xT, p.top, okColor);
        createMeasureTag(Math.round(topNeighbor.d), xT, (topNeighbor.bottom + p.top) / 2, okColor);
        createMeasureLine(xB, p.bottom, xB, bottomNeighbor.top, okColor);
        createMeasureTag(Math.round(bottomNeighbor.d), xB, (p.bottom + bottomNeighbor.top) / 2, okColor);
      }
      updateFloatingCoords(obj);
    });

    canvas.on("mouse:up", clearGuides);

    // Real-time Fraction Alignment & Sync
    function syncFraction(target) {
      if (!target.fractionId) return;
      
      const objects = canvas.getObjects();
      const parts = objects.filter(o => o.fractionId === target.fractionId);
      const num = parts.find(p => p.fractionRole === 'num');
      const den = parts.find(p => p.fractionRole === 'den');
      const line = parts.find(p => p.fractionRole === 'line');

      if (!num || !den || !line) return;

      const isLineObj = line.type === 'line';
      const lineH = isLineObj ? (line.strokeWidth || 2) : (line.height || 2);
      const lineW = isLineObj ? Math.abs((line.x2 || 0) - (line.x1 || 0)) : (line.width || 0);

      if (target.type === 'i-text') {
        const maxWidth = Math.max(num.width, den.width, 20);
        // Preserve a manually-extended fraction bar, but still grow it when text gets wider.
        const nextW = Math.max(maxWidth + 10, lineW, 30);
        
        if (isLineObj) {
          line.set({ x1: 0, y1: 0, x2: nextW, y2: 0, scaleX: 1, scaleY: 1 });
        } else {
          line.set({ width: nextW });
        }
        
        line.set({ left: num.left });
        den.set({ left: num.left });
        
        const lineTop = num.top + num.height + 2;
        line.set({ top: line.originY === 'center' ? lineTop + lineH / 2 : lineTop });
        den.set({ top: lineTop + lineH + 5 });
      } else if (target === num || target === den || target === line) {
        const offsetX = target.left;
        const offsetY = target.top;
        
        if (target === num) {
          const lineTop = offsetY + num.height + 2;
          line.set({ left: offsetX, top: line.originY === 'center' ? lineTop + lineH / 2 : lineTop });
          den.set({ left: offsetX, top: lineTop + lineH + 5 });
        } else if (target === den) {
          const lineTop = offsetY - lineH - 5;
          num.set({ left: offsetX, top: lineTop - num.height - 2 });
          line.set({ left: offsetX, top: line.originY === 'center' ? lineTop + lineH / 2 : lineTop });
        } else if (target === line) {
          const lineTop = line.originY === 'center' ? offsetY - lineH / 2 : offsetY;
          num.set({ left: offsetX, top: lineTop - num.height - 2 });
          den.set({ left: offsetX, top: lineTop + lineH + 5 });
        }
      }
      num.setCoords?.();
      den.setCoords?.();
      line.setCoords?.();
      canvas.requestRenderAll();
    }

    function syncLongDivision(target) {
      if (!target.longDivisionId) return;

      const objects = canvas.getObjects();
      const parts = objects.filter(o => o.longDivisionId === target.longDivisionId);
      const divisor = parts.find(p => p.longDivisionRole === "divisor");
      const dividend = parts.find(p => p.longDivisionRole === "dividend");
      const bracket = parts.find(p => p.longDivisionRole === "bracket");

      if (!divisor || !dividend || !bracket) return;

      const divisorH = divisor.height || 24;
      const dividendW = dividend.width || 36;
      const dividendH = dividend.height || 24;
      const currentBracketWidth = bracket.longDivisionWidth || bracket.width || LONG_DIVISION_PRESET_WIDTH;
      const currentBracketHeight = bracket.longDivisionHeight || bracket.height || LONG_DIVISION_PRESET_HEIGHT;
      const contentWidth = Math.max(dividendW + 12, LONG_DIVISION_MIN_AUTO_WIDTH);
      const contentHeight = Math.max(dividendH + 8, divisorH + 10, LONG_DIVISION_MIN_AUTO_HEIGHT);
      const divisorGap = -4;
      const dividendOffsetY = 1;

      const placeFromBracket = (bracketLeft, bracketTop, nextBracketWidth, nextBracketHeight) => {
        const dividendInset = Math.max(10, Math.min(16, nextBracketWidth * 0.14));
        const divisorOffsetY = dividendOffsetY + Math.round((dividendH - divisorH) / 2);
        applyLongDivisionGeometry(bracket, nextBracketWidth, nextBracketHeight, {
          point: new fabric.Point(bracketLeft, bracketTop),
          originX: "left",
          originY: "top",
        });
        divisor.set({
          left: bracketLeft - divisorGap,
          top: bracketTop + divisorOffsetY,
        });
        dividend.set({
          left: bracketLeft + dividendInset,
          top: bracketTop + dividendOffsetY,
        });
      };

      if (target.type === "i-text") {
        const nextBracketWidth = contentWidth;
        const nextBracketHeight = contentHeight;
        if (target === divisor) {
          const bracketLeft = divisor.left + divisorGap;
          const divisorOffsetY = dividendOffsetY + Math.round((dividendH - divisorH) / 2);
          const bracketTop = divisor.top - divisorOffsetY;
          placeFromBracket(bracketLeft, bracketTop, nextBracketWidth, nextBracketHeight);
        } else if (target === dividend) {
          const bracketLeft = dividend.left - Math.max(10, Math.min(16, nextBracketWidth * 0.14));
          const bracketTop = dividend.top - dividendOffsetY;
          placeFromBracket(bracketLeft, bracketTop, nextBracketWidth, nextBracketHeight);
        }
      } else if (target === divisor || target === dividend || target === bracket) {
        const nextBracketWidth = target === bracket
          ? Math.max(currentBracketWidth, contentWidth)
          : contentWidth;
        const nextBracketHeight = target === bracket
          ? Math.max(currentBracketHeight, contentHeight)
          : contentHeight;
        if (target === divisor) {
          const bracketLeft = divisor.left + divisorGap;
          const divisorOffsetY = dividendOffsetY + Math.round((dividendH - divisorH) / 2);
          const bracketTop = divisor.top - divisorOffsetY;
          placeFromBracket(bracketLeft, bracketTop, nextBracketWidth, nextBracketHeight);
        } else if (target === dividend) {
          const bracketLeft = dividend.left - Math.max(10, Math.min(16, nextBracketWidth * 0.14));
          const bracketTop = dividend.top - dividendOffsetY;
          placeFromBracket(bracketLeft, bracketTop, nextBracketWidth, nextBracketHeight);
        } else {
          const bracketLeft = Number.isFinite(bracket.left) ? bracket.left : bracket.getBoundingRect().left;
          const bracketTop = Number.isFinite(bracket.top) ? bracket.top : bracket.getBoundingRect().top;
          placeFromBracket(bracketLeft, bracketTop, nextBracketWidth, nextBracketHeight);
        }
      }

      divisor.setCoords?.();
      dividend.setCoords?.();
      bracket.setCoords?.();
      canvas.requestRenderAll();
    }

    canvas.on("object:moving", (e) => syncFraction(e.target));
    canvas.on("object:moving", (e) => syncLongDivision(e.target));
    canvas.on("text:changed", (e) => {
      syncFraction(e.target);
      syncLongDivision(e.target);
      if (!e?.target?.isGuide) {
        scheduleLiveChange();
        scheduleLiveExport();
      }
    });

    // Handle fraction part deletion to prevent locking
    canvas.on("object:removed", (e) => {
      const removed = e.target;
      if (removed.fractionId && !isInternalChange.current) {
        const objects = canvas.getObjects();
        objects.forEach(obj => {
          if (obj.fractionId === removed.fractionId) {
            delete obj.fractionId;
            delete obj.fractionRole;
            obj.set({ selectable: true, hasControls: true, evented: true });
          }
        });
      }
      if (removed.longDivisionId && !isInternalChange.current) {
        const objects = canvas.getObjects();
        objects.forEach(obj => {
          if (obj.longDivisionId === removed.longDivisionId) {
            delete obj.longDivisionId;
            delete obj.longDivisionRole;
            obj.set({ selectable: true, hasControls: true, evented: true });
          }
        });
      }
      if (!e.target._fromUndo && !e.target.isGuide) {
        if (!isErasingRef.current) scheduleCommitChange();
      }
    });

    const performUndo = () => {
      if (changeCommitTimer.current) {
        window.clearTimeout(changeCommitTimer.current);
        changeCommitTimer.current = null;
        handleChange();
      }
      if (history.current.length <= 1) return;
      isInternalChange.current = true;
      const current = history.current.pop();
      redoStack.current.push(current);
      const prev = history.current[history.current.length - 1];
      canvas.loadFromJSON(prev, () => {
        canvas.forEachObject(obj => obj._fromUndo = true);
        migrateLegacyTextOnCanvas();
        canvas.getObjects().forEach(ensureLayerId);
        canvas.renderAll();
        isInternalChange.current = false;
        const state = canvas.toJSON();
        const dataURL = exportDataURL();
        onChange({ state, dataURL });
        refreshUI();
      });
    };

    const performRedo = () => {
      if (changeCommitTimer.current) {
        window.clearTimeout(changeCommitTimer.current);
        changeCommitTimer.current = null;
        handleChange();
      }
      if (redoStack.current.length === 0) return;
      isInternalChange.current = true;
      const next = redoStack.current.pop();
      history.current.push(next);
      canvas.loadFromJSON(next, () => {
        canvas.forEachObject(obj => obj._fromUndo = true);
        migrateLegacyTextOnCanvas();
        canvas.getObjects().forEach(ensureLayerId);
        canvas.renderAll();
        isInternalChange.current = false;
        const state = canvas.toJSON();
        const dataURL = exportDataURL();
        onChange({ state, dataURL });
        refreshUI();
      });
    };

    const getCanvasCenter = () => {
      const w = typeof canvas.getWidth === "function" ? canvas.getWidth() : canvas.width;
      const h = typeof canvas.getHeight === "function" ? canvas.getHeight() : canvas.height;
      const cx = Number.isFinite(w) ? w / 2 : 0;
      const cy = Number.isFinite(h) ? h / 2 : 0;
      return new fabric.Point(cx, cy);
    };

    const getRectCenter = (o) => {
      try {
        const r = o.getBoundingRect(true, true);
        if (r && Number.isFinite(r.left) && Number.isFinite(r.top) && Number.isFinite(r.width) && Number.isFinite(r.height)) {
          return new fabric.Point(r.left + r.width / 2, r.top + r.height / 2);
        }
      } catch {}
      try {
        const p = o.getCenterPoint();
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
      } catch {}
      return getCanvasCenter();
    };

    const copySelection = () => {
      const active = canvas.getActiveObject();
      if (!active) return false;
      const activeObjects = canvas.getActiveObjects?.() || (active ? [active] : []);
      const objs = (activeObjects || []).filter(o => o && !o.isGuide);
      if (!objs.length) return false;
      clipboardData.current = {
        type: (objs.length > 1 ? "activeSelection" : (active.type || "object")),
        objects: objs.map(o => o.toObject())
      };
      clipboard.current = active;
      clipboardMeta.current = { type: active.type };
      clipboardClone.current = null;
      active.clone((cloned) => {
        clipboardClone.current = cloned;
      });
      return true;
    };

    const pasteSelection = (pointOverride) => {
      const payload = clipboardData.current;
      if (payload?.objects?.length) {
        fabric.util.enlivenObjects(payload.objects, (enlivened) => {
          const objects = (enlivened || []).filter(Boolean);
          if (!objects.length) return;
          canvas.discardActiveObject();
          isInternalChange.current = true;
          if (changeCommitTimer.current) window.clearTimeout(changeCommitTimer.current);
          changeCommitTimer.current = null;

          const pickTarget = (base) => {
            if (pointOverride && Number.isFinite(pointOverride.x) && Number.isFinite(pointOverride.y)) return new fabric.Point(pointOverride.x, pointOverride.y);
            const p = lastPointer.current;
            if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return new fabric.Point(p.x, p.y);
            const c = base || getCanvasCenter();
            if (Number.isFinite(c.x) && Number.isFinite(c.y)) return new fabric.Point(c.x + 20, c.y + 20);
            return new fabric.Point(60, 60);
          };

          const cleanObj = (obj) => {
            if (obj.type === "line" && obj.fractionRole === "line" && !obj.shapeKind) obj.shapeKind = "hrLine";
            delete obj.fractionId;
            delete obj.fractionRole;
            delete obj.longDivisionId;
            delete obj.longDivisionRole;
            obj.set({ selectable: true, hasControls: true, evented: true });
            if (isTextObj(obj)) obj.initDimensions();
            configureHrLine(obj);
            ensureLayerId(obj);
            obj.dirty = true;
          };

          objects.forEach((obj) => {
            cleanObj(obj);
            obj.set({ visible: true, opacity: 1 });
            obj.setCoords?.();
            canvas.add(obj);
          });

          if (objects.length > 1) {
            const selection = new fabric.ActiveSelection(objects, { canvas });
            const baseCenter = getRectCenter(selection);
            const targetCenter = pickTarget(baseCenter);
            selection.setPositionByOrigin(targetCenter, "center", "center");
            selection.setCoords();
            canvas.setActiveObject(selection);
          } else {
            const obj = objects[0];
            const baseCenter = getRectCenter(obj);
            const targetCenter = pickTarget(baseCenter);
            obj.setPositionByOrigin(targetCenter, "center", "center");
            obj.setCoords?.();
            canvas.setActiveObject(obj);
          }

          canvas.renderAll();
          isInternalChange.current = false;
          handleChange();
          refreshUI();
        });
        return true;
      }

      const source = clipboardClone.current || clipboard.current;
      if (!source) return false;
      source.clone((cloned) => {
        canvas.discardActiveObject();
        isInternalChange.current = true;
        if (changeCommitTimer.current) window.clearTimeout(changeCommitTimer.current);
        changeCommitTimer.current = null;

        const pickTarget = (base) => {
          if (pointOverride && Number.isFinite(pointOverride.x) && Number.isFinite(pointOverride.y)) return new fabric.Point(pointOverride.x, pointOverride.y);
          const p = lastPointer.current;
          if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return new fabric.Point(p.x, p.y);
          const c = base || getCanvasCenter();
          if (Number.isFinite(c.x) && Number.isFinite(c.y)) return new fabric.Point(c.x + 20, c.y + 20);
          return new fabric.Point(60, 60);
        };

        const cleanObj = (obj) => {
          if (obj.type === "line" && obj.fractionRole === "line" && !obj.shapeKind) obj.shapeKind = "hrLine";
          delete obj.fractionId;
          delete obj.fractionRole;
          delete obj.longDivisionId;
          delete obj.longDivisionRole;
          obj.set({ selectable: true, hasControls: true, evented: true });
          if (isTextObj(obj)) obj.initDimensions();
          configureHrLine(obj);
          ensureLayerId(obj);
          obj.dirty = true;
        };

        const metaType = clipboardMeta.current?.type;

        if (cloned.type === "group" && metaType === "activeSelection" && typeof cloned.toActiveSelection === "function") {
          cloned.set({ visible: true, opacity: 1, evented: true });
          cloned.canvas = canvas;
          cloned.forEachObject(cleanObj);
          canvas.add(cloned);
          const baseCenter = getRectCenter(cloned);
          const targetCenter = pickTarget(baseCenter);
          cloned.setPositionByOrigin(targetCenter, "center", "center");
          cloned.setCoords();
          canvas.setActiveObject(cloned);
          canvas.renderAll();
          cloned.toActiveSelection();
          const sel = canvas.getActiveObject();
          sel?.setCoords?.();
          canvas.setActiveObject(sel);
          canvas.renderAll();
        } else if (cloned.type === 'activeSelection') {
          const group = typeof cloned.toGroup === "function" ? cloned.toGroup() : null;
          const g = group || cloned;
          g.set({ visible: true, opacity: 1, evented: true });
          g.canvas = canvas;
          if (typeof g.forEachObject === "function") g.forEachObject(cleanObj);
          canvas.add(g);
          const baseCenter = getRectCenter(g);
          const targetCenter = pickTarget(baseCenter);
          g.setPositionByOrigin(targetCenter, "center", "center");
          g.setCoords();
          canvas.setActiveObject(g);
          canvas.renderAll();
          if (typeof g.toActiveSelection === "function") {
            g.toActiveSelection();
            const sel = canvas.getActiveObject();
            sel?.setCoords?.();
            canvas.setActiveObject(sel);
            canvas.renderAll();
          }
        } else {
          const baseCenter = getRectCenter(cloned);
          const targetCenter = pickTarget(baseCenter);
          cleanObj(cloned);
          cloned.set({
            visible: true,
            opacity: 1,
          });
          cloned.setPositionByOrigin(targetCenter, "center", "center");
          cloned.setCoords();
          cloned.dirty = true;
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
        }
        canvas.renderAll();
        isInternalChange.current = false;
        handleChange();
        refreshUI();
      });
      return true;
    };

    const deleteSelection = () => {
      const activeObject = canvas.getActiveObject();
      if (!activeObject) return false;
      if (activeObject.isEditing) return false;
      canvas.remove(...canvas.getActiveObjects());
      canvas.discardActiveObject().renderAll();
      refreshUI();
      return true;
    };

    const duplicateSelection = () => {
      const active = canvas.getActiveObject();
      if (!active) return false;
      const base = (canvas.getActiveObjects?.()?.length || 0) > 1 ? new fabric.ActiveSelection(canvas.getActiveObjects(), { canvas }) : active;
      const center = getRectCenter(base);
      const target = new fabric.Point(center.x + 20, center.y + 20);
      if (!copySelection()) return false;
      return pasteSelection(target);
    };

    const groupSelection = () => {
      const active = canvas.getActiveObject();
      if (!active || active.type !== "activeSelection") return false;
      const g = typeof active.toGroup === "function" ? active.toGroup() : null;
      if (!g) return false;
      ensureLayerId(g);
      canvas.setActiveObject(g);
      canvas.requestRenderAll();
      handleChange();
      refreshUI();
      return true;
    };

    const ungroupSelection = () => {
      const active = canvas.getActiveObject();
      if (!active || active.type !== "group" || typeof active.toActiveSelection !== "function") return false;
      active.toActiveSelection();
      const sel = canvas.getActiveObject();
      sel?.setCoords?.();
      canvas.requestRenderAll();
      handleChange();
      refreshUI();
      return true;
    };

    const alignSelection = (alignmentType) => {
      const active = canvas.getActiveObject();
      const objects = (canvas.getActiveObjects?.() || []).filter(o => o && !o.isGuide);
      if (!objects.length) return false;

      const syncCompound = (obj) => {
        if (obj.fractionId) syncFraction(obj);
        if (obj.longDivisionId) syncLongDivision(obj);
      };

      // 1. Single object: align relative to canvas bounds
      if (objects.length === 1) {
        const obj = objects[0];
        const cWidth = canvas.getWidth();
        const cHeight = canvas.getHeight();
        const b = obj.getBoundingRect(true, true);
        const offsetX = obj.left - b.left;
        const offsetY = obj.top - b.top;

        let targetLeft = obj.left;
        let targetTop = obj.top;

        switch (alignmentType) {
          case "left":
            targetLeft = 24 + offsetX;
            break;
          case "centerH":
            targetLeft = Math.round((cWidth - b.width) / 2) + offsetX;
            break;
          case "right":
            targetLeft = Math.round(cWidth - b.width - 24) + offsetX;
            break;
          case "top":
            targetTop = 24 + offsetY;
            break;
          case "middleV":
            targetTop = Math.round((cHeight - b.height) / 2) + offsetY;
            break;
          case "bottom":
            targetTop = Math.round(cHeight - b.height - 24) + offsetY;
            break;
          case "centerCanvas":
            targetLeft = Math.round((cWidth - b.width) / 2) + offsetX;
            targetTop = Math.round((cHeight - b.height) / 2) + offsetY;
            break;
          default:
            return false;
        }

        obj.set({ left: targetLeft, top: targetTop });
        obj.setCoords();
        syncCompound(obj);
        canvas.requestRenderAll();
        handleChange();
        refreshUI();
        return true;
      }

      // 2. Multiple objects (ActiveSelection)
      const selRect = active.getBoundingRect(true, true);
      const minLeft = selRect.left;
      const maxRight = selRect.left + selRect.width;
      const centerX = selRect.left + selRect.width / 2;
      const minTop = selRect.top;
      const maxBottom = selRect.top + selRect.height;
      const centerY = selRect.top + selRect.height / 2;

      // Discard active selection to revert child coordinates to world canvas space
      canvas.discardActiveObject();

      if (alignmentType === "distributeH" || alignmentType === "distributeV") {
        if (objects.length < 3) {
          const reSel = new fabric.ActiveSelection(objects, { canvas });
          canvas.setActiveObject(reSel);
          reSel.setCoords();
          canvas.requestRenderAll();
          return false;
        }

        if (alignmentType === "distributeH") {
          const sorted = [...objects].sort((a, b) => {
            const bA = a.getBoundingRect(true, true);
            const bB = b.getBoundingRect(true, true);
            return (bA.left + bA.width / 2) - (bB.left + bB.width / 2);
          });

          const firstBox = sorted[0].getBoundingRect(true, true);
          const lastBox = sorted[sorted.length - 1].getBoundingRect(true, true);
          const totalSpan = (lastBox.left + lastBox.width) - firstBox.left;
          const totalObjWidths = sorted.reduce((sum, o) => sum + o.getBoundingRect(true, true).width, 0);
          const availableSpace = totalSpan - totalObjWidths;

          if (availableSpace >= 0) {
            const gap = availableSpace / (sorted.length - 1);
            let curLeft = firstBox.left + firstBox.width + gap;
            for (let i = 1; i < sorted.length - 1; i++) {
              const obj = sorted[i];
              const b = obj.getBoundingRect(true, true);
              const offsetX = obj.left - b.left;
              obj.set({ left: curLeft + offsetX });
              obj.setCoords();
              syncCompound(obj);
              curLeft += b.width + gap;
            }
          } else {
            const firstCenter = firstBox.left + firstBox.width / 2;
            const lastCenter = lastBox.left + lastBox.width / 2;
            const centerStep = (lastCenter - firstCenter) / (sorted.length - 1);
            for (let i = 1; i < sorted.length - 1; i++) {
              const obj = sorted[i];
              const b = obj.getBoundingRect(true, true);
              const targetCenter = firstCenter + i * centerStep;
              const deltaX = targetCenter - (b.left + b.width / 2);
              obj.set({ left: obj.left + deltaX });
              obj.setCoords();
              syncCompound(obj);
            }
          }
        } else if (alignmentType === "distributeV") {
          const sorted = [...objects].sort((a, b) => {
            const bA = a.getBoundingRect(true, true);
            const bB = b.getBoundingRect(true, true);
            return (bA.top + bA.height / 2) - (bB.top + bB.height / 2);
          });

          const firstBox = sorted[0].getBoundingRect(true, true);
          const lastBox = sorted[sorted.length - 1].getBoundingRect(true, true);
          const totalSpan = (lastBox.top + lastBox.height) - firstBox.top;
          const totalObjHeights = sorted.reduce((sum, o) => sum + o.getBoundingRect(true, true).height, 0);
          const availableSpace = totalSpan - totalObjHeights;

          if (availableSpace >= 0) {
            const gap = availableSpace / (sorted.length - 1);
            let curTop = firstBox.top + firstBox.height + gap;
            for (let i = 1; i < sorted.length - 1; i++) {
              const obj = sorted[i];
              const b = obj.getBoundingRect(true, true);
              const offsetY = obj.top - b.top;
              obj.set({ top: curTop + offsetY });
              obj.setCoords();
              syncCompound(obj);
              curTop += b.height + gap;
            }
          } else {
            const firstCenter = firstBox.top + firstBox.height / 2;
            const lastCenter = lastBox.top + lastBox.height / 2;
            const centerStep = (lastCenter - firstCenter) / (sorted.length - 1);
            for (let i = 1; i < sorted.length - 1; i++) {
              const obj = sorted[i];
              const b = obj.getBoundingRect(true, true);
              const targetCenter = firstCenter + i * centerStep;
              const deltaY = targetCenter - (b.top + b.height / 2);
              obj.set({ top: obj.top + deltaY });
              obj.setCoords();
              syncCompound(obj);
            }
          }
        }
      } else {
        objects.forEach((obj) => {
          const b = obj.getBoundingRect(true, true);
          let deltaX = 0;
          let deltaY = 0;

          switch (alignmentType) {
            case "left":
              deltaX = minLeft - b.left;
              break;
            case "centerH":
              deltaX = centerX - (b.left + b.width / 2);
              break;
            case "right":
              deltaX = maxRight - (b.left + b.width);
              break;
            case "top":
              deltaY = minTop - b.top;
              break;
            case "middleV":
              deltaY = centerY - (b.top + b.height / 2);
              break;
            case "bottom":
              deltaY = maxBottom - (b.top + b.height);
              break;
            case "centerCanvas": {
              const cW = canvas.getWidth();
              const cH = canvas.getHeight();
              deltaX = (cW / 2) - centerX;
              deltaY = (cH / 2) - centerY;
              break;
            }
            default:
              break;
          }

          if (deltaX !== 0) obj.set({ left: obj.left + deltaX });
          if (deltaY !== 0) obj.set({ top: obj.top + deltaY });
          obj.setCoords();
          syncCompound(obj);
        });
      }

      // Recreate active selection with aligned objects
      const newSel = new fabric.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(newSel);
      newSel.setCoords();
      updateConnectedArrowsForObject(newSel);
      canvas.requestRenderAll();
      handleChange();
      refreshUI();
      return true;
    };

    const zoomBy = (factor) => {
      const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
      zoomToPoint(center, canvas.getZoom() * factor);
    };
    const resetZoom = () => {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.requestRenderAll();
      setZoomPercent(100);
    };

    // Keyboard support
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      const key = String(e.key || "").toLowerCase();
      const tag = e.target?.tagName || "";
      const isTyping = !!tag && /INPUT|TEXTAREA/.test(tag);
      const activeNow = canvas.getActiveObject();
      const isEditingText = isTextObj(activeNow) && !!activeNow.isEditing;

      // Guaranteed way out of a stuck text edit: fabric normally handles Escape
      // on its hidden textarea, but if that listener is ever lost this still
      // lets the user cancel the edit instead of locking the canvas.
      if (e.key === "Escape" && isEditingText && typeof activeNow.exitEditing === "function") {
        activeNow.exitEditing();
        refreshUI();
        scheduleCommitChange();
        return;
      }

      if (e.code === "Space" && !isTyping && !isEditingText) {
        spaceDownRef.current = true;
        e.preventDefault();
        return;
      }

      if (key === 'm' && !ctrlKey && !isTyping && !isEditingText) {
        setSnapping(s => !s);
        e.preventDefault();
        return;
      }

      if (key === 'g' && !ctrlKey && !isTyping && !isEditingText) {
        setGridMode(g => g === "none" ? "dots" : g === "dots" ? "grid" : "none");
        e.preventDefault();
        return;
      }

      if (e.altKey && !ctrlKey && !isTyping && !isEditingText && canvas.getActiveObject()) {
        if (e.key === "ArrowLeft") {
          alignSelection("left");
          e.preventDefault();
          return;
        }
        if (e.key === "ArrowRight") {
          alignSelection("right");
          e.preventDefault();
          return;
        }
        if (e.key === "ArrowUp") {
          alignSelection("top");
          e.preventDefault();
          return;
        }
        if (e.key === "ArrowDown") {
          alignSelection("bottom");
          e.preventDefault();
          return;
        }
        if (key === "h") {
          alignSelection("centerH");
          e.preventDefault();
          return;
        }
        if (key === "v") {
          alignSelection("middleV");
          e.preventDefault();
          return;
        }
      }

      if (!ctrlKey && !isTyping && !isEditingText && /^Arrow(Up|Down|Left|Right)$/.test(e.key || "")) {
        const step = e.shiftKey ? 10 : 1;
        const moved = nudgeSelection(
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0,
          e
        );
        if (moved) e.preventDefault();
        return;
      }

      if (ctrlKey && key === 'z') {
        if (e.shiftKey) performRedo();
        else performUndo();
        e.preventDefault();
      } else if (ctrlKey && key === 'y') {
        performRedo();
        e.preventDefault();
      } else if (ctrlKey && (key === '=' || key === '+')) {
        if (isTyping || isEditingText) return;
        zoomBy(1.12);
        e.preventDefault();
      } else if (ctrlKey && key === '-') {
        if (isTyping || isEditingText) return;
        zoomBy(1 / 1.12);
        e.preventDefault();
      } else if (ctrlKey && key === '0') {
        if (isTyping || isEditingText) return;
        resetZoom();
        e.preventDefault();
      } else if (ctrlKey && key === 'a') {
        if (isTyping || isEditingText) return;
        const objs = canvas.getObjects().filter(o => !o.isGuide);
        if (!objs.length) return;
        canvas.discardActiveObject();
        const sel = new fabric.ActiveSelection(objs, { canvas });
        sel.setCoords();
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
        refreshUI();
        e.preventDefault();
      } else if (ctrlKey && key === 'c') {
        if (isTyping || isEditingText) return;
        copySelection();
        e.preventDefault();
      } else if (ctrlKey && key === 'v') {
        if (isTyping || isEditingText) return;
        pasteSelection();
        e.preventDefault();
      } else if (ctrlKey && key === 'd') {
        if (isTyping || isEditingText) return;
        duplicateSelection();
        e.preventDefault();
      } else if (ctrlKey && key === 'g') {
        if (isTyping || isEditingText) return;
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        e.preventDefault();
      } else if (key === 's' && !ctrlKey && !isTyping && !isEditingText) {
        straightenSelection();
      } else if (key === 'e' && !ctrlKey && !isTyping && !isEditingText) {
        setTool("eraser");
      } else if (key === 'p' && !ctrlKey && !isTyping && !isEditingText) {
        setTool("pen");
      } else if (key === 'v' && !ctrlKey && !isTyping && !isEditingText) {
        setTool("move");
      } else if ((e.key === "Delete" || e.key === "Backspace") && !(e.target?.tagName && e.target.tagName.match(/INPUT|TEXTAREA/))) {
        deleteSelection();
      }
    };
    const handleKeyUp = (e) => {
      if (/^Arrow(Up|Down|Left|Right)$/.test(e.key || "")) {
        clearGuides();
        canvas.requestRenderAll();
      }
      if (e.code !== "Space") return;
      spaceDownRef.current = false;
      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas.skipTargetFind = false;
        canvas.selection = (!canvas.isDrawingMode && toolRef.current === "move");
        canvas.defaultCursor = canvas.isDrawingMode ? "crosshair" : "default";
        canvas.requestRenderAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const handleWindowBlur = () => {
      spaceDownRef.current = false;
      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas.skipTargetFind = toolRef.current === "pan";
        canvas.selection = (!canvas.isDrawingMode && toolRef.current === "move");
        canvas.defaultCursor = canvas.isDrawingMode ? "crosshair" : "default";
        canvas.requestRenderAll();
      }
      const editing = canvas.getActiveObject();
      if (isTextObj(editing) && editing.isEditing && typeof editing.exitEditing === "function") {
        editing.exitEditing();
        refreshUI();
        scheduleCommitChange();
      }
    };
    window.addEventListener("blur", handleWindowBlur);

    fabricRef.current.performUndo = performUndo;
    fabricRef.current.performRedo = performRedo;
    fabricRef.current.copySelection = copySelection;
    fabricRef.current.pasteSelection = pasteSelection;
    fabricRef.current.deleteSelection = deleteSelection;
    fabricRef.current.duplicateSelection = duplicateSelection;
    fabricRef.current.groupSelection = groupSelection;
    fabricRef.current.ungroupSelection = ungroupSelection;
    fabricRef.current.alignSelection = alignSelection;
    fabricRef.current.zoomBy = zoomBy;
    fabricRef.current.resetZoom = resetZoom;
    fabricRef.current.refreshUI = refreshUI;

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      ctxEl?.removeEventListener?.("contextmenu", handleContextMenu);
      ctxEl?.removeEventListener?.("touchstart", onCanvasTouchStart);
      ctxEl?.removeEventListener?.("touchmove", onCanvasTouchMove);
      ctxEl?.removeEventListener?.("touchend", onCanvasTouchEnd);
      ctxEl?.removeEventListener?.("touchcancel", onCanvasTouchEnd);
      clearLongPressTimer();
      if (keyboardMoveCommitTimer.current) window.clearTimeout(keyboardMoveCommitTimer.current);
      if (textLiveTimer.current) window.clearTimeout(textLiveTimer.current);
      if (textExportTimer.current) window.clearTimeout(textExportTimer.current);
      if (changeCommitTimer.current) window.clearTimeout(changeCommitTimer.current);
      canvas.off("object:scaling");
      canvas.off("mouse:wheel", handleWheelZoom);
      canvas.dispose();
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = "";
    };
  }, []); // Only on mount

  useEffect(() => {
    if (!ctxMenu) return;
    const onMouseDown = (e) => {
      if (ctxMenuRef.current && ctxMenuRef.current.contains(e.target)) return;
      setCtxMenu(null);
    };
    const onTouchStart = (e) => {
      if (ctxMenuRef.current && ctxMenuRef.current.contains(e.target)) return;
      setCtxMenu(null);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setCtxMenu(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ctxMenu]);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const onMouseDown = (e) => {
      if (colorPickerRef.current && colorPickerRef.current.contains(e.target)) return;
      setColorPickerOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setColorPickerOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [colorPickerOpen]);

  useEffect(() => {
    if (!stickyNoteMenuOpen && !floatingPopover && !flowchartMenuOpen && !shapesMenuOpen && !mathMenuOpen) return;
    const onPointerDown = (e) => {
      if (stickyNoteMenuRef.current && stickyNoteMenuRef.current.contains(e.target)) return;
      if (flowchartMenuRef.current && flowchartMenuRef.current.contains(e.target)) return;
      if (shapesMenuRef.current && shapesMenuRef.current.contains(e.target)) return;
      if (mathMenuRef.current && mathMenuRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".draw-canva-floating-bar")) return;
      setStickyNoteMenuOpen(false);
      setFlowchartMenuOpen(false);
      setShapesMenuOpen(false);
      setMathMenuOpen(false);
      setFloatingPopover(null);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setStickyNoteMenuOpen(false);
        setFlowchartMenuOpen(false);
        setShapesMenuOpen(false);
        setMathMenuOpen(false);
        setFloatingPopover(null);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stickyNoteMenuOpen, floatingPopover, flowchartMenuOpen, shapesMenuOpen, mathMenuOpen]);

  useEffect(() => {
    snappingRef.current = snapping;
  }, [snapping]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundColor = gridMode === "none" ? "#ffffff" : gridMode === "warm" ? "#faf8f5" : "transparent";
    canvas.requestRenderAll();
  }, [gridMode]);

  useEffect(() => {
    if (!alignMenuOpen) return;
    const onMouseDown = (e) => {
      if (alignMenuRef.current && alignMenuRef.current.contains(e.target)) return;
      setAlignMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setAlignMenuOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("touchstart", onMouseDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("touchstart", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [alignMenuOpen]);

  // Update tool settings
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    const isPan = tool === "pan";
    const isEraser = tool === "eraser";
    const isHighlighter = tool === "highlighter";
    canvas.isDrawingMode = (tool === "pen" || isHighlighter);
    canvas.selection = (!canvas.isDrawingMode && !isEraser && tool === "move");
    canvas.selectionKey = "shiftKey";
    canvas.skipTargetFind = isPan || isEraser;
    
    if (canvas.isDrawingMode || isPan) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = isHighlighter ? toHighlighterColor(color) : color;
      canvas.freeDrawingBrush.width = isHighlighter ? Math.max(16, size * 5) : size;
      canvas.freeDrawingBrush.straightLineKey = "shiftKey";
      canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
    } else if (isEraser) {
      canvas.discardActiveObject();
      canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
    } else {
      canvas.forEachObject(obj => { obj.selectable = true; obj.evented = true; });
    }

    // Set cursors
    if (tool === "pen" || isHighlighter) {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    } else if (isEraser) {
      const eraserR = Math.max(10, Math.min(30, size * 3.5));
      const s = eraserR * 2 + 6;
      const c = eraserR + 3;
      const cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><circle cx="${c}" cy="${c}" r="${eraserR}" fill="rgba(239,68,68,0.22)" stroke="#e11d48" stroke-width="1.75"/><circle cx="${c}" cy="${c}" r="1.5" fill="#e11d48"/></svg>`;
      const cursorUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(cursorSvg)}") ${c} ${c}, auto`;
      canvas.defaultCursor = cursorUrl;
      canvas.hoverCursor = cursorUrl;
    } else if (tool === "pan") {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    } else {
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
    }

    canvas.requestRenderAll();
  }, [tool, color, size]);

  // Handle height changes
  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.setHeight(Math.max(MIN_H, Math.min(height, MAX_H)));
    fabricRef.current.requestRenderAll();
  }, [height, MAX_H, MIN_H]);

  useEffect(() => {
    const el = boardRef.current;
    const canvas = fabricRef.current;
    if (!el || !canvas) return;
    const apply = () => {
      const w = Math.floor(el.clientWidth - 20);
      const next = Math.max(280, Math.min(BASE_W, w || BASE_W));
      if (canvas.getWidth() !== next) canvas.setWidth(next);
      canvas.calcOffset?.();
      canvas.requestRenderAll();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (boardRef.current) boardRef.current.style.height = `${height}px`;
  }, [height]);

  useEffect(() => {
    if (!boardRef.current) return;
    const resizeScroll = resizeScrollRef.current;
    const autoScrollGuard = resizeAutoScrollGuardRef.current;
    autoScrollGuard.skipUntil = performance.now() + 500;
    resizeScroll.lastH = Math.round(boardRef.current.getBoundingClientRect().height || 0);

    const tick = () => {
      const el = boardRef.current;
      if (!el) {
        resizeScroll.active = false;
        resizeScroll.raf = 0;
        return;
      }
      if (!resizeScroll.active) {
        resizeScroll.raf = 0;
        return;
      }

      const scroller = el.closest(".qb-main");
      if (scroller) {
        const scrollerRect = scroller.getBoundingClientRect();
        const boardRect = el.getBoundingClientRect();
        const margin = 24;
        const delta = boardRect.bottom - (scrollerRect.bottom - margin);
        if (delta > 0) scroller.scrollTop += delta;
      }

      if (performance.now() - resizeScroll.lastChange > 180) {
        resizeScroll.active = false;
        resizeScroll.raf = 0;
        return;
      }
      resizeScroll.raf = window.requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver((entries) => {
      const target = entries[0]?.target;
      if (!target) return;
      const h = Math.round(target.getBoundingClientRect().height || 0);
      if (!h) return;
      const canAutoScroll = performance.now() >= autoScrollGuard.skipUntil;
      if (canAutoScroll && h > resizeScroll.lastH + 1) {
        resizeScroll.active = true;
        resizeScroll.lastChange = performance.now();
        if (!resizeScroll.raf) resizeScroll.raf = window.requestAnimationFrame(tick);
      }
      resizeScroll.lastH = h;
      const next = Math.max(MIN_H, Math.min(h, MAX_H));
      setHeight((prev) => (prev === next ? prev : next));
    });
    ro.observe(boardRef.current);
    return () => {
      ro.disconnect();
      if (resizeScroll.raf) window.cancelAnimationFrame(resizeScroll.raf);
      resizeScroll.raf = 0;
      resizeScroll.active = false;
    };
  }, [MAX_H, MIN_H]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || 0;
      const nextNarrow = !!(w && w < 1180);
      setIsNarrow(nextNarrow);
      setLayersOpen((prev) => (nextNarrow ? prev : true));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 600px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    if (mql.addEventListener) mql.addEventListener("change", apply);
    else mql.addListener(apply);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", apply);
      else mql.removeListener(apply);
    };
  }, []);

  const getLayerLabel = useCallback((obj) => {
    if (!obj) return "Layer";
    if (isTextObj(obj)) return obj.text?.trim() ? `Text: ${obj.text.trim().slice(0, 18)}` : "Text";
    if (obj.type === "path") {
      if (obj.shapeKind === "longDivision") return "Long Division";
      return "Pen";
    }
    if (obj.type === "image") return "Image";
    if (obj.type === "group") return `Group${Array.isArray(obj._objects) ? ` (${obj._objects.length})` : ""}`;
    if (obj.type === "circle") return "Circle";
    if (obj.type === "triangle") return "Triangle";
    if (obj.type === "polygon") return "Star";
    if (obj.type === "polyline") {
      if (obj.shapeKind === "tray") return "Tray";
      if (obj.shapeKind === "roof") return "Roof";
      return "Polyline";
    }
    if (obj.type === "line") {
      if (obj.shapeKind === "hrLine") return "H. Line";
      if (obj.shapeKind === "vrLine") return "V. Line";
      return "Line";
    }
    if (obj.type === "rect") {
      if (obj.shapeKind === "hrLine") return "H. Line";
      if (obj.shapeKind === "vrLine") return "V. Line";
      if ((obj.rx || obj.ry) && obj.width > obj.height) return "Oblong";
      if (obj.height <= 5) return "Line";
      return "Shape";
    }
    return obj.type || "Layer";
  }, []);

  const commitCanvasChange = useCallback((obj) => {
    const canvas = fabricRef.current;
    if (!canvas || !obj) return;
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: obj });
    if (obj.fractionId) canvas.fire("text:changed", { target: obj });
  }, []);

  const applyColor = useCallback((c) => {
    setColor(c);
    setHexInput(c);
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if (isTextObj(active)) active.set("fill", c);
    else if (active.type === "path") active.set("stroke", c);
    else if (isHrLine(active) && active.type === "line") active.set("stroke", c);
    else if (active.type === "rect") {
      if (active.shapeKind === "hrLine" || active.height <= 5) active.set("fill", c);
      else active.set("stroke", c);
    }
    else if (active.type === "circle" || active.type === "triangle" || active.type === "polygon") {
      active.set("stroke", c);
    }
    canvas.requestRenderAll();
    commitCanvasChange(active);
  }, [commitCanvasChange]);

  const straightenSelection = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "path" || active.shapeKind === "longDivision") return;
    const data = Array.isArray(active.path) ? active.path : null;
    if (!data || data.length < 2) return;
    const first = data[0];
    const last = data[data.length - 1];
    const x1 = first[1];
    const y1 = first[2];
    const x2 = last[last.length - 2];
    const y2 = last[last.length - 1];
    if (![x1, y1, x2, y2].every(Number.isFinite)) return;
    try {
      active._setPath([["M", x1, y1], ["L", x2, y2]]);
    } catch (err) {
      return;
    }
    active.setCoords();
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof fabricRef.current?.refreshUI === "function") fabricRef.current.refreshUI();
  }, [commitCanvasChange]);

  const applyFontSize = useCallback((next, updateInput = true) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !isTextObj(active)) return;
    const n = typeof next === "number" ? next : Number(next);
    if (!Number.isFinite(n)) return;
    const clamped = clampFontSizeValue(n);
    setFontSize(clamped);
    if (updateInput || document.activeElement !== fontSizeInputRef.current) {
      setFontSizeInput(String(clamped));
    }
    active.set("fontSize", clamped);
    active.initDimensions();
    active.setCoords();
    canvas.requestRenderAll();
    if (fontCommitTimer.current) window.clearTimeout(fontCommitTimer.current);
    fontCommitTimer.current = window.setTimeout(() => commitCanvasChange(active), 150);
  }, [clampFontSizeValue, commitCanvasChange]);

  const commitFontSizeInput = useCallback((rawValue) => {
    const digits = sanitizeIntegerInput(rawValue);
    if (!digits) {
      setFontSizeInput(String(fontSize));
      return;
    }
    applyFontSize(Number(digits));
  }, [applyFontSize, fontSize, sanitizeIntegerInput]);

  const applyTextAlign = useCallback((align) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !isTextObj(active)) return;
    const prevWidth = active.type === "textbox" ? active.width : null;
    active.set("textAlign", align);
    if (active.isEditing) {
      if (active.hiddenTextarea) active.hiddenTextarea.style.textAlign = align;
      if (typeof active._updateTextarea === "function") active._updateTextarea();
    }
    if (typeof active._clearCache === "function") active._clearCache();
    active.dirty = true;
    if (active.type === "textbox" && Number.isFinite(prevWidth)) active.set("width", prevWidth);
    active.initDimensions();
    if (active.type === "textbox" && Number.isFinite(prevWidth) && active.width !== prevWidth) {
      active.set("width", prevWidth);
      active.initDimensions();
    }
    active.setCoords();
    canvas.renderAll();
    canvas.requestRenderAll();
    setLayersVersion(v => v + 1);
    commitCanvasChange(active);
  }, [commitCanvasChange]);

  const addText = () => {
    if (!fabricRef.current) return;
    const text = new fabric.Textbox("Type here...", {
      left: 100,
      top: 100,
      width: 260,
      fontFamily: "DM Sans",
      fontSize: 24,
      fill: color,
      textAlign: "left",
    });
    configureTextObj(text);
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    setTool("move");
  };

  const addLine = () => {
    if (!fabricRef.current) return;
    const line = new fabric.Rect({
      left: 150,
      top: 150,
      width: 30,
      height: 2,
      fill: color,
      originX: 'center',
      hasControls: false
    });
    fabricRef.current.add(line);
    fabricRef.current.setActiveObject(line);
    setTool("move");
  };

  const addHrLine = () => {
    if (!fabricRef.current) return;
    const line = new fabric.Line([0, 0, 220, 0], {
      left: 100,
      top: 150,
      stroke: color,
      strokeWidth: HR_LINE_THICKNESS,
      strokeUniform: true,
      strokeLineCap: "round",
      originX: "left",
      originY: "center",
      objectCaching: false,
    });
    line.shapeKind = "hrLine";
    configureHrLine(line);
    fabricRef.current.add(line);
    fabricRef.current.setActiveObject(line);
    setTool("move");
  };

  const addVrLine = () => {
    if (!fabricRef.current) return;
    const line = new fabric.Line([0, 0, 0, 220], {
      left: 150,
      top: 100,
      stroke: color,
      strokeWidth: HR_LINE_THICKNESS,
      strokeUniform: true,
      strokeLineCap: "round",
      originX: "center",
      originY: "top",
      objectCaching: false,
    });
    line.shapeKind = "vrLine";
    configureHrLine(line);
    fabricRef.current.add(line);
    fabricRef.current.setActiveObject(line);
    setTool("move");
  };

  const addSquare = () => {
    if (!fabricRef.current) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 60,
      height: 60,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
    });
    fabricRef.current.add(rect);
    fabricRef.current.setActiveObject(rect);
    setTool("move");
  };

  const addRectangle = () => {
    if (!fabricRef.current) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 140,
      height: 80,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
    });
    fabricRef.current.add(rect);
    fabricRef.current.setActiveObject(rect);
    setTool("move");
  };

  const addCircle = () => {
    if (!fabricRef.current) return;
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      radius: 42,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    fabricRef.current.add(circle);
    fabricRef.current.setActiveObject(circle);
    setTool("move");
  };

  const addTriangle = () => {
    if (!fabricRef.current) return;
    const tri = new fabric.Triangle({
      left: 150,
      top: 150,
      width: 110,
      height: 95,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    fabricRef.current.add(tri);
    fabricRef.current.setActiveObject(tri);
    setTool("move");
  };

  const addStar = () => {
    if (!fabricRef.current) return;
    const spikes = 5;
    const outerR = 48;
    const innerR = 22;
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    const star = new fabric.Polygon(pts, {
      left: 150,
      top: 150,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
      objectCaching: false
    });
    fabricRef.current.add(star);
    fabricRef.current.setActiveObject(star);
    setTool("move");
  };

  const addOblong = () => {
    if (!fabricRef.current) return;
    const pill = new fabric.Rect({
      left: 100,
      top: 100,
      width: 140,
      height: 56,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
      rx: 28,
      ry: 28,
    });
    fabricRef.current.add(pill);
    fabricRef.current.setActiveObject(pill);
    setTool("move");
  };

  const addTrayShape = () => {
    if (!fabricRef.current) return;
    const tray = new fabric.Polyline([
      { x: 0, y: 0 },
      { x: 0, y: 64 },
      { x: 108, y: 64 },
      { x: 108, y: 0 }
    ], {
      left: 150,
      top: 150,
      originX: "center",
      originY: "center",
      fill: "transparent",
      stroke: color,
      strokeWidth: HR_LINE_THICKNESS,
      strokeUniform: true,
      strokeLineCap: "butt",
      strokeLineJoin: "miter",
      objectCaching: false
    });
    tray.shapeKind = "tray";
    fabricRef.current.add(tray);
    fabricRef.current.setActiveObject(tray);
    setTool("move");
  };

  const addRoofShape = () => {
    if (!fabricRef.current) return;
    const roof = new fabric.Polyline([
      { x: 0, y: 46 },
      { x: 36, y: 0 },
      { x: 72, y: 46 }
    ], {
      left: 150,
      top: 150,
      originX: "center",
      originY: "center",
      fill: "transparent",
      stroke: color,
      strokeWidth: 5,
      strokeUniform: true,
      strokeLineCap: "butt",
      strokeLineJoin: "miter",
      objectCaching: false
    });
    roof.shapeKind = "roof";
    fabricRef.current.add(roof);
    fabricRef.current.setActiveObject(roof);
    setTool("move");
  };

  const addStickyNote = useCallback((bg = "#fef08a", textCol = "#713f12") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const note = new fabric.Textbox("Key Rule / Formula\nDouble-click to write...", {
      left: 120,
      top: 100,
      width: 170,
      backgroundColor: bg,
      fill: textCol,
      fontFamily: "DM Sans, sans-serif",
      fontSize: 16,
      textAlign: "center",
      padding: 14,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.12)",
        blur: 10,
        offsetX: 2,
        offsetY: 4
      }),
    });
    note.isStickyNote = true;
    configureTextObj(note);
    canvas.add(note);
    canvas.setActiveObject(note);
    canvas.requestRenderAll();
    setTool("move");
    setStickyNoteMenuOpen(false);
  }, []);

  const connectSelectedShapes = useCallback((connectorType = "straight") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const activeObjects = (canvas.getActiveObjects?.() || []).filter(o => o && !o.isGuide && o.shapeKind !== "arrow" && o.shapeKind !== "curvedArrow" && o.shapeKind !== "elbowArrow");
    if (activeObjects.length < 2) {
      showToast("Select 2 or more shapes on canvas to connect!");
      return;
    }

    // Sort objects left-to-right (or top-to-bottom) for natural sequential connection
    const sorted = [...activeObjects].sort((a, b) => {
      const anchA = getShapeAnchors(a);
      const anchB = getShapeAnchors(b);
      const cA = anchA?.center || { x: a.left || 0, y: a.top || 0 };
      const cB = anchB?.center || { x: b.left || 0, y: b.top || 0 };
      if (Math.abs(cA.x - cB.x) > 30) {
        return cA.x - cB.x;
      }
      return cA.y - cB.y;
    });

    const pairsToConnect = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const objA = sorted[i];
      const objB = sorted[i + 1];
      const conn = findBestConnection(objA, objB);
      if (conn) {
        pairsToConnect.push({ objA, objB, conn });
      }
    }

    if (pairsToConnect.length === 0) return;

    // Discard active selection to revert child coordinates to clean world canvas space
    canvas.discardActiveObject();

    const createdArrows = [];
    pairsToConnect.forEach(({ objA, objB, conn }) => {
      let pathData;
      if (connectorType === "curved") {
        pathData = buildCurvedArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, -35, "end").d;
      } else if (connectorType === "elbow") {
        pathData = buildElbowConnectorPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, "end");
      } else {
        pathData = buildStraightArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, "end");
      }

      const arrow = new fabric.Path(pathData, {
        stroke: color || "#3b82f6",
        strokeWidth: 2.5,
        fill: "transparent",
        strokeLineCap: "round",
        strokeLineJoin: "round",
        objectCaching: false
      });
      arrow.shapeKind = connectorType === "curved" ? "curvedArrow" : connectorType === "elbow" ? "elbowArrow" : "arrow";
      arrow.connectorKind = connectorType;
      arrow.arrowHead = "end";
      arrow.bend = -35;
      arrow.isSmartConnector = true;
      arrow.connectedFromId = objA.layerId;
      arrow.connectedToId = objB.layerId;
      ensureLayerId(arrow);

      canvas.add(arrow);
      createdArrows.push(arrow);
    });

    if (createdArrows.length === 1) {
      canvas.setActiveObject(createdArrows[0]);
    }
    canvas.requestRenderAll();
    showToast(`Linked ${pairsToConnect.length} step${pairsToConnect.length > 1 ? "s" : ""} with smart ${connectorType} connector!`);
    commitCanvasChange(createdArrows[0] || null);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [color, commitCanvasChange, showToast, ensureLayerId]);

  const addArrow = useCallback((head = "end") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const activeObjects = (canvas.getActiveObjects?.() || []).filter(o => o && !o.isGuide && o.shapeKind !== "arrow" && o.shapeKind !== "curvedArrow" && o.shapeKind !== "elbowArrow");
    if (activeObjects.length >= 2) {
      connectSelectedShapes("straight");
      return;
    }
    const pathD = getLocalStraightPath(160, head);
    const arrow = new fabric.Path(pathD, {
      left: 140,
      top: 140,
      stroke: color || "#1a2540",
      strokeWidth: 2.5,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      objectCaching: false
    });
    arrow.shapeKind = "arrow";
    arrow.connectorKind = "straight";
    arrow.arrowHead = head;
    ensureLayerId(arrow);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
    canvas.requestRenderAll();
    setTool("move");
    showToast("Straight arrow added! (→)");
  }, [color, connectSelectedShapes, ensureLayerId, showToast]);

  const addCurvedArrow = useCallback((customBend = -35, head = "end") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const activeObjects = (canvas.getActiveObjects?.() || []).filter(o => o && !o.isGuide && o.shapeKind !== "arrow" && o.shapeKind !== "curvedArrow" && o.shapeKind !== "elbowArrow");
    if (activeObjects.length >= 2) {
      connectSelectedShapes("curved");
      return;
    }
    const pathD = getLocalCurvedPath(160, customBend, head);
    const arrow = new fabric.Path(pathD, {
      left: 140,
      top: 140,
      stroke: color || "#1a2540",
      strokeWidth: 2.5,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      objectCaching: false
    });
    arrow.shapeKind = "curvedArrow";
    arrow.connectorKind = "curved";
    arrow.bend = customBend;
    arrow.arrowHead = head;
    ensureLayerId(arrow);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
    canvas.requestRenderAll();
    setTool("move");
    showToast("Curved process arrow added! (↷)");
  }, [color, connectSelectedShapes, ensureLayerId, showToast]);

  const addElbowConnector = useCallback((head = "end") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const activeObjects = (canvas.getActiveObjects?.() || []).filter(o => o && !o.isGuide && o.shapeKind !== "arrow" && o.shapeKind !== "curvedArrow" && o.shapeKind !== "elbowArrow");
    if (activeObjects.length >= 2) {
      connectSelectedShapes("elbow");
      return;
    }
    const pathD = getLocalElbowPath(160, 80, head);
    const arrow = new fabric.Path(pathD, {
      left: 140,
      top: 140,
      stroke: color || "#1a2540",
      strokeWidth: 2.5,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      objectCaching: false
    });
    arrow.shapeKind = "elbowArrow";
    arrow.connectorKind = "elbow";
    arrow.arrowHead = head;
    ensureLayerId(arrow);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
    canvas.requestRenderAll();
    setTool("move");
    showToast("Elbow 90° step connector added! (↳)");
  }, [color, connectSelectedShapes, ensureLayerId, showToast]);

  const modifyActiveArrow = useCallback(({ newKind, newBend, newHead, flipDirection, detach, snapToNearest }) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if (active.shapeKind !== "arrow" && active.shapeKind !== "curvedArrow" && active.shapeKind !== "elbowArrow") return;

    let currentKind = newKind || active.connectorKind || (active.shapeKind === "curvedArrow" ? "curved" : active.shapeKind === "elbowArrow" ? "elbow" : "straight");
    let currentBend = newBend !== undefined ? newBend : (active.bend != null ? active.bend : -35);
    let currentHead = newHead !== undefined ? newHead : (active.arrowHead || "end");

    let fromId = detach ? null : active.connectedFromId;
    let toId = detach ? null : active.connectedToId;

    if (snapToNearest) {
      const allObjects = canvas.getObjects().filter(o => o && !o.isGuide && o !== active && o.shapeKind !== "arrow" && o.shapeKind !== "curvedArrow" && o.shapeKind !== "elbowArrow");
      const arrBound = active.getBoundingRect(true, true);
      const pStart = { x: arrBound.left, y: arrBound.top };
      const pEnd = { x: arrBound.left + arrBound.width, y: arrBound.top + arrBound.height };

      let closestStart = null, minStartD = Infinity;
      let closestEnd = null, minEndD = Infinity;

      allObjects.forEach(obj => {
        const b = obj.getBoundingRect(true, true);
        const c = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        const d1 = Math.hypot(c.x - pStart.x, c.y - pStart.y);
        const d2 = Math.hypot(c.x - pEnd.x, c.y - pEnd.y);
        if (d1 < minStartD) { minStartD = d1; closestStart = obj; }
        if (d2 < minEndD && obj !== closestStart) { minEndD = d2; closestEnd = obj; }
      });

      if (closestStart && closestEnd && minStartD < 260 && minEndD < 260) {
        fromId = closestStart.layerId;
        toId = closestEnd.layerId;
        showToast("Smart-snapped to nearest shapes!");
      } else {
        showToast("No nearby shapes found to snap to.");
      }
    }

    let pathD;
    const allObjects = canvas.getObjects();
    const fromObj = fromId ? allObjects.find(o => o.layerId === fromId) : null;
    const toObj = toId ? allObjects.find(o => o.layerId === toId) : null;

    if (fromObj && toObj) {
      let pA = fromObj;
      let pB = toObj;
      if (flipDirection) {
        pA = toObj;
        pB = fromObj;
        fromId = pA.layerId;
        toId = pB.layerId;
      }
      const conn = findBestConnection(pA, pB);
      if (conn) {
        if (currentKind === "curved") {
          pathD = buildCurvedArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, currentBend, currentHead).d;
        } else if (currentKind === "elbow") {
          pathD = buildElbowConnectorPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, currentHead);
        } else {
          pathD = buildStraightArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, currentHead);
        }
      }
    }

    const bound = active.getBoundingRect(true, true);
    const w = Math.max(70, Math.min(600, bound.width || 160));
    const h = Math.max(40, Math.min(400, bound.height || 80));

    const isAnchored = !!(fromObj && toObj && pathD);

    if (!pathD) {
      if (flipDirection && currentKind === "curved") {
        currentBend = currentBend * -1;
      } else if (flipDirection) {
        currentHead = currentHead === "end" ? "start" : currentHead === "start" ? "end" : currentHead;
      }

      if (currentKind === "curved") {
        pathD = getLocalCurvedPath(w, currentBend, currentHead);
      } else if (currentKind === "elbow") {
        pathD = getLocalElbowPath(w, h, currentHead);
      } else {
        pathD = getLocalStraightPath(w, currentHead);
      }
    }

    const prevLeft = active.left;
    const prevTop = active.top;
    const prevStroke = active.stroke || color || "#1a2540";
    const prevStrokeWidth = active.strokeWidth || 2.5;
    const prevStrokeDash = active.strokeDashArray || null;
    const prevOpacity = active.opacity != null ? active.opacity : 1;
    const prevLayerId = active.layerId;

    const idx = canvas._objects.indexOf(active);
    canvas.remove(active);
    const pathOptions = {
      stroke: prevStroke,
      strokeWidth: prevStrokeWidth,
      strokeDashArray: prevStrokeDash,
      opacity: prevOpacity,
      fill: "transparent",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      objectCaching: false
    };
    if (!isAnchored) {
      pathOptions.left = prevLeft;
      pathOptions.top = prevTop;
    }
    const newArrow = new fabric.Path(pathD, pathOptions);
    newArrow.layerId = prevLayerId;
    newArrow.shapeKind = currentKind === "curved" ? "curvedArrow" : currentKind === "elbow" ? "elbowArrow" : "arrow";
    newArrow.connectorKind = currentKind;
    newArrow.bend = currentBend;
    newArrow.arrowHead = currentHead;
    newArrow.isSmartConnector = !!(fromId && toId);
    newArrow.connectedFromId = fromId;
    newArrow.connectedToId = toId;

    if (idx >= 0 && idx < canvas._objects.length) {
      canvas.insertAt(newArrow, idx, false);
    } else {
      canvas.add(newArrow);
    }
    canvas.setActiveObject(newArrow);
    canvas.requestRenderAll();
    commitCanvasChange(newArrow);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [color, commitCanvasChange, showToast]);

  const addProcessStep = useCallback((text = "Step 1: Formula / Process") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const box = new fabric.Textbox(text, {
      left: 130,
      top: 130,
      width: 170,
      backgroundColor: "#eff6ff",
      fill: "#1e3a8a",
      fontFamily: "DM Sans, sans-serif",
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
      padding: 12,
      stroke: "#3b82f6",
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.08)",
        blur: 8,
        offsetX: 0,
        offsetY: 3
      })
    });
    box.shapeKind = "process";
    configureTextObj(box);
    ensureLayerId(box);
    canvas.add(box);
    canvas.setActiveObject(box);
    canvas.requestRenderAll();
    setTool("move");
    setFlowchartMenuOpen(false);
    showToast("Process step card added! Double click to edit.");
  }, [configureTextObj, ensureLayerId, showToast]);

  const addDecisionDiamond = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new fabric.Textbox("Condition?\n(Yes / No)", {
      left: 140,
      top: 140,
      width: 140,
      backgroundColor: "rgba(245, 158, 11, 0.16)",
      stroke: "#d97706",
      strokeWidth: 2,
      fontSize: 13,
      fontWeight: "bold",
      fill: "#92400e",
      textAlign: "center",
      padding: 12,
      rx: 4,
      ry: 4,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.08)",
        blur: 8,
        offsetX: 0,
        offsetY: 3
      })
    });
    text.shapeKind = "decision";
    configureTextObj(text);
    ensureLayerId(text);
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    setTool("move");
    setFlowchartMenuOpen(false);
    showToast("Decision condition card added!");
  }, [configureTextObj, ensureLayerId, showToast]);

  const addTerminator = useCallback((text = "Start / Solution") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const box = new fabric.Textbox(text, {
      left: 140,
      top: 140,
      width: 150,
      backgroundColor: "#f0fdf4",
      fill: "#166534",
      fontFamily: "DM Sans, sans-serif",
      fontSize: 14,
      fontWeight: "bold",
      textAlign: "center",
      padding: 10,
      stroke: "#22c55e",
      strokeWidth: 2,
      rx: 20,
      ry: 20,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.08)",
        blur: 8,
        offsetX: 0,
        offsetY: 3
      })
    });
    box.shapeKind = "terminator";
    configureTextObj(box);
    ensureLayerId(box);
    canvas.add(box);
    canvas.setActiveObject(box);
    canvas.requestRenderAll();
    setTool("move");
    setFlowchartMenuOpen(false);
    showToast("Start / End capsule added!");
  }, [configureTextObj, ensureLayerId, showToast]);

  const addDataNode = useCallback((text = "Input / Output Data") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const box = new fabric.Textbox(text, {
      left: 140,
      top: 140,
      width: 160,
      backgroundColor: "#f5f3ff",
      fill: "#5b21b6",
      fontFamily: "DM Sans, sans-serif",
      fontSize: 13,
      fontWeight: "bold",
      textAlign: "center",
      padding: 10,
      stroke: "#8b5cf6",
      strokeWidth: 2,
      rx: 4,
      ry: 4,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.08)",
        blur: 8,
        offsetX: 0,
        offsetY: 3
      })
    });
    box.shapeKind = "dataNode";
    configureTextObj(box);
    ensureLayerId(box);
    canvas.add(box);
    canvas.setActiveObject(box);
    canvas.requestRenderAll();
    setTool("move");
    setFlowchartMenuOpen(false);
    showToast("Input / Output data card added!");
  }, [configureTextObj, ensureLayerId, showToast]);

  const addNextConnectedStep = useCallback((stepShape = "process") => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    const bound = active.getBoundingRect(true, true);
    const boardW = boardRef.current ? boardRef.current.clientWidth : 820;
    const stepW = 160;

    let nextLeft = bound.left + bound.width + 56;
    let nextTop = bound.top;

    if (nextLeft + stepW > boardW - 24) {
      nextLeft = bound.left;
      nextTop = bound.top + bound.height + 56;
    }

    let stepObj;
    if (stepShape === "decision") {
      stepObj = new fabric.Textbox("Condition?\n(Yes / No)", {
        left: nextLeft,
        top: nextTop,
        width: stepW,
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        fill: "#92400e",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 13,
        fontWeight: "bold",
        textAlign: "center",
        padding: 10,
        stroke: "#f59e0b",
        strokeWidth: 2,
        rx: 6,
        ry: 6,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.08)",
          blur: 8,
          offsetX: 0,
          offsetY: 3
        })
      });
      stepObj.shapeKind = "decision";
    } else if (stepShape === "terminator") {
      stepObj = new fabric.Textbox("End / Result", {
        left: nextLeft,
        top: nextTop,
        width: 140,
        backgroundColor: "#f0fdf4",
        fill: "#166534",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        padding: 10,
        stroke: "#22c55e",
        strokeWidth: 2,
        rx: 20,
        ry: 20,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.08)",
          blur: 8,
          offsetX: 0,
          offsetY: 3
        })
      });
      stepObj.shapeKind = "terminator";
    } else {
      stepObj = new fabric.Textbox("Next Step", {
        left: nextLeft,
        top: nextTop,
        width: stepW,
        backgroundColor: "#eff6ff",
        fill: "#1e3a8a",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        padding: 10,
        stroke: "#3b82f6",
        strokeWidth: 2,
        rx: 8,
        ry: 8,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.08)",
          blur: 8,
          offsetX: 0,
          offsetY: 3
        })
      });
      stepObj.shapeKind = "process";
    }

    configureTextObj(stepObj);
    ensureLayerId(stepObj);
    canvas.add(stepObj);

    const conn = findBestConnection(active, stepObj);
    if (conn) {
      const pathD = buildStraightArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, "end");
      const arrow = new fabric.Path(pathD, {
        stroke: color || "#3b82f6",
        strokeWidth: 2.5,
        fill: "transparent",
        strokeLineCap: "round",
        strokeLineJoin: "round",
        objectCaching: false
      });
      arrow.shapeKind = "arrow";
      arrow.connectorKind = "straight";
      arrow.arrowHead = "end";
      arrow.isSmartConnector = true;
      arrow.connectedFromId = active.layerId;
      arrow.connectedToId = stepObj.layerId;
      ensureLayerId(arrow);
      canvas.add(arrow);
    }

    canvas.setActiveObject(stepObj);
    canvas.requestRenderAll();
    showToast("Connected next step added! Type to edit.");
    commitCanvasChange(stepObj);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [color, configureTextObj, commitCanvasChange, showToast, ensureLayerId]);

  const addProcessTemplate = useCallback((templateType = "linear3") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const startX = 60;
    const startY = 120;

    if (templateType === "linear3") {
      const steps = [
        { text: "1. Problem\nDefinition", bg: "#eff6ff", stroke: "#3b82f6", color: "#1e3a8a", w: 140 },
        { text: "2. Analysis &\nCalculation", bg: "#fef3c7", stroke: "#f59e0b", color: "#92400e", w: 140 },
        { text: "3. Verified\nSolution", bg: "#f0fdf4", stroke: "#22c55e", color: "#166534", w: 140 },
      ];
      const createdNodes = [];
      steps.forEach((s, i) => {
        const node = new fabric.Textbox(s.text, {
          left: startX + i * 220,
          top: startY,
          width: s.w,
          backgroundColor: s.bg,
          fill: s.color,
          fontFamily: "DM Sans, sans-serif",
          fontSize: 13,
          fontWeight: "bold",
          textAlign: "center",
          padding: 10,
          stroke: s.stroke,
          strokeWidth: 2,
          rx: 8,
          ry: 8,
          shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.06)", blur: 6, offsetX: 0, offsetY: 2 })
        });
        node.shapeKind = "process";
        configureTextObj(node);
        ensureLayerId(node);
        canvas.add(node);
        createdNodes.push(node);
      });

      for (let i = 0; i < createdNodes.length - 1; i++) {
        const nA = createdNodes[i];
        const nB = createdNodes[i + 1];
        const conn = findBestConnection(nA, nB);
        if (conn) {
          const pathD = buildStraightArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, "end");
          const arrow = new fabric.Path(pathD, {
            stroke: "#3b82f6",
            strokeWidth: 2.5,
            fill: "transparent",
            strokeLineCap: "round",
            strokeLineJoin: "round",
            objectCaching: false
          });
          arrow.shapeKind = "arrow";
          arrow.connectorKind = "straight";
          arrow.arrowHead = "end";
          arrow.isSmartConnector = true;
          arrow.connectedFromId = nA.layerId;
          arrow.connectedToId = nB.layerId;
          ensureLayerId(arrow);
          canvas.add(arrow);
        }
      }
      canvas.requestRenderAll();
      setFlowchartMenuOpen(false);
      showToast("3-Step Linear Process flowchart added!");
    } else if (templateType === "decision") {
      const startNode = new fabric.Textbox("Start", {
        left: startX,
        top: startY + 40,
        width: 100,
        backgroundColor: "#f0fdf4",
        fill: "#166534",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 13,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#22c55e",
        strokeWidth: 2,
        rx: 16,
        ry: 16
      });
      startNode.shapeKind = "terminator";
      configureTextObj(startNode);
      ensureLayerId(startNode);

      const decisionNode = new fabric.Textbox("Condition?\n(Check Data)", {
        left: startX + 160,
        top: startY + 28,
        width: 130,
        backgroundColor: "rgba(245, 158, 11, 0.16)",
        fill: "#92400e",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#f59e0b",
        strokeWidth: 2,
        rx: 6,
        ry: 6
      });
      decisionNode.shapeKind = "decision";
      configureTextObj(decisionNode);
      ensureLayerId(decisionNode);

      const yesNode = new fabric.Textbox("Outcome A\n(Pass / True)", {
        left: startX + 360,
        top: startY - 20,
        width: 130,
        backgroundColor: "#eff6ff",
        fill: "#1e3a8a",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#3b82f6",
        strokeWidth: 2,
        rx: 6,
        ry: 6
      });
      yesNode.shapeKind = "process";
      configureTextObj(yesNode);
      ensureLayerId(yesNode);

      const noNode = new fabric.Textbox("Outcome B\n(Fail / Retry)", {
        left: startX + 360,
        top: startY + 80,
        width: 130,
        backgroundColor: "#fef2f2",
        fill: "#991b1b",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#ef4444",
        strokeWidth: 2,
        rx: 6,
        ry: 6
      });
      noNode.shapeKind = "process";
      configureTextObj(noNode);
      ensureLayerId(noNode);

      canvas.add(startNode, decisionNode, yesNode, noNode);

      const connectPair = (nA, nB, kind = "straight") => {
        const conn = findBestConnection(nA, nB);
        if (conn) {
          const pathD = kind === "elbow"
            ? buildElbowConnectorPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, "end")
            : buildStraightArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, "end");
          const arrow = new fabric.Path(pathD, {
            stroke: "#475569",
            strokeWidth: 2.2,
            fill: "transparent",
            strokeLineCap: "round",
            strokeLineJoin: "round",
            objectCaching: false
          });
          arrow.shapeKind = kind === "elbow" ? "elbowArrow" : "arrow";
          arrow.connectorKind = kind;
          arrow.arrowHead = "end";
          arrow.isSmartConnector = true;
          arrow.connectedFromId = nA.layerId;
          arrow.connectedToId = nB.layerId;
          ensureLayerId(arrow);
          canvas.add(arrow);
        }
      };

      connectPair(startNode, decisionNode, "straight");
      connectPair(decisionNode, yesNode, "elbow");
      connectPair(decisionNode, noNode, "elbow");

      canvas.requestRenderAll();
      setFlowchartMenuOpen(false);
      showToast("Decision Branching flowchart added!");
    } else if (templateType === "cycle") {
      const n1 = new fabric.Textbox("1. Plan &\nHypothesis", {
        left: startX + 160,
        top: startY - 40,
        width: 120,
        backgroundColor: "#eff6ff",
        fill: "#1e3a8a",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#3b82f6",
        strokeWidth: 2,
        rx: 8,
        ry: 8
      });
      const n2 = new fabric.Textbox("2. Execute &\nMeasure", {
        left: startX + 310,
        top: startY + 90,
        width: 120,
        backgroundColor: "#fef3c7",
        fill: "#92400e",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#f59e0b",
        strokeWidth: 2,
        rx: 8,
        ry: 8
      });
      const n3 = new fabric.Textbox("3. Review &\nIterate", {
        left: startX + 20,
        top: startY + 90,
        width: 120,
        backgroundColor: "#f0fdf4",
        fill: "#166534",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        padding: 8,
        stroke: "#22c55e",
        strokeWidth: 2,
        rx: 8,
        ry: 8
      });
      [n1, n2, n3].forEach(n => {
        n.shapeKind = "process";
        configureTextObj(n);
        ensureLayerId(n);
        canvas.add(n);
      });

      const connectCurved = (nA, nB, bend) => {
        const bA = nA.getBoundingRect(true, true);
        const bB = nB.getBoundingRect(true, true);
        const conn = findBestConnection(bA, bB);
        if (conn) {
          const pathD = buildCurvedArrowPath(conn.from.x, conn.from.y, conn.to.x, conn.to.y, bend, "end").d;
          const arrow = new fabric.Path(pathD, {
            stroke: "#2563eb",
            strokeWidth: 2.5,
            fill: "transparent",
            strokeLineCap: "round",
            strokeLineJoin: "round",
            objectCaching: false
          });
          arrow.shapeKind = "curvedArrow";
          arrow.connectorKind = "curved";
          arrow.arrowHead = "end";
          arrow.bend = bend;
          arrow.isSmartConnector = true;
          arrow.connectedFromId = nA.layerId;
          arrow.connectedToId = nB.layerId;
          ensureLayerId(arrow);
          canvas.add(arrow);
        }
      };

      connectCurved(n1, n2, -30);
      connectCurved(n2, n3, -30);
      connectCurved(n3, n1, -30);

      canvas.requestRenderAll();
      setFlowchartMenuOpen(false);
      showToast("Curved 3-Node Cycle flowchart added!");
    } else if (templateType === "series") {
      const terms = ["2", "5", "10", "17"];
      const diffs = ["+3", "+5", "+7"];
      const termNodes = [];
      terms.forEach((t, i) => {
        const node = new fabric.Textbox(t, {
          left: startX + 30 + i * 110,
          top: startY + 35,
          width: 48,
          backgroundColor: "#eff6ff",
          fill: "#1e3a8a",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 18,
          fontWeight: "bold",
          textAlign: "center",
          padding: 6,
          stroke: "#3b82f6",
          strokeWidth: 2,
          rx: 8,
          ry: 8
        });
        node.shapeKind = "process";
        configureTextObj(node);
        ensureLayerId(node);
        canvas.add(node);
        termNodes.push(node);
      });

      for (let i = 0; i < termNodes.length - 1; i++) {
        const x1 = startX + 54 + i * 110;
        const x2 = startX + 54 + (i + 1) * 110;
        const y = startY + 30;
        const arc = buildCurvedArrowPath(x1, y, x2, y, -34, "end");
        const arrow = new fabric.Path(arc.d, {
          stroke: "#dc2626",
          strokeWidth: 2.2,
          fill: "transparent",
          strokeLineCap: "round",
          strokeLineJoin: "round",
          objectCaching: false
        });
        arrow.shapeKind = "curvedArrow";
        arrow.connectorKind = "curved";
        arrow.arrowHead = "end";
        arrow.bend = -34;
        ensureLayerId(arrow);
        canvas.add(arrow);

        const diffLabel = new fabric.Textbox(diffs[i], {
          left: (x1 + x2) / 2 - 18,
          top: y - 38,
          width: 38,
          fontSize: 13,
          fontWeight: "bold",
          fill: "#dc2626",
          fontFamily: "DM Sans, sans-serif",
          textAlign: "center"
        });
        configureTextObj(diffLabel);
        ensureLayerId(diffLabel);
        canvas.add(diffLabel);
      }
      canvas.requestRenderAll();
      setFlowchartMenuOpen(false);
      showToast("Number Series Jump Arcs template added!");
    } else if (templateType === "crossMultiply") {
      const leftA = new fabric.Textbox("a\n—\nb", {
        left: startX + 50,
        top: startY,
        width: 50,
        fontSize: 18,
        fontWeight: "bold",
        fill: "#1e3a8a",
        fontFamily: "DM Sans, sans-serif",
        textAlign: "center",
        lineHeight: 0.95
      });
      const eq = new fabric.Textbox("=", {
        left: startX + 120,
        top: startY + 22,
        width: 30,
        fontSize: 22,
        fontWeight: "bold",
        fill: "#1a2540",
        fontFamily: "DM Sans, sans-serif",
        textAlign: "center"
      });
      const rightC = new fabric.Textbox("c\n—\nd", {
        left: startX + 170,
        top: startY,
        width: 50,
        fontSize: 18,
        fontWeight: "bold",
        fill: "#1e3a8a",
        fontFamily: "DM Sans, sans-serif",
        textAlign: "center",
        lineHeight: 0.95
      });
      const diag1 = new fabric.Path(buildStraightArrowPath(startX + 90, startY + 12, startX + 180, startY + 58, "both"), {
        stroke: "#ef4444",
        strokeWidth: 2,
        strokeDashArray: [4, 3],
        fill: "transparent"
      });
      diag1.shapeKind = "arrow";
      diag1.connectorKind = "straight";
      diag1.arrowHead = "both";
      const diag2 = new fabric.Path(buildStraightArrowPath(startX + 90, startY + 58, startX + 180, startY + 12, "both"), {
        stroke: "#2563eb",
        strokeWidth: 2,
        strokeDashArray: [4, 3],
        fill: "transparent"
      });
      diag2.shapeKind = "arrow";
      diag2.connectorKind = "straight";
      diag2.arrowHead = "both";
      const resultBox = new fabric.Textbox("a × d = b × c", {
        left: startX + 250,
        top: startY + 18,
        width: 130,
        backgroundColor: "#fef3c7",
        fill: "#92400e",
        stroke: "#f59e0b",
        strokeWidth: 2,
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "DM Sans, sans-serif",
        textAlign: "center",
        padding: 8
      });
      resultBox.shapeKind = "process";
      [leftA, eq, rightC, diag1, diag2, resultBox].forEach(o => {
        configureTextObj(o);
        ensureLayerId(o);
        canvas.add(o);
      });
      canvas.requestRenderAll();
      setFlowchartMenuOpen(false);
      showToast("Cross-Multiplication Ratio template added!");
    } else if (templateType === "dstTriangle") {
      const tri = new fabric.Triangle({
        left: startX + 150,
        top: startY + 70,
        width: 160,
        height: 135,
        fill: "rgba(59, 130, 246, 0.08)",
        stroke: "#2563eb",
        strokeWidth: 2.5,
        originX: "center",
        originY: "center"
      });
      const hLine = new fabric.Line([startX + 108, startY + 72, startX + 192, startY + 72], {
        stroke: "#2563eb",
        strokeWidth: 2.2
      });
      const vLine = new fabric.Line([startX + 150, startY + 72, startX + 150, startY + 136], {
        stroke: "#2563eb",
        strokeWidth: 2.2
      });
      const dTxt = new fabric.Textbox("D", {
        left: startX + 130,
        top: startY + 32,
        width: 40,
        fontSize: 22,
        fontWeight: "bold",
        fill: "#1e3a8a",
        textAlign: "center"
      });
      const sTxt = new fabric.Textbox("S", {
        left: startX + 96,
        top: startY + 90,
        width: 40,
        fontSize: 20,
        fontWeight: "bold",
        fill: "#1e3a8a",
        textAlign: "center"
      });
      const tTxt = new fabric.Textbox("T", {
        left: startX + 164,
        top: startY + 90,
        width: 40,
        fontSize: 20,
        fontWeight: "bold",
        fill: "#1e3a8a",
        textAlign: "center"
      });
      [tri, hLine, vLine, dTxt, sTxt, tTxt].forEach(o => {
        configureTextObj(o);
        ensureLayerId(o);
        canvas.add(o);
      });
      canvas.requestRenderAll();
      setFlowchartMenuOpen(false);
      showToast("Distance-Speed-Time (D / S×T) Triangle added!");
    }
  }, [configureTextObj, ensureLayerId, showToast]);

  const addStepBadge = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const existing = (canvas.getObjects?.() || []).filter(o => o && o.isStepBadge);
    const idx = existing.length;
    const label = STEP_CIRCLES[idx] || `${idx + 1}.`;
    const badge = new fabric.Textbox(label, {
      left: 70,
      top: 70 + (idx % 6) * 44,
      width: 36,
      backgroundColor: "#eff6ff",
      fill: "#1d4ed8",
      fontFamily: "DM Sans, sans-serif",
      fontSize: 20,
      fontWeight: "bold",
      textAlign: "center",
      padding: 4,
      stroke: "#3b82f6",
      strokeWidth: 1.5,
      rx: 18,
      ry: 18
    });
    badge.isStepBadge = true;
    badge.shapeKind = "terminator";
    configureTextObj(badge);
    ensureLayerId(badge);
    canvas.add(badge);
    canvas.setActiveObject(badge);
    canvas.requestRenderAll();
    setTool("move");
    showToast(`Added Step Badge ${label}`);
  }, [configureTextObj, ensureLayerId, showToast]);

  const addCancelSlash = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const slash = new fabric.Line([0, 28, 34, 0], {
      left: 160,
      top: 130,
      stroke: "#ef4444",
      strokeWidth: 3,
      strokeUniform: true,
      strokeLineCap: "round",
      originX: "center",
      originY: "center",
      objectCaching: false
    });
    ensureLayerId(slash);
    canvas.add(slash);
    canvas.setActiveObject(slash);
    canvas.requestRenderAll();
    setTool("move");
    showToast("Cancellation slash added! Place over terms to cancel.");
  }, [ensureLayerId, showToast]);

  const addCalloutCard = useCallback((preset) => {
    const canvas = fabricRef.current;
    if (!canvas || !preset) return;
    const card = new fabric.Textbox(preset.defaultText, {
      left: 110,
      top: 110,
      width: 220,
      backgroundColor: preset.bg,
      fill: preset.text,
      stroke: preset.border,
      strokeWidth: 2,
      fontFamily: "DM Sans, sans-serif",
      fontSize: 15,
      fontWeight: "bold",
      textAlign: "left",
      padding: 12,
      rx: 10,
      ry: 10,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.08)",
        blur: 8,
        offsetX: 0,
        offsetY: 3
      })
    });
    card.shapeKind = "process";
    card.isStickyNote = true;
    configureTextObj(card);
    ensureLayerId(card);
    canvas.add(card);
    canvas.setActiveObject(card);
    canvas.requestRenderAll();
    setTool("move");
    setStickyNoteMenuOpen(false);
    showToast(`${preset.label} added!`);
  }, [configureTextObj, ensureLayerId, showToast]);

  const addVennDiagram = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const c1 = new fabric.Circle({
      left: 80,
      top: 100,
      radius: 65,
      fill: "rgba(59, 130, 246, 0.28)",
      stroke: "#2563eb",
      strokeWidth: 2,
    });
    const c2 = new fabric.Circle({
      left: 165,
      top: 100,
      radius: 65,
      fill: "rgba(236, 72, 153, 0.28)",
      stroke: "#db2777",
      strokeWidth: 2,
    });
    const textA = new fabric.Textbox("Set A", {
      left: 95,
      top: 120,
      width: 60,
      fontSize: 14,
      fontWeight: "bold",
      fill: "#1e3a8a",
      textAlign: "center",
    });
    const textB = new fabric.Textbox("Set B", {
      left: 225,
      top: 120,
      width: 60,
      fontSize: 14,
      fontWeight: "bold",
      fill: "#831843",
      textAlign: "center",
    });
    configureTextObj(textA);
    configureTextObj(textB);
    canvas.add(c1, c2, textA, textB);
    const sel = new fabric.ActiveSelection([c1, c2, textA, textB], { canvas });
    canvas.setActiveObject(sel);
    canvas.requestRenderAll();
    setTool("move");
  }, []);

  const applyActiveFill = useCallback((c) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set("fill", c);
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const applyActiveStroke = useCallback((c) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set("stroke", c);
    if (!active.strokeWidth || active.strokeWidth === 0) {
      active.set("strokeWidth", 2);
    }
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const applyActiveStrokeWidth = useCallback((w) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set("strokeWidth", w);
    if (w > 0 && (!active.stroke || active.stroke === "transparent")) {
      active.set("stroke", color || "#1a2540");
    }
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [color, commitCanvasChange]);

  const applyActiveStrokeStyle = useCallback((style) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if (style === "dashed") active.set("strokeDashArray", [8, 6]);
    else if (style === "dotted") active.set("strokeDashArray", [3, 4]);
    else active.set("strokeDashArray", null);
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const applyActiveFontFamily = useCallback((ff) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !isTextObj(active)) return;
    active.set("fontFamily", ff);
    active.initDimensions?.();
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const toggleActiveBold = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !isTextObj(active)) return;
    const next = active.fontWeight === "bold" ? "normal" : "bold";
    active.set("fontWeight", next);
    active.initDimensions?.();
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const toggleActiveItalic = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !isTextObj(active)) return;
    const next = active.fontStyle === "italic" ? "normal" : "italic";
    active.set("fontStyle", next);
    active.initDimensions?.();
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const toggleActiveUnderline = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !isTextObj(active)) return;
    active.set("underline", !active.underline);
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const applyActiveOpacity = useCallback((pct) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set("opacity", Math.max(0.05, Math.min(1, pct / 100)));
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const arrangeActive = useCallback((action) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if (action === "front") canvas.bringToFront(active);
    else if (action === "forward") canvas.bringForward(active);
    else if (action === "backward") canvas.sendBackwards(active);
    else if (action === "back") canvas.sendToBack(active);
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const toggleActiveLock = useCallback(() => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const next = !(active.lockMovementX && active.lockMovementY);
    active.set({
      lockMovementX: next,
      lockMovementY: next,
      lockRotation: next,
      lockScalingX: next,
      lockScalingY: next,
      hasControls: !next,
    });
    active.locked = next;
    active.dirty = true;
    canvas.requestRenderAll();
    commitCanvasChange(active);
    if (typeof canvas.refreshUI === "function") canvas.refreshUI();
  }, [commitCanvasChange]);

  const copyImageToClipboard = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const prevActive = canvas.getActiveObject();
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      if (prevActive) {
        canvas.setActiveObject(prevActive);
        canvas.requestRenderAll();
      }
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        showToast("Diagram copied to clipboard! Ready to paste.");
      } else {
        showToast("Clipboard copy not supported in this browser.");
      }
    } catch (err) {
      console.error("Clipboard copy error:", err);
      showToast("Could not copy to clipboard.");
    }
  }, [showToast]);

  const downloadImage = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const prevActive = canvas.getActiveObject();
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      if (prevActive) {
        canvas.setActiveObject(prevActive);
        canvas.requestRenderAll();
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `canva-diagram-${Date.now()}.png`;
      a.click();
      showToast("Diagram exported as PNG!");
    } catch (err) {
      console.error("Download error:", err);
    }
  }, [showToast]);

  const addFraction = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const fId = `fraction-${Date.now()}`;
    const left = 150;
    const top = 100;

    // Numerator
    const num = new fabric.IText("1", {
      left: left,
      top: top,
      fontFamily: "DM Sans",
      fontSize: 22,
      fill: color,
      textAlign: 'center',
      originX: 'center',
      fractionId: fId,
      fractionRole: 'num',
      hasControls: false
    });

    // Denominator
    const den = new fabric.IText("2", {
      left: left,
      top: top + 40,
      fontFamily: "DM Sans",
      fontSize: 22,
      fill: color,
      textAlign: 'center',
      originX: 'center',
      fractionId: fId,
      fractionRole: 'den',
      hasControls: false
    });

    // Fraction Line
    const line = new fabric.Line([0, 0, 30, 0], {
      left: left,
      top: top + 25,
      stroke: color,
      strokeWidth: HR_LINE_THICKNESS,
      strokeUniform: true,
      originX: 'center',
      originY: 'center',
      fractionId: fId,
      fractionRole: 'line',
      selectable: true,
      hasControls: true,
      objectCaching: false
    });
    line.shapeKind = "hrLine";
    configureHrLine(line);

    canvas.add(line, num, den);
    canvas.setActiveObject(num);
    num.enterEditing();
    num.selectAll();
    
    canvas.requestRenderAll();
    setTool("move");
  };

  const addLongDivision = () => {
    if (!fabricRef.current) return;
    const geometry = buildLongDivisionPath(LONG_DIVISION_DEFAULT_WIDTH, LONG_DIVISION_DEFAULT_HEIGHT);
    const bracket = new fabric.Path(geometry.path, {
      left: 100,
      top: 100,
      stroke: color,
      strokeWidth: HR_LINE_THICKNESS,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      fill: "",
      originX: 'center',
      originY: 'center',
      objectCaching: false
    });
    bracket.shapeKind = "longDivision";
    bracket.longDivisionWidth = geometry.width;
    bracket.longDivisionHeight = geometry.height;
    configureLongDivisionBracket(bracket);
    fabricRef.current.add(bracket);
    fabricRef.current.setActiveObject(bracket);
    setTool("move");
  };

  const addLongDivisionPreset = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const longDivisionId = `long-division-${Date.now()}`;
    const bracketLeft = 176;
    const bracketTop = 92;
    const geometry = buildLongDivisionPath(LONG_DIVISION_PRESET_WIDTH, LONG_DIVISION_PRESET_HEIGHT);
    const divisor = new fabric.IText("2", {
      left: bracketLeft + 4,
      top: bracketTop + 1,
      fontFamily: "DM Sans",
      fontSize: 24,
      fill: color,
      textAlign: "right",
      originX: "right",
      originY: "top",
      longDivisionId,
      longDivisionRole: "divisor",
      hasControls: false,
    });
    const dividend = new fabric.IText("12", {
      left: bracketLeft + 10,
      top: bracketTop + 1,
      fontFamily: "DM Sans",
      fontSize: 24,
      fill: color,
      textAlign: "left",
      originX: "left",
      originY: "top",
      longDivisionId,
      longDivisionRole: "dividend",
      hasControls: false,
    });
    const bracket = new fabric.Path(geometry.path, {
      left: bracketLeft,
      top: bracketTop,
      stroke: color,
      strokeWidth: HR_LINE_THICKNESS,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      fill: "",
      originX: "left",
      originY: "top",
      objectCaching: false,
      longDivisionId,
      longDivisionRole: "bracket",
    });
    bracket.shapeKind = "longDivision";
    bracket.longDivisionWidth = geometry.width;
    bracket.longDivisionHeight = geometry.height;
    configureLongDivisionBracket(bracket);

    canvas.add(bracket, divisor, dividend);
    canvas.setActiveObject(dividend);
    canvas.fire("text:changed", { target: dividend });
    dividend.enterEditing();
    dividend.selectAll();
    canvas.requestRenderAll();
    setTool("move");
  };

  const addSymbol = (sym) => {
    if (!fabricRef.current) return;
    const text = new fabric.IText(sym, {
      left: 150,
      top: 150,
      fontFamily: "DM Sans",
      fontSize: 28,
      fill: color,
      originX: 'center',
      originY: 'center'
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    setTool("move");
  };

  const undo = () => {
    if (fabricRef.current?.performUndo) {
      fabricRef.current.performUndo();
    }
  };

  const redo = () => {
    if (fabricRef.current?.performRedo) {
      fabricRef.current.performRedo();
    }
  };

  const clear = () => {
    const canvas = fabricRef.current;
    canvas.clear();
    canvas.setBackgroundColor("#ffffff", () => canvas.requestRenderAll());
    onChange(null);
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.remove(...activeObjects);
      canvas.discardActiveObject().requestRenderAll();
    }
  };

  const moveForward = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringForward(activeObject);
      canvas.requestRenderAll();
      commitCanvasChange(activeObject);
    }
  };

  const moveBackward = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendBackwards(activeObject);
      canvas.requestRenderAll();
      commitCanvasChange(activeObject);
    }
  };

  const COLORS = ["#1a2540", "#1d4ed8", "#dc2626", "#15803d", "#7c3aed", "#ea7c0a"];
  const PICKER_COLORS = [
    "#000000", "#1a2540", "#4b5563", "#9ca3af", "#e5e7eb", "#ffffff",
    "#dc2626", "#f97316", "#f59e0b", "#facc15", "#84cc16", "#22c55e",
    "#15803d", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#1d4ed8", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#e11d48", "#92400e", "#78716c", "#0f766e", "#b45309",
  ];
  const canvasObjects = fabricRef.current?.getObjects?.().filter(o => !o.isGuide) || [];
  const activeLayerIdSet = new Set(activeLayerIds);
  const activeObj = (activeLayerIds.length === 1 ? canvasObjects.find(o => o.layerId === activeLayerIds[0]) : null) || fabricRef.current?.getActiveObject();
  const showFontSize = isTextObj(activeObj);
  const showTextAlign = isTextObj(activeObj);
  const activeTextAlign = (activeObj?.textAlign || "left");
  const boardHeight = Math.max(MIN_H, Math.min(height, MAX_H));
  const useExternalLayers = !!layersHost;
  const narrow = useExternalLayers ? false : isNarrow;
  const activeCanvasObj = fabricRef.current?.getActiveObject?.() || null;
  const selectionCount = (fabricRef.current?.getActiveObjects?.() || []).filter(o => o && !o.isGuide).length;
  const canAlign = selectionCount > 0;
  const canDistribute = selectionCount >= 3;
  const canCopy = selectionCount > 0;
  const canPaste = !!(clipboardData.current?.objects?.length || clipboardClone.current || clipboard.current);
  const canGroup = activeCanvasObj?.type === "activeSelection";
  const canUngroup = activeCanvasObj?.type === "group";
  const canStraighten = activeCanvasObj?.type === "path" && activeCanvasObj?.shapeKind !== "longDivision";

  const handleAlign = (type) => fabricRef.current?.alignSelection?.(type);
  const handleResetZoom = () => {
    fabricRef.current?.resetZoom?.();
    setZoomPercent(100);
  };
  const bumpBoardHeight = (delta) => {
    const cur = Math.round(boardRef.current?.getBoundingClientRect?.().height || height);
    const next = Math.max(MIN_H, Math.min(cur + delta, MAX_H));
    if (boardRef.current) boardRef.current.style.height = `${next}px`;
    setHeight(next);
  };
  const selectLayer = (obj, closeAfter) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    setActiveLayerIds(obj.layerId ? [obj.layerId] : []);
    if (isTextObj(obj)) {
      const next = Math.round(obj.fontSize || 24);
      setFontSize(next);
      if (document.activeElement !== fontSizeInputRef.current) setFontSizeInput(String(next));
    }
    if (closeAfter) setLayersOpen(false);
  };

  const reorderLayerAbove = useCallback((dragId, targetId) => {
    const canvas = fabricRef.current;
    if (!canvas || !dragId || !targetId || dragId === targetId) return;
    const all = canvas.getObjects?.() || [];
    const dragObj = all.find(o => o?.layerId === dragId);
    const targetObj = all.find(o => o?.layerId === targetId);
    if (!dragObj || !targetObj) return;
    const fromIndex = all.indexOf(dragObj);
    const targetIndex = all.indexOf(targetObj);
    if (fromIndex < 0 || targetIndex < 0) return;
    const desired = Math.max(0, Math.min(all.length - 1, fromIndex < targetIndex ? targetIndex : targetIndex + 1));
    if (typeof canvas.moveTo === "function") canvas.moveTo(dragObj, desired);
    canvas.requestRenderAll();
    commitCanvasChange(dragObj);
  }, [commitCanvasChange]);

  const beginLayerDrag = useCallback((layerId, ev) => {
    if (!layerId) return;
    if (dragJustEndedRef.current) return;
    if (ev?.pointerType === "mouse" && ev.button !== 0) return;
    layerDragRef.current = {
      layerId,
      startX: ev.clientX,
      startY: ev.clientY,
      moved: false,
      overId: null
    };

    const onMove = (e) => {
      const st = layerDragRef.current;
      if (!st) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (!st.moved) {
        if ((dx * dx + dy * dy) < 36) return;
        st.moved = true;
        setDraggingLayerId(st.layerId);
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest?.("[data-layer-role='layer']");
      const overId = row?.getAttribute?.("data-layer-id") || null;
      st.overId = overId;
      setDragOverLayerId(overId);
      try {
        e.preventDefault();
      } catch {}
    };

    const onUp = () => {
      const st = layerDragRef.current;
      layerDragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!st?.moved) return;
      const fromId = st.layerId;
      const toId = st.overId;
      setDraggingLayerId(null);
      setDragOverLayerId(null);
      if (toId && toId !== fromId) reorderLayerAbove(fromId, toId);
      dragJustEndedRef.current = true;
      window.setTimeout(() => { dragJustEndedRef.current = false; }, 0);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [reorderLayerAbove]);

  const layersPanel = (showClose) => (
    <div
      style={{
        width: "100%",
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        padding: 14,
        height: useExternalLayers ? "auto" : boardHeight,
        maxHeight: useExternalLayers ? "calc(100dvh - var(--hdr-height) - 44px)" : undefined,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", opacity: 0.72, marginBottom: 4 }}>Visual Layers</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Drawing stack</div>
        </div>
        {showClose && (
          <button className="draw-tb" onClick={() => setLayersOpen(false)} title="Close Layers">
            <X size={16} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto", flex: 1, overscrollBehavior: isMobile ? "auto" : "contain", paddingRight: 2 }}>
        {canvasObjects.slice().reverse().map((obj) => {
          const key = obj.layerId || `${obj.type}-${obj.left}-${obj.top}`;
          const id = obj.layerId || "";
          const isActive = !!(id && activeLayerIdSet.has(id));
          const isDragging = !!(id && draggingLayerId === id);
          const isOver = !!(id && dragOverLayerId === id && draggingLayerId && draggingLayerId !== id);
          return (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                type="button"
                data-layer-role="layer"
                data-layer-id={id}
                onPointerDown={(e) => { if (id) beginLayerDrag(id, e); }}
                onClick={() => {
                  if (dragJustEndedRef.current) return;
                  selectLayer(obj, showClose);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  outline: isOver ? "2px solid #f5a623" : (isActive ? "2px solid #a855f7" : "none"),
                  outlineOffset: -1,
                  background: isOver ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.035)",
                  opacity: isDragging ? 0.55 : 1,
                  color: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  touchAction: "pan-y"
                }}
              >
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getLayerLabel(obj)}
                </span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>{Math.round(obj.angle || 0)}°</span>
              </button>
              {obj.type === "group" && Array.isArray(obj._objects) && obj._objects.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 16 }}>
                  {obj._objects.slice().reverse().map((child, i) => (
                    <div
                      key={`${id || key}-sub-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.02)",
                        opacity: 0.95
                      }}
                    >
                      <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {getLayerLabel(child)}
                      </span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>{Math.round(child?.angle || 0)}°</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!canvasObjects.length && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>No layers yet</div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef}>
      <div className="draw-bar">
        {/* Row 1: Creation, Solution Tools, Shapes & Math */}
        <div className="draw-bar-row">
          {/* Core Drawing & Solution Brushes */}
          <div className="draw-bar-group">
            <button className={`draw-tb${tool === "pen" ? " draw-on" : ""}`} onClick={() => setTool("pen")} title="Draw with Pen (P)">
              <Pencil size={15} />
            </button>
            <button
              className={`draw-tb${tool === "highlighter" ? " draw-on" : ""}`}
              onClick={() => setTool("highlighter")}
              title="Highlighter Marker for Key Steps & Answers (H)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 11-6 6v3h9l3-3" />
                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
              </svg>
            </button>
            <button className={`draw-tb${tool === "move" ? " draw-on" : ""}`} onClick={() => setTool("move")} title="Select & Move Objects (V)">
              <MousePointer2 size={15} />
            </button>
            <button className={`draw-tb${tool === "pan" ? " draw-on" : ""}`} onClick={() => setTool("pan")} title="Pan Canvas (Hold Space)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 2l-2 2m2-2l2 2M12 22l-2-2m2 2l2-2M2 12l2-2m-2 2l2 2M22 12l-2-2m2 2l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className={`draw-tb${tool === "eraser" ? " draw-on" : ""}`} onClick={() => setTool("eraser")} title="Eraser Brush (E)">
              <Eraser size={15} />
            </button>
            <button className="draw-tb" onClick={addText} title="Add Text Layer (T)">
              <Type size={15} />
            </button>
          </div>

          <div className="draw-bar-divider" />

          {/* Lines, Connectors & Quick Solution Stamps */}
          <div className="draw-bar-group">
            <button className="draw-tb draw-desktop-only" onClick={addHrLine} title="Add Rotatable Horizontal Line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="5" cy="12" r="2" fill="currentColor" />
                <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="19" cy="12" r="2" fill="currentColor" />
              </svg>
            </button>
            <button className="draw-tb draw-desktop-only" onClick={addVrLine} title="Add Rotatable Vertical Line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="5" r="2" fill="currentColor" />
                <path d="M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="19" r="2" fill="currentColor" />
              </svg>
            </button>
            <button className="draw-tb" onClick={addLine} title="Add Line Segment / Fraction Bar">
              <Minus size={15} />
            </button>
            <button className="draw-tb" onClick={() => addArrow("end")} title="Add Process / Connector Arrow">
              <ArrowRight size={15} />
            </button>
            <button
              className="draw-tb"
              onClick={addCancelSlash}
              title="Add Cancellation Slash (Strike out / Cancel terms)"
              style={{ color: "#e0365a", fontWeight: 800 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="6" y1="19" x2="18" y2="5" />
              </svg>
            </button>
            <button
              className="draw-tb draw-tb-pill"
              onClick={() => addStepBadge()}
              title="Add Numbered Solution Step Badge (1, 2, 3...)"
            >
              <span className="draw-step-pill-icon">1</span>
              <span className="draw-tb-pill-label">Step</span>
            </button>
          </div>

          <div className="draw-bar-divider" />

          {/* Shapes, Callouts & Flowchart Templates */}
          <div className="draw-bar-group">
            <button className="draw-tb" onClick={addSquare} title="Add Square">
              <Square size={15} />
            </button>
            <button className="draw-tb draw-desktop-only" onClick={addRectangle} title="Add Rounded Rectangle">
              <span style={{ display: "inline-block", width: 17, height: 11, border: "2px solid currentColor", borderRadius: 3 }} />
            </button>
            <button className="draw-tb" onClick={addCircle} title="Add Circle">
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid currentColor", borderRadius: "50%" }} />
            </button>
            <button className="draw-tb draw-desktop-only" onClick={addTriangle} title="Add Triangle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 4 L21 20 H3 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>

            {/* All Shapes & Solution Stamps Popover */}
            <div className="draw-popover-anchor" ref={shapesMenuRef}>
              <button
                type="button"
                className={`draw-tb draw-tb-pill${shapesMenuOpen ? " draw-on" : ""}`}
                onClick={() => toggleToolbarMenu("shapes")}
                title="More Shapes, Brackets, Venn & Step Badges"
              >
                <CircleDot size={14} />
                <span className="draw-tb-pill-label">Shapes</span>
                <span className="draw-tb-caret">▾</span>
              </button>
              {shapesMenuOpen && (
                <div className="draw-popover-menu" style={{ width: 248 }}>
                  <div className="draw-popover-section-title">Shapes & Diagrams</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addSquare(); setShapesMenuOpen(false); }} title="Add Square">
                      <Square size={14} />
                      <span>Square</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addRectangle(); setShapesMenuOpen(false); }} title="Add Rounded Rectangle">
                      <span style={{ display: "inline-block", width: 15, height: 10, border: "2px solid currentColor", borderRadius: 2 }} />
                      <span>Rect</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addCircle(); setShapesMenuOpen(false); }} title="Add Circle">
                      <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid currentColor", borderRadius: "50%" }} />
                      <span>Circle</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addTriangle(); setShapesMenuOpen(false); }} title="Add Triangle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4 L21 20 H3 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                      <span>Triangle</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addStar(); setShapesMenuOpen(false); }} title="Add Star">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2 L15.1 8.6 L22 9.3 L17 13.9 L18.5 21 L12 17.4 L5.5 21 L7 13.9 L2 9.3 L8.9 8.6 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                      <span>Star</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addOblong(); setShapesMenuOpen(false); }} title="Add Oblong (Butterfly Method)">
                      <span style={{ display: "inline-block", width: 15, height: 8, border: "2px solid currentColor", borderRadius: 9999 }} />
                      <span>Oblong</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addTrayShape(); setShapesMenuOpen(false); }} title="Add Tray Shape (Bracket)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 5 V18 H19 V5" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" />
                      </svg>
                      <span>Bracket</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addRoofShape(); setShapesMenuOpen(false); }} title="Add Roof / Caret Shape">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M4 17 L12 7 L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Caret</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addVennDiagram(); setShapesMenuOpen(false); }} title="Add 2-Circle Venn Diagram">
                      <CircleDot size={14} />
                      <span>Venn</span>
                    </button>
                  </div>

                  <div className="draw-popover-section-title" style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                    Rotatable Lines & Slash
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addHrLine(); setShapesMenuOpen(false); }} title="Rotatable Horizontal Line">
                      <span>⊶⊷</span>
                      <span>H-Line</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addVrLine(); setShapesMenuOpen(false); }} title="Rotatable Vertical Line">
                      <span>⫯</span>
                      <span>V-Line</span>
                    </button>
                    <button className="draw-tb draw-popover-grid-btn" onClick={() => { addCancelSlash(); setShapesMenuOpen(false); }} style={{ color: "#e0365a" }} title="Cancellation Slash">
                      <span style={{ fontWeight: 800 }}>/</span>
                      <span>Cancel</span>
                    </button>
                  </div>

                  <div className="draw-popover-section-title" style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                    Step Number Badges
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                    {STEP_CIRCLES.map((sc, idx) => (
                      <button
                        key={sc}
                        type="button"
                        className="draw-tb"
                        onClick={() => addStepBadge(idx + 1)}
                        title={`Insert Step ${idx + 1} Badge`}
                        style={{ fontWeight: 700, fontSize: 13 }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Notes & Solution Callout Cards */}
            <div className="draw-popover-anchor" ref={stickyNoteMenuRef}>
              <button
                type="button"
                className={`draw-tb draw-tb-pill${stickyNoteMenuOpen ? " draw-on" : ""}`}
                onClick={() => toggleToolbarMenu("sticky")}
                title="Add Sticky Note or Solution Callout Card"
              >
                <StickyNote size={14} />
                <span className="draw-tb-pill-label">Note</span>
                <span className="draw-tb-caret">▾</span>
              </button>
              {stickyNoteMenuOpen && (
                <div className="draw-popover-menu" style={{ width: 210 }}>
                  <div className="draw-popover-section-title">Solution Callout Banners</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    {CALLOUT_PRESETS.map((cp) => (
                      <button
                        key={cp.label}
                        type="button"
                        onClick={() => addCalloutCard(cp)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: `1.5px solid ${cp.border}`,
                          background: cp.bg,
                          color: cp.text,
                          fontWeight: 700,
                          fontSize: 11.5,
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>

                  <div className="draw-popover-section-title" style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                    Sticky Notes
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {STICKY_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => addStickyNote(p.bg, p.text)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 7px",
                          borderRadius: 7,
                          border: "1px solid rgba(0,0,0,0.08)",
                          background: p.bg,
                          color: p.text,
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: p.bg, border: "1px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label.replace(" Note", "")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flowchart, Smart Connectors & Solution Templates */}
            <div className="draw-popover-anchor" ref={flowchartMenuRef}>
              <button
                type="button"
                className={`draw-tb draw-tb-pill${flowchartMenuOpen ? " draw-on" : ""}`}
                onClick={() => toggleToolbarMenu("flow")}
                title="Flowchart, Smart Connectors & Solution Templates"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="6" height="6" rx="1.5" />
                  <rect x="15" y="15" width="6" height="6" rx="1.5" />
                  <path d="M9 6h4a3 3 0 0 1 3 3v6" />
                  <polyline points="13 13 16 16 19 13" />
                </svg>
                <span className="draw-tb-pill-label">Flow</span>
                <span className="draw-tb-caret">▾</span>
              </button>
              {flowchartMenuOpen && (
                <div className="draw-popover-menu draw-popover-right" style={{ width: 256 }}>
                  {/* Connectors & Arrows */}
                  <div>
                    <div className="draw-popover-section-title">Connectors & Arrows</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      <button className="draw-tb" onClick={() => { addArrow("end"); setFlowchartMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span>→</span> Straight
                      </button>
                      <button className="draw-tb" onClick={() => { addCurvedArrow(-35, "end"); setFlowchartMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span>↷</span> Curved Arc
                      </button>
                      <button className="draw-tb" onClick={() => { addElbowConnector("end"); setFlowchartMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span>↳</span> 90° Elbow
                      </button>
                      <button className="draw-tb" onClick={() => { addArrow("both"); setFlowchartMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span>↔</span> Two-Way
                      </button>
                      <button className="draw-tb" onClick={() => { addArrow("circle-arrow"); setFlowchartMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span>•→</span> Dot-to-Arrow
                      </button>
                      <button className="draw-tb" onClick={() => { connectSelectedShapes("curved"); setFlowchartMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px", color: "#2563eb", fontWeight: 700 }}>
                        <span>🔗</span> Connect 2 Sel
                      </button>
                    </div>
                  </div>

                  {/* Flowchart Nodes */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 6 }}>
                    <div className="draw-popover-section-title">Flowchart Nodes</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      <button className="draw-tb" onClick={addProcessStep} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span style={{ display: "inline-block", width: 14, height: 10, border: "1.5px solid currentColor", borderRadius: 2 }} />
                        Process Card
                      </button>
                      <button className="draw-tb" onClick={addDecisionDiamond} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid #d97706", transform: "rotate(45deg)", margin: "0 2px" }} />
                        Decision
                      </button>
                      <button className="draw-tb" onClick={addTerminator} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span style={{ display: "inline-block", width: 16, height: 9, border: "1.5px solid #22c55e", borderRadius: 999 }} />
                        Start / End
                      </button>
                      <button className="draw-tb" onClick={addDataNode} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 7px" }}>
                        <span style={{ display: "inline-block", width: 14, height: 10, border: "1.5px solid currentColor", transform: "skewX(-20deg)" }} />
                        Data Node
                      </button>
                    </div>
                  </div>

                  {/* Quick Solution & Flowchart Templates */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 6 }}>
                    <div className="draw-popover-section-title">Solution & Diagram Templates</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <button className="draw-tb" onClick={() => addProcessTemplate("series")} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                        <span>🔢</span> Number Series Pattern (+d Jumps)
                      </button>
                      <button className="draw-tb" onClick={() => addProcessTemplate("crossMultiply")} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                        <span>✖️</span> Cross-Multiply Ratio Grid
                      </button>
                      <button className="draw-tb" onClick={() => addProcessTemplate("dstTriangle")} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                        <span>📐</span> Distance-Speed-Time Triangle
                      </button>
                      <button className="draw-tb" onClick={() => addProcessTemplate("linear3")} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                        <span>▶</span> 3-Step Process (1 ➔ 2 ➔ 3)
                      </button>
                      <button className="draw-tb" onClick={() => addProcessTemplate("decision")} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                        <span>⌥</span> If-Else Decision Branch (Yes / No)
                      </button>
                      <button className="draw-tb" onClick={() => addProcessTemplate("cycle")} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                        <span>↺</span> 3-Node Cycle (Feedback Loop)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="draw-bar-divider" />

          {/* Math Presets & Operators */}
          <div className="draw-bar-group">
            <button className="draw-tb" onClick={addFraction} title="Add Fraction (Auto-layout)">
              <Divide size={15} />
            </button>
            <button className="draw-tb" onClick={addLongDivisionPreset} title="Add Long Division Preset (Auto-layout)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <text x="3.5" y="14.2" fontSize="7" fill="currentColor" fontFamily="Arial, sans-serif">2</text>
                <text x="11" y="10.5" fontSize="6" fill="currentColor" fontFamily="Arial, sans-serif">12</text>
                <path d="M9 6H21M9 6C11.8 8.4 11.8 14.8 9 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="draw-tb draw-desktop-only" onClick={addLongDivision} title="Add Long Division Bracket">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 5H20M5 5C9.4 8 9.4 16 5 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="draw-bar-subdivider draw-desktop-only" />
            <button className="draw-tb draw-tb-symbol draw-desktop-only" onClick={() => addSymbol("+")} title="Plus">+</button>
            <button className="draw-tb draw-tb-symbol draw-desktop-only" onClick={() => addSymbol("-")} title="Minus">-</button>
            <button className="draw-tb draw-tb-symbol draw-desktop-only" onClick={() => addSymbol("×")} title="Multiply">×</button>
            <button className="draw-tb draw-tb-symbol draw-desktop-only" onClick={() => addSymbol("÷")} title="Divide">÷</button>
            <button className="draw-tb draw-tb-symbol draw-desktop-only" onClick={() => addSymbol("=")} title="Equal">=</button>

            {/* Math & Logic Symbols Popover */}
            <div className="draw-popover-anchor" ref={mathMenuRef}>
              <button
                type="button"
                className={`draw-tb draw-tb-pill${mathMenuOpen ? " draw-on" : ""}`}
                onClick={() => toggleToolbarMenu("math")}
                title="Math & Logic Operators, Roots, Pi, Therefore"
              >
                <span style={{ fontWeight: 700, fontSize: 12 }}>±=</span>
                <span className="draw-tb-pill-label">Math</span>
                <span className="draw-tb-caret">▾</span>
              </button>
              {mathMenuOpen && (
                <div className="draw-popover-menu draw-popover-right" style={{ width: 224 }}>
                  <div className="draw-popover-section-title">Math & Logic Symbols</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 8 }}>
                    {["+", "-", "×", "÷", "=", ...EXTRA_MATH_SYMBOLS.filter(s => s !== "÷" && s !== "=")].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        className="draw-tb draw-tb-symbol"
                        onClick={() => { addSymbol(sym); setMathMenuOpen(false); }}
                        title={`Insert ${sym}`}
                        style={{ height: 30, fontSize: 14, fontWeight: 700 }}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                  <div className="draw-popover-section-title" style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                    Math Layouts
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <button className="draw-tb" onClick={() => { addFraction(); setMathMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                      <Divide size={13} /> Editable Fraction (a / b)
                    </button>
                    <button className="draw-tb" onClick={() => { addLongDivisionPreset(); setMathMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                      <span>⟌</span> Long Division (Auto-layout)
                    </button>
                    <button className="draw-tb" onClick={() => { addLongDivision(); setMathMenuOpen(false); }} style={{ justifyContent: "flex-start", gap: 6, fontSize: 11, padding: "5px 8px" }}>
                      <span>⌈</span> Long Division Bracket Only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Styling, Alignment, View & History */}
        <div className="draw-bar-row">
          {/* Color & Stroke */}
          <div className="draw-bar-group draw-popover-anchor" ref={colorPickerRef}>
            {COLORS.map((c, idx) => (
              <div
                key={c}
                onClick={() => applyColor(c)}
                className={`draw-color-swatch${idx >= 4 ? " draw-color-swatch-extra" : ""}`}
                style={{
                  width: 17, height: 17, borderRadius: "50%", background: c, cursor: "pointer", flexShrink: 0,
                  border: color === c ? "2px solid #fff" : "1px solid rgba(0,0,0,0.15)",
                  boxShadow: color === c ? "0 0 0 2px #f5a623" : "none"
                }}
                title={`Color ${c}`}
              />
            ))}
            <button
              type="button"
              className={`draw-tb${colorPickerOpen ? " draw-on" : ""}`}
              onClick={() => toggleToolbarMenu("color")}
              title="Open Full Color Palette"
              style={{ padding: "0 5px", minWidth: 26, height: 26, gap: 3 }}
            >
              <Palette size={13} />
              <span
                className="draw-mobile-only-swatch"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: color,
                  border: "1px solid rgba(0,0,0,0.25)"
                }}
              />
            </button>
            {colorPickerOpen && (
              <div className="draw-popover-menu" style={{ width: 240, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: 0.75, marginBottom: 10 }}>Color Palette</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 12 }}>
                  {PICKER_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyColor(c)}
                      title={c}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", padding: 0,
                        border: color === c ? "2px solid var(--text)" : "1px solid rgba(0,0,0,0.15)",
                        boxShadow: color === c ? "0 0 0 2px #f5a623" : "none"
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#1a2540"}
                    onChange={e => applyColor(e.target.value)}
                    title="Native color picker"
                    style={{ width: 34, height: 28, padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "transparent", cursor: "pointer" }}
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={e => {
                      const v = e.target.value;
                      setHexInput(v);
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) applyColor(hexInput);
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") e.currentTarget.blur();
                    }}
                    placeholder="#1a2540"
                    title="Enter a hex color code and press Enter"
                    style={{ flex: 1, minWidth: 0, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontFamily: "'Fira Mono',monospace", fontSize: 11, outline: "none" }}
                  />
                </div>
              </div>
            )}
            <div className="draw-bar-subdivider" />
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, minWidth: 14, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{size}</span>
            <input type="range" min={1} max={20} value={size} onChange={e => setSize(+e.target.value)}
              className="draw-stroke-slider"
              title={tool === "eraser" ? `Eraser Size: ${size}px` : tool === "highlighter" ? `Highlighter Width: ${Math.max(14, size * 4)}px` : `Stroke Size: ${size}px`}
              style={{ width: 44, accentColor: "#f5a623", cursor: "pointer" }} />
          </div>

          <div className="draw-bar-divider" />

          {/* Arrange & Align */}
          <div className="draw-bar-group">
            <button className="draw-tb" onClick={moveForward} title="Bring Forward">
              <ChevronUp size={15} />
            </button>
            <button className="draw-tb" onClick={moveBackward} title="Send Backward">
              <ChevronDown size={15} />
            </button>
            <div className="draw-bar-subdivider" />
            <div ref={alignMenuRef} className="draw-popover-anchor">
              <button 
                type="button"
                className={`draw-tb draw-tb-pill${alignMenuOpen ? " draw-on" : ""}`} 
                onClick={() => toggleToolbarMenu("align")} 
                disabled={!canAlign}
                title="Align Objects"
              >
                <AlignCenterHorizontal size={14} />
                <span className="draw-tb-pill-label">Align</span>
              </button>
              {alignMenuOpen && (
                <div className="draw-popover-menu" style={{ minWidth: 168 }}>
                  <div className="draw-popover-section-title">
                    {selectionCount > 1 ? `Align ${selectionCount} Items` : "Align to Page"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 6 }}>
                    <button className="draw-tb" onClick={() => { handleAlign("left"); setAlignMenuOpen(false); }} title="Align Left">
                      <AlignStartHorizontal size={15} />
                    </button>
                    <button className="draw-tb" onClick={() => { handleAlign("centerH"); setAlignMenuOpen(false); }} title="Center Horizontally">
                      <AlignCenterHorizontal size={15} />
                    </button>
                    <button className="draw-tb" onClick={() => { handleAlign("right"); setAlignMenuOpen(false); }} title="Align Right">
                      <AlignEndHorizontal size={15} />
                    </button>
                    <button className="draw-tb" onClick={() => { handleAlign("top"); setAlignMenuOpen(false); }} title="Align Top">
                      <AlignStartVertical size={15} />
                    </button>
                    <button className="draw-tb" onClick={() => { handleAlign("middleV"); setAlignMenuOpen(false); }} title="Center Vertically">
                      <AlignCenterVertical size={15} />
                    </button>
                    <button className="draw-tb" onClick={() => { handleAlign("bottom"); setAlignMenuOpen(false); }} title="Align Bottom">
                      <AlignEndVertical size={15} />
                    </button>
                  </div>
                  <button
                    className="draw-tb"
                    style={{ width: "100%", justifyContent: "center", fontSize: 11, gap: 5, padding: "5px 6px", marginBottom: canDistribute ? 6 : 0 }}
                    onClick={() => { handleAlign("centerCanvas"); setAlignMenuOpen(false); }}
                    title="Center on Canvas"
                  >
                    <Square size={13} style={{ strokeDasharray: "2 2" }} />
                    Center on Canvas
                  </button>
                  {canDistribute && (
                    <>
                      <div className="draw-popover-section-title" style={{ marginTop: 6, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                        Distribute
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        <button className="draw-tb" style={{ justifyContent: "center", fontSize: 11, gap: 4, padding: "5px 4px" }} onClick={() => { handleAlign("distributeH"); setAlignMenuOpen(false); }} title="Distribute Horizontally">
                          <AlignHorizontalDistributeCenter size={14} />
                          Horiz
                        </button>
                        <button className="draw-tb" style={{ justifyContent: "center", fontSize: 11, gap: 4, padding: "5px 4px" }} onClick={() => { handleAlign("distributeV"); setAlignMenuOpen(false); }} title="Distribute Vertically">
                          <AlignVerticalDistributeCenter size={14} />
                          Vert
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="draw-bar-subdivider draw-desktop-only" />
            <button className="draw-tb draw-desktop-only" onClick={() => fabricRef.current?.groupSelection?.()} disabled={!canGroup} title="Group (Ctrl+G)" style={{ padding: "0 6px" }}>
              Group
            </button>
            <button className="draw-tb draw-desktop-only" onClick={() => fabricRef.current?.ungroupSelection?.()} disabled={!canUngroup} title="Ungroup (Ctrl+Shift+G)" style={{ padding: "0 6px" }}>
              Ungroup
            </button>
            <button className="draw-tb" onClick={straightenSelection} disabled={!canStraighten} title="Straighten Line (S)">
              <Ruler size={15} />
            </button>
          </div>

          <div className="draw-bar-divider" />

          {/* Canvas Aids & Zoom View */}
          <div className="draw-bar-group">
            <button className={`draw-tb${snapping ? " draw-on" : ""}`} onClick={() => setSnapping(s => !s)} title={snapping ? "Smart Snapping Enabled (M)" : "Smart Snapping Disabled (M)"}>
              <Magnet size={15} />
            </button>
            <button className={`draw-tb${gridMode !== "none" ? " draw-on" : ""}`} onClick={() => setGridMode(g => g === "none" ? "dots" : g === "dots" ? "grid" : "none")} title={`Canvas Grid: ${gridMode === "none" ? "Off" : gridMode} (G)`}>
              <Grid size={15} />
            </button>
            <div className="draw-bar-subdivider" />
            <button className="draw-tb" onClick={() => fabricRef.current?.zoomBy?.(1/1.2)} title="Zoom Out (Ctrl+-)">
              <ZoomOut size={14} />
            </button>
            <button className="draw-tb" onClick={handleResetZoom} style={{ fontSize: 11, fontWeight: 600, minWidth: 36, padding: "0 3px", fontVariantNumeric: "tabular-nums" }} title="Reset Zoom to 100%">
              {zoomPercent}%
            </button>
            <button className="draw-tb" onClick={() => fabricRef.current?.zoomBy?.(1.2)} title="Zoom In (Ctrl++)">
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="draw-bar-divider" />

          {/* Clipboard, History & Destructive Actions */}
          <div className="draw-bar-group">
            <button className="draw-tb draw-desktop-only" onClick={() => fabricRef.current?.copySelection?.()} disabled={!canCopy} title="Copy (Ctrl+C)">
              <Copy size={15} />
            </button>
            <button className="draw-tb draw-desktop-only" onClick={() => fabricRef.current?.pasteSelection?.()} disabled={!canPaste} title="Paste (Ctrl+V)">
              <ClipboardPaste size={15} />
            </button>
            <button className="draw-tb draw-desktop-only" onClick={() => fabricRef.current?.duplicateSelection?.()} disabled={!canCopy} title="Duplicate (Ctrl+D)">
              <CopyPlus size={15} />
            </button>
            <div className="draw-bar-subdivider draw-desktop-only" />
            <button className="draw-tb" onClick={undo} title="Undo (Ctrl+Z)">
              <Undo2 size={15} />
            </button>
            <button className="draw-tb" onClick={redo} title="Redo (Ctrl+Y)">
              <Redo2 size={15} />
            </button>
            <div className="draw-bar-subdivider" />
            <button className="draw-tb" onClick={deleteSelected} style={{ color: "#e0365a" }} title="Delete Selected (Del)">
              <Trash2 size={15} />
            </button>
            <button className="draw-tb" onClick={clear} style={{ color: "#e0365a" }} title="Clear Canvas">
              <RotateCcw size={15} />
            </button>
            <div className="draw-bar-subdivider" />
            <button className="draw-tb" onClick={copyImageToClipboard} title="Copy Diagram to System Clipboard">
              <Copy size={14} />
            </button>
            <button className="draw-tb" onClick={downloadImage} title="Export / Download Diagram as PNG">
              <Download size={14} />
            </button>
            {(!isMobile && narrow) && (
              <>
                <div className="qb-draw-layers-divider draw-bar-subdivider" />
                <button className="draw-tb qb-draw-layers-btn" onClick={() => setLayersOpen(o => !o)} title={layersOpen ? "Hide Layers" : "Show Layers"}>
                  {layersOpen ? <X size={15} /> : <span style={{ fontSize: 11, padding: "0 4px" }}>Layers</span>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {useExternalLayers ? createPortal(layersPanel(false), layersHost) : null}

      <div style={{ position: "relative" }} ref={menuHostRef}>
        {toastMsg && (
          <div className="draw-canva-toast">
            <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── Canva Floating Selection Bar ── */}
        {selectionBounds && activeObjProps ? (
          <div
            className="draw-canva-floating-bar"
            style={{
              position: "absolute",
              left: isMobile ? "50%" : `${selectionBounds.left}px`,
              top: `${selectionBounds.top}px`,
              transform: "translateX(-50%)",
              zIndex: 25,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Color Swatch (Fill) for Shapes & Text */}
            {(activeObjProps.isShape || activeObjProps.isText) && (
              <div className="draw-floating-anchor">
                <button
                  type="button"
                  className="draw-canva-pill-btn"
                  onClick={() => setFloatingPopover(p => p === "fill" ? null : "fill")}
                  title="Fill Color"
                >
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      background: activeObjProps.fill === "transparent" ? "none" : activeObjProps.fill,
                      border: "1.5px solid rgba(0,0,0,0.18)",
                      backgroundImage: activeObjProps.fill === "transparent"
                        ? "repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, #fff 2px, #fff 4px)"
                        : "none",
                      display: "inline-block"
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Fill</span>
                </button>
                {floatingPopover === "fill" && (
                  <div className="draw-floating-popover" style={{ left: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, color: "var(--text-muted)" }}>
                      Fill Color
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                      {FILL_PALETTE.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => { applyActiveFill(item.value); setFloatingPopover(null); }}
                          title={item.name}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: item.value === "transparent" ? "none" : item.value,
                            backgroundImage: item.value === "transparent"
                              ? "repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, #fff 2px, #fff 4px)"
                              : "none",
                            border: activeObjProps.fill === item.value ? "2px solid #a855f7" : "1px solid rgba(0,0,0,0.15)",
                            boxShadow: activeObjProps.fill === item.value ? "0 0 0 2px #a855f7" : "none",
                            cursor: "pointer"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Border / Stroke for Shapes & Lines */}
            {(activeObjProps.isShape || activeObjProps.isLine) && (
              <div className="draw-floating-anchor">
                <button
                  type="button"
                  className="draw-canva-pill-btn"
                  onClick={() => setFloatingPopover(p => p === "stroke" ? null : "stroke")}
                  title="Border & Stroke"
                >
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 3,
                      border: `2px solid ${activeObjProps.stroke === "transparent" ? "#94a3b8" : activeObjProps.stroke}`,
                      display: "inline-block"
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Border</span>
                </button>
                {floatingPopover === "stroke" && (
                  <div className="draw-floating-popover" style={{ left: 0, width: 215 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, color: "var(--text-muted)" }}>
                      Border Color
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 10 }}>
                      {COLORS.concat(["#ef4444", "#3b82f6", "#10b981"]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => applyActiveStroke(c)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: c,
                            border: activeObjProps.stroke === c ? "2px solid #a855f7" : "1px solid rgba(0,0,0,0.15)",
                            boxShadow: activeObjProps.stroke === c ? "0 0 0 2px #a855f7" : "none",
                            cursor: "pointer"
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "var(--text-muted)" }}>
                      Border Thickness
                    </div>
                    <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                      {[0, 1, 2, 4, 8].map((w) => (
                        <button
                          key={w}
                          type="button"
                          className={`draw-tb${activeObjProps.strokeWidth === w ? " draw-on" : ""}`}
                          onClick={() => applyActiveStrokeWidth(w)}
                          style={{ flex: 1, fontSize: 11, fontWeight: 600 }}
                        >
                          {w === 0 ? "0" : `${w}px`}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "var(--text-muted)" }}>
                      Border Style
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button
                        type="button"
                        className={`draw-tb${!activeObjProps.strokeDashArray ? " draw-on" : ""}`}
                        onClick={() => applyActiveStrokeStyle("solid")}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        className={`draw-tb${activeObjProps.strokeDashArray?.length === 2 && activeObjProps.strokeDashArray[0] === 8 ? " draw-on" : ""}`}
                        onClick={() => applyActiveStrokeStyle("dashed")}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        Dashed
                      </button>
                      <button
                        type="button"
                        className={`draw-tb${activeObjProps.strokeDashArray?.length === 2 && activeObjProps.strokeDashArray[0] === 3 ? " draw-on" : ""}`}
                        onClick={() => applyActiveStrokeStyle("dotted")}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        Dotted
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text Formatting: Font, Size, Bold, Italic, Underline, Align */}
            {activeObjProps.isText && (
              <>
                <div className="draw-floating-anchor">
                  <button
                    type="button"
                    className="draw-canva-pill-btn"
                    onClick={() => setFloatingPopover(p => p === "font" ? null : "font")}
                    title="Font Family"
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {CANVA_FONTS.find(f => activeObjProps.fontFamily?.includes(f.name))?.name || "Font"}
                    </span>
                  </button>
                  {floatingPopover === "font" && (
                    <div className="draw-floating-popover" style={{ left: 0, width: 145 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "var(--text-muted)" }}>
                        Font Family
                      </div>
                      {CANVA_FONTS.map((f) => (
                        <button
                          key={f.name}
                          type="button"
                          className="draw-tb"
                          onClick={() => { applyActiveFontFamily(f.value); setFloatingPopover(null); }}
                          style={{
                            width: "100%",
                            justifyContent: "flex-start",
                            fontFamily: f.value,
                            fontSize: 12,
                            padding: "5px 7px",
                            marginBottom: 2
                          }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button className="draw-tb" onClick={() => applyFontSize(fontSize - 1)} title="Font Size -">
                    <Minus size={12} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    ref={fontSizeInputRef}
                    value={fontSizeInput}
                    onChange={(e) => {
                      const val = sanitizeIntegerInput(e.target.value);
                      setFontSizeInput(val);
                      if (val !== "") applyFontSize(Number(val), false);
                    }}
                    onBlur={(e) => commitFontSizeInput(e.target.value)}
                    style={{ width: 32, padding: "2px 2px", fontSize: 11, fontWeight: 600, textAlign: "center", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "inherit" }}
                  />
                  <button className="draw-tb" onClick={() => applyFontSize(fontSize + 1)} title="Font Size +">
                    <Plus size={12} />
                  </button>
                </div>

                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button
                    className={`draw-tb${activeObjProps.fontWeight === "bold" ? " draw-on" : ""}`}
                    onClick={toggleActiveBold}
                    title="Bold"
                    style={{ fontWeight: 700, minWidth: 24, fontSize: 12 }}
                  >
                    B
                  </button>
                  <button
                    className={`draw-tb${activeObjProps.fontStyle === "italic" ? " draw-on" : ""}`}
                    onClick={toggleActiveItalic}
                    title="Italic"
                    style={{ fontStyle: "italic", minWidth: 24, fontSize: 12, fontFamily: "serif" }}
                  >
                    I
                  </button>
                  <button
                    className={`draw-tb${activeObjProps.underline ? " draw-on" : ""}`}
                    onClick={toggleActiveUnderline}
                    title="Underline"
                    style={{ textDecoration: "underline", minWidth: 24, fontSize: 12 }}
                  >
                    U
                  </button>
                </div>

                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button className={`draw-tb${activeTextAlign === "left" ? " draw-on" : ""}`} onClick={() => applyTextAlign("left")} title="Align Left">
                    <AlignLeft size={13} />
                  </button>
                  <button className={`draw-tb${activeTextAlign === "center" ? " draw-on" : ""}`} onClick={() => applyTextAlign("center")} title="Align Center">
                    <AlignCenter size={13} />
                  </button>
                  <button className={`draw-tb${activeTextAlign === "right" ? " draw-on" : ""}`} onClick={() => applyTextAlign("right")} title="Align Right">
                    <AlignRight size={13} />
                  </button>
                </div>
              </>
            )}

            {/* Smart Connectors & Curved Arrows Controls */}
            {activeObjProps.isArrow && (
              <>
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button
                    type="button"
                    className={`draw-tb${activeObjProps.connectorKind === "straight" ? " draw-on" : ""}`}
                    onClick={() => modifyActiveArrow({ newKind: "straight" })}
                    title="Straight Arrow (→)"
                    style={{ minWidth: 26, fontSize: 13, fontWeight: 700 }}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={`draw-tb${activeObjProps.connectorKind === "curved" ? " draw-on" : ""}`}
                    onClick={() => modifyActiveArrow({ newKind: "curved" })}
                    title="Curved Process Arrow (↷)"
                    style={{ minWidth: 26 }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 18 C 4 9, 14 6, 20 8" />
                      <path d="M15 4 L20 8 L16 13" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`draw-tb${activeObjProps.connectorKind === "elbow" ? " draw-on" : ""}`}
                    onClick={() => modifyActiveArrow({ newKind: "elbow" })}
                    title="Elbow 90° Connector (↳)"
                    style={{ minWidth: 26 }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 6 H14 V18" />
                      <path d="M10 14 L14 18 L18 14" />
                    </svg>
                  </button>
                </div>

                {/* Arrowhead Style Selector */}
                <div className="draw-floating-anchor">
                  <button
                    type="button"
                    className="draw-canva-pill-btn"
                    onClick={() => setFloatingPopover(p => p === "arrowHead" ? null : "arrowHead")}
                    title="Arrowhead Style"
                  >
                    <span style={{ fontSize: 11, fontWeight: 600 }}>
                      {activeObjProps.arrowHead === "both" ? "↔ Both" : activeObjProps.arrowHead === "circle-arrow" ? "•→ Dot" : activeObjProps.arrowHead === "none" ? "— Line" : "→ End"}
                    </span>
                  </button>
                  {floatingPopover === "arrowHead" && (
                    <div className="draw-floating-popover" style={{ left: 0, width: 145 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "var(--text-muted)" }}>
                        Arrowhead
                      </div>
                      {[
                        { id: "end", label: "→ End Arrow" },
                        { id: "both", label: "↔ Both Ends" },
                        { id: "circle-arrow", label: "•→ Dot & Arrow" },
                        { id: "none", label: "— Plain Line" }
                      ].map(h => (
                        <button
                          key={h.id}
                          type="button"
                          className={`draw-tb${activeObjProps.arrowHead === h.id ? " draw-on" : ""}`}
                          onClick={() => { modifyActiveArrow({ newHead: h.id }); setFloatingPopover(null); }}
                          style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px", marginBottom: 2 }}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Curvature / Bend Slider & Presets (if curved) */}
                {activeObjProps.connectorKind === "curved" && (
                  <div className="draw-floating-anchor">
                    <button
                      type="button"
                      className="draw-canva-pill-btn"
                      onClick={() => setFloatingPopover(p => p === "curvature" ? null : "curvature")}
                      title="Curve Bend & Arc Angle"
                    >
                      <Sliders size={12} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Arc: {activeObjProps.bend || -35}</span>
                    </button>
                    {floatingPopover === "curvature" && (
                      <div className="draw-floating-popover" style={{ left: 0, width: 200 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)" }}>
                            Curvature Bend
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{activeObjProps.bend || -35}px</span>
                        </div>
                        <input
                          type="range"
                          min={-90}
                          max={90}
                          step={5}
                          value={activeObjProps.bend != null ? activeObjProps.bend : -35}
                          onChange={(e) => modifyActiveArrow({ newBend: Number(e.target.value) })}
                          style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer", marginBottom: 8 }}
                        />
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                          Arc Presets
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
                          <button className="draw-tb" onClick={() => modifyActiveArrow({ newBend: -60 })} style={{ fontSize: 10 }}>Deep Up</button>
                          <button className="draw-tb" onClick={() => modifyActiveArrow({ newBend: -30 })} style={{ fontSize: 10 }}>Arc Up</button>
                          <button className="draw-tb" onClick={() => modifyActiveArrow({ newBend: 0 })} style={{ fontSize: 10 }}>Flat</button>
                          <button className="draw-tb" onClick={() => modifyActiveArrow({ newBend: 30 })} style={{ fontSize: 10 }}>Arc Down</button>
                          <button className="draw-tb" onClick={() => modifyActiveArrow({ newBend: 60 })} style={{ fontSize: 10 }}>Deep Down</button>
                          <button className="draw-tb" onClick={() => modifyActiveArrow({ newBend: (activeObjProps.bend || -35) * -1 })} style={{ fontSize: 10 }}>Flip ⇄</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reverse / Flip Direction */}
                <button
                  type="button"
                  className="draw-tb"
                  onClick={() => modifyActiveArrow({ flipDirection: true })}
                  title="Reverse Arrow Direction (⇄)"
                  style={{ minWidth: 26 }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>⇄</span>
                </button>

                {/* Connection status badge */}
                {activeObjProps.isSmartConnector ? (
                  <button
                    type="button"
                    className="draw-canva-pill-btn"
                    onClick={() => modifyActiveArrow({ detach: true })}
                    title="Connected to Shapes. Click to Detach."
                    style={{ color: "#2563eb", background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.28)" }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>🔗 Linked (Detach)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="draw-canva-pill-btn"
                    onClick={() => modifyActiveArrow({ snapToNearest: true })}
                    title="Snap endpoints to nearest shapes"
                  >
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Snap to Shapes</span>
                  </button>
                )}
              </>
            )}

            {/* Multi-Selection Connect Shapes Tool */}
            {activeObjProps.multiSelectCount >= 2 && (
              <div className="draw-floating-anchor">
                <button
                  type="button"
                  className="draw-canva-pill-btn"
                  onClick={() => setFloatingPopover(p => p === "multiConnect" ? null : "multiConnect")}
                  title="Connect selected shapes with smart arrow"
                  style={{ background: "#3b82f6", color: "#fff", border: "none", fontWeight: 700, padding: "4px 10px" }}
                >
                  <span>Connect Shapes ▾</span>
                </button>
                {floatingPopover === "multiConnect" && (
                  <div className="draw-floating-popover" style={{ left: 0, width: 175 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "var(--text-muted)" }}>
                      Smart Connector
                    </div>
                    <button
                      type="button"
                      className="draw-tb"
                      onClick={() => { connectSelectedShapes("straight"); setFloatingPopover(null); }}
                      style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px", marginBottom: 2 }}
                    >
                      → Straight Arrow
                    </button>
                    <button
                      type="button"
                      className="draw-tb"
                      onClick={() => { connectSelectedShapes("curved"); setFloatingPopover(null); }}
                      style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px", marginBottom: 2 }}
                    >
                      ↷ Curved Process Arrow
                    </button>
                    <button
                      type="button"
                      className="draw-tb"
                      onClick={() => { connectSelectedShapes("elbow"); setFloatingPopover(null); }}
                      style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px" }}
                    >
                      ↳ 90° Step Connector
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Flowchart Step Spawner */}
            {activeObjProps.isFlowchartShape && activeObjProps.multiSelectCount === 1 && (
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <button
                  type="button"
                  className="draw-canva-pill-btn"
                  onClick={() => addNextConnectedStep("process")}
                  title="Add connected next step card"
                  style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: 700 }}
                >
                  + Next Step
                </button>
                <button
                  type="button"
                  className="draw-canva-pill-btn"
                  onClick={() => addNextConnectedStep("decision")}
                  title="Add connected decision branch"
                  style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", fontWeight: 700 }}
                >
                  + Decision
                </button>
              </div>
            )}

            <div className="draw-bar-subdivider" />

            {/* Opacity Slider Popover */}
            <div className="draw-floating-anchor">
              <button
                type="button"
                className="draw-canva-pill-btn"
                onClick={() => setFloatingPopover(p => p === "opacity" ? null : "opacity")}
                title="Transparency / Opacity"
              >
                <Sliders size={13} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{activeObjProps.opacity}%</span>
              </button>
              {floatingPopover === "opacity" && (
                <div className="draw-floating-popover" style={{ left: "50%", transform: "translateX(-50%)", width: 170 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)" }}>
                      Opacity
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{activeObjProps.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={activeObjProps.opacity}
                    onChange={(e) => applyActiveOpacity(+e.target.value)}
                    style={{ width: "100%", accentColor: "#a855f7", cursor: "pointer" }}
                  />
                </div>
              )}
            </div>

            {/* Layer Arrange Popover */}
            <div className="draw-floating-anchor">
              <button
                type="button"
                className="draw-canva-pill-btn"
                onClick={() => setFloatingPopover(p => p === "arrange" ? null : "arrange")}
                title="Position / Arrange Layer"
              >
                <Layers2 size={13} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>Position</span>
              </button>
              {floatingPopover === "arrange" && (
                <div className="draw-floating-popover" style={{ right: 0, width: 145 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: "var(--text-muted)" }}>
                    Layer Order
                  </div>
                  <button className="draw-tb" onClick={() => { arrangeActive("forward"); setFloatingPopover(null); }} style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px", marginBottom: 2 }}>
                    Forward
                  </button>
                  <button className="draw-tb" onClick={() => { arrangeActive("backward"); setFloatingPopover(null); }} style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px", marginBottom: 2 }}>
                    Backward
                  </button>
                  <button className="draw-tb" onClick={() => { arrangeActive("front"); setFloatingPopover(null); }} style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px", marginBottom: 2 }}>
                    To Front
                  </button>
                  <button className="draw-tb" onClick={() => { arrangeActive("back"); setFloatingPopover(null); }} style={{ width: "100%", justifyContent: "flex-start", fontSize: 11, padding: "5px 7px" }}>
                    To Back
                  </button>
                </div>
              )}
            </div>

            <div className="draw-bar-subdivider" />

            {/* Quick Actions: Duplicate, Lock, Delete */}
            <button className="draw-tb" onClick={() => fabricRef.current?.duplicateSelection?.()} title="Duplicate (Ctrl+D)">
              <CopyPlus size={14} />
            </button>
            <button className="draw-tb" onClick={toggleActiveLock} title={activeObjProps.isLocked ? "Unlock Object" : "Lock Object"}>
              {activeObjProps.isLocked ? <Lock size={14} style={{ color: "#f5a623" }} /> : <Unlock size={14} />}
            </button>
            <button className="draw-tb" onClick={deleteSelected} style={{ color: "#e0365a" }} title="Delete (Del)">
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          (canAlign || showFontSize || showTextAlign) && (
            <div className="draw-contextual-bar" style={{ position: "absolute", left: 10, top: 10, zIndex: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {showFontSize && (
                <div style={{ display: "flex", gap: 4, alignItems: "center", background: "var(--surface-h)", padding: "3px 8px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <button className="draw-tb" onClick={() => applyFontSize(fontSize - 1)} title="Font Size -">
                    <Minus size={16} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    ref={fontSizeInputRef}
                    value={fontSizeInput}
                    onChange={(e) => {
                      const val = sanitizeIntegerInput(e.target.value);
                      setFontSizeInput(val);
                      if (val !== "") applyFontSize(Number(val), false);
                    }}
                    onBlur={(e) => commitFontSizeInput(e.target.value)}
                    style={{ width: 58, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "inherit" }}
                  />
                  <button className="draw-tb" onClick={() => applyFontSize(fontSize + 1)} title="Font Size +">
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {canAlign && (
                <div style={{ display: "flex", gap: 2, alignItems: "center", background: "var(--surface-h)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <button className="draw-tb" onClick={() => handleAlign("left")} title="Align Left">
                    <AlignStartHorizontal size={15} />
                  </button>
                  <button className="draw-tb" onClick={() => handleAlign("centerH")} title="Center Horizontally">
                    <AlignCenterHorizontal size={15} />
                  </button>
                  <button className="draw-tb" onClick={() => handleAlign("right")} title="Align Right">
                    <AlignEndHorizontal size={15} />
                  </button>
                  <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />
                  <button className="draw-tb" onClick={() => handleAlign("top")} title="Align Top">
                    <AlignStartVertical size={15} />
                  </button>
                  <button className="draw-tb" onClick={() => handleAlign("middleV")} title="Center Vertically">
                    <AlignCenterVertical size={15} />
                  </button>
                  <button className="draw-tb" onClick={() => handleAlign("bottom")} title="Align Bottom">
                    <AlignEndVertical size={15} />
                  </button>
                </div>
              )}
            </div>
          )
        )}
        {ctxMenu && (
          <div
            ref={ctxMenuRef}
            style={{
              position: "absolute",
              left: ctxMenu.x,
              top: ctxMenu.y,
              zIndex: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
              width: 140,
              minWidth: 0,
              padding: 6
            }}
          >
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 3, padding: "5px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}
              disabled={!canCopy}
              onClick={() => { fabricRef.current?.copySelection?.(); setCtxMenu(null); }}
            >
              <Copy size={14} />
              Copy
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 3, padding: "5px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}
              disabled={!canPaste}
              onClick={() => { fabricRef.current?.pasteSelection?.(); setCtxMenu(null); }}
            >
              <ClipboardPaste size={14} />
              Paste
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 3, padding: "5px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}
              disabled={!canCopy}
              onClick={() => { fabricRef.current?.duplicateSelection?.(); setCtxMenu(null); }}
            >
              <CopyPlus size={14} />
              Duplicate
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 3, padding: "5px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}
              disabled={!canCopy}
              onClick={() => { fabricRef.current?.deleteSelection?.(); setCtxMenu(null); }}
            >
              <Trash2 size={14} />
              Delete
            </button>
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 3, padding: "5px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}
              disabled={!canGroup}
              onClick={() => { fabricRef.current?.groupSelection?.(); setCtxMenu(null); }}
            >
              <Layers size={14} />
              Group
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 3, padding: "5px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}
              disabled={!canUngroup}
              onClick={() => { fabricRef.current?.ungroupSelection?.(); setCtxMenu(null); }}
            >
              <Ungroup size={14} />
              Ungroup
            </button>
            {canAlign && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 6px" }}>
                  Align
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: "2px" }}>
                  <button className="draw-tb" onClick={() => { handleAlign("left"); setCtxMenu(null); }} title="Align Left">
                    <AlignStartHorizontal size={13} />
                  </button>
                  <button className="draw-tb" onClick={() => { handleAlign("centerH"); setCtxMenu(null); }} title="Center Horizontally">
                    <AlignCenterHorizontal size={13} />
                  </button>
                  <button className="draw-tb" onClick={() => { handleAlign("right"); setCtxMenu(null); }} title="Align Right">
                    <AlignEndHorizontal size={13} />
                  </button>
                  <button className="draw-tb" onClick={() => { handleAlign("top"); setCtxMenu(null); }} title="Align Top">
                    <AlignStartVertical size={13} />
                  </button>
                  <button className="draw-tb" onClick={() => { handleAlign("middleV"); setCtxMenu(null); }} title="Center Vertically">
                    <AlignCenterVertical size={13} />
                  </button>
                  <button className="draw-tb" onClick={() => { handleAlign("bottom"); setCtxMenu(null); }} title="Align Bottom">
                    <AlignEndVertical size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <div style={{ 
          width: "100%", overflow: "hidden", overscrollBehavior: "auto", resize: "vertical", minHeight: MIN_H, maxHeight: MAX_H, boxSizing: "border-box",
          borderRadius: 20, border: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(244,246,250,0.98), rgba(236,239,245,0.92))", padding: "12px", flex: 1, minWidth: 0,
          display: "flex", justifyContent: "center", alignItems: "flex-start",
          touchAction: "none"
        }} className={`draw-board-shell ${gridMode !== "none" ? `draw-grid-${gridMode}` : ""}`} ref={boardRef}>
          <div style={{ boxShadow: "0 18px 38px rgba(15,23,42,0.12)", width: "fit-content", margin: 0, borderRadius: 16, overflow: "hidden" }}>
            <div className={`draw-canvas-host ${gridMode !== "none" ? `draw-grid-${gridMode}` : ""}`} ref={canvasHostRef} />
          </div>
        </div>

        {layersOpen && !useExternalLayers && narrow && (
          <>
            <div onClick={() => setLayersOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", borderRadius: 20 }} />
            <div style={{ position: "absolute", right: 0, top: 0, width: 280, zIndex: 5, boxShadow: "0 18px 42px rgba(15,23,42,0.22)", maxHeight: isMobile ? "60vh" : "none", overflowY: "auto" }}>
              {layersPanel(true)}
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, textAlign: "right", fontStyle: "italic" }}>
        Canva Mode: [Del] deletes, Arrow keys nudge (Alt+Arrows align), [M] toggles magnet snap, [G] toggles grid, [Ctrl+D] duplicates, Double-click text to edit.
      </p>
    </div>
  );
}
