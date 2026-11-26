# Architecture

How the hardware, software and interface connect (the handbook asks for this figure in the report).

```text
 PARTICIPANT
   │  scans a printed claim card            │  presses Trust / Unsure / Don't trust
   ▼                                        ▼
 Phone app (React Native + Expo, TypeScript)      ESP32-S2 device (Arduino C++)
   Camera: photo of the scan frame,                 3 buttons, RGB light (white = system,
   or a QR marker outside study trials              blue = match result; no green or red)
   Claim review: OCR text, confidence, edit         polls GET /api/device/state every 300 ms
   Results: match strength (text similarity,        sends POST /api/device/decision on a press
   not a truth rating), dataset notice,             │
   evidence and sources, never a verdict            │  Wi-Fi, same hotspot as the laptop
   Device panel: waits for the press, Undo 5 s      │  (not ngrok)
   Browser condition: same buttons, same timer      │
   │  HTTPS (ngrok during development)              │
   ▼                                                ▼
 Backend (Node.js + Express 5, TypeScript)
   /api/ocr      Google Cloud Vision, Tesseract fallback (images in memory only)
   /api/verify   approximate matching against the curated claims; Google Fact Check on no match
   /api/device   one active trial in memory: light state, press, undo, t0–t3 on the server clock
   /api/study    claims, block-randomised group, debrief after the session
   /api/decisions, /api/sessions, /api/questionnaires   study logging
   │
   ▼
 MySQL 8 (Docker)
   claims, sources, evidence, provenance signals (curated dataset, answers never sent during trials)
   study_sessions, decisions, hardware_events, questionnaire_responses, browser_source_coding
   │
   ▼
 Analysis: npm run export → CSV → analysis/inferential.py (tests) and analyze-study.ts (descriptives)
```

Details: `docs/api-contract.md` (endpoints), `docs/device-signal-spec.md` (device), `docs/source-use-metric.md` (source use), `docs/data-privacy.md` (data handling).
