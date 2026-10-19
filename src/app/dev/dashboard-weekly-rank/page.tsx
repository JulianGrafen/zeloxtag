import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ShowcaseWeeklyRankDashboardMockToast } from "@/components/showcase-swipe/showcase-weekly-rank-dashboard-mock-toast";
import { ShowcaseWeeklyRankDashboardNotice } from "@/components/showcase-swipe/showcase-weekly-rank-dashboard-notice";
import { parseWeeklyRankMockParam } from "@/lib/showcase/parse-weekly-rank-mock-param";
import { mockWeeklyRankAward } from "@/lib/showcase/weekly-rank-share-mock-data";

type DevDashboardWeeklyRankPageProps = {
  searchParams: Promise<{ rank?: string }>;
};

export default async function DevDashboardWeeklyRankPage({
  searchParams,
}: DevDashboardWeeklyRankPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { rank: rankRaw } = await searchParams;
  const mockRank = parseWeeklyRankMockParam(rankRaw ?? "1") ?? 1;
  const award = mockWeeklyRankAward(mockRank);
  const entdeckenHref = "/v/demo-active-tag/entdecken";

  return (
    <AppShell showNavbar={false}>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Dev · Dashboard
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-[color:var(--vd-text)]">
            Wochenplatzierung (Mock)
          </h1>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            Banner + Toast wie nach dem Montags-Cron. Im echten Dashboard:{" "}
            <code className="text-[0.78rem]">?mockWeeklyRank=1|2|3</code>
          </p>
        </header>
        <ShowcaseWeeklyRankDashboardMockToast
          award={award}
          entdeckenHref={entdeckenHref}
        />
        <ShowcaseWeeklyRankDashboardNotice
          award={award}
          entdeckenHref={entdeckenHref}
        />
      </div>
    </AppShell>
  );
}
