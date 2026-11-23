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

import {
  ClaimAnswer,
} from "../types/api";

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