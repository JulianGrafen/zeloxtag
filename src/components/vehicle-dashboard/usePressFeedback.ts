"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent,
} from "react";

const RELEASE_FALLBACK_MS = 600;

/**
 * Apple-ähnliches Press-Feedback via Pointer-Events.
 * Zuverlässiger als :active auf iOS/Mobile.
 *
 * Hardened against stuck `data-pressed` (lost pointerup during scroll,
 * view transitions, or navigation unmount).
 */
export function usePressFeedback() {
  const [pressed, setPressed] = useState(false);
  const pointerId = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallback = useCallback(() => {
    if (fallbackTimer.current !== null) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, []);

  const release = useCallback(() => {
    clearFallback();
    const node = targetRef.current;
    const id = pointerId.current;
    if (node && id !== null) {
      try {
        if (node.hasPointerCapture?.(id)) {
          node.releasePointerCapture(id);
        }
      } catch {
        // ignore — capture may already be gone after navigation
      }
    }
    pointerId.current = null;
    targetRef.current = null;
    setPressed(false);
  }, [clearFallback]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;

      // Avoid stacking stuck presses across rapid taps.
      release();

      pointerId.current = event.pointerId;
      targetRef.current = event.currentTarget;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some environments disallow capture — still show pressed state.
      }

      setPressed(true);
      clearFallback();
      fallbackTimer.current = setTimeout(() => {
        release();
      }, RELEASE_FALLBACK_MS);
    },
    [clearFallback, release],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        pointerId.current !== null &&
        event.pointerId !== pointerId.current
      ) {
        return;
      }
      release();
    },
    [release],
  );

  const onLostPointerCapture = useCallback(() => {
    release();
  }, [release]);

  const onVisibilityHide = useEffectEvent(() => {
    if (document.visibilityState === "hidden") {
      release();
    }
  });

  useEffect(() => {
    const onWindowBlur = () => release();
    const onVisibility = () => onVisibilityHide();

    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibility);
    // Global safety net if a pointerup never reaches the element.
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    return () => {
      clearFallback();
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [clearFallback, onVisibilityHide, release]);

  return {
    pressed,
    pressProps: {
      onPointerDown,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture,
      "data-pressed": pressed ? "true" : undefined,
    } as const,
  };
}
