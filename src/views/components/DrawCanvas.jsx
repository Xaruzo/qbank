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
  X
} from "lucide-react";

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
  const resizeScrollRef = useRef({ lastH: 0, active: false, lastChange: 0, raf: 0 });
  const fontCommitTimer = useRef(null);
  const textLiveTimer = useRef(null);
  const changeCommitTimer = useRef(null);
  const keyboardMoveCommitTimer = useRef(null);
  const [tool, setTool] = useState("move");
  const [color, setColor] = useState("#1a2540");
  const [size, setSize] = useState(2);
  const [height, setHeight] = useState(360);
  const [layersVersion, setLayersVersion] = useState(0);
  const [activeLayerIds, setActiveLayerIds] = useState([]);
  const [fontSize, setFontSize] = useState(24);
  const [fontSizeInput, setFontSizeInput] = useState("24");
  const [isNarrow, setIsNarrow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);
  const ctxMenuRef = useRef(null);
  const layerDragRef = useRef(null);
  const dragJustEndedRef = useRef(false);
  const MIN_H = 260;
  const MAX_H = 2000;
  const BASE_W = 820;
  const HR_LINE_THICKNESS = 2;
  const FONT_SIZE_MIN = 8;
  const FONT_SIZE_MAX = 120;
  
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
  const sanitizeIntegerInput = (value) => String(value ?? "").replace(/[^\d]/g, "");
  const clampFontSizeValue = (value) => Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(value)));
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
      lastPointer.current = canvas.getPointer(ev);
    });
    canvas.on("mouse:up", () => {
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
      canvas.zoomToPoint(point, clampZoom(nextZoom));
      canvas.requestRenderAll();
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

    const handleContextMenu = (ev) => {
      try {
        ev.preventDefault();
      } catch {}
      try {
        const p = canvas.getPointer(ev);
        lastPointer.current = p;
      } catch {}
      let target = null;
      try {
        target = canvas.findTarget(ev, true);
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
      const x = rect ? ev.clientX - rect.left : ev.clientX;
      const y = rect ? ev.clientY - rect.top : ev.clientY;
      setCtxMenu({ x: Math.max(8, x), y: Math.max(8, y) });
    };

    const ctxEl = canvas.upperCanvasEl || canvasEl;
    ctxEl?.addEventListener?.("contextmenu", handleContextMenu);

    const ensureLayerId = (obj) => {
      if (!obj || obj.isGuide) return;
      configureTextObj(obj);
      configureHrLine(obj);
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
      if (obj.fractionId) return null;
      const center = typeof obj.getCenterPoint === "function" ? obj.getCenterPoint() : null;
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
      if (center) {
        tb.setPositionByOrigin(center, "center", "center");
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

    function saveHistory() {
      if (isInternalChange.current) return;
      history.current.push(JSON.stringify(canvas.toJSON()));
      if (history.current.length > 50) history.current.shift();
      redoStack.current = []; // Clear redo on new action
    }

    const handleChange = () => {
      saveHistory();
      const guides = canvas.getObjects().filter(o => o.isGuide);
      if (guides.length) {
        guides.forEach(g => canvas.remove(g));
        canvas.renderAll();
      }
      const state = canvas.toJSON();
      const dataURL = canvas.toDataURL({ format: 'png', quality: 0.8 });
      onChange({ state, dataURL });
    };

    const handleLiveChange = () => {
      if (isInternalChange.current) return;
      const guides = canvas.getObjects().filter(o => o.isGuide);
      if (guides.length) {
        guides.forEach(g => canvas.remove(g));
        canvas.renderAll();
      }
      const state = canvas.toJSON();
      const dataURL = canvas.toDataURL({ format: 'png', quality: 0.8 });
      onChange({ state, dataURL });
    };

    const scheduleLiveChange = () => {
      if (textLiveTimer.current) window.clearTimeout(textLiveTimer.current);
      textLiveTimer.current = window.setTimeout(() => {
        textLiveTimer.current = null;
        handleLiveChange();
      }, 160);
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
      if (!e.target._fromUndo && !e.target.isGuide) scheduleCommitChange();
    });
    canvas.on("object:modified", (e) => {
      const t = e.target;
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
    canvas.on("selection:created", (e) => { logHrLineSelection(e); refreshUI(); });
    canvas.on("selection:updated", (e) => { logHrLineSelection(e); refreshUI(); });
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

      // Ensure fraction stays together during movement
      if (obj.fractionId) {
        syncFraction(obj);
      }

      if (nativeEvent?.altKey) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const w = obj.getScaledWidth();
      const h = obj.getScaledHeight();
      let center = obj.getCenterPoint();

      const setCenter = (cx, cy) => {
        center = new fabric.Point(Math.round(cx), Math.round(cy));
        obj.setPositionByOrigin(center, "center", "center");
        obj.setCoords();
        // If part of a fraction, sync the other parts after snapping
        if (obj.fractionId) syncFraction(obj);
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
      canvas.requestRenderAll();
      refreshUI();
      scheduleKeyboardMoveCommit();
      return true;
    };

    canvas.on("object:moving", (options) => {
      applyMoveGuides(options.target, options?.e);
    });

    canvas.on("object:scaling", (options) => {
      const obj = options.target;
      clearGuides();

      if (options?.e?.altKey) return;

      const corner = options?.transform?.corner || "";
      const isTextbox = obj?.type === "textbox" && !obj.isGuide;
      if ((isTextObj(obj) || isHrLine(obj)) && !obj.isGuide) obj.__scaleCorner = corner;
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
      if (anchorOrigin && anchorPoint && (isTextObj(obj) || isHrLine(obj)) && !obj.isGuide) {
        obj.__resizeAnchor = { corner, originX: anchorOrigin.originX, originY: anchorOrigin.originY, x: anchorPoint.x, y: anchorPoint.y };
      }
      const resizeAnchorPoint = (anchorOrigin && (isTextObj(obj) || isHrLine(obj)) && obj.__resizeAnchor)
        ? new fabric.Point(obj.__resizeAnchor.x, obj.__resizeAnchor.y)
        : anchorPoint;

      const candidates = [];
      canvas.getObjects().forEach((other) => {
        if (other === obj || other.isGuide) return;
        if (obj.fractionId && other.fractionId === obj.fractionId) return;
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

    canvas.on("object:moving", (e) => syncFraction(e.target));
    canvas.on("text:changed", (e) => {
      syncFraction(e.target);
      if (!e?.target?.isGuide) scheduleLiveChange();
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
      if (!e.target._fromUndo && !e.target.isGuide) scheduleCommitChange();
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
        const dataURL = canvas.toDataURL({ format: 'png', quality: 0.8 });
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
        const dataURL = canvas.toDataURL({ format: 'png', quality: 0.8 });
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

    const zoomBy = (factor) => {
      const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
      zoomToPoint(center, canvas.getZoom() * factor);
    };
    const resetZoom = () => {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.requestRenderAll();
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

      if (e.code === "Space" && !isTyping && !isEditingText) {
        spaceDownRef.current = true;
        e.preventDefault();
        return;
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
      } else if ((e.key === "Delete" || e.key === "Backspace") && !e.target.tagName.match(/INPUT|TEXTAREA/)) {
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

    fabricRef.current.performUndo = performUndo;
    fabricRef.current.performRedo = performRedo;
    fabricRef.current.copySelection = copySelection;
    fabricRef.current.pasteSelection = pasteSelection;
    fabricRef.current.deleteSelection = deleteSelection;
    fabricRef.current.duplicateSelection = duplicateSelection;
    fabricRef.current.groupSelection = groupSelection;
    fabricRef.current.ungroupSelection = ungroupSelection;

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      ctxEl?.removeEventListener?.("contextmenu", handleContextMenu);
      if (keyboardMoveCommitTimer.current) window.clearTimeout(keyboardMoveCommitTimer.current);
      if (textLiveTimer.current) window.clearTimeout(textLiveTimer.current);
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
    const onKeyDown = (e) => {
      if (e.key === "Escape") setCtxMenu(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ctxMenu]);

  // Update tool settings
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    const isPan = tool === "pan";
    canvas.isDrawingMode = (tool === "pen" || tool === "eraser");
    canvas.selection = (!canvas.isDrawingMode && tool === "move");
    canvas.selectionKey = "shiftKey";
    canvas.skipTargetFind = isPan;
    
    if (canvas.isDrawingMode || isPan) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      if (tool === "eraser") {
        canvas.freeDrawingBrush.color = "#ffffff";
        canvas.freeDrawingBrush.width = size * 7;
      } else {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = size;
      }
      canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
    } else {
      canvas.forEachObject(obj => { obj.selectable = true; obj.evented = true; });
    }

    // Set cursors
    if (tool === "pen") canvas.defaultCursor = 'crosshair';
    else if (tool === "eraser") canvas.defaultCursor = 'cell';
    else if (tool === "pan") canvas.defaultCursor = 'grab';
    else canvas.defaultCursor = 'default';

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
      if (h > resizeScroll.lastH + 1) {
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
    if (obj.type === "path") return "Pen";
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
      strokeWidth: 5,
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
  const canCopy = selectionCount > 0;
  const canPaste = !!(clipboardData.current?.objects?.length || clipboardClone.current || clipboard.current);
  const canGroup = activeCanvasObj?.type === "activeSelection";
  const canUngroup = activeCanvasObj?.type === "group";
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
    <div style={{ width: "100%", borderRadius: 8, border: "2px solid var(--border)", background: "var(--surface-h)", padding: 10, height: useExternalLayers ? "100%" : boardHeight, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Layers</div>
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
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  outline: isOver ? "2px solid #f5a623" : (isActive ? "2px solid #a855f7" : "none"),
                  outlineOffset: -1,
                  background: isOver ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.04)",
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
                        padding: "6px 10px",
                        borderRadius: 8,
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
        <div className="draw-bar-group" style={{ display: "flex", background: "var(--surface-h)", padding: "3px", borderRadius: "8px", gap: "2px" }}>
          <button className={`draw-tb${tool === "pen" ? " draw-on" : ""}`} onClick={() => setTool("pen")} title="Draw with Pen">
            <Pencil size={16} />
          </button>
          <button className={`draw-tb${tool === "move" ? " draw-on" : ""}`} onClick={() => setTool("move")} title="Select & Move Objects">
            <MousePointer2 size={16} />
          </button>
          <button className={`draw-tb${tool === "pan" ? " draw-on" : ""}`} onClick={() => setTool("pan")} title="Pan Canvas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 2l-2 2m2-2l2 2M12 22l-2-2m2 2l2-2M2 12l2-2m-2 2l2 2M22 12l-2-2m2 2l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addText} title="Add Text Layer">
            <Type size={16} />
          </button>
          <button className="draw-tb" onClick={addHrLine} title="Add Rotatable Horizontal Line">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="5" cy="12" r="2" fill="currentColor" />
              <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="19" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addVrLine} title="Add Rotatable Vertical Line">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="5" r="2" fill="currentColor" />
              <path d="M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="19" r="2" fill="currentColor" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addLine} title="Add Short Line (Fraction)">
            <Minus size={16} />
          </button>
          <button className="draw-tb" onClick={addSquare} title="Add Square Shape">
            <Square size={16} />
          </button>
          <button className="draw-tb" onClick={addRectangle} title="Add Rectangle Shape">
            <span style={{ display: "inline-block", width: 18, height: 12, border: "2px solid currentColor", borderRadius: 3 }} />
          </button>
          <button className="draw-tb" onClick={addCircle} title="Add Circle Shape">
            <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid currentColor", borderRadius: 9999 }} />
          </button>
          <button className="draw-tb" onClick={addTriangle} title="Add Triangle Shape">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 4 L21 20 H3 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addStar} title="Add Star Shape">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 L15.1 8.6 L22 9.3 L17 13.9 L18.5 21 L12 17.4 L5.5 21 L7 13.9 L2 9.3 L8.9 8.6 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addOblong} title="Add Oblong (Butterfly Method)">
            <span style={{ display: "inline-block", width: 18, height: 10, border: "2px solid currentColor", borderRadius: 9999 }} />
          </button>
          <button className="draw-tb" onClick={addTrayShape} title="Add Tray Shape">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 5 V18 H19 V5" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addRoofShape} title="Add Roof Shape">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 17 L12 7 L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="draw-tb" onClick={addFraction} title="Add Fraction (Auto-layout)">
            <Divide size={16} />
          </button>
          <button className={`draw-tb${tool === "eraser" ? " draw-on" : ""}`} onClick={() => setTool("eraser")} title="Eraser (Brush)">
            <Eraser size={16} />
          </button>
        </div>
        
        <div className="draw-bar-group" style={{ display: "flex", gap: 4, alignItems: "center", background: "var(--surface-h)", padding: "3px 8px", borderRadius: "8px" }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => { 
              setColor(c); 
              const active = fabricRef.current?.getActiveObject();
              if (active) {
                if (isTextObj(active)) active.set('fill', c);
                else if (active.type === 'path') active.set('stroke', c);
                else if (isHrLine(active) && active.type === 'line') active.set('stroke', c);
                else if (active.type === 'rect') {
                  if (active.shapeKind === 'hrLine' || active.height <= 5) active.set('fill', c);
                  else active.set('stroke', c);
                }
                else if (active.type === 'circle' || active.type === 'triangle' || active.type === 'polygon') {
                  active.set('stroke', c);
                }
                fabricRef.current.requestRenderAll();
                commitCanvasChange(active);
              }
            }}
              style={{
                width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer", flexShrink: 0,
                border: color === c ? "2px solid #fff" : "1px solid rgba(0,0,0,0.1)",
                boxShadow: color === c ? "0 0 0 2px #f5a623" : "none"
              }}
            />
          ))}
          <div style={{ width: "1px", height: "20px", background: "var(--border)", margin: "0 4px" }} />
          <input type="range" min={1} max={20} value={size} onChange={e => setSize(+e.target.value)}
            style={{ width: 50, accentColor: "#f5a623" }} />
        </div>

        <div className="draw-bar-group" style={{ display: "flex", background: "var(--surface-h)", padding: "3px", borderRadius: "8px", gap: "2px" }}>
          <button className="draw-tb draw-tb-lg" onClick={() => addSymbol("+")} title="Plus">+</button>
          <button className="draw-tb draw-tb-lg" onClick={() => addSymbol("-")} title="Minus">-</button>
          <button className="draw-tb draw-tb-lg" onClick={() => addSymbol("×")} title="Multiply">×</button>
          <button className="draw-tb draw-tb-lg" onClick={() => addSymbol("÷")} title="Divide">÷</button>
          <button className="draw-tb draw-tb-lg" onClick={() => addSymbol("=")} title="Equal">=</button>
        </div>

        <div className="draw-bar-group" style={{ display: "flex", gap: 4, background: "var(--surface-h)", padding: "3px", borderRadius: "8px" }}>
          <button className="draw-tb" onClick={moveForward} title="Bring Forward">
            <ChevronUp size={16} />
          </button>
          <button className="draw-tb" onClick={moveBackward} title="Send Backward">
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="draw-bar-group" style={{ display: "flex", gap: 4, background: "var(--surface-h)", padding: "3px", borderRadius: "8px" }}>
          <button className="draw-tb" onClick={() => fabricRef.current?.groupSelection?.()} disabled={!canGroup} title="Group">
            Group
          </button>
          <button className="draw-tb" onClick={() => fabricRef.current?.ungroupSelection?.()} disabled={!canUngroup} title="Ungroup">
            Ungroup
          </button>
        </div>

        <div className="draw-bar-group" style={{ display: "flex", gap: 4, background: "var(--surface-h)", padding: "3px", borderRadius: "8px" }}>
          <button className="draw-tb" onClick={() => bumpBoardHeight(200)} title="Add Space Below">
            <Plus size={16} />
          </button>
          <button className="draw-tb" onClick={() => bumpBoardHeight(-200)} title="Remove Space Below">
            <Minus size={16} />
          </button>
        </div>
        
        <div className="draw-bar-group" style={{ marginLeft: narrow ? 0 : "auto", display: "flex", gap: 4 }}>
          {narrow && (
            <button className="draw-tb" onClick={() => setLayersOpen(o => !o)} title={layersOpen ? "Hide Layers" : "Show Layers"}>
              {layersOpen ? <X size={16} /> : <span style={{ fontSize: 12, padding: "0 4px" }}>Layers</span>}
            </button>
          )}
          <button className="draw-tb" onClick={deleteSelected} style={{ color: "#e0365a" }} title="Delete Selected (Del)">
            <Trash2 size={16} />
          </button>
          <button className="draw-tb" onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
          <button className="draw-tb" onClick={redo} title="Redo (Ctrl+Y)">
            <Redo2 size={16} />
          </button>
          <button className="draw-tb" onClick={clear} style={{ color: "#e0365a" }} title="Clear All">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {useExternalLayers ? createPortal(layersPanel(false), layersHost) : null}

      <div style={{ position: "relative" }} ref={menuHostRef}>
        {(showFontSize || showTextAlign) && (
          <div style={{ position: "absolute", left: 10, top: 10, zIndex: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitFontSizeInput(e.currentTarget.value);
                      e.currentTarget.blur();
                    } else if (e.key === "Escape") {
                      setFontSizeInput(String(fontSize));
                      e.currentTarget.blur();
                    }
                  }}
                  style={{ width: 58, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "inherit" }}
                />
                <button className="draw-tb" onClick={() => applyFontSize(fontSize + 1)} title="Font Size +">
                  <Plus size={16} />
                </button>
              </div>
            )}

            {showTextAlign && (
              <div style={{ display: "flex", gap: 2, alignItems: "center", background: "var(--surface-h)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <button className={`draw-tb${activeTextAlign === "left" ? " draw-on" : ""}`} onClick={() => applyTextAlign("left")} title="Align Left">
                  <AlignLeft size={16} />
                </button>
                <button className={`draw-tb${activeTextAlign === "center" ? " draw-on" : ""}`} onClick={() => applyTextAlign("center")} title="Align Center">
                  <AlignCenter size={16} />
                </button>
                <button className={`draw-tb${activeTextAlign === "right" ? " draw-on" : ""}`} onClick={() => applyTextAlign("right")} title="Align Right">
                  <AlignRight size={16} />
                </button>
                <button className={`draw-tb${activeTextAlign === "justify" ? " draw-on" : ""}`} onClick={() => applyTextAlign("justify")} title="Justify">
                  <AlignJustify size={16} />
                </button>
              </div>
            )}
          </div>
        )}
        {ctxMenu && (
          <div
            ref={ctxMenuRef}
            style={{
              position: "absolute",
              left: ctxMenu.x,
              top: ctxMenu.y,
              zIndex: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 6,
              boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
              minWidth: 160
            }}
          >
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
              disabled={!canCopy}
              onClick={() => { fabricRef.current?.copySelection?.(); setCtxMenu(null); }}
            >
              Copy
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
              disabled={!canPaste}
              onClick={() => { fabricRef.current?.pasteSelection?.(); setCtxMenu(null); }}
            >
              Paste
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
              disabled={!canCopy}
              onClick={() => { fabricRef.current?.duplicateSelection?.(); setCtxMenu(null); }}
            >
              Duplicate
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
              disabled={!canCopy}
              onClick={() => { fabricRef.current?.deleteSelection?.(); setCtxMenu(null); }}
            >
              Delete
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
              disabled={!canGroup}
              onClick={() => { fabricRef.current?.groupSelection?.(); setCtxMenu(null); }}
            >
              Group
            </button>
            <button
              className="draw-tb"
              style={{ width: "100%", textAlign: "left" }}
              disabled={!canUngroup}
              onClick={() => { fabricRef.current?.ungroupSelection?.(); setCtxMenu(null); }}
            >
              Ungroup
            </button>
          </div>
        )}
        <div style={{ 
          width: "100%", overflow: "hidden", overscrollBehavior: "auto", resize: "vertical", minHeight: MIN_H, maxHeight: MAX_H, boxSizing: "border-box",
          borderRadius: 8, border: "2px solid var(--border)",
          background: "#f0f0f0", padding: "10px", flex: 1, minWidth: 0,
          display: "flex", justifyContent: "center", alignItems: "flex-start",
          touchAction: "none"
        }} ref={boardRef}>
          <div style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.1)", width: "fit-content", margin: 0 }}>
            <div ref={canvasHostRef} />
          </div>
        </div>

        {!useExternalLayers && narrow && layersOpen && (
          <>
            <div onClick={() => setLayersOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", borderRadius: 8 }} />
            <div style={{ position: "absolute", right: 0, top: 0, width: 280, zIndex: 5, boxShadow: "0 8px 22px rgba(0,0,0,0.25)" }}>
              {layersPanel(true)}
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 7, textAlign: "right", fontStyle: "italic" }}>
        Canva Mode: [Del] deletes, Arrow keys nudge, [Shift]+Arrow moves 10px, Double-click text to edit.
      </p>
    </div>
  );
}
