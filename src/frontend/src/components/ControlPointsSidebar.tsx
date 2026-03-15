import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, MapPin, Trash2 } from "lucide-react";
import type { PickingState } from "../hooks/useControlPoints";
import type { ControlPoint } from "../utils/wld3";
import { computeAffine, downloadWld3, generateWld3 } from "../utils/wld3";

const MARKER_COLOR = "#FF8C00";

interface ControlPointsSidebarProps {
  points: ControlPoint[];
  pickingState: PickingState;
  filename: string;
  onDeletePoint: (id: number) => void;
}

export function ControlPointsSidebar({
  points,
  pickingState,
  filename,
  onDeletePoint,
}: ControlPointsSidebarProps) {
  const canDownload = points.length >= 3;

  const handleDownload = () => {
    const params = computeAffine(points);
    if (!params) return;
    const content = generateWld3(params);
    const baseName = filename.replace(/\.[^.]+$/, "");
    downloadWld3(content, `${baseName}.wld3`);
  };

  const statusMessages: Record<PickingState, string> = {
    idle: "Ready",
    "waiting-cad": "Click CAD drawing…",
    "waiting-map": "Click map…",
  };

  return (
    <div
      data-ocid="sidebar.panel"
      className="flex flex-col h-full bg-card border-l border-border"
      style={{ width: 280, minWidth: 280 }}
    >
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground tracking-wider uppercase flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" style={{ color: MARKER_COLOR }} />
            Georeference Data
          </h2>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
            {points.length}
          </span>
        </div>

        <div
          className={`mt-2 flex items-center gap-2 text-xs font-mono
          ${pickingState === "idle" ? "text-muted-foreground" : ""}`}
          style={pickingState !== "idle" ? { color: MARKER_COLOR } : {}}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              pickingState === "idle" ? "bg-muted" : "animate-pulse"
            }`}
            style={pickingState !== "idle" ? { background: MARKER_COLOR } : {}}
          />
          {statusMessages[pickingState]}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {points.length === 0 ? (
            <div
              className="text-center py-8"
              data-ocid="sidebar.point.empty_state"
            >
              <div className="text-muted-foreground text-xs font-mono leading-relaxed">
                <p>No control points yet.</p>
                <p className="mt-1" style={{ color: `${MARKER_COLOR}aa` }}>
                  Use the Pin tool in
                </p>
                <p style={{ color: `${MARKER_COLOR}aa` }}>
                  the CAD viewer to add points.
                </p>
                <p className="mt-2" style={{ color: `${MARKER_COLOR}66` }}>
                  3 points needed for export.
                </p>
              </div>
            </div>
          ) : (
            points.map((p, idx) => (
              <div
                key={p.id}
                data-ocid={`sidebar.point.item.${idx + 1}`}
                className="bg-secondary/50 border border-border rounded p-2.5 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: MARKER_COLOR,
                        boxShadow: `0 0 6px ${MARKER_COLOR}66`,
                      }}
                    >
                      <span
                        className="text-[9px] font-bold font-mono"
                        style={{ color: "#1a0a00" }}
                      >
                        {p.id}
                      </span>
                    </div>
                    <span className="text-foreground text-xs font-semibold">
                      Point {p.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-ocid={`sidebar.point.delete_button.${idx + 1}`}
                    onClick={() => onDeletePoint(p.id)}
                    className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-muted-foreground font-mono uppercase tracking-wider"
                      style={{ fontSize: 10 }}
                    >
                      CAD
                    </span>
                    <span
                      className="font-mono font-bold text-foreground"
                      style={{ fontSize: 18 }}
                    >
                      {p.cadX.toFixed(2)}, {p.cadY.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-muted-foreground font-mono uppercase tracking-wider"
                      style={{ fontSize: 10 }}
                    >
                      Map
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ fontSize: 18, color: MARKER_COLOR }}
                    >
                      {p.mapLat.toFixed(5)}, {p.mapLng.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border space-y-2">
        <Button
          data-ocid="sidebar.download_button"
          onClick={handleDownload}
          disabled={!canDownload}
          size="sm"
          className="w-full gap-2"
          style={
            canDownload
              ? {
                  background: MARKER_COLOR,
                  color: "#1a0a00",
                  boxShadow: `0 0 10px ${MARKER_COLOR}44`,
                }
              : {}
          }
        >
          <Download className="w-3.5 h-3.5" />
          Download .wld3
        </Button>

        {!canDownload && (
          <p className="text-center text-[10px] font-mono text-muted-foreground">
            {3 - points.length} more point{3 - points.length !== 1 ? "s" : ""}{" "}
            needed
          </p>
        )}
      </div>
    </div>
  );
}
