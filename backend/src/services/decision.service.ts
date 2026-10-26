//saves the participant's decision
//mock version: keeps decisions in memory, so they are lost when the server restarts
//manaal's study logging will replace this with mysql, the controller and route stay the same

import { randomUUID } from "crypto"; //makes unique ids
import { DecisionRequest, DecisionResponse } from "../types/api"; //request and response shapes
import { scoreDecision } from "../config/study"; //decides if a choice was right
import { getClaimAnswer } from "./claim.service"; //looks up the stored correct answer

//a saved decision: what the app sent plus a few fields the server adds
interface StoredDecision extends DecisionRequest {
  decisionId: string; //unique id
  durationMs: number; //how long the task took
  receivedAt: string; //when the server got it
  wasCorrect: boolean | null; //accuracy for the study, compared with the claim's stored answer: null for unsure or when there is no claim id
}

const decisions: StoredDecision[] = []; //in-memory list, cleared on restart

//compares the participant's choice with the claim's stored answer
function scoreClaim(input: DecisionRequest): boolean | null {
  if (!input.claimId) return null; //nothing to compare against
  const answer = getClaimAnswer(input.claimId); //stored correct answer
  return answer ? scoreDecision(input.decision, answer) : null; //null if the claim has no answer
}

export function recordDecision(input: DecisionRequest): DecisionResponse {
  const durationMs = Date.parse(input.endedAt) - Date.parse(input.startedAt); //worked out on the server from the two timestamps, never taken from the app
  const stored: StoredDecision = {
    ...input, //everything the app sent
    decisionId: randomUUID(), //new unique id
    durationMs,
    receivedAt: new Date().toISOString(), //current time
    wasCorrect: scoreClaim(input), //scored on the server only, never sent back to the app
  };
  decisions.push(stored); //save it
  return { decisionId: stored.decisionId, durationMs }; //tell the app it worked
}

//returns every saved decision, only for checking things while developing (no route uses it)
export function getAllDecisions(): readonly StoredDecision[] {
  return decisions;
}
