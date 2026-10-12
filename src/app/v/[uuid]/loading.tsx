import { AppShell } from "@/components/layout/app-shell";
import {
  RouteTransitionLoadingOverlay,
  RouteTransitionLoadingTrigger,
} from "@/components/ui/transition-loading";

export default function TagScanLoading() {
  return (
    <AppShell showNavbar={false}>
      <RouteTransitionLoadingTrigger label="Dashboard wird geladen" />
      <RouteTransitionLoadingOverlay />
    </AppShell>
  );
}
