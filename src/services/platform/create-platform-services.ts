"use client";

import { Capacitor } from "@capacitor/core";

import { createBillingService } from "@/services/platform/billing/create-billing-service";
import type { IBillingService } from "@/services/platform/billing/billing-service";
import { createNativeBridgeService } from "@/services/platform/native-bridge/create-native-bridge-service";
import type { INativeBridgeService } from "@/services/platform/native-bridge/native-bridge-service";
import {
  detectPlatformSnapshot,
  PlatformService,
} from "@/services/platform/platform-service";
import type { PlatformRuntimeInput } from "@/services/platform/types";

export type PlatformServices = {
  platform: PlatformService;
  billing: IBillingService;
  nativeBridge: INativeBridgeService;
};

export function readPlatformRuntimeInput(): PlatformRuntimeInput {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    userAgent,
    isNativePlatform: Capacitor.isNativePlatform(),
    nativePlatform: Capacitor.getPlatform(),
  };
}

export function createPlatformServices(
  runtime: PlatformRuntimeInput = readPlatformRuntimeInput(),
): PlatformServices {
  const snapshot = detectPlatformSnapshot(runtime);
  const platform = new PlatformService(snapshot);
  return {
    platform,
    billing: createBillingService(snapshot),
    nativeBridge: createNativeBridgeService(snapshot),
  };
}
