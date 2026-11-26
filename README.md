# FactTrace

**Mobile Provenance Verification Lens**  
CS 449 / CS 549 — Human-Computer Interaction  
Sabancı University — Fall 2026–27

---

## Overview

FactTrace is a mobile verification application designed to help users investigate claims before deciding whether to trust them.

The application allows users to enter or scan a claim, send it to the FactTrace backend, retrieve matching evidence and source information, and review the result through a mobile interface.

The project is being developed as part of the CS 449 / CS 549 Human-Computer Interaction final project.

---

## Main Application Flow

```text
Claim Input
    ↓
Claim Review
    ↓
Backend Verification
    ↓
Match Result
    ↓
Evidence and Sources
    ↓
User Review
```

---

# Current Implementation Status

The core FactTrace application is implemented and integrated.

Current working functionality includes:

- React Native + Expo mobile application
- TypeScript frontend
- Navigation between the main application screens
- Manual claim entry
- Claim review
- Strong-match handling
- Weak-match handling
- No-match handling
- Weak-match warning ("Possible match")
- Evidence display
- Source details
- Backend integration
- Node.js + Express backend
- MySQL database
- Docker development environment
- REST API integration
- Physical iPhone testing through Expo Go
- ngrok backend tunneling
- TypeScript compilation checks

The main application flow has been tested successfully on a physical iPhone.

Study features (FactTrace vs. browser search):

- Guided participant flow: anonymous participant code, information form, 2 practice trials and two blocks of 7 claims
- Browser comparison screen for the baseline condition
- Counterbalancing in 4 groups (tool order × claim-set order), assigned automatically from the participant code
- SUS and NASA-TLX after each block, saved and scored by the backend
- Logging of every trial: start, end and duration, claim, decision, sharing intention, sources opened, correctness, match result, OCR errors and retakes, app version
- Source-use measurement: counted by the app in the FactTrace condition, counted from screen recordings by two coders in the browser condition
- ESP32 decision device: firmware, signal specification and backend endpoints (the app does not start device trials yet, see Known Limitations)

The complete study session (16 trials and both questionnaires) has also been tested end to end on the web version of the app.

---

# Technology Stack

## Mobile

- React Native
- Expo
- TypeScript
- React Navigation
- Expo Go

## Backend

- Node.js
- Express
- TypeScript
- REST API

## Database

- MySQL 8
- Docker
- Docker Compose

## Development and Networking

- ngrok
- Expo Tunnel

## Design and Collaboration

- Figma
- GitHub
- GitHub Branches
- Pull Requests

---

# Repository Structure

```text
FactTrace/
│
├── mobile/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── App.tsx
│   ├── package.json
│   └── .env
│
├── backend/
│   ├── src/
│   ├── secrets/
│   ├── package.json
│   ├── .env
│   └── .env.example
│
├── database/
│   ├── schema.sql
│   └── seed_claims.sql
│
├── docs/
│   ├── api-contract.md
│   └── architecture.md
│
├── docs/ (other study documents)
│   ├── claim-set-gold-standard.md
│   ├── device-signal-spec.md
│   ├── hci-accessibility-review.md
│   ├── source-use-metric.md
│   ├── pilot-checklist.md
│   ├── system-test-pp2.md
│   └── data-privacy.md
│
├── firmware/
│   ├── facttrace_device/
│   └── test/
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# First-Time Setup

These steps are required when setting up FactTrace on a new computer for the first time.

## 1. Install Required Software

Install:

- Git
- Node.js
- npm
- Docker Desktop
- ngrok
- Expo Go on the physical phone

For Apple Silicon Macs such as M1, M2, M3, and M4, install the Apple Silicon version of Docker Desktop.

---

## 2. Clone the Repository

```bash
git clone https://github.com/abdallahalhomsi/FactTrace.git
cd FactTrace
```

---

## 3. Install Backend Dependencies

From the repository root:

```bash
cd backend
npm install
cd ..
```

---

## 4. Install Mobile Dependencies

```bash
cd mobile
npm install
cd ..
```

If Expo packages need to be restored, run:

```bash
cd mobile
npm install
cd ..
```

---

# Environment Files

FactTrace uses two separate environment files:

```text
backend/.env
mobile/.env
```

These files have different purposes.

Do not commit `.env` files or secret credentials to GitHub.

---

# Backend Environment File

Create:

```text
backend/.env
```

The easiest method is:

```bash
cd backend
cp .env.example .env
```

Use the following development configuration:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
MAX_IMAGE_MB=10

GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-key.json
OCR_PRIMARY=cloud_vision

FACT_CHECK_API_KEY=

MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=facttrace123
MYSQL_DATABASE=facttrace
```

The backend runs locally on:

```text
http://localhost:3000/api
```

---

# Mobile Environment File

Create:

```text
mobile/.env
```

The mobile application must point to the current public ngrok address of the backend.

Example:

```env
EXPO_PUBLIC_API_BASE_URL=https://example.ngrok-free.dev
```

Do not add `/api` to the end of this value.

The frontend adds the API endpoint paths itself.

Example final requests:

```text
https://example.ngrok-free.dev/api/health
https://example.ngrok-free.dev/api/config
https://example.ngrok-free.dev/api/verify
```

The ngrok URL can change whenever a new ngrok session is started.

When the URL changes:

1. Copy the new ngrok HTTPS address.
2. Open `mobile/.env`.
3. Replace the old URL.
4. Save the file.
5. Restart Expo.

---

# How to Run FactTrace Every Time

After the first-time setup is complete, use the following routine every time the project is started.

You will normally use:

- Docker Desktop
- MySQL
- Backend server
- ngrok
- Expo
- Physical phone

The easiest setup uses three terminal windows.

---

# Step 1 — Open Docker Desktop

Open Docker Desktop.

Wait until Docker is running.

Docker Desktop must remain open while FactTrace is running.

---

# Step 2 — Start MySQL

Open a terminal at the root of the project:

```bash
cd ~/Desktop/FactTrace
```

Run:

```bash
docker compose up -d
```

Check the container:

```bash
docker compose ps
```

The MySQL container should appear as running.

Because Docker is started with `-d`, the container runs in the background.

On the first start, Docker creates the database and loads `database/schema.sql` and `database/seed_claims.sql` automatically.

---

# Step 3 — Terminal 1: Start the Backend

Open the first terminal window.

Run:

```bash
cd ~/Desktop/FactTrace/backend
npm run dev
```

Keep this terminal open.

A normal backend startup looks like:

```text
[mysql] connection OK
[mysql] loaded 50 claims
FactTrace backend listening on http://localhost:3000/api (development)
```

The backend loads the claims from MySQL when it starts. If MySQL is not running or has no claims, it stops with a message saying what to fix. Start Docker (Step 2) and run `npm run dev` again.

---

# Step 4 — Terminal 2: Start ngrok

Open a second terminal window.

Run:

```bash
ngrok http 3000
```

Keep this terminal open.

ngrok will display a forwarding URL similar to:

```text
https://example.ngrok-free.dev
```

Copy the HTTPS URL.

---

# Step 5 — Update `mobile/.env`

Open:

```text
mobile/.env
```

Set:

```env
EXPO_PUBLIC_API_BASE_URL=https://example.ngrok-free.dev
```

Replace the example URL with the current ngrok URL.

Do not add `/api`.

Save the file.

---

# Step 6 — Check the Public Backend URL

The public health endpoint will be:

```text
https://example.ngrok-free.dev/api/health
```

You can open this address in a browser to confirm that the backend is reachable.

A successful response should contain:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

---

# Step 7 — Terminal 3: Start Expo

Open a third terminal window.

Run:

```bash
cd ~/Desktop/FactTrace/mobile
npx expo start --tunnel -c
```

Keep this terminal open.

Expo will display a QR code for opening the development project.

Open Expo Go on the iPhone and connect to FactTrace.

---

# Required Running Setup

While developing or testing FactTrace, keep the following running:

```text
Docker Desktop
│
└── MySQL container

Terminal 1
│
├── cd backend
└── npm run dev

Terminal 2
│
└── ngrok http 3000

Terminal 3
│
├── cd mobile
└── npx expo start --tunnel -c

Physical iPhone
│
└── Expo Go → FactTrace
```

---

# Complete Connection Path

```text
iPhone
    ↓
Expo Go / FactTrace
    ↓
ngrok
    ↓
localhost:3000
    ↓
Node.js / Express Backend
    ↓
MySQL
```

---

# Quick Start for Returning Development Sessions

Once the project has already been set up, use these steps.

## 1. Open Docker Desktop

Then from the repository root:

```bash
docker compose up -d
```

---

## 2. Start the Backend

Terminal 1:

```bash
cd ~/Desktop/FactTrace/backend
npm run dev
```

---

## 3. Start ngrok

Terminal 2:

```bash
ngrok http 3000
```

Copy the new HTTPS ngrok URL.

---

## 4. Update the Mobile Environment URL

Open:

```text
mobile/.env
```

Set:

```env
EXPO_PUBLIC_API_BASE_URL=https://CURRENT-NGROK-URL.ngrok-free.dev
```

Save the file.

---

## 5. Start Expo

Terminal 3:

```bash
cd ~/Desktop/FactTrace/mobile
npx expo start --tunnel -c
```

---

## 6. Open FactTrace

Open Expo Go on the iPhone and launch the FactTrace project.

The application is now ready to use.

---

## Inspecting Study Data

During the study, use `backend/src/scripts/inspect.sql` to check progress, verify data, and catch problems.

**Run all queries:**

```bash
docker exec -i facttrace-mysql mysql -u root -pfacttrace123 facttrace < backend/src/scripts/inspect.sql
```
**Run individual queries interactively:**

```bash
docker exec -it facttrace-mysql mysql -u root -pfacttrace123 facttrace
```  
**Export the full dataset to CSV:**  

```bash
cd backend
npm run export
```

This writes four files to `backend/exports/` (gitignored, never commit them):

- `trials.csv`: one row per decision, with the claim's answer and set, the participant's group, the light at the press and the device times (`processing_ms`, `evidence_ms`, `device_time_to_decision_ms`)
- `sessions.csv`: the background questionnaire and counterbalanced group
- `questionnaires.csv`: SUS and NASA-TLX items and scores per condition
- `hardware_events.csv`: every button press with its timestamps
- `browser_source_coding.csv`: source counts from the browser screen recordings (coder 1, coder 2 and final)

`trials.csv` also includes `browser_video_source_count`, the final screen-recording source count for browser trials.

**Check one participant after a session:**

```bash
cd backend
npm run check-participant -- P07
```

This checks that the session, all 16 trials (claim, condition, timing, decision and scoring), both questionnaires and the device presses are saved. FAIL means something is missing or wrong; WARN means something to look at.

**Code the browser screen recordings** (after data collection, see `docs/source-use-metric.md`):

```bash
cd backend
npm run coding -- sheet                       # one blank sheet per coder
npm run coding -- import coder1 sheet1.csv    # then the same for coder2
npm run coding -- agreement                   # agreement, ICC and the trials to discuss
npm run coding -- finalize                    # agreed counts become final
npm run coding -- import final agreed.csv     # counts agreed after discussion
```

**Analyse the results:**

```bash
cd backend
npx tsx src/scripts/analyze-study.ts
```

For browser trials, the analysis uses the final screen-recording count as source use.


# Verification States

FactTrace currently supports three matching states.

## Strong Match

```text
strong_match
```

The submitted claim closely matches an entry available through the backend.

---

## Weak Match

```text
weak_match
```

The application shows that the match is uncertain.

The result is labelled:

```text
POSSIBLE MATCH
```

with the message "FactTrace found evidence that may be related to your claim. Review the sources carefully." The user can then review the sources and make a decision.

---

## No Match

```text
no_match
```

The backend did not find a sufficiently close match.

---

# Evidence and Sources

Verification results may include:

- Original claim
- Matched claim
- Match score
- Match explanation
- Evidence summary
- Source title
- Source organization
- Author
- Publication date
- Source type
- Original source URL
- Additional source details

The user can inspect the available sources before making a decision.

---

# API

The full API contract is documented in:

```text
docs/api-contract.md
```

Main endpoints include:

```text
GET  /api/health
GET  /api/config

POST /api/ocr
POST /api/verify
POST /api/decisions
POST /api/sessions
GET  /api/study/claims
GET  /api/study/assignment?participantId=P07
POST /api/questionnaires

GET  /api/device/state?deviceId=dev1
GET  /api/device/status
POST /api/device/trial
POST /api/device/end
POST /api/device/decision

POST /api/claims/match
GET  /api/claims/:id
```

`GET /api/study/claims` returns the practice claims and the two study sets (A and B) in order, without answers. The app uses it for the participant flow and sends each `claimId` to `/api/decisions` in both conditions.

`GET /api/study/assignment` returns a participant's counterbalanced group (tool order and claim-set order); the app uses it so the order is never chosen by hand. `POST /api/questionnaires` saves the SUS and NASA-TLX answers after each block. The `/api/device/...` endpoints are used by the ESP32 device and the app (see `docs/device-signal-spec.md`).

---

# API Response Format

Successful responses follow:

```json
{
  "success": true,
  "data": {}
}
```

Failure responses follow:

```json
{
  "success": false,
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

---

# Study Claims

The database holds 50 real claims (18 true, 16 false, 16 misleading), each checked against fact checks or official sources. They are in `database/seed_claims.sql`.

16 of them are used in the study: 2 practice claims, set A (7) and set B (7). The other 34 stay in the database as extras and for matching tests.

The full list of claim IDs, with their study set, is in `docs/api-contract.md`.

## Test Inputs

Send these to `POST /api/verify` to see each match state:

- Strong match: `Mount Everest is the tallest mountain on Earth.`
- Weak match: `Einstein said insanity is doing the same thing`
- No match: `The moon is made of cheese`
- QR scan: `{ "source": "qr", "claimId": "claim_16" }`

---

# Useful Development Commands

## Mobile TypeScript Check

```bash
cd mobile
npx tsc --noEmit
```

---

## Backend TypeScript Check

```bash
cd backend
npm run typecheck
```

---

## Start Backend

```bash
cd backend
npm run dev
```

---

## Start Expo

```bash
cd mobile
npx expo start --tunnel -c
```

---

## Start ngrok

```bash
ngrok http 3000
```

---

## Start MySQL

From the repository root:

```bash
docker compose up -d
```

---

## Check MySQL Status

```bash
docker compose ps
```

---

## Stop Docker Containers

```bash
docker compose down
```

---

## Reload the Claims After Pulling Changes

Docker only loads `seed_claims.sql` when the database is first created. After pulling new claims or schema changes, recreate the database from the repository root:

```bash
docker compose down -v
docker compose up -d
```

This also deletes saved test decisions and sessions, so export them first if you need them.

To add a new table to an existing database without deleting anything (for example `browser_source_coding`), run only that table's `CREATE TABLE` statement from `database/schema.sql`.

---

## Code Changes Not Showing in the App

Stop Expo and start it again with a cleared cache:

```bash
cd mobile
npx expo start --tunnel -c
```

---

## Try the App in a Laptop Browser

```bash
cd mobile
npx expo start --web
```

The camera and OCR do not work in the browser; type the claim on the review screen instead.

---

## Port 3306 Already in Use (Windows)

If `docker compose up -d` says port 3306 is not available, another MySQL installed on the computer is running. Stop it in an administrator terminal (for example `net stop MySQL91`), then start Docker again. Start it again later with `net start MySQL91`.

---

## Data Checks

```bash
cd backend
npm run test:questionnaire          # SUS and NASA-TLX scoring
npm run check-participant -- P07    # one participant's saved data
```

ESP32 light patterns (no device needed), from the repository root:

```bash
g++ -std=gnu++17 -o test_signals firmware/test/test_signals.cpp && ./test_signals
```

---

# Team

## Abdallah Al Homsi

- Team lead
- Frontend foundation
- Core verification flow
- Shared frontend services and types
- Frontend/backend integration
- End-to-end testing

## Mazen

- Figma
- UI/UX design

## Rand

- Frontend continuation
- Verification History
- Profile
- Login / Signup
- Guest and logged-in behavior
- Evidence interface
- API integration support
- Browser-search comparison interface
- Study readiness: SUS and NASA-TLX in the app, counterbalanced claim-set order, logging checks, source-use metric and screen-recording coding, ESP32 check, pilot checklist, system test and data privacy procedure

## Manal and Ayesha

- Backend development
- Node.js / Express / TypeScript
- Verification services
- MySQL
- API contract
- Backend integration

---

# HCI Evaluation

The planned evaluation compares:

```text
FactTrace
vs.
Standard Browser Search
```

Evaluation measures include:

- Verification accuracy
- Verification time
- Source use

## Study Design

- Within-subjects: every participant uses both tools.
- Independent variable: tool (FactTrace, browser search).
- Counterbalancing: 4 groups crossing tool order (FactTrace first / browser first) with claim-set order (Set A first / Set B first). The group follows from the participant code (P01 → group 1, P02 → group 2, …, P05 → group 1).
- One H0 / H1 pair per dependent variable: H0 says the tools do not differ on that measure, H1 says they do.

## Dependent Variables

| Measure | How it is measured |
|---|---|
| Truth discernment | Trust rate for true claims minus trust rate for false and misleading claims; accuracy and Unsure rate are also reported |
| Verification time | From Start Trial to the decision tap (`duration_ms`), the same in both conditions |
| Source use | Distinct evidence sources inspected before the decision (`docs/source-use-metric.md`); in the browser condition, counted from screen recordings by two coders |
| Sharing intention | 1–7 rating of how likely the participant would share the claim |
| Usability | SUS after each block |
| Workload | Raw NASA-TLX after each block |

## Materials

- 16 claims from the curated dataset: 2 practice claims, Set A (7) and Set B (7). Each set has 3 true and 4 false or misleading claims, with matched topics (`docs/claim-set-gold-standard.md`).
- FactTrace on the study iPhone (Expo Go), connected to the backend on the study laptop.
- Printed claim cards for the FactTrace condition.
- ESP32 decision device with three buttons and a status light (`docs/device-signal-spec.md`).

## Trial Procedure

| Step | FactTrace | Browser |
|---|---|---|
| 1 | "Had you seen or heard this claim before?" (study trials only) | same |
| 2 | Start Trial | Start Trial, then Start Task |
| 3 | Scan the claim card and check the text | Search in the phone's browser |
| 4 | Open sources (View source) | Open pages and list each source used |
| 5 | Decide: Trust, Unsure or Don't Trust | same |
| 6 | Sharing question (1–7) | same |

## Session Procedure

1. Consent form, stored separately from the study data.
2. The researcher enters the participant code; the app loads the group.
3. Participant information form.
4. Screen recording starts.
5. Two practice trials, one with each tool.
6. Block 1: 7 claims with the first tool, then SUS and NASA-TLX.
7. Block 2: 7 claims with the other tool and the other claim set, then SUS and NASA-TLX.
8. Screen recording stops; the researcher runs `npm run check-participant`.

The step-by-step version for researchers is in `docs/pilot-checklist.md`.

## Participants and Privacy

- Sabancı University students aged 18 or over, with normal or corrected vision.
- Participants are identified only by codes (P01, P02, …). Consent forms are kept separately from the data, and screen recordings are deleted after coding (`docs/data-privacy.md`).

## Known Limitations

- The app does not start ESP32 device trials yet, so device presses are not recorded during a session. The team still has to decide whether the device or the on-screen buttons are the official decision input.
- Browser verification time includes typing in the sources used.
- Browser trials have one more step (Start Task) than FactTrace trials.
- Phone camera scanning, the physical ESP32 and the screen recording have not yet been tested with the complete study flow; the pilot covers them.

The full list of tested and open issues is in `docs/system-test-pp2.md`.

---

# Current Milestone

FactTrace currently has a working integrated prototype connecting the mobile frontend, backend services, and MySQL database.

The current system supports:

```text
Claim Input
→ Backend Verification
→ Match Result
→ Evidence and Sources
→ User Review
```

The project is ready for continued interface refinement, dataset development, evaluation preparation, and final project development.

Next steps:

- Connect the ESP32 device to the app's study flow
- Run the 1–3 person pilot (`docs/pilot-checklist.md`)
- Remove test data before the real study (`docs/data-privacy.md`)
