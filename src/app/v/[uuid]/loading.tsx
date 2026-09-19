import { AppShell } from "@/components/layout/app-shell";
import { DashboardTransitionLoading } from "@/components/ui/transition-loading";

export default function TagScanLoading() {
  return (
    <AppShell showNavbar={false}>
      <DashboardTransitionLoading />
    </AppShell>
  );
}
