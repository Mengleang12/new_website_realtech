import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Trash2, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface SignatureCanvasProps {
  onChange?: (dataUrl: string, isEmpty: boolean) => void;
  height?: number;
  initialDataUrl?: string;
  readOnly?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onChange,
  height = 180,
  initialDataUrl,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<string>("#0f172a"); // Default dark ink
  const [penWidth, setPenWidth] = useState<number>(3);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // Redraw all strokes on canvas
  const renderStrokes = useCallback(
    (strokeList: Stroke[], ctx: CanvasRenderingContext2D, width: number, h: number) => {
      ctx.clearRect(0, 0, width, h);

      // Draw dashed guideline line
      ctx.save();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const lineY = h - 35;
      ctx.moveTo(30, lineY);
      ctx.lineTo(width - 30, lineY);
      ctx.stroke();

      // Sign here label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText("✍️ Sign above this line / ចុះហត្ថលេខានៅត្រង់នេះ", 32, lineY + 18);
      ctx.restore();

      // Draw all strokes
      strokeList.forEach((stroke) => {
        if (stroke.points.length < 1) return;
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (stroke.points.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length - 1; i++) {
            const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
            const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
          }
          const last = stroke.points[stroke.points.length - 1];
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
        }
        ctx.restore();
      });
    },
    []
  );

  // Resize canvas to parent width with high-DPI scaling
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      renderStrokes(strokes, ctx, w, h);
    }
  }, [height, strokes, renderStrokes]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeCanvas]);

  // Notify parent on change
  useEffect(() => {
    if (!onChange) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (strokes.length === 0) {
      setHasSignature(false);
      onChange("", true);
    } else {
      setHasSignature(true);
      // Generate clean PNG data URL
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl, false);
    }
  }, [strokes, onChange]);

  // Load initialDataUrl if provided and no strokes
  useEffect(() => {
    if (initialDataUrl && strokes.length === 0 && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasSignature(true);
        }
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  // Coordinate helper
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    const p = getCoordinates(e);
    if (!p) return;

    setIsDrawing(true);
    const newStroke: Stroke = {
      points: [p],
      color: penColor,
      width: penWidth,
    };
    setStrokes((prev) => [...prev, newStroke]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly) return;
    const p = getCoordinates(e);
    if (!p) return;

    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const lastIndex = prev.length - 1;
      const updatedStroke = {
        ...prev[lastIndex],
        points: [...prev[lastIndex].points, p],
      };
      const next = [...prev];
      next[lastIndex] = updatedStroke;

      // Immediate draw for ultra smooth responsiveness
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        if (ctx) {
          renderStrokes(next, ctx, rect.width, rect.height);
        }
      }

      return next;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      if (ctx) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        renderStrokes([], ctx, rect.width, rect.height);
      }
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        if (ctx) {
          renderStrokes(next, ctx, rect.width, rect.height);
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full rounded-xl border-2 border-dashed border-border/80 bg-background/80 hover:border-primary/50 transition-colors overflow-hidden select-none touch-none shadow-xs"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Live signature indicator badge */}
        <div className="absolute top-2.5 right-2.5 pointer-events-none">
          {hasSignature ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Check className="w-3 h-3" /> Signed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              <PenTool className="w-3 h-3" /> Awaiting Signature
            </span>
          )}
        </div>
      </div>

      {/* Signature Toolbar */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Pen Color & Width Toggles */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Pen Ink:</span>
            <button
              type="button"
              onClick={() => setPenColor("#0f172a")}
              className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-transform ${
                penColor === "#0f172a" ? "scale-110 border-primary ring-2 ring-primary/20" : "border-border"
              }`}
              title="Black Ink"
            />
            <button
              type="button"
              onClick={() => setPenColor("#1d4ed8")}
              className={`w-6 h-6 rounded-full bg-blue-700 border-2 transition-transform ${
                penColor === "#1d4ed8" ? "scale-110 border-primary ring-2 ring-primary/20" : "border-border"
              }`}
              title="Royal Blue Ink"
            />
            <div className="h-4 w-px bg-border mx-1" />
            <div className="flex items-center gap-1">
              {[
                { label: "Fine", width: 2 },
                { label: "Med", width: 3 },
                { label: "Bold", width: 4.5 },
              ].map((item) => (
                <button
                  key={item.width}
                  type="button"
                  onClick={() => setPenWidth(item.width)}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                    penWidth === item.width
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Undo & Clear Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="h-8 text-xs gap-1 px-2.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
