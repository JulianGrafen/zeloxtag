"use client";

import { useState } from "react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { PlannedModExtractResult } from "@/lib/build-planner/extract-schema";

type BuildPlannerExtractPreviewProps = {
  extract: PlannedModExtractResult;
  pending: boolean;
  onDiscard: () => void;
  onConfirm: (edited: PlannedModExtractResult) => void;
};

export function BuildPlannerExtractPreview({
  extract,
  pending,
  onDiscard,
  onConfirm,
}: BuildPlannerExtractPreviewProps) {
  const [title, setTitle] = useState(extract.part.title);
  const [price, setPrice] = useState(
    extract.part.plannedPriceEur != null
      ? String(extract.part.plannedPriceEur)
      : "",
  );
  const [todos, setTodos] = useState(extract.todos.map((t) => t.title));
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 space-y-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        Vorschau · vor dem Speichern bearbeiten
      </p>

      {localError ? (
        <p className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2 text-[0.82rem] text-[color:var(--vd-text)]">
          {localError}
        </p>
      ) : null}

      {extract.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-[0.78rem] text-[color:var(--vd-muted)]">
          {extract.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <label className="block space-y-1">
        <span className="text-[0.75rem] text-[color:var(--vd-muted)]">Titel</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--vd-border)] px-3 py-2.5 text-[0.9rem]"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[0.75rem] text-[color:var(--vd-muted)]">
          Geplanter Preis (€)
        </span>
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--vd-border)] px-3 py-2.5 text-[0.9rem]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[0.75rem] text-[color:var(--vd-muted)]">Schritte</p>
        {todos.map((todoTitle, index) => (
          <input
            key={index}
            value={todoTitle}
            onChange={(e) => {
              const next = [...todos];
              next[index] = e.target.value;
              setTodos(next);
            }}
            className="w-full rounded-xl border border-[color:var(--vd-border)] px-3 py-2 text-[0.85rem]"
          />
        ))}
      </div>

      <div className="flex gap-2">
        <PressableButton
          type="button"
          className="flex-1 rounded-xl border border-[color:var(--vd-border)] py-2.5 text-[0.85rem] font-medium"
          disabled={pending}
          onClick={onDiscard}
        >
          Verwerfen
        </PressableButton>
        <PressableButton
          type="button"
          className="flex-1 rounded-xl bg-[color:var(--vd-text)] py-2.5 text-[0.85rem] font-semibold text-[color:var(--vd-bg)]"
          disabled={pending || title.trim().length < 2}
          onClick={() => {
            setLocalError(null);
            const trimmedTitle = title.trim();
            if (trimmedTitle.length < 2) {
              setLocalError("Bitte einen Titel mit mindestens 2 Zeichen eingeben.");
              return;
            }
            const parsedPrice = price.trim()
              ? Number.parseFloat(price.replace(",", "."))
              : null;
            const normalizedTodos = todos
              .map((t, index) => ({ title: t.trim(), sortOrder: index }))
              .filter((t) => t.title.length >= 2);
            if (normalizedTodos.length < 3) {
              setLocalError("Mindestens drei Schritte mit je 2+ Zeichen erforderlich.");
              return;
            }
            onConfirm({
              ...extract,
              part: {
                ...extract.part,
                title: trimmedTitle,
                plannedPriceEur:
                  parsedPrice != null && Number.isFinite(parsedPrice)
                    ? parsedPrice
                    : null,
              },
              todos: normalizedTodos,
            });
          }}
        >
          Speichern
        </PressableButton>
      </div>
    </section>
  );
}
