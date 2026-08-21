/**
 * German count + noun with correct singular/plural ("1 Dokument" vs "2 Dokumente").
 */
export function pluralizeDe(
  count: number,
  singular: string,
  plural: string,
): string {
  const noun = count === 1 ? singular : plural;
  return `${count.toLocaleString("de-DE")} ${noun}`;
}

export function eintraegeLabel(count: number): string {
  return pluralizeDe(count, "Eintrag", "Einträge");
}

export function dokumenteLabel(count: number): string {
  return pluralizeDe(count, "Dokument", "Dokumente");
}

export function belegeLabel(count: number): string {
  return pluralizeDe(count, "Beleg", "Belege");
}
