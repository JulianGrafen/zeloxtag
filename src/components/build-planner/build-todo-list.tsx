"use client";

import { Plus } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { BuildTodo } from "@/types/database";

type BuildTodoListProps = {
  todos: BuildTodo[];
  disabled?: boolean;
  onToggle: (todoId: string, status: "pending" | "done") => void;
  onAdd: (title: string) => void;
};

export function BuildTodoList({
  todos,
  disabled,
  onToggle,
  onAdd,
}: BuildTodoListProps) {
  return (
    <ul className="space-y-2">
      {todos.map((todo) => {
        const checked = todo.status === "done";
        return (
          <li key={todo.id}>
            <label
              className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--vd-border)] px-3 py-2.5"
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--vd-text)]"
                checked={checked}
                disabled={disabled}
                onChange={() =>
                  onToggle(todo.id, checked ? "pending" : "done")
                }
              />
              <span
                className={`text-[0.88rem] leading-snug ${
                  checked
                    ? "text-[color:var(--vd-muted)] line-through"
                    : "text-[color:var(--vd-text)]"
                }`}
              >
                {todo.title}
              </span>
            </label>
          </li>
        );
      })}

      <PressableButton
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
        onClick={() => {
          const title = window.prompt("Neuer Schritt:");
          if (title?.trim()) onAdd(title.trim());
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Schritt
      </PressableButton>
    </ul>
  );
}
