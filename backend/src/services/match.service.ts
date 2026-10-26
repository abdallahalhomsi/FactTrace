//finds which stored claim the user's text is about
//mock version: counts shared words between the text and each claim (dice score)
//good enough to return realistic match, weak match and no match results for the frontend
//the real approximate matching replaces the matchclaim function later, with the same input and output

import { MatchRequest, MatchResult } from "../types/shared"; //types agreed with manaal
import { claimExists, listClaimsForMatching } from "./claim.service"; //claim lookups

export const MATCH_THRESHOLD = 0.7; //score at or above this is a confident match
export const WEAK_MATCH_THRESHOLD = 0.4; //score at or above this (but below 0.7) is a weak match

//common words that appear in almost every claim, so they should not count as a real overlap
const STOP_WORDS = new Set(["the", "is", "a", "an", "of", "to", "in", "on", "for", "and", "or", "it", "if", "be", "are", "was", "that", "this", "with", "as", "at", "by"]);

//splits text into a set of lowercase words without punctuation or stop words
function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase() //capital and small letters count as the same word
      .normalize("NFKD") //splits accented letters, so "café" becomes "cafe" plus an accent mark
      .replace(/[^\p{L}\p{N}\s]/gu, " ") //turns punctuation and accent marks into spaces
      .split(/\s+/) //split on any whitespace
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)) //drop single letters and stop words
  );
}

//dice score: 2 x shared words / (words in a + words in b), gives 0 (nothing shared) to 1 (same words)
function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0; //empty text matches nothing
  let overlap = 0; //how many words both texts have
  for (const t of a) if (b.has(t)) overlap++;
  return (2 * overlap) / (a.size + b.size);
}

const LOW_OCR_CONFIDENCE = 0.5; //same threshold manaal uses for partial ocr results

export function matchClaim(req: MatchRequest): MatchResult {
  //qr codes already contain the claim id, so no text matching is needed
  if (req.source === "qr" && req.claimId) {
    return claimExists(req.claimId)
      ? { status: "MATCH", score: 1, claimId: req.claimId } //known id
      : { status: "NO_MATCH", score: 0, claimId: null }; //qr code we do not know
  }

  //compare the text with every stored claim and keep the best score
  const input = tokens(req.claimText);
  let best = { claimId: null as string | null, score: 0 };
  for (const c of listClaimsForMatching()) {
    const score = dice(input, tokens(c.text));
    if (score > best.score) best = { claimId: c.claimId, score };
  }
  const score = Math.round(best.score * 100) / 100; //round to 2 decimals for the response

  //ocr confidence only matters if the text came from ocr and the user did not fix it,
  //once the user edits the text, the ocr quality no longer says anything about it
  const textUnedited = req.originalOcrText !== undefined && req.originalOcrText.trim() === req.claimText.trim();
  const lowOcr = req.source === "ocr" && textUnedited && typeof req.ocrConfidence === "number" && req.ocrConfidence < LOW_OCR_CONFIDENCE;

  if (score >= MATCH_THRESHOLD) {
    //good text match, but the text itself may be misread, so ask the user to confirm
    if (lowOcr) return { status: "WEAK_MATCH", score, claimId: best.claimId, reason: "low_ocr_confidence" };
    return { status: "MATCH", score, claimId: best.claimId }; //confident match
  }
  if (score >= WEAK_MATCH_THRESHOLD) {
    return { status: "WEAK_MATCH", score, claimId: best.claimId, reason: lowOcr ? "both" : "low_similarity" }; //only a partial match
  }
  //todo: when manaal's factcheck service is ready, no_match results call it here and add the result as factcheck
  return { status: "NO_MATCH", score, claimId: null }; //nothing close enough
}
