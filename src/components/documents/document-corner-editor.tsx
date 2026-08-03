"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clampQuadToBounds,
  defaultDocumentCorners,
  type Point2D,
  type QuadPoints,
} from "@/lib/utils/perspective";

const CORNER_LABELS = ["OL", "OR", "UR", "UL"] as const;

interface DocumentCornerEditorProps {
  /** Source image already drawn to a canvas (working resolution). */
  sourceCanvas: HTMLCanvasElement;
  disabled?: boolean;
  onConfirm: (corners: QuadPoints) => void;
  onCancel: () => void;
}

type DragState = {
  index: number;
  pointerId: number;
};

/**
 * Interactive TL/TR/BR/BL corner picker for perspective correction.
 * Coordinates are stored in source-image space; UI maps via display scale.
 */
export function DocumentCornerEditor({
  sourceCanvas,
  disabled = false,
  onConfirm,
  onCancel,
}: DocumentCornerEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 1, height: 1 });
  const [corners, setCorners] = useState<QuadPoints>(() =>
    defaultDocumentCorners(sourceCanvas.width, sourceCanvas.height),
  );
  const dragRef = useRef<DragState | null>(null);

  const imageUrl = useMemo(
    () => sourceCanvas.toDataURL("image/jpeg", 0.85),
    [sourceCanvas],
  );

  useEffect(() => {
    setCorners(defaultDocumentCorners(sourceCanvas.width, sourceCanvas.height));
  }, [sourceCanvas]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const update = () => {
      const rect = frame.getBoundingClientRect();
      setDisplaySize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [sourceCanvas]);

  const scaleX = displaySize.width / sourceCanvas.width;
  const scaleY = displaySize.height / sourceCanvas.height;

  const toDisplay = useCallback(
    (point: Point2D) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }),
    [scaleX, scaleY],
  );

  const polygonPoints = corners
    .map((point) => {
      const display = toDisplay(point);
      return `${display.x},${display.y}`;
    })
    .join(" ");

  function clientToImage(clientX: number, clientY: number): Point2D {
    const frame = frameRef.current;
    if (!frame) return { x: 0, y: 0 };
    const rect = frame.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * sourceCanvas.width,
      y: ((clientY - rect.top) / rect.height) * sourceCanvas.height,
    };
  }

  function onHandlePointerDown(
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { index, pointerId: event.pointerId };
  }

  function onHandlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextPoint = clientToImage(event.clientX, event.clientY);
    setCorners((current) => {
      const next = [...current] as QuadPoints;
      next[drag.index] = nextPoint;
      return clampQuadToBounds(
        next,
        sourceCanvas.width,
        sourceCanvas.height,
      );
    });
  }

  function onHandlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore — capture may already be released
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-3 shadow-[var(--vd-shadow-sm)]">
        <p className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
          Dokument zuschneiden
        </p>
        <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
          Ziehe die vier Ecken auf die Papierseiten — dann Perspektivkorrektur.
        </p>
      </div>

      <div
        ref={frameRef}
        className="relative mx-auto w-full max-h-[58vh] overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-neutral-900 touch-none select-none"
        style={{
          aspectRatio: `${sourceCanvas.width} / ${sourceCanvas.height}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Aufnahme für Zuschnitt"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          draggable={false}
        />

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <mask id="doc-crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <polygon points={polygonPoints} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.45)"
            mask="url(#doc-crop-mask)"
          />
          <polygon
            points={polygonPoints}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={2}
          />
        </svg>

        {corners.map((point, index) => {
          const display = toDisplay(point);
          return (
            <button
              key={CORNER_LABELS[index]}
              type="button"
              aria-label={`Ecke ${CORNER_LABELS[index]}`}
              disabled={disabled}
              className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-[0.65rem] font-semibold tracking-wide text-white shadow-lg active:scale-95"
              style={{ left: display.x, top: display.y }}
              onPointerDown={(event) => onHandlePointerDown(index, event)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            >
              <span className="pointer-events-none h-2.5 w-2.5 rounded-full bg-white" />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setCorners(
              defaultDocumentCorners(sourceCanvas.width, sourceCanvas.height),
            );
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Zurücksetzen
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onConfirm(corners)}
        >
          <Check className="h-4 w-4" aria-hidden />
          Zuschneiden
        </Button>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onCancel}
        className="w-full text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
      >
        Anderes Foto wählen
      </button>
    </div>
  );
}
