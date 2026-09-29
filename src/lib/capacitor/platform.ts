import { Capacitor } from "@capacitor/core";

export function isNativeCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

export function capacitorPlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}
