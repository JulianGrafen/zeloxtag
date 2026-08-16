import type { ReactNode } from "react";

type SpecCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
};

export function SpecCard({ label, value, icon }: SpecCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3.5 backdrop-blur-md">
      <p className="flex items-center justify-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-zinc-400">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-center text-[0.95rem] font-semibold tabular-nums leading-snug text-zinc-50">
        {value}
      </p>
    </div>
  );
}
