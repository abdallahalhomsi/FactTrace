# Pilot checklist (1–3 people)

The pilot runs the complete study once with 1–3 people, to check that the full flow works and everything is saved before real participants come in. Everything a participant does is the same as in the real study.

## Pilot participant codes

Use **P81, P82, P83**. They fall in groups 1, 2 and 3, so the pilot covers both tool orders and both set orders. Real participants start at **P01**. Leave pilot data out of the analysis (or remove it before the real study).

| Code | Group | Order |
|---|---|---|
| P81 | 1 | FactTrace with Set A, then Browser with Set B |
| P82 | 2 | Browser with Set A, then FactTrace with Set B |
| P83 | 3 | FactTrace with Set B, then Browser with Set A |

Codes already used for testing: P90, P93–P96, P99.

## Before the pilot

- [ ] Docker Desktop open, then `docker compose up -d` (if the database says port 3306 is busy, stop the other MySQL: `net stop MySQL91` in an admin terminal)
- [ ] Backend: `cd backend` then `npm run dev`
- [ ] ngrok running, and its URL in `mobile/.env` (see the README)
- [ ] Expo: `cd mobile` then `npx expo start --clear` (`--clear` makes sure the phone gets the latest code)
- [ ] Study phone: FactTrace open in Expo Go, Do Not Disturb on, Screen Recording in Control Center, enough storage
- [ ] Printed claim cards for the FactTrace trials (the participant scans these with the camera)
- [ ] ESP32: powered on and connected to the laptop's network; the app shows it as connected before the first trial
- [ ] Consent form ready, stored separately from the study data
- [ ] Someone taking notes on problems (see the log at the end)

## During each session

1. Home → **FactTrace vs Browser Study** → enter the code (e.g. `P81`) → **Continue**.
   - [ ] Check the group line at the top of the form matches the table above.
2. The participant fills in the information form → **Save & Start Study**.
3. **Start the screen recording.**
4. The participant does all 16 trials (each tool: one practice trial, then 7 claims), deciding on the ESP32 buttons:
   - FactTrace trials: scan the printed card, check the text, open sources, decide, answer the sharing question.
   - Browser trials: **Start Task**, search in the phone's browser, list the sources used, decide, answer the sharing question.
5. After the first tool's block (trial 8): SUS + NASA-TLX about that tool. After trial 16: about the second tool.
6. **Study complete** → **stop the screen recording.**
7. Copy the recording to the laptop by cable, name it `P81_browser.mp4`, and delete it from the phone (including Recently Deleted).

Write down anything that goes wrong or confuses the participant, with the trial number.

## After each session

From the `backend` folder:

```
npm run check-participant -- P81
```

It checks that the session, all 16 trials (right claim, condition, timing, decision, scoring), both questionnaires and the device presses are saved. **FAIL** means something is missing or wrong. **WARN** means something to look at (e.g. a trial under 3 seconds, or no sources opened).

- [ ] `check-participant` shows no FAIL
- [ ] Screen-recording check (first pilot session; see `docs/source-use-metric.md`, "Not tested yet"):
  - [ ] the recording kept going when the participant switched between FactTrace and the browser
  - [ ] the status bar clock is readable in the video
  - [ ] the video copied to the laptop and plays
  - [ ] someone counted the sources for one browser trial from the video
  - [ ] no notifications appeared
- [ ] Ask the participant: anything confusing, slow or annoying?

After all pilot sessions: `npm run export` and look at `exports/trials.csv` to check the data looks as expected.

## Known issues to look out for

| Issue | What happens | Status |
|---|---|---|
| ESP32 offline or a press not recorded | The app shows the device as offline; the researcher can switch that trial to the on-screen buttons; `check-participant` warns about missing presses | Check the device's Wi-Fi and server address before the session |
| Retake | Each Retake adds another camera screen behind the current one | Small fix, not done yet |
| Browser has an extra "Start Task" tap | One more step than FactTrace; timing is not affected | Note it, decide if it should go |
| Expo shows old code | Changes don't appear on the phone | Restart with `npx expo start --clear` |
| OCR in a web browser | Text extraction fails on the web version | Web only; use the phone |

## Problem log

| Participant | Trial | What happened | Fix / decision |
|---|---|---|---|
| | | | |
