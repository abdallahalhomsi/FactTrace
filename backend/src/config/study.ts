// Study settings shared by the backend.
//
// Verdict:
//   trust
//   don't trust
//   unsure
//
// Sharing intention:
//   1 = extremely unlikely
//   7 = extremely likely

import { ALLOCATION } from "./allocation";
import {
  ClaimAnswer,
  ConditionOrder,
  SetOrder,
} from "../types/api";

//four counterbalanced groups; which group a participant gets comes from the block-randomised list in allocation.ts
//every tool is used with every claim set, and each set appears first and second equally often
export const STUDY_GROUPS: { conditionOrder: ConditionOrder; setOrder: SetOrder }[] = [
  { conditionOrder: "app_first", setOrder: "a_first" }, //group 1: FactTrace with Set A, then browser with Set B
  { conditionOrder: "browser_first", setOrder: "a_first" }, //group 2: browser with Set A, then FactTrace with Set B
  { conditionOrder: "app_first", setOrder: "b_first" }, //group 3: FactTrace with Set B, then browser with Set A
  { conditionOrder: "browser_first", setOrder: "b_first" }, //group 4: browser with Set B, then FactTrace with Set A
];

//group (1 to 4) for a participant id such as P07: from the randomised list, or a plain rotation past its end
export function groupFor(participantId: string): 1 | 2 | 3 | 4 {
  const n = Number(participantId.replace(/^[pP]/, ""));
  if (n >= 1 && n <= ALLOCATION.length) return ALLOCATION[n - 1];
  return ((((n - 1) % 4) + 4) % 4 + 1) as 1 | 2 | 3 | 4;
}

export interface VerdictOption {
  value: string;
  label: string;
  correctFor: ClaimAnswer[];
}

export interface SharingOption {
  value: string;
  label: string;
}

export const VERDICT_OPTIONS:
VerdictOption[] = [
  {
    value: "trust",
    label: "Trust",
    correctFor: ["true"],
  },

  {
    value: "dont_trust",
    label: "Don't Trust",
    correctFor: [
      "false",
      "misleading",
    ],
  },

  {
    value: "unsure",
    label: "Unsure",

    /*
     * Unsure is never a correct answer.
     *
     * It is still retained separately as
     * decision = "unsure" so Unsure rate
     * can be analysed independently.
     */
    correctFor: [],
  },
];

export const SHARING_OPTIONS:
SharingOption[] = [
  {
    value: "1",
    label: "Extremely unlikely",
  },
  {
    value: "2",
    label: "Very unlikely",
  },
  {
    value: "3",
    label: "Unlikely",
  },
  {
    value: "4",
    label: "Neither likely nor unlikely",
  },
  {
    value: "5",
    label: "Likely",
  },
  {
    value: "6",
    label: "Very likely",
  },
  {
    value: "7",
    label: "Extremely likely",
  },
];

/*
 * Returns:
 *
 * true  = correct verdict
 * false = incorrect verdict, INCLUDING Unsure
 * null  = unknown/invalid verdict that cannot be scored
 */
export function scoreDecision(
  decision: string,
  answer: ClaimAnswer,
): boolean | null {
  const option =
    VERDICT_OPTIONS.find(
      item =>
        item.value ===
        decision,
    );

  if (!option) {
    return null;
  }

  return option.correctFor.includes(
    answer,
  );
}

//the app never shows a verdict: no per-source supports/contradicts line, no curated summary of the answer,
//no overall stance; participants see the sources, what each one reports, and factual provenance only
//used by /api/verify and /api/claims/:id; the fields stay in the database for analysis
export const SHOW_VERDICT_HINTS = false;
