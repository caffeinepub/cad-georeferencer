import { Expand, Hand, MapPin, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PickingState } from "../hooks/useControlPoints";
import type { DxfData } from "../utils/dxfRenderer";
import { renderDxf, renderGrid } from "../utils/dxfRenderer";
import type { ControlPoint } from "../utils/wld3";

type ActiveTool = "pan" | "zoom-box" | "add-points";

const TOOL_STORAGE_KEY = "cad-tool";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function fitBounds(
  canvasW: number,
  canvasH: number,
  bounds: DxfData["bounds"],
): { tx: number; ty: number; scale: number } {
  const dxfW = bounds.maxX - bounds.minX || 1;
  const dxfH = bounds.maxY - bounds.minY || 1;
  const padding = 0.9;
  const scale = Math.min(
    (canvasW * padding) / dxfW,
    (canvasH * padding) / dxfH,
  );
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const tx = canvasW / 2 - cx * scale;
  const ty = canvasH / 2 + cy * scale;
  return { tx, ty, scale };
}

interface CadViewerProps {
  dxf: DxfData | null;
  parseError: boolean;
  pickingState: PickingState;
  points: ControlPoint[];
  pendingCadCoord: { x: number; y: number } | null;
  onCadClick: (x: number, y: number) => void;
  isAddMode: boolean;
  onStartAddMode: () => void;
  onStopAddMode: () => void;
}

export function CadViewer({
  dxf,
  parseError,
  pickingState,
  points,
  pendingCadCoord,
  onCadClick,
  isAddMode,
  onStartAddMode,
  onStopAddMode,
}: CadViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const txRef = useRef(0);
  const tyRef = useRef(0);
  const scaleRef = useRef(1);

  const [renderTick, setRenderTick] = useState(0);
  const bumpRender = useCallback(() => setRenderTick((n) => n + 1), []);

  const [activeTool, setActiveTool] = useState<ActiveTool>(() => {
    const stored = localStorage.getItem(TOOL_STORAGE_KEY);
    if (stored === "pan" || stored === "zoom-box") return stored;
    return "pan";
  });

  const isDragging = useRef(false);
  const isMiddleMousePan = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const zoomBoxStart = useRef<{ x: number; y: number } | null>(null);
  const [zoomBoxRect, setZoomBoxRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const animFrameRef = useRef<number | null>(null);

  const setActiveTool_ = useCallback((tool: ActiveTool) => {
    setActiveTool(tool);
    if (tool !== "add-points") {
      localStorage.setItem(TOOL_STORAGE_KEY, tool);
    }
  }, []);

  // Sync activeTool when isAddMode changes externally (e.g. stopAddMode called)
  useEffect(() => {
    if (!isAddMode && activeTool === "add-points") {
      setActiveTool("pan");
    }
  }, [isAddMode, activeTool]);

  const toCanvas = useCallback(
    (wx: number, wy: number) => ({
      x: wx * scaleRef.current + txRef.current,
      y: -wy * scaleRef.current + tyRef.current,
    }),
    [],
  );

  const toWorld = useCallback(
    (cx: number, cy: number) => ({
      x: (cx - txRef.current) / scaleRef.current,
      y: -(cy - tyRef.current) / scaleRef.current,
    }),
    [],
  );

  const fitToExtent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dxf) return;
    const f = fitBounds(canvas.width, canvas.height, dxf.bounds);
    txRef.current = f.tx;
    tyRef.current = f.ty;
    scaleRef.current = f.scale;
    bumpRender();
  }, [dxf, bumpRender]);

  const animateTo = useCallback(
    (targetTx: number, targetTy: number, targetScale: number) => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      const startTx = txRef.current;
      const startTy = tyRef.current;
      const startScale = scaleRef.current;
      const startTime = performance.now();
      const duration = 400;

      const step = (now: number) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const e = easeOut(t);
        txRef.current = startTx + (targetTx - startTx) * e;
        tyRef.current = startTy + (targetTy - startTy) * e;
        scaleRef.current = startScale + (targetScale - startScale) * e;
        bumpRender();
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(step);
    },
    [bumpRender],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: renderTick intentionally triggers re-render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;

    renderGrid(ctx, width, height);

    if (dxf && !parseError) {
      renderDxf(ctx, dxf, { toCanvas });

      const allPins = points.map((p) => ({
        id: p.id,
        cadX: p.cadX,
        cadY: p.cadY,
      }));
      if (pendingCadCoord) {
        allPins.push({
          id: -1,
          cadX: pendingCadCoord.x,
          cadY: pendingCadCoord.y,
        });
      }

      for (const pin of allPins) {
        const pos = toCanvas(pin.cadX, pin.cadY);
        drawPin(ctx, pos.x, pos.y, pin.id === -1 ? "?" : String(pin.id));
      }
    } else if (parseError) {
      ctx.save();
      ctx.font = "14px JetBrains Mono";
      ctx.fillStyle = "rgba(0, 212, 255, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText(
        "Could not parse file — manual coordinate entry available",
        width / 2,
        height / 2,
      );
      ctx.restore();
    }
  }, [dxf, parseError, points, pendingCadCoord, toCanvas, renderTick]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      bumpRender();
    });
    observer.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    return () => observer.disconnect();
  }, [bumpRender]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when dxf identity changes
  useEffect(() => {
    if (dxf) fitToExtent();
  }, [dxf]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = clamp(scaleRef.current * factor, 0.001, 500);
      const ratio = newScale / scaleRef.current;
      txRef.current = mouseX - (mouseX - txRef.current) * ratio;
      tyRef.current = mouseY - (mouseY - tyRef.current) * ratio;
      scaleRef.current = newScale;
      bumpRender();
    },
    [bumpRender],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        isMiddleMousePan.current = true;
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button !== 0) return;

      if (activeTool === "pan") {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      } else if (activeTool === "zoom-box") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        zoomBoxStart.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
      // add-points: click handled in handleClick
    },
    [activeTool],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        txRef.current += dx;
        tyRef.current += dy;
        bumpRender();
        return;
      }

      if (activeTool === "zoom-box" && zoomBoxStart.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        const sx = zoomBoxStart.current.x;
        const sy = zoomBoxStart.current.y;
        setZoomBoxRect({
          left: Math.min(sx, curX),
          top: Math.min(sy, curY),
          width: Math.abs(curX - sx),
          height: Math.abs(curY - sy),
        });
      }
    },
    [activeTool, bumpRender],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        isMiddleMousePan.current = false;
        return;
      }

      if (activeTool === "zoom-box" && zoomBoxStart.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const curX = e.clientX - rect.left;
          const curY = e.clientY - rect.top;
          const sx = zoomBoxStart.current.x;
          const sy = zoomBoxStart.current.y;
          const boxW = Math.abs(curX - sx);
          const boxH = Math.abs(curY - sy);

          if (boxW > 5 && boxH > 5) {
            const boxLeft = Math.min(sx, curX);
            const boxTop = Math.min(sy, curY);
            const wTL = toWorld(boxLeft, boxTop);
            const wBR = toWorld(boxLeft + boxW, boxTop + boxH);
            const worldW = Math.abs(wBR.x - wTL.x) || 1;
            const worldH = Math.abs(wBR.y - wTL.y) || 1;
            const padding = 0.9;
            const newScale = clamp(
              Math.min(
                (canvas.width * padding) / worldW,
                (canvas.height * padding) / worldH,
              ),
              0.001,
              500,
            );
            const worldCx = (wTL.x + wBR.x) / 2;
            const worldCy = (wTL.y + wBR.y) / 2;
            const newTx = canvas.width / 2 - worldCx * newScale;
            const newTy = canvas.height / 2 + worldCy * newScale;
            animateTo(newTx, newTy, newScale);
          }
        }
        zoomBoxStart.current = null;
        setZoomBoxRect(null);
      }
    },
    [activeTool, toWorld, animateTo],
  );

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    isMiddleMousePan.current = false;
    if (zoomBoxStart.current) {
      zoomBoxStart.current = null;
      setZoomBoxRect(null);
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "add-points") return;
      if (pickingState !== "waiting-cad") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const world = toWorld(cx, cy);
      onCadClick(world.x, world.y);
    },
    [activeTool, pickingState, toWorld, onCadClick],
  );

  const getCursor = () => {
    if (activeTool === "pan") return isDragging.current ? "grabbing" : "grab";
    if (activeTool === "zoom-box") return "crosshair";
    if (activeTool === "add-points") return "crosshair";
    return "default";
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#0d1b2a" }}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: canvas interaction requires mouse events */}
      <canvas
        ref={canvasRef}
        data-ocid="cad.canvas_target"
        className="block w-full h-full"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {zoomBoxRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: zoomBoxRect.left,
            top: zoomBoxRect.top,
            width: zoomBoxRect.width,
            height: zoomBoxRect.height,
            border: "1.5px solid #00d4ff",
            background: "rgba(0,212,255,0.06)",
          }}
        />
      )}

      {/* Floating toolbar — top left */}
      <div
        data-ocid="cad.toolbar.panel"
        className="absolute top-3 left-3 flex flex-col gap-1 p-1 rounded-md"
        style={{
          background: "rgba(13,27,42,0.88)",
          border: "1px solid rgba(0,212,255,0.18)",
          backdropFilter: "blur(6px)",
        }}
      >
        <ToolButton
          ocid="cad.pan_tool.button"
          label="Pan"
          active={activeTool === "pan"}
          onClick={() => {
            setActiveTool_("pan");
            onStopAddMode();
          }}
        >
          <Hand size={14} />
        </ToolButton>
        <ToolButton
          ocid="cad.zoombox_tool.button"
          label="Zoom Box"
          active={activeTool === "zoom-box"}
          onClick={() => {
            setActiveTool_("zoom-box");
            onStopAddMode();
          }}
        >
          <Maximize2 size={14} />
        </ToolButton>
        <ToolButton
          ocid="cad.add_points.button"
          label="Add Control Points"
          active={activeTool === "add-points"}
          onClick={() => {
            setActiveTool_("add-points");
            onStartAddMode();
          }}
        >
          <MapPin size={14} />
        </ToolButton>
        <div
          style={{
            height: 1,
            background: "rgba(0,212,255,0.18)",
            margin: "2px 4px",
          }}
        />
        <ToolButton
          ocid="cad.fit_extent.button"
          label="Fit to Extent"
          active={false}
          onClick={fitToExtent}
        >
          <Expand size={14} />
        </ToolButton>
      </div>

      {activeTool === "add-points" && pickingState === "waiting-cad" && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1.5 rounded-sm pointer-events-none"
          style={{ background: "rgba(0,212,255,0.9)", color: "#0d1b2a" }}
        >
          Click CAD drawing to place point
        </div>
      )}
      {activeTool === "add-points" && pickingState === "waiting-map" && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1.5 rounded-sm pointer-events-none"
          style={{ background: "rgba(255,200,0,0.9)", color: "#0d1b2a" }}
        >
          Now click the map to match this point
        </div>
      )}
    </div>
  );
}

function ToolButton({
  ocid,
  label,
  active,
  onClick,
  children,
}: {
  ocid: string;
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      title={label}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors duration-150"
      style={{
        background: active ? "#00d4ff" : "transparent",
        color: active ? "#0d1b2a" : "rgba(0,212,255,0.7)",
      }}
    >
      {children}
    </button>
  );
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
) {
  const r = 11;
  ctx.save();
  ctx.shadowColor = "#00d4ff";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#00d4ff";
  ctx.fill();
  ctx.strokeStyle = "#0d1b2a";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0d1b2a";
  ctx.font = "bold 10px JetBrains Mono";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  ctx.restore();
}
