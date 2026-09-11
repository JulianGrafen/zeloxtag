import type { ReactNode } from "react";

import { showroom } from "./showroom-styles";

type SpecCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
};

export function SpecCard({ label, value, icon }: SpecCardProps) {
  return (
    <div
      className={`rounded-[1.25rem] border border-white/15 bg-black/80 px-3 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md`}
    >
      <p
        className={`flex items-center justify-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.16em] ${showroom.label}`}
      >
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-center text-[0.95rem] font-semibold tabular-nums leading-snug text-white">
        {value}
      </p>
    </div>
  );
}
