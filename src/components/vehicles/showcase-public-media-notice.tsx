import { Globe } from "lucide-react";

type ShowcasePublicMediaNoticeProps = {
  isPublic: boolean;
};

export function ShowcasePublicMediaNotice({
  isPublic,
}: ShowcasePublicMediaNoticeProps) {
  return (
    <div
      className="flex gap-3 rounded-[1.15rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3.5"
      role="note"
    >
      <Globe
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-accent)]"
        aria-hidden
      />
      <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
        {isPublic
          ? "Das Fahrzeugbild aus den Fahrzeugdaten und das Leistungsdiagramm sind für alle Besucher öffentlich sichtbar."
          : "Wenn du dein öffentliches Profil aktivierst, sind das Fahrzeugbild aus den Fahrzeugdaten und das Leistungsdiagramm für alle Besucher sichtbar."}
      </p>
    </div>
  );
}
