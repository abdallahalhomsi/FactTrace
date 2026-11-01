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
- Weak-match confirmation
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
│   └── seed_mock.sql
│
├── docs/
│   ├── api-contract.md
│   └── architecture.md
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
FactTrace backend listening on http://localhost:3000/api (development)
[mysql] connection OK
```

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

The user is asked:

```text
Is this the claim you saw?
```

before continuing.

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

POST /api/claims/match
GET  /api/claims/:id
```

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

# Development Test Claims

The backend includes development claims for integration testing.

## `claim_01`

```text
Drinking eight glasses of water a day is required for good health.
```

## `claim_02`

```text
Sabancı University campus will be closed to all students for the entire month of December.
```

## `claim_03`

```text
Honey never spoils if it is stored in a sealed container.
```

These IDs can be used while testing backend verification and frontend integration.

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
