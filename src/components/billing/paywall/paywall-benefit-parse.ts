export type ParsedPaywallBenefit = {
  title: string;
  description: string;
};

export function parsePaywallBenefit(benefit: string): ParsedPaywallBenefit {
  const colonIndex = benefit.indexOf(":");
  if (colonIndex === -1) {
    return { title: benefit, description: "" };
  }
  return {
    title: benefit.slice(0, colonIndex).trim(),
    description: benefit.slice(colonIndex + 1).trim(),
  };
}
