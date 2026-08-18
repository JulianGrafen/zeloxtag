"use client";

import { ArrowLeft } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

interface BackNavProps {
  label?: string;
  href?: string;
  onClick?: () => void;
}

export function BackNav({ label = "Zurück", href, onClick }: BackNavProps) {
  if (onClick) {
    return (
      <PressableButton
        type="button"
        variant="pill"
        onClick={onClick}
        className="vd-back-pill"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {label}
      </PressableButton>
    );
  }

  return (
    <PressableLink href={href ?? "/"} variant="pill" className="vd-back-pill">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </PressableLink>
  );
}
