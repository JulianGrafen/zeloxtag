import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { landingSurface } from "./landing-styles";

type GlassSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function GlassSurface({ children, className }: GlassSurfaceProps) {
  return (
    <div className={cn(landingSurface.glass, className)}>{children}</div>
  );
}
