import { AppShell } from "@/components/layout/app-shell";
import { DocumentsTransitionLoading } from "@/components/ui/transition-loading";

export default function VehicleDocumentsLoading() {
  return (
    <AppShell showNavbar={false}>
      <DocumentsTransitionLoading />
    </AppShell>
  );
}
