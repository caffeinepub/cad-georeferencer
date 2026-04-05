import { Toaster } from "@/components/ui/sonner";
import { FileX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CadViewer } from "./components/CadViewer";
import { ControlPointsSidebar } from "./components/ControlPointsSidebar";
import { MapViewer } from "./components/MapViewer";
import { UploadZone } from "./components/UploadZone";
import { useControlPoints } from "./hooks/useControlPoints";
import { parseDxf } from "./utils/dxfRenderer";
import type { DxfData } from "./utils/dxfRenderer";

type AppState = "upload" | "workspace";

export default function App() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [filename, setFilename] = useState("");
  const [dxfData, setDxfData] = useState<DxfData | null>(null);
  const [parseError, setParseError] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const {
    points,
    pickingState,
    pendingCadCoord,
    isAddMode,
    startAddMode,
    stopAddMode,
    onCadClick,
    onMapClick,
    updateMapPoint,
    onUpdateAllMapPoints,
    deletePoint,
    undoLastPoint,
    clearAll,
  } = useControlPoints();

  const handleFileLoaded = async (content: string, name: string) => {
    setFilename(name);
    setIsParsing(true);
    setParseError(false);

    try {
      const parsed = await parseDxf(content);
      setDxfData(parsed);
      if (parsed.entities.length === 0) {
        toast.warning(
          "File parsed but no entities found. The drawing may be empty.",
        );
      } else {
        toast.success(`Loaded ${parsed.entities.length} entities`);
      }
    } catch {
      setDxfData(null);
      setParseError(true);
      toast.error(
        "Could not parse DXF file. You can still add control points manually.",
      );
    }

    setIsParsing(false);
    setAppState("workspace");
  };

  const handleNewFile = () => {
    setAppState("upload");
    setDxfData(null);
    setParseError(false);
    setFilename("");
    clearAll();
  };

  useEffect(() => {
    document.title =
      appState === "workspace"
        ? `${filename} — CAD Georeferencer`
        : "CAD Georeferencer";
  }, [appState, filename]);

  return (
    <>
      <AnimatePresence mode="wait">
        {appState === "upload" ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <UploadZone onFileLoaded={handleFileLoaded} />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full"
            style={{ background: "#0d1b2a" }}
          >
            <header
              className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0"
              style={{ height: 44 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-primary/60 flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-label="CAD Georeferencer"
                    role="img"
                    className="text-primary"
                  >
                    <path
                      d="M3 3h18v18H3V3z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path
                      d="M7 12h10M14 7l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  CAD Georeferencer
                </span>
              </div>

              <div className="flex items-center gap-2 max-w-sm overflow-hidden">
                <FileX className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {filename}
                </span>
                {isParsing && (
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <button
                type="button"
                data-ocid="header.new_file_button"
                onClick={handleNewFile}
                className="text-xs font-mono text-muted-foreground hover:text-primary border border-border hover:border-primary/50 px-3 py-1 rounded-sm transition-colors"
              >
                New File
              </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-secondary/30 border-b border-border flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    CAD Viewer
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CadViewer
                    dxf={dxfData}
                    parseError={parseError}
                    pickingState={pickingState}
                    points={points}
                    pendingCadCoord={pendingCadCoord}
                    onCadClick={onCadClick}
                    isAddMode={isAddMode}
                    onStartAddMode={startAddMode}
                    onStopAddMode={stopAddMode}
                    onUndoLastPoint={undoLastPoint}
                    onDeletePoint={deletePoint}
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-secondary/30 border-b border-border flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    Map Viewer
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <MapViewer
                    pickingState={pickingState}
                    points={points}
                    dxfData={dxfData}
                    onMapClick={onMapClick}
                    onUpdateMapPoint={updateMapPoint}
                    onUpdateAllMapPoints={onUpdateAllMapPoints}
                    onClearAll={clearAll}
                  />
                </div>
              </div>

              <ControlPointsSidebar
                points={points}
                pickingState={pickingState}
                filename={filename}
                onDeletePoint={deletePoint}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="fixed bottom-0 left-0 right-0 flex justify-center py-1 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <p className="text-[10px] text-muted-foreground/40 font-mono">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="hover:text-primary transition-colors pointer-events-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </div>

      <Toaster />
    </>
  );
}
