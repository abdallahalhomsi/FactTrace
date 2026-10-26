//study settings that the frontend design may still change
//the decision buttons and sharing answers are defined only here, so changing them is a one-file edit
//the app can read these from get /api/config and build its buttons from them, so nothing is hardcoded twice

import { ClaimAnswer } from "../types/api"; //the stored correct answer of a claim (never sent to the app)

//one decision button: the value the app sends, the label it can show, and which answers make it correct
export interface VerdictOption {
  value: string; //what the app sends in the decision field
  label: string; //text for the button
  correctFor: ClaimAnswer[]; //claim answers for which this choice counts as correct, empty means never scored as correct
}

//one sharing answer
export interface SharingOption {
  value: string; //what the app sends in the sharing intention field
  label: string; //text for the button
}

//current figma (screen 04): trust, don't trust, unsure
//to switch to true / false / misleading later, replace this list, nothing else in the backend changes
export const VERDICT_OPTIONS: VerdictOption[] = [
  { value: "trust", label: "Trust", correctFor: ["true"] }, //right when the claim is true
  { value: "dont_trust", label: "Don't Trust", correctFor: ["false", "misleading"] }, //right when the claim is false or misleading
  { value: "unsure", label: "Unsure", correctFor: [] }, //counted separately, never right or wrong
];

//sharing intention popup shown after the decision
export const SHARING_OPTIONS: SharingOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];

//returns true or false if the choice can be scored, or null for choices like unsure
export function scoreDecision(decision: string, answer: ClaimAnswer): boolean | null {
  const option = VERDICT_OPTIONS.find((o) => o.value === decision); //find the chosen button
  if (!option || option.correctFor.length === 0) return null; //unsure (or unknown) is not scored
  return option.correctFor.includes(answer); //correct if the claim's answer is in the list
}
