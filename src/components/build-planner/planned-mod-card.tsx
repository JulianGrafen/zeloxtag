"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { PlannedModWithTodos } from "@/lib/build-planner/types";

import { BuildTodoList } from "./build-todo-list";

type PlannedModCardProps = {
  mod: PlannedModWithTodos;
  disabled?: boolean;
  onToggleTodo: (todoId: string, status: "pending" | "done") => void;
  onAddTodo: (title: string) => void;
  onComplete: () => void;
};

export function PlannedModCard({
  mod,
  disabled,
  onToggleTodo,
  onAddTodo,
  onComplete,
}: PlannedModCardProps) {
  const [open, setOpen] = useState(true);
  const done = mod.todos.filter((t) => t.status === "done").length;
  const total = mod.todos.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <article className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h3 className="font-semibold text-[color:var(--vd-text)]">
            {mod.title}
          </h3>
          <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
            {mod.planned_price_eur != null
              ? formatEur(mod.planned_price_eur)
              : "Preis offen"}
            {total > 0 ? ` · ${pct}%` : ""}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[color:var(--vd-muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-[color:var(--vd-border)] px-4 pb-4 pt-3 space-y-3">
          <BuildTodoList
            todos={mod.todos}
            disabled={disabled}
            onToggle={onToggleTodo}
            onAdd={onAddTodo}
          />
          {allDone ? (
            <PressableButton
              type="button"
              disabled={disabled}
              className="w-full rounded-xl bg-[color:var(--vd-text)] py-3 text-[0.88rem] font-semibold text-[color:var(--vd-bg)]"
              onClick={onComplete}
            >
              Build abschließen
            </PressableButton>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
