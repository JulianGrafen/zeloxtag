import Link from "next/link";

import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";

export function ActivateCloudView({ tagUuid }: { tagUuid: string }) {
  const dashboardHref = `/v/${tagUuid}?scan=1`;
  const aboHref = `/v/${tagUuid}/abo`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <section className="claim-panel">
        <header>
          <p className="claim-kicker">ZeloxTag Cloud</p>
          <h1 className="claim-title mt-2">Abo aktivieren</h1>
          <p className="claim-copy mt-2">
            4,99 € im Monat. Zahlung läuft über Stripe — gebunden an dieses
            Konto, nicht an eine Shop-Bestellnummer.
          </p>
        </header>

        <StripeCheckoutButton
          successPath={dashboardHref}
          cancelPath={aboHref}
        />

        <Link href={dashboardHref} className="claim-later mt-4">
          Später im Konto abschließen
        </Link>
      </section>
    </div>
  );
}
