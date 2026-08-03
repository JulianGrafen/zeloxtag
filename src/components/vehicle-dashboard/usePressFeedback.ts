"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

/**
 * Apple-ähnliches Press-Feedback via Pointer-Events.
 * Uses pointer capture so `pressed` never sticks after share sheets,
 * navigation, or scroll interrupts (common iOS hang).
 */
export function usePressFeedback() {
  const [pressed, setPressed] = useState(false);
  const pointerId = useRef<number | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
    pointerId.current = null;
    setPressed(false);
  }, []);

  useEffect(() => () => clear(), [clear]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;

      const target = event.currentTarget;
      if (
        target instanceof HTMLButtonElement &&
        target.disabled
      ) {
        return;
      }
      if (target.getAttribute("aria-disabled") === "true") return;

      pointerId.current = event.pointerId;

      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Some environments reject capture; release still works via up/cancel.
      }

      setPressed(true);

      // Hard failsafe — never leave a control visually stuck.
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      safetyTimer.current = setTimeout(() => {
        clear();
      }, 900);
    },
    [clear],
  );

  const release = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        pointerId.current !== null &&
        event.pointerId !== pointerId.current
      ) {
        return;
      }

      try {
        if (
          pointerId.current !== null &&
          event.currentTarget.hasPointerCapture?.(pointerId.current)
        ) {
          event.currentTarget.releasePointerCapture(pointerId.current);
        }
      } catch {
        // ignore
      }

      clear();
    },
    [clear],
  );

  return {
    pressed,
    pressProps: {
      onPointerDown,
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: clear,
      onBlur: clear,
      "data-pressed": pressed ? "true" : undefined,
    } as const,
  };
}
