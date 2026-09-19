import { TransitionLoading } from "@/components/ui/transition-loading";

export function ExposeSkeleton() {
  return (
    <TransitionLoading
      label="Exposé wird geladen"
      state="composing"
      theme="light"
      className="mx-auto min-h-dvh max-w-2xl"
    />
  );
}
