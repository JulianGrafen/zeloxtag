"use client";

import { ENGINE_SOUND_MAX_BYTES } from "@/lib/vehicles/engine-sound-constants";

/**
 * Soundcheck picked during onboarding, before the vehicle exists. Kept in
 * sessionStorage (≤ 2 MB raw ≈ 2.7 MB base64) and uploaded once the dashboard
 * mounts — same pattern as the pending vehicle photo.
 */
const PENDING_SOUND_KEY = "zlx-onboarding-pending-engine-sound";

type StoredSound = {
  base64: string;
  mime: string;
  name: string;
  durationSeconds: number | null;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function storePendingOnboardingEngineSound(
  file: File,
  durationSeconds: number | null,
): Promise<boolean> {
  if (typeof window === "undefined" || file.size > ENGINE_SOUND_MAX_BYTES) {
    return false;
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload: StoredSound = {
      base64: toBase64(bytes),
      mime: file.type || "audio/mpeg",
      name: file.name || "engine-sound",
      durationSeconds,
    };
    sessionStorage.setItem(PENDING_SOUND_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Quota exceeded or private mode: owner can still add it in Soundcheck later.
    return false;
  }
}

export function readPendingOnboardingEngineSound(): {
  file: File;
  durationSeconds: number | null;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SOUND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSound;
    if (!parsed.base64 || !parsed.mime) return null;
    const bytes = fromBase64(parsed.base64);
    return {
      file: new File([bytes.buffer as ArrayBuffer], parsed.name || "engine-sound", {
        type: parsed.mime,
        lastModified: Date.now(),
      }),
      durationSeconds: parsed.durationSeconds ?? null,
    };
  } catch {
    return null;
  }
}

export function clearPendingOnboardingEngineSound(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_SOUND_KEY);
  } catch {
    // ignore
  }
}

/**
 * Uploads a staged onboarding Soundcheck to the new vehicle. Returns true when
 * uploaded (or nothing was staged), false on failure — the file stays staged
 * so the next dashboard visit can retry.
 */
export async function flushPendingOnboardingEngineSound(input: {
  vehicleId: string;
  tagUuid?: string | null;
}): Promise<boolean> {
  const pending = readPendingOnboardingEngineSound();
  if (!pending) return true;

  const body = new FormData();
  body.append("vehicleId", input.vehicleId);
  const tagUuid = input.tagUuid?.trim();
  if (tagUuid) body.append("tagUuid", tagUuid);
  if (pending.durationSeconds != null) {
    body.append("durationSeconds", String(pending.durationSeconds));
  }
  body.append("file", pending.file, pending.file.name);

  try {
    const response = await fetch("/api/vehicle/engine-sound", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
    if (!response.ok) {
      // 4xx = file rejected for good (format/size) — drop it instead of retrying forever.
      if (response.status >= 400 && response.status < 500 && response.status !== 401) {
        clearPendingOnboardingEngineSound();
      }
      return false;
    }
    clearPendingOnboardingEngineSound();
    return true;
  } catch {
    return false;
  }
}
