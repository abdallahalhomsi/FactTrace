# FactTrace API Contract (v0, mock backend)

Base URL: `http://<laptop-ip>:3000/api` on the same Wi-Fi, or the ngrok URL + `/api`.
Types live in `backend/src/types/shared.ts` and `backend/src/types/api.ts`. Mirror both in `mobile/src/types/`.

Status: endpoints are live but backed by **mock data** (7 placeholder claims, in-memory decisions). The MySQL schema is in `database/schema.sql`. Shapes are what the real backend will return; only the data changes.

**Flexible by design.** The frontend isn't final, so the backend sends everything a screen might need and the app decides what to show. Decision and sharing options come from `GET /config`, so changing them needs no app or route change.

## Response format

Every response has the same envelope. Check `success` first.

```ts
// success
{ "success": true, "data": T }

// failure
{ "success": false, "error": { "code": ErrorCode, "message": string, "details"?: any } }
```

| code | HTTP | when |
|---|---|---|
| `VALIDATION_ERROR` | 400 | missing/wrong fields. `details.fields` lists every bad field |
| `IMAGE_REQUIRED` | 400 | `/ocr` called without an image |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | image is not jpeg/png/webp |
| `FILE_TOO_LARGE` | 413 | image over 10 MB |
| `PAYLOAD_TOO_LARGE` | 413 | JSON body too large |
| `CLAIM_NOT_FOUND` | 404 | unknown claim id (`GET /claims/:id`, or a non-null `claimId` in `/decisions`) |
| `NOT_FOUND` | 404 | unknown route |
| `INTERNAL_ERROR` | 500 | anything else |

**OCR outcomes are not errors.** `/ocr` returns 200 with an `OcrResult`; the app reads `data.error` (`NO_TEXT`, `OCR_FAILED`, `PARTIAL`, or `null`) and shows the right state.

## Flow

```
Screen 2 camera ──► POST /ocr ──► Screen 3: show text (editable), PARTIAL warning if needed
QR scan ──────────────────────────────┐
Manual entry ─────────────────────────┤
                                      ▼
                     POST /verify (one call) ──► strong / weak match ──► Screens 4 + 5
                         (or /claims/match + GET /claims/:id) └─► no match ──► "no match" screen (+ factCheck)
                                                               │
                         decision + sharing popup ◄────────────┘
                                      ▼
                              POST /decisions
```

## Endpoints

### `GET /health`
`data: { status: "ok", uptimeSeconds, timestamp, ocr: { primary, cloudVisionKeyFound } }`. Use it to check the phone can reach the laptop. `cloudVisionKeyFound: false` means OCR is running on Tesseract.

### `GET /config`
The answer options to show. Build the decision buttons and the sharing popup from this.

```json
{
  "decisionOptions": [
    { "value": "trust", "label": "Trust" },
    { "value": "dont_trust", "label": "Don't Trust" },
    { "value": "unsure", "label": "Unsure" }
  ],
  "sharingOptions": [
    { "value": "yes", "label": "Yes" },
    { "value": "no", "label": "No" },
    { "value": "not_sure", "label": "Not sure" }
  ]
}
```
Send back the `value`, never the label. The options are defined in `backend/src/config/study.ts`; changing them there is the only change needed.

### `POST /ocr`
Agreed format: JSON with the photo as base64.

```ts
const photo = await camera.takePictureAsync({ quality: 0.7 });
//shrink to about 1600px wide with expo-image-manipulator, then send the result as base64
fetch(`${API}/ocr`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: shrunkPhotoBase64 }), // a "data:image/jpeg;base64," prefix is also fine
});
```
A multipart upload (file in field `image`) also works, if that turns out easier.

`data: OcrResult`
```json
{ "success": true, "text": "Honey never spoils if it is stored sealed.", "confidence": 0.95, "engine": "tesseract", "error": null }
```
- `PARTIAL` still returns text: show it with a "please check this text" warning.
- Keep `text`, `confidence`, `engine` and `error`: `text` and `confidence` go to `/verify` (or `/claims/match`) as `originalOcrText` and `ocrConfidence`; `engine` and `error` go to `/decisions` as `ocrEngine` and `ocrError`.
- Raw base64 without the `data:` prefix is preferred; the prefixed form also works.
- Shrink photos to about 1600px wide (JPEG quality around 0.7) before sending, for example with `expo-image-manipulator`. At 1600px Tesseract takes about 0.6 to 1.2s; full resolution phone photos are noticeably slower and the upload is much bigger.
- Images are processed in memory and never stored.

### `POST /verify` (recommended for the app)
One call that matches the claim and returns everything the results screen needs, in the frontend's `VerificationResult` shape. Same request body as `/claims/match` below; `source` defaults to `"manual"` if missing.

```json
{ "claimText": "honey never spoils", "source": "ocr", "originalOcrText": "honey never spoils", "ocrConfidence": 0.3 }
```
QR scans: `{ "source": "qr", "claimId": "claim_02" }` (no text needed).

`data: VerifyResponse`
```json
{
  "originalClaim": "honey never spoils",
  "matchedClaim": "Honey never spoils if it is stored in a sealed container.",
  "matchStatus": "weak_match",
  "matchScore": 67,
  "explanation": "Sealed honey resists spoilage because of its low moisture and acidity. It can crystallize, but that is not spoiling.",
  "evidence": [
    {
      "id": "ev_03a",
      "sourceId": "src_03a",
      "title": "Why honey lasts",
      "sourceName": "Example Journal of Food Science",
      "organization": "Academic source",
      "author": "C. Researcher",
      "publicationDate": "May 2021",
      "summary": "Honey's low moisture and acidity prevent most microbial growth when sealed.",
      "evidenceText": "Honey's low moisture and acidity prevent most microbial growth when sealed.",
      "originalUrl": "https://example.org/journal/honey",
      "provenance": "Example Journal of Food Science → FactTrace curated dataset",
      "isPrimary": true,
      "stance": "supports",
      "sourceType": "academic",
      "publishedAt": "2021-05-12"
    }
  ],
  "claimId": "claim_03",
  "matchExplanation": "This only partly matches a claim in our dataset (67% word overlap), and the scanned text may have been misread. Check that it is the claim you saw.",
  "weakReason": "both",
  "overallStance": "supports",
  "datasetNotice": "These results come from a curated set of claims prepared for this study. They are not an independent verification of the claim.",
  "provenanceSignals": [ ... ],
  "factCheck": {
    "found": true,
    "rating": "This is not true. There is no evidence that 5G WiFi networks are linked to the new coronavirus.",
    "publisher": "Full Fact",
    "url": "https://fullfact.org/health/5G-not-accelerating-coronavirus/",
    "reviewDate": "2020-03-31T00:00:00Z"
  }
}
```
- `matchStatus`: `strong_match` | `weak_match` | `no_match`. `matchScore`: 0 to 100.
- Fields up to `evidence` match the frontend's existing `VerificationResult` / `EvidenceSource` types exactly. `author` and `publicationDate` are left out when unknown (optional in those types).
- Extras the app can use or ignore: `claimId` (send it to `/decisions`), `matchExplanation` (how sure the match is, in plain words), `weakReason`, `overallStance`, `datasetNotice`, `provenanceSignals`, and per evidence `sourceId` (log it in `sourcesOpened`), `stance`, `sourceType`, `publishedAt`. Evidence is sorted primary first.
- no_match: evidence and provenanceSignals are empty and there is no matchedClaim. If Google's Fact Check Tools API found a review for the claim, the response includes factCheck: FactCheckResult (found: true, rating, publisher, url, reviewDate). If not found or the API times out (3s), the field is absent — treat "absent" as "no fact check found".
- Dr. Göktaş asked that a database match is never presented as independent verification and that uncertain matches are recognisable: show `datasetNotice` on the results screen, and on `weak_match` show `matchedClaim` with `matchExplanation` ("Is this the claim you saw?").

### `POST /claims/match`
Lower-level alternative to `/verify` (match only, backend field names).
Body: `MatchRequest` (`ocrConfidence` is the `confidence` from `/ocr`, optional)
```json
{ "claimText": "honey never spoils in a sealed container", "source": "ocr", "originalOcrText": "honey nevr spoils in a sealed contaner", "ocrConfidence": 0.62 }
```
QR scans: `{ "source": "qr", "claimId": "claim_02" }` (no text needed).

`data: MatchResult`
```json
{ "status": "MATCH", "score": 1, "claimId": "claim_03" }
{ "status": "WEAK_MATCH", "score": 0.5, "claimId": "claim_03", "reason": "low_similarity" }
{ "status": "NO_MATCH", "score": 0.12, "claimId": null, "factCheck": { "found": true, "rating": "...", "publisher": "...", "url": "...", "reviewDate": "..." } }
```
On NO_MATCH, the backend calls Google's Fact Check Tools API with a 3s timeout. If a review is found, the response includes factCheck: FactCheckResult (found: true, rating, publisher, url, reviewDate). If not found or the API times out, the field is absent — the app should treat a missing factCheck as "no fact check found". The backend never throws on Fact Check failure.
`reason` (only on `WEAK_MATCH`):
- `low_similarity`: the text only partly matches a stored claim
- `low_ocr_confidence`: the text matches, but OCR confidence was below 0.5 and the user didn't edit it
- `both`: both of the above

On a weak match the app can show the matched claim's text and ask the user to confirm. How to handle it is a frontend choice.

### `GET /claims/:id`
`data: ClaimDetail`. Everything a results screen or an evidence screen might show; use what the design needs and ignore the rest.

| field | for (current Figma) |
|---|---|
| `text` | "Your claim" card (Screen 4) |
| `overallStance` | banner, e.g. "Evidence contradicts the claim": `supports` / `contradicts` / `mixed` / `unclear` |
| `summary` | "What we found" text |
| `evidence[]` | `summary`, `stance` (`supports` / `contradicts` / `context`), `sourceId` |
| `sources[]` | `title`, `outlet`, `author`, `publishedAt`, `url`, `type` (`news` / `fact_check` / `official` / `academic` / `social`), `isPrimary` ("Primary source" label) |
| `provenanceSignals[]` | `label`, `detail`, `level` (`positive` / `neutral` / `warning`) |
| `origin` | outlet, author, firstSeenAt, url of the claim's first appearance (any may be null) |

There is **no verdict field**: the user makes the decision. The correct answer is stored for scoring only and never sent to the app. Every claim includes a `dataset` signal saying results come from a curated set.

### `POST /decisions`
Body: `DecisionRequest`
```json
{
  "participantId": "P07",
  "condition": "app",
  "claimId": "claim_04",
  "claimText": "The city will introduce free public transport next month.",
  "originalOcrText": "The city wil introduce free public transport next month.",
  "inputSource": "ocr",
  "matchStatus": "weak_match",
  "matchScore": 67,
  "weakReason": "both",
  "weakMatchConfirmed": true,
  "ocrEngine": "cloud_vision",
  "ocrError": null,
  "ocrConfidence": 0.42,
  "ocrRetakes": 0,
  "decision": "dont_trust",
  "sharingIntention": "no",
  "sourcesOpened": ["src_04a"],
  "startedAt": "2026-10-30T10:00:00.000Z",
  "endedAt": "2026-10-30T10:01:30.000Z",
  "clientRecordId": "lq3k9x-7f2a1c",
  "trialIndex": 3,
  "isPractice": false,
  "appVersion": "0.2.0"
}
```

**Required:** `participantId`, `condition`, `claimId` (may be `null`), `claimText`, `decision`, `sharingIntention`, `sourcesOpened`, `startedAt`, `endedAt`. Everything else is optional; old request bodies keep working.

| field | sent by | rule |
|---|---|---|
| `participantId` | app | must look like `P07` (P + 1 to 3 digits, stored uppercase); anything else is rejected, so names or student IDs can't be saved by mistake |
| `condition` | app | `app` \| `browser`. The browser baseline uses the same endpoint; send the `claimId` being checked so accuracy can be scored, and put URLs in `sourcesOpened` |
| `decision`, `sharingIntention` | app | a `value` from `GET /config`, exactly as written (snake_case) |
| `matchStatus` | app, from `/verify` | either spelling (`strong_match` or `MATCH` etc.). Stored as `MATCH` \| `WEAK_MATCH` \| `NO_MATCH` (the `shared.ts` enum) |
| `matchScore` | app, from `/verify` | **0 to 100, exactly as `/verify` returns it**. The server stores it as 0 to 1 (67 becomes 0.67) |
| `weakReason` | app, from `/verify` | `low_ocr_confidence` \| `low_similarity` \| `both`, or null |
| `weakMatchConfirmed` | app | the user's answer to "Is this the claim you saw?": `true` or `false` on a weak match. On any other match status the server stores `null`, whatever is sent |
| `factCheckFound` | app, from `/verify` | `factCheck?.found === true` from the `/verify` result: `true` or `false` on a no match. On any other match status the server stores `null`, whatever is sent |
| `ocrEngine`, `ocrError` | app, from `/ocr` | copy `engine` and `error`; omit or null for QR and typed claims |
| `ocrConfidence` | app, from `/ocr` | copy `confidence` (0 to 1); omit or null for QR and typed claims |
| `ocrRetakes` | app (counted on the phone) | how many times the user tapped "Retake Photo" on this claim before submitting: `0` = no retake. Omit or null for QR and typed claims. The app has to count this; the server can't tell a retake from a photo of a different claim |
| `clientRecordId` | app | a unique id the app makes for this answer (the local `recordId`). If the same id is sent again, for example after a timeout, the server returns the first save instead of storing it twice |
| `trialIndex` | app | which claim this is for the participant: 1, 2, 3 and so on (counted per participant, across both conditions) |
| `isPractice` | app | `true` for a warm-up claim; stored but left out of the results. Default `false` |
| `appVersion` | app | for example `"0.2.0"`. Bump it when the design changes, so results before and after can be compared |
| `startedAt`, `endedAt` | app | full ISO strings (`new Date().toISOString()`); `endedAt` must not be before `startedAt` |

Unknown extra fields are ignored, not stored.

**Worked out by the server, never taken from the app:**

| stored as | rule |
|---|---|
| `duration_ms` | `endedAt` minus `startedAt`, in milliseconds |
| `correct_answer` | the claim's stored answer at the moment the decision is saved (a snapshot, so later fixes to a claim don't change old results); null if `claimId` is null |
| `was_correct` | `trust` is correct for a `true` claim, `dont_trust` for `false` or `misleading`; `unsure` or no claim gives null. Never sent back to the app |
| `text_was_edited` | `originalOcrText` and `claimText` differ after trimming spaces at both ends; null if there was no OCR text |
| `sources_opened_count` | number of different entries in `sourcesOpened` (duplicates count once) |

`201`, `data: { decisionId, durationMs }`

### `POST /sessions` (planned, Manaal)
Creates one row per participant before they start, so the condition order is recorded.
```json
{ "participantId": "P07", "conditionOrder": "app_first", "notes": "optional, up to 500 characters" }
```
`conditionOrder`: `app_first` \| `browser_first`. Decisions are still saved if no session exists.

## Mock claim ids
Placeholder data (example.org sources) until the real claims are seeded. Use these ids for QR test codes.

| id | claim | answer | overallStance |
|---|---|---|---|
| `claim_01` | Drinking eight glasses of water a day is required for good health. | misleading | contradicts |
| `claim_02` | Sabancı University campus will be closed to all students for the entire month of December. | false | contradicts |
| `claim_03` | Honey never spoils if it is stored in a sealed container. | true | supports |
| `claim_04` | The city will introduce free public transport next month. (Figma claim) | misleading | contradicts |
| `claim_05` | A new study proves that using your phone before bed causes permanent memory loss. | false | contradicts |
| `claim_06` | Working from home makes employees more productive. | misleading | mixed |
| `claim_07` | The campus library will stay open 24 hours a day during final exams. | true | unclear |

Test inputs for each match status (send to `/api/verify` with `source: "manual"`):
- strong: the full claim text, e.g. `The city will introduce free public transport next month.`
- weak: a partial version, e.g. `free public transport in the city`
- no match: unrelated text, e.g. `The moon is made of cheese`
- weak because of OCR: full claim text with `source: "ocr"`, the same `originalOcrText`, and `ocrConfidence: 0.3`

## Running the backend
```
cd backend
npm install
copy .env.example .env      (macOS/Linux: cp .env.example .env)
npm run dev                 # http://localhost:3000/api
```
No Google key needed for development: OCR falls back to Tesseract (bundled, works offline).