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
│   └──