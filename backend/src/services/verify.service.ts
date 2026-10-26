//runs matching and the claim lookup in one go, and shapes the result for the frontend's results screen
//this is what post /api/verify uses, so the app needs one request instead of two

import { MatchRequest, MatchResult } from "../types/shared"; //types agreed with manaal
import { ClaimDetail, SourceType, VerifyEvidence, VerifyMatchStatus, VerifyResponse } from "../types/api"; //response shapes
import { matchClaim } from "./match.service"; //finds the matching claim
import { getClaimDetail } from "./claim.service"; //loads its evidence and sources

//shown with every result, because the prof asked that a database match is never presented as independent verification
export const DATASET_NOTICE =
  "These results come from a curated set of claims prepared for this study. They are not an independent verification of the claim.";

//backend match labels to the labels the frontend uses
const STATUS_LABEL: Record<MatchResult["status"], VerifyMatchStatus> = {
  MATCH: "strong_match",
  WEAK_MATCH: "weak_match",
  NO_MATCH: "no_match",
};

//readable names for each kind of source, used as the "organization" line on evidence cards
const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  news: "News source",
  fact_check: "Fact check",
  official: "Official source",
  academic: "Academic source",
  social: "Social media",
};

//turns "2026-10-15" into "october 2026" (with a capital month name), like the figma shows, or undefined if there is no date
function readableDate(isoDate: string | null): string | undefined {
  if (!isoDate) return undefined; //no date stored
  const date = new Date(`${isoDate}T00:00:00Z`); //read as utc so the month never shifts with time zones
  if (Number.isNaN(date.getTime())) return undefined; //badly stored date, better to hide it than show nonsense
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

//plain words on how sure the match is, so users can recognise an uncertain match
function describeMatch(match: MatchResult): string {
  const percent = Math.round(match.score * 100); //score as a percentage
  if (match.status === "MATCH") return `This closely matches a claim in our curated dataset (${percent}% word overlap).`;
  if (match.status === "NO_MATCH") return "We could not find this claim in our curated dataset."; //also used for unknown qr codes
  if (match.reason === "low_ocr_confidence") return "This matches a claim in our dataset, but the scanned text may have been misread. Check that it is the claim you saw.";
  if (match.reason === "both") return `This only partly matches a claim in our dataset (${percent}% word overlap), and the scanned text may have been misread. Check that it is the claim you saw.`;
  return `This only partly matches a claim in our dataset (${percent}% word overlap). Check that it is the claim you saw.`;
}

//joins each evidence item with its source into one card, in the frontend's field names
function toEvidenceCards(claim: ClaimDetail): VerifyEvidence[] {
  const sourcesById = new Map(claim.sources.map((s) => [s.id, s])); //quick lookup of sources by id
  const cards: VerifyEvidence[] = [];
  for (const e of claim.evidence) {
    const s = sourcesById.get(e.sourceId); //the source this evidence comes from
    if (!s) continue; //evidence pointing to a missing source is skipped instead of breaking the screen
    cards.push({
      id: e.id,
      title: s.title,
      sourceName: s.outlet,
      organization: SOURCE_TYPE_LABEL[s.type],
      author: s.author ?? undefined, //left out instead of null, matching the frontend's optional field
      publicationDate: readableDate(s.publishedAt),
      summary: e.summary,
      evidenceText: e.summary, //the mock data has one text per evidence, the real database can store a longer one later
      originalUrl: s.url,
      provenance: `${s.outlet} → FactTrace curated dataset`,
      isPrimary: s.isPrimary,
      stance: e.stance,
      sourceType: s.type,
      publishedAt: s.publishedAt,
    });
  }
  return cards.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)); //primary sources first
}

export async function verifyClaim(req: MatchRequest): Promise<VerifyResponse> {
  const match = await matchClaim(req); //find the closest stored claim
  const base = {
    matchStatus: STATUS_LABEL[match.status],
    matchScore: Math.round(match.score * 100), //0 to 1 becomes 0 to 100 for the frontend
    claimId: match.claimId,
    matchExplanation: describeMatch(match),
    datasetNotice: DATASET_NOTICE,
  };

  //no match: nothing to show except the notice (fact check is added here later)
  if (!match.claimId) {
    const unknownQr = req.source === "qr" && !req.claimText; //a qr code we do not know, with no text to show
    return {
      ...base,
      originalClaim: unknownQr ? `QR code: ${req.claimId}` : req.claimText, //never send an empty claim, the screen would show a blank card
      explanation: unknownQr
        ? "This QR code is not linked to any claim in the curated dataset."
        : "No closely matching claim or evidence was found in the curated dataset.",
      evidence: [],
      provenanceSignals: [],
      ...(match.factCheck ? { factCheck: match.factCheck } : {}), //only included once manaal's service fills it
    };
  }

  //strong or weak match: load the claim and turn it into the results screen format
  const claim = getClaimDetail(match.claimId);
  return {
    ...base,
    originalClaim: req.claimText || claim.text, //qr scans send no text, so show the stored claim
    matchedClaim: claim.text,
    explanation: claim.summary,
    evidence: toEvidenceCards(claim),
    ...(match.reason ? { weakReason: match.reason } : {}), //only on weak matches
    overallStance: claim.overallStance,
    provenanceSignals: claim.provenanceSignals,
  };
}
