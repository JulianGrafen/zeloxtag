"use client";

import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { addBuildTodo } from "@/actions/build-planner/add-todo";
import { completePlannedMod } from "@/actions/build-planner/complete-planned-mod";
import { createPlannedModFromExtract } from "@/actions/build-planner/create-from-extract";
import { createPlannedModManual } from "@/actions/build-planner/create-manual";
import { updateBuildTodo } from "@/actions/build-planner/update-todo";
import { ScanContent } from "@/components/layout/scan-content";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { PlannedModExtractResult } from "@/lib/build-planner/extract-schema";
import type { BuildPlannerPageData } from "@/lib/build-planner/types";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { PlannedModWithTodos } from "@/lib/build-planner/types";

import { BuildPlannerBudgetHero } from "./build-planner-budget-hero";
import { BuildPlannerExtractPreview } from "./build-planner-extract-preview";
import { BuildPlannerSmartInput } from "./build-planner-smart-input";
import { CompletePlannedModSheet } from "./complete-planned-mod-sheet";
import { PlannedModCard } from "./planned-mod-card";

type BuildPlannerViewProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  vehicleId: string;
  tagUuid: string;
  vehicleModel: string;
  initialData: BuildPlannerPageData;
  aiUnlocked: boolean;
  onAiLocked?: () => void;
};

export function BuildPlannerView({
  vehicleSurfaceScope,
  vehicleId,
  tagUuid,
  vehicleModel,
  initialData,
  aiUnlocked,
  onAiLocked,
}: BuildPlannerViewProps) {
  const router = useRouter();
  const dashboardHref = vehicleSurfaceHref(vehicleSurfaceScope);
  const [mods, setMods] = useState(initialData.mods);
  const summary = initialData.summary;

  useEffect(() => {
    setMods(initialData.mods);
  }, [initialData]);
  const [preview, setPreview] = useState<{
    extract: PlannedModExtractResult;
    modelId: string;
    sourceKind: "link" | "image" | "text";
    sourceUrl?: string;
  } | null>(null);
  const [completeMod, setCompleteMod] = useState<PlannedModWithTodos | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeMods = useMemo(
    () =>
      mods.filter(
        (mod) => mod.status === "active" || mod.status === "draft",
      ),
    [mods],
  );

  const refresh = () => router.refresh();

  function applyLocalTodoToggle(
    modId: string,
    todoId: string,
    status: "pending" | "done",
  ) {
    setMods((prev) =>
      prev.map((mod) => {
        if (mod.id !== modId) return mod;
        return {
          ...mod,
          todos: mod.todos.map((todo) =>
            todo.id === todoId ? { ...todo, status } : todo,
          ),
        };
      }),
    );
  }

  return (
    <ScanContent className="vd-root gap-5 pb-10">
      <header className="space-y-3">
        <PressableLink
          href={dashboardHref}
          className="inline-flex items-center gap-2 text-[0.85rem] font-medium text-[color:var(--vd-muted)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </PressableLink>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Build Planner
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleModel} · Geplant vs. aus Belegen
          </p>
        </div>
      </header>

      <BuildPlannerBudgetHero summary={summary} />

      <BuildPlannerSmartInput
        vehicleId={vehicleId}
        aiUnlocked={aiUnlocked}
        onLocked={() => onAiLocked?.()}
        onExtract={(payload) => {
          setError(null);
          setPreview(payload);
        }}
        onError={setError}
      />

      {error ? (
        <p className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.85rem] text-[color:var(--vd-text)]">
          {error}
        </p>
      ) : null}

      {preview ? (
        <BuildPlannerExtractPreview
          extract={preview.extract}
          pending={pending}
          onDiscard={() => setPreview(null)}
          onConfirm={(edited) => {
            startTransition(async () => {
              const result = await createPlannedModFromExtract({
                vehicleId,
                tagUuid,
                extract: edited,
                sourceKind: preview.sourceKind,
                sourceUrl: preview.sourceUrl,
                aiModel: preview.modelId,
              });
              if (result.status === "error") {
                setError(result.message);
                return;
              }
              setPreview(null);
              showSavedToast("Build gespeichert");
              refresh();
            });
          }}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Geplante Mods
          </h2>
          <PressableButton
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] px-3 py-1.5 text-[0.78rem] font-medium text-[color:var(--vd-text)]"
            disabled={pending}
            onClick={() => {
              const title = window.prompt("Name des geplanten Mods:");
              if (!title?.trim()) return;
              startTransition(async () => {
                const result = await createPlannedModManual({
                  vehicleId,
                  tagUuid,
                  title: title.trim(),
                });
                if (result.status === "error") {
                  setError(result.message);
                  return;
                }
                showSavedToast("Mod angelegt");
                refresh();
              });
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Manuell
          </PressableButton>
        </div>

        {activeMods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--vd-border)] p-6 text-center">
            <Sparkles
              className="mx-auto h-8 w-8 text-[color:var(--vd-muted)]"
              aria-hidden
            />
            <p className="mt-3 text-[0.9rem] font-medium text-[color:var(--vd-text)]">
              Noch nichts geplant
            </p>
            <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">
              Link, Foto oder Text oben — oder manuell starten.
            </p>
          </div>
        ) : (
          activeMods.map((mod) => (
            <PlannedModCard
              key={mod.id}
              mod={mod}
              disabled={pending}
              onToggleTodo={(todoId, nextStatus) => {
                const previous = mod.todos.find((t) => t.id === todoId)?.status;
                applyLocalTodoToggle(mod.id, todoId, nextStatus);
                startTransition(async () => {
                  const result = await updateBuildTodo({
                    vehicleId,
                    tagUuid,
                    todoId,
                    status: nextStatus,
                  });
                  if (result.status === "error") {
                    if (previous) {
                      applyLocalTodoToggle(mod.id, todoId, previous);
                    }
                    setError(result.message);
                    return;
                  }
                  refresh();
                });
              }}
              onAddTodo={(title) => {
                startTransition(async () => {
                  const result = await addBuildTodo({
                    vehicleId,
                    tagUuid,
                    plannedModId: mod.id,
                    title,
                  });
                  if (result.status === "error") {
                    setError(result.message);
                    return;
                  }
                  showSavedToast("Schritt hinzugefügt");
                  refresh();
                });
              }}
              onComplete={() => setCompleteMod(mod)}
            />
          ))
        )}
      </section>

      {mods.some((mod) => mod.status === "completed") ? (
        <section className="space-y-2">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Übernommen
          </h2>
          {mods
            .filter((mod) => mod.status === "completed")
            .map((mod) => (
              <div
                key={mod.id}
                className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3"
              >
                <p className="font-medium text-[color:var(--vd-text)]">
                  {mod.title}
                </p>
                <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
                  In Garage ·{" "}
                  {mod.planned_price_eur != null
                    ? formatEur(mod.planned_price_eur)
                    : "ohne Preis"}
                </p>
              </div>
            ))}
        </section>
      ) : null}

      <CompletePlannedModSheet
        open={completeMod != null}
        mod={completeMod}
        pending={pending}
        onClose={() => setCompleteMod(null)}
        onConfirm={(showOnPublicShowcase) => {
          if (!completeMod) return;
          startTransition(async () => {
            const result = await completePlannedMod({
              vehicleId,
              tagUuid,
              plannedModId: completeMod.id,
              showOnPublicShowcase,
            });
            if (result.status === "error") {
              setError(result.message);
              return;
            }
            setCompleteMod(null);
            showSavedToast("In Garage übernommen");
            refresh();
          });
        }}
      />
    </ScanContent>
  );
}
