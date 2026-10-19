import { CapacitorNativeBridgeAdapter } from "@/services/platform/native-bridge/adapters/capacitor-native-bridge-adapter";
import { WebNativeBridgeAdapter } from "@/services/platform/native-bridge/adapters/web-native-bridge-adapter";
import type { INativeBridgeService } from "@/services/platform/native-bridge/native-bridge-service";
import type { PlatformSnapshot } from "@/services/platform/types";

export function createNativeBridgeService(
  snapshot: PlatformSnapshot,
): INativeBridgeService {
  if (snapshot.isNativeApp) {
    return new CapacitorNativeBridgeAdapter();
  }
  return new WebNativeBridgeAdapter();
}
