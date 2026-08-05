"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type MfaRecoveryCodesPanelProps = {
  codes: string[];
  onDismiss?: () => void;
  title?: string;
};

/**
 * One-time display of plaintext recovery codes after enroll / regenerate.
 */
export function MfaRecoveryCodesPanel({
  codes,
  onDismiss,
  title = "Recovery-Codes speichern",
}: MfaRecoveryCodesPanelProps) {
  const [copied, setCopied] = useState(false);

  if (codes.length === 0) return null;

  const textBlock = codes.join("\n");

  return (
    <div className="space-y-3 rounded-[1.35rem] border border-amber-300/70 bg-amber-50 p-5 shadow-[var(--vd-shadow-sm)]">
      <h3 className="font-[family-name:var(--font-display)] text-[1.1rem] font-semibold text-amber-950">
        {title}
      </h3>
      <p className="text-[0.85rem] leading-relaxed text-amber-950/80">
        Jeder Code funktioniert einmal, wenn du keinen Zugriff mehr auf deine
        Authenticator-App hast. Speichere sie offline — sie werden nicht erneut
        angezeigt.
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-[0.85rem] tracking-wide text-amber-950">
        {codes.map((code) => (
          <li
            key={code}
            className="rounded-xl border border-amber-300/60 bg-white px-3 py-2 text-center"
          >
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <PressableButton
          type="button"
          variant="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/70 bg-white px-3 py-2 text-[0.8rem] font-medium text-amber-950"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(textBlock);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? "Kopiert" : "Kopieren"}
        </PressableButton>
        <PressableButton
          type="button"
          variant="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/70 bg-white px-3 py-2 text-[0.8rem] font-medium text-amber-950"
          onClick={() => {
            const blob = new Blob([textBlock], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "zeloxtag-recovery-codes.txt";
            anchor.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Als Datei speichern
        </PressableButton>
        {onDismiss ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={onDismiss}
            className="inline-flex items-center rounded-xl bg-amber-950 px-3 py-2 text-[0.8rem] font-semibold text-white"
          >
            Ich habe die Codes gespeichert
          </PressableButton>
        ) : null}
      </div>
    </div>
  );
}
