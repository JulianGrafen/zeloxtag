import { AppShell } from "@/components/layout/app-shell";
import {
  RouteTransitionLoadingOverlay,
  RouteTransitionLoadingTrigger,
} from "@/components/ui/transition-loading";

export default function VehicleDocumentsLoading() {
  return (
    <AppShell showNavbar={false}>
      <RouteTransitionLoadingTrigger label="Dokumente werden geladen" />
      <RouteTransitionLoadingOverlay />
    </AppShell>
  );
}
