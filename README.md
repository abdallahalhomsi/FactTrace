# VerifyLens

Mobile Provenance Verification Lens for CS 449/549 Human-Computer Interaction.

## Project Overview

VerifyLens is a cross-platform mobile application that helps users fact-check claims encountered in printed or on-screen contexts.

The intended flow is:

1. Capture a claim using the phone camera.
2. Extract text using OCR.
3. Let the user review/edit the extracted claim.
4. Send the claim to the backend.
5. Retrieve verification data, evidence, and provenance information.
6. Present the evidence clearly.
7. Ask the user to record a verification decision and sharing intention.

The project will later be evaluated against a standard browser-search flow.

## Initial Tech Stack

### Mobile
- React Native
- Expo
- TypeScript
- Expo Camera
- Expo QR scanning

### OCR
- Primary: Google Cloud Vision
- Backup: Tesseract

### Backend
- Node.js
- Express
- TypeScript
- REST API

### Database
- MySQL

### Design and Collaboration
- Figma
- GitHub
- GitHub Projects / Issues
- WhatsApp for quick team communication
- Google Drive for documentation and meeting notes

## Fact-Checking Approach

The final fact-checking architecture is pending TA confirmation.

Current proposed approach:
- Store a controlled set of claims, verdicts, evidence, and provenance in MySQL.
- Use those same claims during testing and user evaluation.
- If the TA requires an ML/LLM component, the database will still be used to store claims, evidence, model/API outputs, and evaluation results.

## Initial Repository Structure

```text
VerifyLens/
├── mobile/
├── backend/
├── database/
├── docs/
├── README.md
└── .gitignore
```

## Planned Mobile Flow

```text
Home
→ Camera
→ Capture Claim
→ OCR
→ Review/Edit Extracted Text
→ Verify
→ Evidence & Provenance
→ User Decision
→ Sharing Intention
```

## Team Roles

- Mazen — mainly frontend
- Abdallah — frontend + backend / integration
- Rand — frontend + backend
- Manal — mainly backend
- Ayesha — mainly backend

Specific ownership for OCR, database, API architecture, Figma, and integration will be assigned as development begins.

## Git Workflow

- `main` should always remain stable.
- Create a branch for each task or feature.
- Example branch names:
  - `feature/camera`
  - `feature/ocr`
  - `feature/backend-api`
  - `feature/database`
  - `feature/results-screen`
  - `fix/...`
- Open a Pull Request before merging into `main`.
- At least one teammate should review the Pull Request before merge.

## This Week's Goal

- Finalize the tech stack.
- Create and configure the GitHub repository.
- Ensure all team members can clone, branch, commit, push, and open Pull Requests.
- Confirm the MySQL setup.
- Confirm the OCR approach.
- Wait for the TA response about whether an ML/LLM component is required.
- Make sure every team member has the required development tools installed and working.

## Next Steps

### Frontend
- Create the Figma design.
- Define the full mobile user flow.
- Set up the React Native + Expo starter project.

### Backend
- Create the Express + TypeScript architecture.
- Define the REST API contract.
- Set up MySQL connectivity.
- Prepare the initial claim/evidence data model.

## Status

Initial setup phase.
