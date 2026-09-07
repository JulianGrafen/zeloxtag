import "server-only";

import {
  isAccountInDeletionGrace,
  logAccountExportDownloaded,
} from "@/lib/account/account-lifecycle";
import {
  collectAccountStoragePaths,
  type AccountStorageManifest,
  zipEntryNameForStorageRef,
} from "@/lib/account/collect-account-storage-paths";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createStoreZip, type ZipEntry } from "@/lib/zip/store-zip";
import type { Document, Tag, Vehicle, VehicleEvent } from "@/types/database";

async function loadExportPayload(userId: string): Promise<AccountStorageManifest> {
  const admin = createAdminClient();
  const { data: vehicles, error: vehiclesError } = await admin
    .from("vehicles")
    .select("*")
    .eq("user_id", userId);
  if (vehiclesError) {
    throw new Error(`vehicles load failed: ${vehiclesError.message}`);
  }

  const vehicleRows = (vehicles ?? []) as Vehicle[];
  const vehicleIds = vehicleRows.map((vehicle) => vehicle.id);

  let documents: Document[] = [];
  let events: VehicleEvent[] = [];
  let tags: Tag[] = [];

  if (vehicleIds.length > 0) {
    const [docsResult, eventsResult, tagsResult] = await Promise.all([
      admin.from("documents").select("*").in("vehicle_id", vehicleIds),
      admin.from("vehicle_events").select("*").in("vehicle_id", vehicleIds),
      admin.from("tags").select("*").in("vehicle_id", vehicleIds),
    ]);

    if (docsResult.error) {
      throw new Error(`documents load failed: ${docsResult.error.message}`);
    }
    if (eventsResult.error) {
      throw new Error(`events load failed: ${eventsResult.error.message}`);
    }
    if (tagsResult.error) {
      throw new Error(`tags load failed: ${tagsResult.error.message}`);
    }

    documents = (docsResult.data ?? []) as Document[];
    events = (eventsResult.data ?? []) as VehicleEvent[];
    tags = (tagsResult.data ?? []) as Tag[];
  }

  return {
    exportedAt: new Date().toISOString(),
    userId,
    vehicles: vehicleRows,
    tags,
    events,
    documents,
  };
}

async function downloadStorageObject(
  bucket: string,
  path: string,
): Promise<Uint8Array | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    console.error(
      `[export-account-archive] download failed ${bucket}/${path}`,
      error?.message,
    );
    return null;
  }
  return new Uint8Array(await data.arrayBuffer());
}

export type BuildAccountArchiveResult =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; code: "not_in_grace" | "unconfigured" | "error"; message: string };

export async function buildAccountArchiveZip(
  userId: string,
): Promise<BuildAccountArchiveResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      code: "unconfigured",
      message: "Supabase ist nicht konfiguriert.",
    };
  }

  if (!(await isAccountInDeletionGrace(userId))) {
    return {
      ok: false,
      code: "not_in_grace",
      message:
        "Der Datenexport ist nur während der 30-tägigen Löschfrist verfügbar.",
    };
  }

  try {
    const manifest = await loadExportPayload(userId);
    const storageRefs = collectAccountStoragePaths({
      vehicles: manifest.vehicles,
      documents: manifest.documents,
    });

    const entries: ZipEntry[] = [
      {
        name: "manifest.json",
        data: JSON.stringify(manifest, null, 2),
      },
    ];

    for (const ref of storageRefs) {
      const bytes = await downloadStorageObject(ref.bucket, ref.path);
      if (!bytes) continue;
      entries.push({
        name: zipEntryNameForStorageRef(ref),
        data: bytes,
      });
    }

    const buffer = createStoreZip(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `zeloxtag-export-${stamp}.zip`;

    await logAccountExportDownloaded(userId);

    return { ok: true, buffer, filename };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export fehlgeschlagen.";
    console.error("[export-account-archive] failed", message);
    return { ok: false, code: "error", message };
  }
}
