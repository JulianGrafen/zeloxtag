import { AppShell } from "@/components/layout/app-shell";
import {
  RouteTransitionLoadingOverlay,
  RouteTransitionLoadingTrigger,
} from "@/components/ui/transition-loading";

/** Route fallback while Beleg-/Dokument-Detail server data loads. */
export function DocumentDetailRouteLoading() {
  return (
    <AppShell showNavbar={false}>
      <RouteTransitionLoadingTrigger label="Beleg wird geladen" />
      <RouteTransitionLoadingOverlay />
    </AppShell>
  );
}
