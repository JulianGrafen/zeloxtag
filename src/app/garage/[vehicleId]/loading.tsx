import { AppShell } from "@/components/layout/app-shell";
import { DashboardTransitionLoading } from "@/components/ui/transition-loading";

export default function GarageDashboardLoading() {
  return (
    <AppShell showNavbar={false}>
      <DashboardTransitionLoading />
    </AppShell>
  );
}
