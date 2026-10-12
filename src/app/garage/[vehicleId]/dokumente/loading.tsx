import { AppShell } from "@/components/layout/app-shell";
import { RouteTransitionLoadingTrigger } from "@/components/ui/transition-loading";

export default function VehicleDocumentsLoading() {
  return (
    <AppShell showNavbar={false}>
      <RouteTransitionLoadingTrigger label="Dokumente werden geladen" />
    </AppShell>
  );
}
