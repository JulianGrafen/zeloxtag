"use client";

import { Car, CheckCircle2, ChevronLeft, CreditCard } from "lucide-react";

import {
  ReceiptActionBar,
  ReceiptHero,
  ReceiptLineItemsCard,
  ReceiptMetadataCard,
} from "@/components/documents/receipt";
import {
  IOS_PILL,
  IOSScreen,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import { restoreGermanUmlauts } from "@/utils/formatters";

import { type InvoiceDocument } from "./invoiceDocuments";
import { PressableLink } from "./Pressable";

interface InvoiceDetailViewProps {
  document: InvoiceDocument;
  vehicleModel: string;
}

async function shareCurrentPage(title: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href });
      return;
    }
    await navigator.clipboard?.writeText(window.location.href);
  } catch {
    // User cancelled share sheet — ignore.
  }
}

/** Demo receipt (`/rechnungen/[id]`) — same Wallet layout as the live Beleg-Detail. */
export function InvoiceDetailView({
  document,
  vehicleModel,
}: InvoiceDetailViewProps) {
  return (
    <IOSScreen>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href="/rechnungen"
          variant="pill"
          className="-ml-1 inline-flex w-fit items-center gap-0.5 py-1 text-[17px] text-[#0A84FF]"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Belege
        </PressableLink>

        <ReceiptHero
          title={document.title}
          amount={document.amount}
          categoryLabel={document.category}
          vendor={document.vendor}
          dateLabel={document.issuedAt}
          status={
            <span className={cn(IOS_PILL, "bg-emerald-500/15 text-emerald-400")}>
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              {document.status}
            </span>
          }
        />

        <ReceiptMetadataCard
          metadata={{
            vendor: document.vendor,
            category: document.category,
            mileageKm: document.mileageKm ?? null,
            invoiceNumber: document.invoiceNumber,
          }}
          extraRows={
            <>
              <InsetListRow
                icon={CreditCard}
                iconTone="amber"
                label="Zahlung"
                value={document.paymentMethod}
              />
              <InsetListRow
                icon={Car}
                iconTone="neutral"
                label="Fahrzeug"
                value={vehicleModel}
              />
            </>
          }
        />

        <ReceiptLineItemsCard items={document.lineItems} total={document.amount} />

        {document.notes ? (
          <InsetGroupedCard header="Notizen">
            <p className="px-4 py-3 text-[15px] leading-snug text-white">
              {restoreGermanUmlauts(document.notes)}
            </p>
          </InsetGroupedCard>
        ) : null}

        <InsetGroupedCard header="Original">
          <InsetListRow
            label={document.fileName}
            sublabel={`${document.fileSize} · gescannt ${document.scannedAt}`}
            emphasis="navigation"
          />
        </InsetGroupedCard>
      </div>

      <ReceiptActionBar
        onShare={() => {
          void shareCurrentPage(document.title);
        }}
        onEdit={() => {}}
      />
    </IOSScreen>
  );
}
