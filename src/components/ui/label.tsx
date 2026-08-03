import type { ComponentProps } from "react";

export function Label({ className = "", children, ...props }: ComponentProps<"label">) {
  return (
    <label className={["block space-y-1.5", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </label>
  );
}
