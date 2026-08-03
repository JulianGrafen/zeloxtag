import { AppShell } from "@/components/layout/app-shell";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function TagScanLoading() {
  return (
    <AppShell>
      <DashboardSkeleton />
    </AppShell>
  );
}
