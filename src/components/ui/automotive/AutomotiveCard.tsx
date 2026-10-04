import type { ComponentProps, ReactNode } from "react";

import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

import {
  automotiveCardClassName,
  automotiveCardInteractiveClassName,
} from "./primitives";

type AutomotiveCardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "div" | "section" | "article";
};

export function AutomotiveCard({
  children,
  className,
  interactive = false,
  as = "div",
}: AutomotiveCardProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        interactive ? automotiveCardInteractiveClassName : automotiveCardClassName,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type AutomotiveCardLinkProps = Omit<ComponentProps<typeof PressableLink>, "variant"> & {
  className?: string;
};

export function AutomotiveCardLink({
  className,
  children,
  ...props
}: AutomotiveCardLinkProps) {
  return (
    <PressableLink
      variant="tile"
      className={cn(automotiveCardInteractiveClassName, "block", className)}
      {...props}
    >
      {children}
    </PressableLink>
  );
}
