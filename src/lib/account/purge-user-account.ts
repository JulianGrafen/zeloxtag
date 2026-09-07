import "server-only";

import {
  listAccountsDueForPurge,
  logAccountPurgeCompleted,
} from "@/lib/account/account-lifecycle";
import {
  collectAccountStoragePaths,
  type StorageObjectRef,
} from "@/lib/account/collect-account-storage-paths";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Document, Vehicle } from "@/types/database";

const STORAGE_REMOVE_BATCH = 100;

async function loadUserVehicles(userId: string): Promise<Vehicle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`vehicles load failed: ${error.message}`);
  }
  return (data ?? []) as Vehicle[];
}

async function loadUserDocuments(vehicleIds: string[]): Promise<Document[]> {
  if (vehicleIds.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("documents")
    .select("*")
    .in("vehicle_id", vehicleIds);
  if (error) {
    throw new Error(`documents load failed: ${error.message}`);
  }
  return (data ?? []) as Document[];
}

async function removeStorageObjects(refs: StorageObjectRef[]): Promise<void> {
  if (refs.length === 0) return;
  const admin = createAdminClient();
  const byBucket = new Map<string, string[]>();

  for (const ref of refs) {
    const paths = byBucket.get(ref.bucket) ?? [];
    paths.push(ref.path);
    byBucket.set(ref.bucket, paths);
  }

  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += STORAGE_REMOVE_BATCH) {
      const batch = paths.slice(i, i + STORAGE_REMOVE_BATCH);
      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) {
        console.error(
          `[purge-user-account] storage remove failed (${bucket})`,
          error.message,
        );
      }
    }
  }
}

async function unclaimTagsForVehicles(vehicleIds: string[]): Promise<void> {
  if (vehicleIds.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("tags")
    .update({ vehicle_id: null, status: "unclaimed" })
    .in("vehicle_id", vehicleIds);
  if (error) {
    throw new Error(`tag unclaim failed: ${error.message}`);
  }
}

async function deleteAuthUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`auth delete failed: ${error.message}`);
  }
}

export async function purgeUserAccount(
  userId: string,
  requestId?: string,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin is not configured.");
  }

  const vehicles = await loadUserVehicles(userId);
  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const documents = await loadUserDocuments(vehicleIds);
  const storageRefs = collectAccountStoragePaths({ vehicles, documents });

  await removeStorageObjects(storageRefs);
  await unclaimTagsForVehicles(vehicleIds);
  await logAccountPurgeCompleted(userId, requestId);
  await deleteAuthUser(userId);
}

export async function purgeDueAccounts(limit = 50): Promise<
  Array<{ userId: string; status: "ok" | "error"; message?: string }>
> {
  const due = await listAccountsDueForPurge(limit);
  const results: Array<{
    userId: string;
    status: "ok" | "error";
    message?: string;
  }> = [];

  for (const entry of due) {
    try {
      await purgeUserAccount(entry.userId, entry.requestId);
      results.push({ userId: entry.userId, status: "ok" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "purge failed";
      console.error("[purge-user-account] failed", entry.userId, message);
      results.push({ userId: entry.userId, status: "error", message });
    }
  }

  return results;
}
