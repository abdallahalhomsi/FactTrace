# Data privacy during the study

Three rules: **participant codes only**, **consent forms stored separately**, **screen recordings deleted after coding**. The repository is public, so no participant data may ever be committed.

## 1. Participant codes only

Every participant gets a code (`P01`, `P02`, …), assigned in order. The code decides the counterbalanced group, so codes are never skipped or reused.

What the system already enforces:
- All study tables (`study_sessions`, `decisions`, `questionnaire_responses`, `hardware_events`, `browser_source_coding`) only accept codes in the form `P` + 1–3 digits. A name or student ID is rejected by the database.
- The participant information form asks for no name, student ID or email, and says so at the top.
- The backend log prints only the request line (for example `POST /api/decisions 201`), never what was sent.
- Study trials are never added to an account's History on the phone, so a logged-in account cannot collect participants' checks.
- `.gitignore` blocks exports (`/backend/exports/`, `*.csv`), recordings (`*.mp4`, `*.mov`, `*.m4v`, `/recordings/`) and scanned consent forms (`/consent/`).

What the researchers must do:
- Never write a name next to a code: not in notes, file names, the problem log or the coding sheets' `notes` column.
- The optional "name of a fact-checking tool" and "notes" fields are free text. Do not put anything that identifies a person in them.
- Do not log in with a personal account on the study phone during sessions.

## 2. Consent forms stored separately

- Consent forms are signed on paper (or as a scan) and kept by one named team member, in a separate folder from all study data. They never go into the repository, the shared drive with the data, or the exports folder.
- **Do not write the participant code on the consent form**, and do not keep a list that links names to codes. The study data then cannot be traced back to a person.
- Trade-off to agree on as a team: without a name–code link, a participant cannot withdraw their data after leaving, because we cannot find it. If the team wants to allow later withdrawal, keep one name–code list on paper, stored with the consent forms (not with the data), and destroy it when data collection ends. Say which option you chose in the consent form.
- The consent form should also ask people with photosensitive epilepsy not to take part (the ESP32 light blinks; see `docs/device-signal-spec.md`).

## 3. Screen recordings deleted after coding

Recordings show everything on the phone screen, so they are the most sensitive data in the study.

- Do Not Disturb on the study phone during every session, so no notifications (names, messages) are recorded.
- After each session: copy the recording to the study laptop by cable, name it with the code only (`P07_browser.mp4`), keep it in one local folder that is not synced to iCloud, Google Drive or OneDrive, and delete it from the phone, including **Recently Deleted**.
- Only the two coders watch the recordings.
- When the final counts are imported (`npm run coding -- finalize` and `import final`, see `docs/source-use-metric.md`), delete all recordings, empty the Recycle Bin, and fill in the log below.

| Recording | Coded (final count imported) | Deleted on | Deleted by |
|---|---|---|---|
| P01_browser.mp4 | | | |

## Other places data goes

| Where | What | Action |
|---|---|---|
| Study phone (app storage) | Every decision is also saved on the phone (codes only), and the browser screen's "Export Local Evaluation JSON" button can export them | After data collection, remove the app's data from the phone (delete and reinstall Expo Go, or clear its storage) |
| Study laptop: database and `backend/exports/` | All study data (codes only) | Keep only on the study laptop; delete when the course no longer needs it |
| ngrok | The connection between the phone and the laptop passes through ngrok's servers (encrypted, HTTPS) | Use the HTTPS address only; stop ngrok after each session |
| Google Cloud Vision | Photos of the printed claim cards, for OCR | Photograph only the claim card, never people; the camera frame crops to the card |

## Before the real study starts

- [ ] Remove test and pilot data from the database (test codes P90, P93–P96, P99; pilot codes P81–P83; P84 from the system test), or start from a fresh database (`docker compose down -v` then `docker compose up -d`)
- [ ] Study phone: no personal account logged in in FactTrace, Do Not Disturb set up
- [ ] Consent forms printed, and the person who keeps them agreed
- [ ] The team has agreed on the withdrawal option in section 2
