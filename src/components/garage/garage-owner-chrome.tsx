"use client";

import type { ReactNode } from "react";

import { GarageSwitcherDock } from "./garage-switcher-dock";

export function GarageOwnerChrome({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GarageSwitcherDock />
    </>
  );
}
