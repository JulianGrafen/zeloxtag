export default function ExposeNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f4f1ea] px-6">
      <div className="max-w-sm text-center">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          ZeloxTag
        </p>
        <h1 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.03em] text-zinc-950">
          Exposé nicht verfügbar
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-zinc-600">
          Dieser Link ist ungültig oder wurde vom Fahrzeughalter deaktiviert.
        </p>
      </div>
    </div>
  );
}
