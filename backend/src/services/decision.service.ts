//saves the participant's decision
//mock version: keeps decisions in memory, so they are lost when the server restarts
//manaal's study logging will replace this with mysql, the controller and route stay the same

import { randomUUID } from "crypto"; //makes unique ids
import { ClaimAnswer, DecisionRequest, DecisionResponse } from "../types/api"; //request and response shapes
import { scoreDecision } from "../config/study"; //decides if a choice was right
import { getClaimAnswer } from "./claim.service"; //looks up the stored correct answer

//a saved decision: what the app sent plus a few fields the server adds
interface StoredDecision extends DecisionRequest {
  decisionId: string; //unique id
  durationMs: number; //how long the task took
  receivedAt: string; //when the server got it
  wasCorrect: boolean | null; //accuracy for the study, compared with the claim's stored answer: null for unsure or when there is no claim id
  correctAnswer: ClaimAnswer | null; //snapshot of the claim's answer when the decision was saved
  textWasEdited: boolean | null; //did the participant change the ocr text, null if there was no ocr text
  sourcesOpenedCount: number; //how many different sources were opened
  matchScore01: number | null; //match score turned from 0 to 100 into 0 to 1, rounded to 3 decimals for the database
}

//the server computed values, kept in one function so the mysql insert can use exactly the same rules
export function computeServerFields(input: DecisionRequest) {
  const correctAnswer = input.claimId ? getClaimAnswer(input.claimId) : null; //null when there is no claim
  return {
    durationMs: Date.parse(input.endedAt) - Date.parse(input.startedAt), //end minus start, the controller already checked end is not before start
    correctAnswer,
    wasCorrect: correctAnswer ? scoreDecision(input.decision, correctAnswer) : null, //null for unsure or no claim
    //only meaningful when there was ocr text: compares after trimming spaces at both ends
    textWasEdited: input.originalOcrText !== undefined && input.originalOcrText !== null ? input.originalOcrText.trim() !== input.claimText.trim() : null,
    sourcesOpenedCount: new Set(input.sourcesOpened).size, //duplicates count once
    matchScore01: typeof input.matchScore === "number" ? Math.round(input.matchScore * 10) / 1000 : null, //67 becomes 0.67
  };
}

const decisions: StoredDecision[] = []; //in-memory list, cleared on restart

export function recordDecision(input: DecisionRequest): DecisionResponse {
  //same clientrecordid sent again (for example the phone retried): return the first save instead of storing it twice
  const existing = input.clientRecordId ? decisions.find((d) => d.clientRecordId === input.clientRecordId) : undefined;
  if (existing) return { decisionId: existing.decisionId, durationMs: existing.durationMs };

  const server = computeServerFields(input); //all values the server works out itself
  const stored: StoredDecision = {
    ...input, //everything the app sent
    ...server,
    decisionId: randomUUID(), //new unique id
    receivedAt: new Date().toISOString(), //current time
  };
  decisions.push(stored); //save it
  return { decisionId: stored.decisionId, durationMs: server.durationMs }; //tell the app it worked, never the accuracy
}

//returns every saved decision, only for checking things while developing (no route uses it)
export function getAllDecisions(): readonly StoredDecision[] {
  return decisions;
}