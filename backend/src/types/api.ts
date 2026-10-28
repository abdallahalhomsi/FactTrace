//shapes of every request and response the api sends, so frontend and backend agree
//the frontend should keep an identical copy in mobile/src/types/api.ts

import { ClaimSource, FactCheckResult, MatchStatus, OcrEngine, OcrError } from "./shared"; //types agreed with manaal in shared.ts

//---------- response envelope ----------

//every response is either a success or a failure, the app checks "success" first
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

//a successful response: the useful content is inside "data"
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

//a failed response: what went wrong is inside "error"
export interface ApiFailure {
  success: false;
  error: ApiError;
}

//details of an error
export interface ApiError {
  code: ErrorCode; //short fixed code the app can switch on
  message: string; //human readable text for debugging, not meant for participants
  details?: unknown; //optional extra info, for example which fields failed validation
}

//every error code the api can send, with the http status it comes with
//ocr results like no text or partial are not errors, /ocr returns them as normal data
export type ErrorCode =
  | "VALIDATION_ERROR" //400: a field is missing or has the wrong type
  | "IMAGE_REQUIRED" //400: /ocr was called without a photo in the "image" field
  | "UNSUPPORTED_MEDIA_TYPE" //415: the file is not a jpeg, png or webp
  | "FILE_TOO_LARGE" //413: the photo is bigger than the size limit
  | "PAYLOAD_TOO_LARGE" //413: the json body is bigger than the size limit
  | "CLAIM_NOT_FOUND" //404: no claim with that id
  | "NOT_FOUND" //404: the url does not exist
  | "INTERNAL_ERROR"; //500: something unexpected broke on the server

//---------- claims, sources and evidence ----------

//what kind of place a source comes from
export type SourceType = "news" | "fact_check" | "official" | "academic" | "social";

//one source the user can open
export interface Source {
  id: string; //unique id, used when logging which sources were opened
  title: string; //article or page title
  outlet: string; //who published it
  author: string | null; //null when there is no named author
  publishedAt: string | null; //date as yyyy-mm-dd, null if unknown
  url: string; //link that opens the source
  type: SourceType; //kind of source
  isPrimary: boolean; //true if this is the original or main source for the claim
}

//whether a piece of evidence backs the claim, goes against it, or just adds context
export type EvidenceStance = "supports" | "contradicts" | "context";

//one short finding linked to a source
export interface Evidence {
  id: string; //unique id
  summary: string; //one or two sentences in plain words
  stance: EvidenceStance; //how it relates to the claim
  sourceId: string; //id of the source this finding comes from
}

//overall direction of all the evidence for one claim
//this describes the evidence, it is not a verdict: the participant still decides for themselves
export type OverallStance = "supports" | "contradicts" | "mixed" | "unclear";

//how a provenance signal should be colored in the app
export type SignalLevel = "positive" | "neutral" | "warning";

//one provenance cue shown to the user, for example "original source found"
export interface ProvenanceSignal {
  key: "original_source" | "claim_date" | "independent_sources" | "source_types" | "dataset"; //which kind of cue this is
  label: string; //short title
  detail: string; //one sentence explanation
  level: SignalLevel; //color hint
}

//what get /claims/:id returns
//it deliberately has no verdict or correct answer, that is kept on the server for scoring only
export interface ClaimDetail {
  claimId: string; //id of the claim
  text: string; //the claim exactly as stored
  origin: {
    outlet: string | null; //where the claim first appeared, if known
    author: string | null; //who first said it, if known
    firstSeenAt: string | null; //earliest date we know of, yyyy-mm-dd
    url: string | null; //link to the first appearance, if any
  };
  overallStance: OverallStance; //what the evidence points to overall, the app can show it or hide it
  summary: string; //short plain text of what was found, for a "what we found" section
  provenanceSignals: ProvenanceSignal[]; //cues about where the claim came from
  evidence: Evidence[]; //findings about the claim
  sources: Source[]; //every source used by the evidence
}

//---------- verify (one call for the frontend's results screen) ----------

//match labels in the format the frontend already uses
export type VerifyMatchStatus = "strong_match" | "weak_match" | "no_match";

//one evidence card, in the exact field names the frontend's evidencesource type uses
export interface VerifyEvidence {
  id: string; //evidence id, also used to open the evidence details screen
  sourceId: string; //source id used for study source-opening logs
  title: string; //source title
  sourceName: string; //who published it, for example "city transport office"
  organization?: string; //kind of source as readable text, for example "official source"
  author?: string; //left out when there is no named author
  publicationDate?: string; //readable date like "october 2026", left out if unknown
  summary: string; //short finding in plain words
  evidenceText: string; //full explanation for the evidence details screen
  originalUrl?: string; //link for "open original source"
  provenance?: string; //where this record came from, ends with the curated dataset
  isPrimary: boolean; //true for the main or original source
  //extras the frontend may use or ignore
  stance: EvidenceStance; //supports, contradicts or context
  sourceType: SourceType; //raw source kind
  publishedAt: string | null; //raw date yyyy-mm-dd
}

//what post /api/verify returns: the frontend's verificationresult shape plus a few extras
export interface VerifyResponse {
  originalClaim: string; //the text the user confirmed (or the stored text for qr scans)
  matchedClaim?: string; //the stored claim it matched, left out on no match
  matchStatus: VerifyMatchStatus; //strong, weak or no match
  matchScore?: number; //match score from 0 to 100
  explanation?: string; //"what we found" text, or why nothing was found
  evidence: VerifyEvidence[]; //evidence cards, empty on no match
  //extras the frontend may use or ignore
  claimId: string | null; //matched claim id, needed later for /api/decisions
  matchExplanation: string; //plain words on how sure the match is (the prof asked users to be able to recognise uncertain matches)
  weakReason?: "low_ocr_confidence" | "low_similarity" | "both"; //only on weak matches
  overallStance?: OverallStance; //what the evidence points to overall, left out on no match
  datasetNotice: string; //reminder that results come from a curated dataset, not independent verification
  provenanceSignals: ProvenanceSignal[]; //provenance cues, empty on no match
  factCheck?: FactCheckResult; //google fact check result on no match (coming from manaal's service)
}

//---------- decisions (study logging) ----------

//the correct answer stored for each claim, used only for scoring and never sent to the app
export type ClaimAnswer = "true" | "false" | "misleading";
//which study condition the participant was in
export type StudyCondition = "app" | "browser";

//what the app sends when the participant records their decision
export interface DecisionRequest {
  participantId: string; //anonymous code like p07, never a name or student id
  condition: StudyCondition; //app or browser baseline
  claimId: string | null; //the claim being checked (in the browser condition too, so accuracy can be scored), null only if unknown
  claimText: string; //the claim text the participant checked
  originalOcrText?: string; //raw ocr text before the participant edited it
  inputSource?: ClaimSource; //how the claim got in: ocr, qr or typed
  matchStatus?: MatchStatus; //what matching returned
  ocrEngine?: OcrEngine | null; //which engine read the photo (from the /ocr result), null if no photo was used
  ocrError?: OcrError; //ocr outcome from the /ocr result: no_text, ocr_failed, partial or null
  decision: string; //the participant's verdict, one of the values from get /api/config
  sharingIntention: string; //would they share it, one of the values from get /api/config
  sourcesOpened: string[]; //source ids (app) or urls (browser) the participant opened
  startedAt: string; //iso time the task started
  endedAt: string; //iso time the decision was submitted
}

//what post /decisions returns
export interface DecisionResponse {
  decisionId: string; //id of the saved decision
  durationMs: number; //how long the task took in milliseconds
}

//one answer button the app can show
export interface ChoiceOptionDto {
  value: string; //what to send back to the backend
  label: string; //default button text
}

//what get /api/config returns, so the app can build its answer buttons from the backend
export interface StudyConfigResponse {
  decisionOptions: ChoiceOptionDto[]; //verdict buttons, currently trust / don't trust / unsure
  sharingOptions: ChoiceOptionDto[]; //sharing question answers, currently yes / no / not sure
}

//what get /health returns
export interface HealthResponse {
  status: "ok"; //always "ok" if the server answered
  uptimeSeconds: number; //how long the server has been running
  timestamp: string; //current server time
  ocr: {
    primary: OcrEngine; //which ocr engine is tried first
    cloudVisionKeyFound: boolean; //false means cloud vision is skipped and tesseract is used
  };
}
