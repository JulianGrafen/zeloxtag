import { AppShell } from "@/components/layout/app-shell";
import { RouteTransitionLoadingTrigger } from "@/components/ui/transition-loading";

export default function TagScanLoading() {
  return (
    <AppShell showNavbar={false}>
      <RouteTransitionLoadingTrigger label="Dashboard wird geladen" />
    </AppShell>
  );
}
