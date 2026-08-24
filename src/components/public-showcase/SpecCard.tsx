import type { ReactNode } from "react";

import { showroom } from "./showroom-styles";

type SpecCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
};

export function SpecCard({ label, value, icon }: SpecCardProps) {
  return (
    <div className={`${showroom.panelFlat} px-3 py-3.5`}>
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
