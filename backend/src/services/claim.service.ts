//everything to do with reading claims
//claims are loaded from mysql once when the server starts and kept in memory, so every lookup stays fast and simple
//controllers only call these functions, so nothing above this file has to change if the storage changes again
//after editing claims in the database, restart the server to load the new data

import { RowDataPacket } from "mysql2/promise"; //row type for query results
import { pool } from "../db/mysql"; //shared mysql connection
import { ClaimAnswer, ClaimDetail, Evidence, OverallStance, ProvenanceSignal, Source, StudyClaim, StudyClaimsResponse } from "../types/api"; //shapes used here
import { AppError } from "../utils/AppError"; //used when a claim does not exist

//one stored claim, including the answer that is never sent to the app
interface StoredClaim extends ClaimDetail {
  correctAnswer: ClaimAnswer; //for scoring accuracy only, never sent to the app
  studySet: "practice" | "A" | "B" | null; //which study list the claim belongs to, null if it is only in the database
  studyPosition: number | null; //order inside that list, starting at 1
}

//added to every claim so users always know results come from a prepared dataset (the ta asked for this transparency)
const DATASET_SIGNAL: ProvenanceSignal = {
  key: "dataset",
  label: "Curated dataset",
  detail: "This result comes from a curated set of claims prepared by the research team for this study.",
  level: "neutral",
};

let claims: StoredClaim[] = []; //filled by loadClaims when the server starts
const byId = new Map<string, StoredClaim>(); //same claims by id, for quick lookups

//reads every claim with its sources, evidence and signals from mysql into memory, returns how many claims were loaded
export async function loadClaims(): Promise<number> {
  //dates are formatted in sql so they arrive as yyyy-mm-dd text, never shifted by the laptop's time zone
  const [claimRows] = await pool.query<RowDataPacket[]>(
    `SELECT claim_id, claim_text, correct_answer, overall_stance, summary, origin_outlet, origin_author,
            DATE_FORMAT(origin_first_seen_at, '%Y-%m-%d') AS origin_first_seen_at, origin_url, study_set, study_position
       FROM claims WHERE is_active ORDER BY claim_id`
  );
  const [sourceRows] = await pool.query<RowDataPacket[]>(
    `SELECT cs.claim_id, s.source_id, s.title, s.outlet, s.author, DATE_FORMAT(s.published_at, '%Y-%m-%d') AS published_at,
            s.url, s.source_type, cs.is_primary
       FROM claim_sources cs JOIN sources s ON s.source_id = cs.source_id
      ORDER BY cs.claim_id, cs.is_primary DESC, cs.display_order`
  );
  const [evidenceRows] = await pool.query<RowDataPacket[]>(
    "SELECT evidence_id, claim_id, source_id, summary, stance FROM evidence ORDER BY claim_id, display_order"
  );
  const [signalRows] = await pool.query<RowDataPacket[]>(
    "SELECT claim_id, signal_key, label, detail, level FROM provenance_signals ORDER BY claim_id, display_order"
  );

  //build the new list first and swap it in at the end, so a failed load never leaves half the data behind
  const loaded: StoredClaim[] = claimRows.map((r) => ({
    claimId: r.claim_id,
    text: r.claim_text,
    correctAnswer: r.correct_answer as ClaimAnswer,
    origin: { outlet: r.origin_outlet, author: r.origin_author, firstSeenAt: r.origin_first_seen_at, url: r.origin_url },
    overallStance: r.overall_stance as OverallStance,
    summary: r.summary,
    provenanceSignals: [],
    evidence: [],
    sources: [],
    studySet: r.study_set,
    studyPosition: r.study_position,
  }));
  const lookup = new Map(loaded.map((c) => [c.claimId, c]));

  for (const r of sourceRows) {
    const source: Source = {
      id: r.source_id,
      title: r.title,
      outlet: r.outlet,
      author: r.author,
      publishedAt: r.published_at,
      url: r.url,
      type: r.source_type,
      isPrimary: Boolean(r.is_primary), //mysql returns 1 or 0
    };
    lookup.get(r.claim_id)?.sources.push(source); //skipped if the claim is inactive
  }
  for (const r of evidenceRows) {
    const evidence: Evidence = { id: r.evidence_id, summary: r.summary, stance: r.stance, sourceId: r.source_id };
    lookup.get(r.claim_id)?.evidence.push(evidence);
  }
  for (const r of signalRows) {
    const signal: ProvenanceSignal = { key: r.signal_key, label: r.label, detail: r.detail, level: r.level };
    lookup.get(r.claim_id)?.provenanceSignals.push(signal);
  }
  for (const c of loaded) c.provenanceSignals.push(DATASET_SIGNAL); //every claim gets the dataset notice last

  claims = loaded;
  byId.clear();
  for (const c of loaded) byId.set(c.claimId, c);
  return claims.length;
}

//returns only the id and text of every claim, which is all matching needs
export function listClaimsForMatching(): { claimId: string; text: string }[] {
  return claims.map(({ claimId, text }) => ({ claimId, text }));
}

//true if a claim with this id exists
export function claimExists(claimId: string): boolean {
  return byId.has(claimId);
}

//returns the stored correct answer, only for scoring decisions on the server, never send this to the app
export function getClaimAnswer(claimId: string): ClaimAnswer | null {
  return byId.get(claimId)?.correctAnswer ?? null; //null if the id is unknown
}

//returns the claim as the app should see it, with the correct answer removed so it can never leak
export function getClaimDetail(claimId: string): ClaimDetail {
  const claim = byId.get(claimId); //look up the claim
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

//returns the claims participants see, in order, without answers: practice first, then set a and set b
export function listStudyClaims(): StudyClaimsResponse {
  const pick = (set: StoredClaim["studySet"]): StudyClaim[] =>
    claims
      .filter((c) => c.studySet === set)
      .sort((a, b) => (a.studyPosition ?? 0) - (b.studyPosition ?? 0))
      .map((c) => ({ claimId: c.claimId, text: c.text, position: c.studyPosition ?? 0 }));
  return { practice: pick("practice"), setA: pick("A"), setB: pick("B") };
}