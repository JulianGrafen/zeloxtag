"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: {
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
];

export function ThemeAppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  return (
    <section
      aria-label="Erscheinungsbild"
      className="vd-surface-card p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
        Erscheinungsbild
      </h2>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
        Hell, dunkel oder automatisch nach Systemeinstellung.
      </p>

      {!mounted ? (
        <div
          className="mt-4 h-11 animate-pulse rounded-[var(--vd-radius-control)] bg-[color:var(--vd-surface-elevated)]"
          aria-hidden
        />
      ) : (
        <>
          <div
            className="mt-4 grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Theme"
          >
            {OPTIONS.map(({ value, label, icon: Icon }) => {
              const selected = active === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-1 rounded-[var(--vd-radius-control)] border px-2 py-2.5 text-[0.72rem] font-medium transition",
                    selected
                      ? "border-[color:var(--vd-text)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
                      : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)] hover:bg-[color:var(--vd-surface-elevated)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
          {resolvedTheme ? (
            <p className="mt-2 text-center text-[0.72rem] text-[color:var(--vd-muted)]">
              Aktiv: {resolvedTheme === "dark" ? "Dunkel" : "Hell"}
              {active === "system" ? " (System)" : ""}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
