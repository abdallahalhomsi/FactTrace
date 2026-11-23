//keeps track of the one active trial for the esp32 device: light state, button press and timing
//kept in memory because only one device and one participant run at a time; a server restart resets it to idle

import { pool } from "../db/mysql"; //database connection
import { AppError } from "../utils/AppError"; //standard error type

export type DeviceCondition = "app" | "browser";
//idle: light off, no trial | ready: white, trial running (browser condition, or app before a result)
//processing: blue, ocr or matching running | strong_match / weak_match / no_match: the match result
export type DeviceLight = "idle" | "ready" | "processing" | "strong_match" | "weak_match" | "no_match";
export type MatchLight = "strong_match" | "weak_match" | "no_match";

const ONLINE_WINDOW_MS = 2000; //the device counts as connected if it polled within this time

interface DeviceTrial {
  participantId: string | null;
  trialIndex: number | null;
  claimId: string | null;
  condition: DeviceCondition | null;
  state: DeviceLight;
  resultState: MatchLight | null; //last match result in this trial, so ocr on a rescan can return to it
  startedAt: Date | null; //when the app started the trial (server clock)
  resultShownAt: Date | null; //when the last match result was sent (app condition only)
  buttonPressed: boolean;
  decision: string | null;
}

const IDLE: DeviceTrial = {
  participantId: null,
  trialIndex: null,
  claimId: null,
  condition: null,
  state: "idle",
  resultState: null,
  startedAt: null,
  resultShownAt: null,
  buttonPressed: false,
  decision: null,
};

let current: DeviceTrial = { ...IDLE }; //starts idle, so the light stays off until the app starts a trial
let lastPollAt = 0; //last time the esp32 polled, in ms

//true while a trial has started and has no decision yet
function trialOpen(): boolean {
  return current.trialIndex !== null && !current.buttonPressed;
}

//what the esp32 needs: the light state and the trial to echo back when a button is pressed
//also records the poll time, which is how the backend knows the device is connected
export function getDeviceState(): { state: DeviceLight; trialIndex: number | null } {
  lastPollAt = Date.now();
  return { state: current.state, trialIndex: current.trialIndex };
}

//what the app needs: the trial, whether its button was pressed, and whether the device is connected
export function getDeviceStatus(): {
  trialIndex: number | null;
  decisionRecorded: boolean;
  decision: string | null;
  state: DeviceLight;
  deviceOnline: boolean;
} {
  return {
    trialIndex: current.trialIndex,
    decisionRecorded: current.buttonPressed,
    decision: current.decision,
    state: current.state,
    deviceOnline: Date.now() - lastPollAt <= ONLINE_WINDOW_MS,
  };
}

//called by the app at the start of every trial in both conditions; the light shows ready (white) in both
export function startTrial(participantId: string, trialIndex: number, claimId: string, condition: DeviceCondition): void {
  current = {
    ...IDLE,
    participantId,
    trialIndex,
    claimId,
    condition,
    state: "ready",
    startedAt: new Date(),
  };
}

//called by the app when the session ends or is abandoned, so the light turns off
export function endTrial(): void {
  current = { ...IDLE };
}

//called when /api/ocr or /api/verify starts, only changes the light during an open app trial
export function markProcessing(): void {
  if (current.condition === "app" && trialOpen()) current.state = "processing";
}

//called when /api/ocr finishes (or /api/verify fails): back to the last result, or ready if there is none yet
export function markDoneProcessing(): void {
  if (current.condition === "app" && trialOpen() && current.state === "processing") {
    current.state = current.resultState ?? "ready";
  }
}

//called when /api/verify returns, with its matchStatus (strong_match, weak_match or no_match)
export function updateMatchState(matchStatus: MatchLight): void {
  if (current.condition === "app" && trialOpen()) {
    current.state = matchStatus;
    current.resultState = matchStatus;
    current.resultShownAt = new Date();
  }
}

//called when a physical button is pressed; trialIndex is the one the esp32 last received
export async function recordHardwareDecision(trialIndex: number, decision: string): Promise<void> {
  if (current.participantId === null || current.trialIndex === null || current.condition === null || current.claimId === null) {
    throw new AppError("DEVICE_CONFLICT", "No active trial");
  }
  if (trialIndex !== current.trialIndex) {
    throw new AppError("DEVICE_CONFLICT", "Button press belongs to a different trial");
  }
  if (current.buttonPressed) {
    throw new AppError("DEVICE_CONFLICT", "Decision already recorded for this trial");
  }
  if (current.state === "processing") {
    throw new AppError("DEVICE_CONFLICT", "Result not ready yet");
  }

  //save first, and only mark the trial as answered if the save worked, so a failed save can be retried
  await pool.execute(
    `INSERT INTO hardware_events
       (participant_id, trial_index, claim_id, study_condition, match_state, decision, trial_started_at, result_shown_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      current.participantId,
      current.trialIndex,
      current.claimId,
      current.condition,
      current.state, //what the light showed when the button was pressed
      decision,
      current.startedAt,
      current.resultShownAt,
    ]
  );

  current.buttonPressed = true;
  current.decision = decision;
  current.state = "idle"; //light off once the decision is made
}
