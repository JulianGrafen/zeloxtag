import type { ComponentProps, ReactNode } from "react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type ButtonVariant = "default" | "outline" | "ghost";

interface ButtonProps extends Omit<ComponentProps<"button">, "className"> {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  default: "claim-cta",
  outline: "claim-back w-full",
  ghost:
    "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-[0.88rem] font-medium text-[color:var(--vd-muted)]",
};

export function Button({
  variant = "default",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <PressableButton
      type={type}
      variant="button"
      className={[variantClass[variant], className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </PressableButton>
  );
}
