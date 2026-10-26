//everything to do with reading claims
//right now it reads the mock data, later only these functions change to query mysql
//controllers only call these functions, so nothing above this file has to change when the database arrives

import { ClaimAnswer, ClaimDetail } from "../types/api"; //shapes used here
import { MOCK_CLAIMS, MockClaim } from "../mocks/claims.mock"; //temporary data
import { AppError } from "../utils/AppError"; //used when a claim does not exist

//returns only the id and text of every claim, which is all matching needs
export function listClaimsForMatching(): Pick<MockClaim, "claimId" | "text">[] {
  return MOCK_CLAIMS.map(({ claimId, text }) => ({ claimId, text }));
}

//true if a claim with this id exists
export function claimExists(claimId: string): boolean {
  return MOCK_CLAIMS.some((c) => c.claimId === claimId);
}

//returns the stored correct answer, only for scoring decisions on the server, never send this to the app
export function getClaimAnswer(claimId: string): ClaimAnswer | null {
  return MOCK_CLAIMS.find((c) => c.claimId === claimId)?.correctAnswer ?? null; //null if the id is unknown
}

//returns the claim as the app should see it, with the correct answer removed so it can never leak
export function getClaimDetail(claimId: string): ClaimDetail {
  const claim = MOCK_CLAIMS.find((c) => c.claimId === claimId); //look up the claim
  if (!claim) throw new AppError("CLAIM_NOT_FOUND", `No claim with id ${claimId}`); //unknown id gives a 404

  //build the public version field by field, so a new private field added later is not sent by accident
  return structuredClone({
    claimId: claim.claimId,
    text: claim.text,
    origin: claim.origin,
    overallStance: claim.overallStance,
    summary: claim.summary,
    provenanceSignals: claim.provenanceSignals,
    evidence: claim.evidence,
    sources: claim.sources,
  }); //structuredclone gives a copy, so nothing outside can change the stored data
}
