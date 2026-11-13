import { describe, it, expect } from "vitest";
import {
  toHighlighterColor,
  computeResponsiveBoardSize,
  computeFloatingBarPosition,
  computeViewportInsertPoint,
  clampCanvasHeight,
  findBestConnection,
  buildStraightArrowPath,
  buildCurvedArrowPath,
  buildElbowConnectorPath,
  distToSegment,
  CUSTOM_FABRIC_PROPS,
} from "../src/utils/canvas/canvasMath";

describe("canvasMath", () => {
  it("converts dark ink colors to translucent yellow highlighter and preserves custom colors", () => {
    expect(toHighlighterColor("#1a2540")).toBe("rgba(250, 204, 21, 0.44)");
    expect(toHighlighterColor("#000000")).toBe("rgba(250, 204, 21, 0.44)");
    expect(toHighlighterColor("#3b82f6")).toBe("rgba(59, 130, 246, 0.36)");
  });

  it("includes all critical custom Fabric properties for Undo/Redo and JSON persistence", () => {
    const required = [
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
    for (const prop of required) {
      expect(CUSTOM_FABRIC_PROPS).toContain(prop);
    }
  });

  it("clamps canvas height between 500 and 2400", () => {
    expect(clampCanvasHeight(200)).toBe(500);
    expect(clampCanvasHeight(3000)).toBe(2400);
    expect(clampCanvasHeight(950.4)).toBe(950);
  });

  it("scales logical 820px artboard proportionally on narrow tablet and mobile viewports", () => {
    const desktop = computeResponsiveBoardSize(1100, 820, 700);
    expect(desktop.displayWidth).toBe(820);
    expect(desktop.displayHeight).toBe(700);
    expect(desktop.scale).toBe(1);

    const mobile = computeResponsiveBoardSize(350, 820, 700);
    expect(mobile.displayWidth).toBe(350);
    expect(mobile.scale).toBeCloseTo(350 / 820, 4);
    expect(mobile.displayHeight).toBe(Math.round(700 * (350 / 820)));
  });

  it("positions and clamps floating selection bar across desktop and mobile bounds", () => {
    const nearTop = computeFloatingBarPosition({
      boundLeft: 100,
      boundTop: 10,
      boundWidth: 140,
      boundHeight: 60,
      scale: 1,
      artboardOffsetX: 20,
      artboardOffsetY: 12,
      hostWidth: 860,
      hostHeight: 720,
    });
    expect(nearTop.isNearTop).toBe(true);
    expect(nearTop.top).toBeGreaterThanOrEqual(82);

    const mobileBar = computeFloatingBarPosition({
      boundLeft: 20,
      boundTop: 200,
      boundWidth: 100,
      boundHeight: 50,
      scale: 0.45,
      artboardOffsetX: 8,
      artboardOffsetY: 8,
      hostWidth: 360,
      hostHeight: 400,
    });
    expect(mobileBar.left).toBe(180);
    expect(mobileBar.top).toBeGreaterThanOrEqual(8);
  });

  it("computes viewport insert coordinates respecting zoom and pan transform", () => {
    const defaultPt = computeViewportInsertPoint(820, 700, [1, 0, 0, 1, 0, 0], 2);
    expect(defaultPt).toEqual({ x: 410, y: 310 });

    const pannedPt = computeViewportInsertPoint(820, 700, [2, 0, 0, 2, -400, -200], 2);
    expect(pannedPt).toEqual({ x: 405, y: 255 });
  });

  it("connects nearest ports between two shapes and builds SVG connector paths", () => {
    const conn = findBestConnection(
      { left: 50, top: 100, width: 100, height: 60 },
      { left: 250, top: 100, width: 100, height: 60 }
    );
    expect(conn).not.toBeNull();
    expect(conn?.nameA).toBe("right");
    expect(conn?.nameB).toBe("left");

    const straight = buildStraightArrowPath(150, 130, 250, 130, "end");
    expect(straight).toContain("M 150 130 L 250 130");

    const curved = buildCurvedArrowPath(150, 130, 250, 130, -35, "both");
    expect(curved.d).toContain("Q ");

    const elbow = buildElbowConnectorPath(150, 130, 250, 200, "circle-arrow");
    expect(elbow).toContain("M 150 130 L 200 130 L 200 200 L 250 200");
  });

  it("computes point-to-segment distance accurately for eraser hit-testing", () => {
    expect(distToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3, 5);
    expect(distToSegment(14, 0, 0, 0, 10, 0)).toBeCloseTo(4, 5);
  });
});
