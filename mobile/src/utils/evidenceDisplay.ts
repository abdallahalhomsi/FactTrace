// Ignore formatting-only differences, but preserve genuinely different evidence.
function normalizeDisplayText(value?: string | null): string {
  return (value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function hasDistinctSourceSummary(
  summary?: string | null,
  evidence?: string | null,
): boolean {
  const normalizedSummary = normalizeDisplayText(summary);
  return normalizedSummary.length > 0 && normalizedSummary !== normalizeDisplayText(evidence);
}
