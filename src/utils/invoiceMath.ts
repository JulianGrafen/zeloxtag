export function parseGermanNumber(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  
  // Strip letters, currency symbols, and spaces
  let clean = String(val).replace(/[^0-9,\.-]/g, '');
  if (!clean) return null;

  // Handle "1.000,50" vs "141,46"
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

export function processLineItems(llmItems: any[]) {
  if (!Array.isArray(llmItems)) return [];

  return llmItems.map(item => {
    const rawMenge = parseGermanNumber(item.menge);
    const rawEPreis = parseGermanNumber(item.einzelpreis);
    const rawGesPreis = parseGermanNumber(item.gesamtpreis);

    // Rule 1: If Menge is missing, default to 1
    const menge = rawMenge !== null ? rawMenge : 1;
    
    // Rule 2: If E-Preis is missing but GesPreis exists, use GesPreis as E-Preis (since menge is likely 1)
    const ePreis = rawEPreis !== null ? rawEPreis : (rawGesPreis !== null ? rawGesPreis : 0);
    
    let gesPreis = rawGesPreis;

    // Rule 3: Math Checksum (Menge * E-Preis)
    const computedTotal = parseFloat((menge * ePreis).toFixed(2));

    // Rule 4: Overwrite if GesPreis is missing OR if the checksum deviates (e.g. LLM hallucinates)
    if (gesPreis === null || Math.abs(gesPreis - computedTotal) > 0.05) {
      gesPreis = computedTotal;
    }

    return {
      ...item,
      menge,
      einzelpreis: ePreis,
      gesamtpreis: gesPreis
    };
  });
}
