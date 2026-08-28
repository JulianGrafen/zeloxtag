import { AppShell } from "@/components/layout/app-shell";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function VehicleDocumentsLoading() {
  return (
    <AppShell showNavbar={false}>
      <DashboardSkeleton />
    </AppShell>
  );
}
