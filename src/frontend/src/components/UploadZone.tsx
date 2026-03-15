import { FileType, Info, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UploadZoneProps {
  onFileLoaded: (content: string, filename: string) => void;
}

export function UploadZone({ onFileLoaded }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      const name = file.name.toLowerCase();
      if (!name.endsWith(".dxf") && !name.endsWith(".dwg")) {
        toast.error("Please upload a .dxf or .dwg file");
        return;
      }
      if (name.endsWith(".dwg")) {
        toast.warning(
          "DWG files may not parse correctly. DXF format recommended.",
        );
      }

      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoaded(content, file.name);
        setIsLoading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsLoading(false);
      };
      reader.readAsText(file);
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div className="min-h-screen blueprint-bg flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded border border-primary/60 flex items-center justify-center"
            style={{ boxShadow: "0 0 16px oklch(85% 0.22 195 / 0.3)" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-label="CAD Georeferencer"
              role="img"
              className="text-primary"
            >
              <path
                d="M3 3h18v18H3V3z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M7 7h4M7 12h10M7 17h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M14 7l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "#e8f4f8" }}
          >
            CAD Georeferencer
          </h1>
        </div>
        <p className="text-muted-foreground text-sm font-mono tracking-wider uppercase">
          Georeference CAD drawings and export WLD3 world files
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-2xl"
      >
        <label
          data-ocid="upload.dropzone"
          htmlFor="file-input"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded transition-all duration-200 p-16 text-center cursor-pointer group block
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-white/[0.02]"
            }`}
          style={
            isDragging
              ? { boxShadow: "0 0 30px oklch(85% 0.22 195 / 0.2)" }
              : {}
          }
        >
          <input
            id="file-input"
            data-ocid="upload.upload_button"
            type="file"
            accept=".dxf,.dwg"
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="flex flex-col items-center gap-5">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200
              ${isDragging ? "bg-primary/20" : "bg-secondary group-hover:bg-primary/10"}`}
            >
              {isLoading ? (
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload
                  className={`w-7 h-7 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}
                />
              )}
            </div>

            <div>
              <p className="text-foreground font-semibold text-lg mb-1">
                {isDragging ? "Release to upload" : "Drop your CAD file here"}
              </p>
              <p className="text-muted-foreground text-sm">
                or{" "}
                <span className="text-primary hover:underline cursor-pointer">
                  browse to select
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded border border-border">
              <FileType className="w-3 h-3" />
              <span>.DXF recommended · .DWG accepted</span>
            </div>
          </div>
        </label>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex items-start gap-2.5 bg-secondary/40 border border-border rounded p-3"
        >
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">
              DXF format required.
            </span>{" "}
            Convert <span className="font-mono text-primary">.dwg</span> to{" "}
            <span className="font-mono text-primary">.dxf</span> using AutoDesk
            tools first. DXF is an open format readable in the browser without
            additional software.
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-16 flex items-center gap-6 text-xs text-muted-foreground font-mono"
      >
        {["Pan & Zoom", "Click to Pick Points", "Export .wld3"].map(
          (step, i) => (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-border">→</span>}
              <span className="text-primary">
                {String(i + 1).padStart(2, "0")}.
              </span>
              <span>{step}</span>
            </div>
          ),
        )}
      </motion.div>
    </div>
  );
}
