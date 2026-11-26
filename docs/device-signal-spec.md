# FactTrace device: purpose and signal specification

Written by Ayesha, reviewed and agreed by Manaal (26 Nov 2026). The firmware (`firmware/facttrace_device/`) implements exactly this table.

**Decisions agreed on 26 Nov:** blue for match results and white for system states; no buzzer in the first build (`BUZZER_ON = false`, one short beep can be added later if the buttons feel too "dead" without it); the consent form asks people with photosensitive epilepsy not to take part.

## Purpose of the device

The ESP32 device is where the participant records their decision, and it shows the state of the check without leaving the claim.

1. **Same decision input in both conditions.** In the FactTrace condition and the browser condition the decision is made with the same three physical buttons, so decision time and the decision itself are recorded the same way. Without the device, the browser condition would need a different input (a form or the experimenter), which would confound the tool comparison.
2. **Discrete, precise timing.** The device makes the decision a single physical event (t3) that the server timestamps, next to the trial start (t0), scan start (t1) and result shown (t2). This splits time into processing time and evidence-reading time, which a screen tap cannot separate as cleanly.
3. **Situated check before sharing.** The light gives a glanceable status of the check (waiting, checking, result available, decision recorded) so the participant can keep looking at the claim card and the evidence instead of watching for screen updates. It shows the state of the system, never whether the claim is true.

## Design rules

- **No verdict.** The device never signals true or false. Match results describe how well the scanned text matched the curated dataset, not whether the claim is true. A strong match on a false claim must look the same as a strong match on a true claim.
- **No green or red.** Green and red read as right and wrong (traffic lights), so they are not used. System states are white; match results are blue. Blue has no right/wrong meaning.
- **Colour never carries meaning alone.** Every state has a different pattern (steady, slow blink, double blink, breathing), so the device works for people with colour vision deficiencies and the app shows the same state in words (WCAG 2.2, 1.4.1 Use of Color).
- **At most 3 flashes per second, no red flashing** (WCAG 2.2, 2.3.1 Three Flashes or Below Threshold). Brightness is kept moderate.
- **Few states to learn.** The participant sees five patterns: ready, checking, three match results; plus one confirmation after a press. They are shown during the practice trials.
- **Buttons:** three identical, neutral-coloured buttons with printed labels in a fixed order: **Trust · Unsure · Don't trust**. No coloured buttons, so the buttons do not suggest an answer.

## Light states (what the participant sees)

| Backend state | When | Light | Pattern (ms) | App shows | Button press |
|---|---|---|---|---|---|
| `idle` | No trial running, or decision recorded | Off | — | — | Ignored (no active trial) |
| `ready` | Trial started (t0). App: before scanning. Browser: the whole trial | White, dim (30%) | Steady | Claim to check / search in browser | Accepted |
| `processing` | OCR or matching running (t1) | White | Breathing: fades up and down over 1500, no hard flashes | "Checking…" | Rejected, "not recorded" pattern |
| `strong_match` | Result shown (t2), close match in the dataset | Blue, full | Steady | "Strong match" + sources | Accepted |
| `weak_match` | Result shown (t2), partial match or uncertain scan | Blue, full | Slow blink: on 500, off 500 (1 Hz) | "Possible match, check it is the claim you saw" + sources | Accepted |
| `no_match` | Result shown (t2), no match in the dataset | Blue, full | Double blink: on 150, off 150, on 150, off 1050 (repeats every 1.5 s) | "No close match" | Accepted |

In the browser condition the light stays on `ready` for the whole trial, because FactTrace does not check the claim; only the buttons are used.

## Feedback after a button press

| Event | Light | Pattern (ms) | App shows |
|---|---|---|---|
| Press recorded (server answers 201) | White | One flash: on 300, then off (`idle`) | "You chose Trust / Unsure / Don't trust. Recorded." (the choice, never right or wrong) |
| Press not recorded (server answers 409: no trial, result not ready, already answered, wrong trial) | White, dim | Three short blinks: on 100, off 233, three times (3 per second), then back to the previous state | Nothing; the experimenter sees it in the app status |
| Buzzer (not used in the first build, decided 26 Nov) | — | If added later: one short beep (100) on a recorded press, the same for all three buttons | — |

The same feedback follows every button, so the feedback cannot hint at the answer. The correct answers are revealed only at the debrief.

## States for the experimenter (not part of the task)

| Situation | Light | Pattern (ms) |
|---|---|---|
| Starting up / connecting to Wi-Fi | White, dim | One blink every 2 s: on 200, off 1800 |
| Wi-Fi or server lost | White, dim | Same as connecting; the app shows "device offline" after 2 s without a poll |

## Timing and communication

| Item | Value | Why |
|---|---|---|
| Device polls `GET /api/device/state` | Every 300 ms | Light change within about 0.3 s of the server state change |
| Device online in the app | Poll within the last 2000 ms (`ONLINE_WINDOW_MS`) | Shows a disconnected device before the trial starts |
| Button debounce | 50 ms | Ignores contact bounce |
| One decision per trial | First accepted press only; the server rejects later presses (409) | One t3 per trial |
| Press sent as | `POST /api/device/decision` `{ deviceId, trialIndex, decision }` with the trialIndex from the last poll | A press is tied to the trial the participant saw |
| Retry | Retry on network error only, never on 409 | A 409 means the press cannot be used |
| Timestamps | t0–t3 taken by the server clock | All four times on one clock |

Known timing error: the light changes 0 to 0.3 s (one poll interval, about 0.15 s on average) after the server state changes. The delay varies from trial to trial, so it adds a little random noise, not a fixed offset, but it cannot favour either condition. It does not affect the recorded times: a press is sent straight away (at most after a request already in progress), not on the next poll, so t3 is stamped when it reaches the server, and in the FactTrace condition the phone shows the result at t2 regardless of the light. It is reported as a limitation.

## Linked metrics

| Device event / field | Metric |
|---|---|
| Button press (decision) | Truth discernment (trust rate true − trust rate not true), accuracy, Unsure rate |
| t2 − t1 | Processing time (FactTrace condition) |
| t3 − t2 | Evidence-reading time (FactTrace condition) |
| t3 − t0 | Time to decision (both conditions, same input) |
| Light at press (`light_at_press`) | Whether the decision was made before or after a result, and decisions by match strength |
| Rejected presses | Usability problem count (formative test) |

## Cognitive load

- Three buttons only (Hick's law: fewer choices, faster decisions).
- Five task patterns, all introduced in the practice trials; each match result keeps the same colour (blue) and differs only in a clearly different rhythm (steady, slow, double).
- The light only shows the state of the check; the evidence itself stays on the phone screen.
- Workload is measured with raw NASA-TLX after each block, so the effect of the device on workload is tested, not assumed.

## Target population

Sabancı University students (18+), with normal or corrected vision. Colour vision deficiencies are covered because no state relies on colour alone. Participants with photosensitive epilepsy are protected by the 3-flashes rule and moderate brightness, and the consent form asks people with photosensitive epilepsy not to take part (agreed 26 Nov).

## "What if" answers

- **What if the light were grey (or another colour) instead of blue?** Meaning is carried by the pattern and the app label, not by the colour, so another neutral colour would work. We avoid green and red because they read as true and false, and grey on an LED is hard to tell apart from dim white.
- **What if a strong match lit green?** A false claim with a strong match would then show green, which reads as "true". That would be a verdict, and a wrong one.
- **What if the buttons were coloured?** Green Trust and red Don't trust would hint at an answer and clash with the light. Neutral buttons with printed labels avoid both.
- **What if the participant presses during "checking"?** The press is rejected with three short blinks and the light returns to "checking"; they press again once the result appears.
- **What if Wi-Fi drops?** The light goes to the slow connecting blink, the app shows "device offline", and the trial can be restarted; the server never records a press without an active trial.
