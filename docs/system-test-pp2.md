# System test before PP2: results and usability notes

Date: 26 Nov 2026. Tested on the web version of the app (laptop browser at phone size, 390 × 844) against the real backend and database. The phone camera, the physical ESP32 and the screen recording were not part of this test (see "Not covered" below).

## Complete session test

Test participant **P84** (group 4: Browser with Set B, then FactTrace with Set A) went through the whole study using only the app's own buttons, with nothing skipped:

- information form → 2 practice trials → 7 browser trials → SUS + NASA-TLX about the browser → 7 FactTrace trials → SUS + NASA-TLX about FactTrace → Study complete
- every trial was saved and confirmed by the server
- `npm run check-participant -- P84`: session, all 16 trials (right claim, condition, timing, decision, scoring) and both questionnaires correct; only warning: no ESP32 presses (device not connected to the app yet)

Earlier tests (P93–P96) also covered all four counterbalanced groups, the questionnaires, the logging fields and the source counting.

**Note:** these tests ran before Ayesha's PR #24 was merged. That PR changed the trial order (each tool's practice trial now comes right before its block, and claims are shuffled per participant), the group allocation (block-randomised list) and connected the ESP32 decision buttons to the app. The questionnaire timing and `check-participant` were updated to the new order; the complete session should be run once more with the merged app and the ESP32.

## Usability and study problems

### Fixed

| # | Problem | Why it matters | Fix |
|---|---|---|---|
| 1 | NASA-TLX scale marks were 12 × 28 px | Below the 24 × 24 px minimum target (WCAG 2.2, 2.5.8); easy to tap the wrong value on a phone | Added full-size **Lower / Higher** buttons (44 px tall) under each scale, in steps of 5 |
| 2 | The app ignored the claim-set order | Only 2 of the 4 counterbalanced groups were really used, and the database said otherwise | The group comes from the backend and the app follows it |
| 3 | FactTrace time included the sharing question, Browser time did not | Made FactTrace look slower | Both stop at the decision tap |
| 4 | View Full Evidence showed all sources without counting any | FactTrace source use could be 0 even when everything was read | Hidden during study trials |
| 5 | OCR errors and retakes were not saved | Failed scans looked like normal trials | Saved with every FactTrace trial |
| 6 | SUS and NASA-TLX were never asked in the app | No usability or workload data | Questionnaire after each block |
| 7 | Technical error text reached the participant | A failed scan showed "Text extraction failed: this.validatePath is not a function"; a lost connection showed server addresses and setup steps | Only plain-language messages that say what to do next; the technical reason goes to the log |
| 8 | Each **Retake** added another camera screen behind the current one | Back navigation became confusing after several retakes | Retake goes back to the existing camera; tested with two retakes (one camera screen, `ocr_retakes = 2` saved) |

### Open (for the team to decide)

| # | Problem | Why it matters | Suggestion |
|---|---|---|---|
| 9 | ~~The ESP32 is not connected to the app~~ **Resolved by PR #24** | The app now starts a device trial for every study trial, and the ESP32 buttons are the decision input in both conditions | Test with the physical device in the pilot |
| 10 | **Browser time includes typing in the sources** (name and URL for each source) | Typing a URL takes 10–20 s, so the browser condition looks slower for a reason that is not about the tool | Since the browser source count now comes from the screen recording, let participants skip the source list, or list sources after the decision (the timer already stops at the decision) |
| 11 | Browser trials need **Start Trial** and then **Start Task** | Two "start" buttons in a row; participants may wonder whether the task has started | Remove Start Task in study trials (the timer already starts at Start Trial) |
| 12 | Researcher text is shown to the participant | The study screen says "Show this claim to the participant…" and "Verify the saved rows in MySQL"; the browser screen shows "Server submission requires a valid participant code" and an **Export Local Evaluation JSON** button | Hide researcher notes and the export button during study trials, or keep the phone with the researcher between trials |
| 13 | The result shows "STRONG MATCH 100% match" | A participant may read "100%" as "100% true", although it only means the text matched the dataset; the design rules say the system never gives a verdict | Change the wording to e.g. "Text match: 100%", and check in the pilot how participants read it |

## Not covered by this test

- **The phone camera and OCR**: on the web version scanning does not work, so the claim text was typed in. Scan the printed claim cards on the phone in the pilot.
- **The physical ESP32**: the backend side was tested by simulating the device (27/27 checks), but not the real light and buttons.
- **Screen recording** on the study phone (checklist in `docs/source-use-metric.md`).
- **Real participants**: none of the above replaces the 1–3 person pilot (`docs/pilot-checklist.md`), which is where problems 10–13 should be watched for.
