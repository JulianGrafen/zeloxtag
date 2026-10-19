"use client";

import { useCallback } from "react";

import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import type { HapticStyle } from "@/services/platform/native-bridge/types";

export function useIosHaptics() {
  const { nativeBridge } = usePlatformServices();

  const hapticLight = useCallback(() => {
    void nativeBridge.triggerHaptic("light");
  }, [nativeBridge]);

  const hapticMedium = useCallback(() => {
    void nativeBridge.triggerHaptic("medium");
  }, [nativeBridge]);

  const hapticSelection = useCallback(() => {
    void nativeBridge.triggerSelectionHaptic();
  }, [nativeBridge]);

  const haptic = useCallback(
    (style: HapticStyle) => {
      void nativeBridge.triggerHaptic(style);
    },
    [nativeBridge],
  );

  return { hapticLight, hapticMedium, hapticSelection, haptic };
}
