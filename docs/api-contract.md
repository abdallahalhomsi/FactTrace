# FactTrace API Contract (v1)

Base URL: `http://<laptop-ip>:3000/api` on the same Wi-Fi, or the ngrok URL + `/api`.
Types live in `backend/src/types/shared.ts` and `backend/src/types/api.ts`. Mirror both in `mobile/src/types/`.

Status: endpoints are live and backed by MySQL. Claims come from `database/seed_claims.sql` (50 real claims, each checked against fact checks or official sources) and are loaded into memory when the server starts, so restart the backend after changing claims. Decisions and sessions are saved to MySQL. The schema is in `database/schema.sql`.

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

### `POST /sessions`
Creates one row per participant before they start, so the condition order is recorded.
```json
{ "participantId": "P07", "conditionOrder": "app_first", "notes": "optional, up to 500 characters" }
```
`conditionOrder`: `app_first` \| `browser_first`. Decisions are still saved if no session exists.

### `GET /study/claims`
The claims participants see, in a fixed order, without answers. Use this to run the participant flow, and send each `claimId` to `/decisions` in **both** conditions (so the browser condition no longer has to guess the claim from typed text).
```json
{
  "practice": [{ "claimId": "claim_01", "text": "Light from the Sun takes about 8 minutes to reach Earth.", "position": 1 }, ...],
  "setA": [{ "claimId": "claim_11", "text": "...", "position": 1 }, ...],
  "setB": [{ "claimId": "claim_16", "text": "...", "position": 1 }, ...]
}
```
- 2 practice claims (send `isPractice: true`), then 7 claims per set, each set 3 true / 2 false / 2 misleading.
- Counterbalancing: participants with `conditionOrder: "app_first"` do set A in the app, then set B in the browser. `browser_first` participants do set A in the browser, then set B in the app. So set A is always first and the tool alternates.
- `trialIndex` in `/decisions` counts across both conditions: practice 1 and 2, then 3 to 16.

## Claim ids
All 50 claims in `database/seed_claims.sql`. Use these ids for QR test codes. The answer column is for the team only; the API never sends it.

| id | claim | answer | study set |
|---|---|---|---|
| `claim_01` | Light from the Sun takes about 8 minutes to reach Earth. | true | practice 1 |
| `claim_02` | The Eiffel Tower gets slightly taller in summer because its iron expands in the heat. | true |  |
| `claim_03` | Octopuses have three hearts. | true | A 4 |
| `claim_04` | Bananas are naturally slightly radioactive. | true |  |
| `claim_05` | A day on Venus is longer than a year on Venus. | true | B 7 |
| `claim_06` | Sharks have existed on Earth longer than trees. | true |  |
| `claim_07` | Wombats produce cube-shaped droppings. | true |  |
| `claim_08` | The United Nations approved Turkey's request to be officially called Türkiye in 2022. | true |  |
| `claim_09` | Göbekli Tepe in southeastern Türkiye is more than twice as old as Stonehenge. | true | A 7 |
| `claim_10` | Türkiye drinks more tea per person than any other country. | true |  |
| `claim_11` | Since December 2024, new phones sold in the EU must have a USB-C charging port. | true | A 1 |
| `claim_12` | The University of Oxford is older than the Aztec Empire. | true |  |
| `claim_13` | Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid. | true |  |
| `claim_14` | The Netherlands has more bicycles than people. | true |  |
| `claim_15` | Scotland's national animal is the unicorn. | true | B 4 |
| `claim_16` | A UN-backed report says the ozone layer is on track to recover within a few decades. | true | B 1 |
| `claim_17` | Mosquitoes were found in Iceland for the first time in 2025. | true |  |
| `claim_18` | The original Coca-Cola recipe contained cocaine. | true |  |
| `claim_19` | The average person swallows eight spiders a year while sleeping. | false | practice 2 |
| `claim_20` | The Great Wall of China is visible from space with the naked eye. | false |  |
| `claim_21` | Goldfish have a memory span of only three seconds. | false |  |
| `claim_22` | Lightning never strikes the same place twice. | false |  |
| `claim_23` | Humans only use 10 percent of their brains. | false |  |
| `claim_24` | Finland is introducing a four-day working week with six-hour days. | false | A 2 |
| `claim_25` | NASA confirmed that Earth will go dark for six days in December. | false | B 2 |
| `claim_26` | 5G mobile networks spread the coronavirus. | false |  |
| `claim_27` | The 1969 Moon landing was filmed in a studio and never happened. | false |  |
| `claim_28` | The white trails behind planes are chemicals sprayed in a secret government programme. | false |  |
| `claim_29` | The MMR vaccine causes autism. | false |  |
| `claim_30` | Drinking hot water protects you from the coronavirus. | false |  |
| `claim_31` | A WhatsApp video called Martinelli will hack your phone if you open it. | false |  |
| `claim_32` | Marie Antoinette said "Let them eat cake" when told the people had no bread. | false | B 5 |
| `claim_33` | Albert Einstein said insanity is doing the same thing over and over and expecting different results. | false | A 5 |
| `claim_34` | Lemmings commit mass suicide by jumping off cliffs. | false |  |
| `claim_35` | Eating carrots improves your eyesight and helps you see in the dark. | misleading |  |
| `claim_36` | Chameleons change colour to blend in with their surroundings. | misleading |  |
| `claim_37` | Drinking coffee dehydrates you. | misleading |  |
| `claim_38` | Taking vitamin C every day prevents colds. | misleading | B 3 |
| `claim_39` | The WHO says processed meat is as dangerous as smoking. | misleading | A 3 |
| `claim_40` | Mount Everest is the tallest mountain on Earth. | misleading | A 6 |
| `claim_41` | Istanbul is the only city in the world located on two continents. | misleading | B 6 |
| `claim_42` | You need to drink eight glasses of water a day to stay healthy. | misleading |  |
| `claim_43` | Working from home makes employees more productive. | misleading |  |
| `claim_44` | A glass of red wine every day is good for your heart. | misleading |  |
| `claim_45` | Pluto lost its planet status because it is too small. | misleading |  |
| `claim_46` | MSG in food causes headaches. | misleading |  |
| `claim_47` | Microwaving food destroys its nutrients. | misleading |  |
| `claim_48` | Humans share 60 percent of their DNA with bananas. | misleading |  |
| `claim_49` | Japan kept a remote train station open just for one high school student until she graduated. | misleading |  |
| `claim_50` | A Dutch researcher predicted the February 2023 earthquake in Türkiye. | misleading |  |

Test inputs for each match status (send to `/api/verify` with `source: "manual"`):
- strong: the full claim text, e.g. `Mount Everest is the tallest mountain on Earth.`
- weak: a partial version, e.g. `Einstein said insanity is doing the same thing`
- no match: unrelated text, e.g. `The moon is made of cheese`
- weak because of OCR: full claim text with `source: "ocr"`, the same `originalOcrText`, and `ocrConfidence: 0.3`

## Running the backend
```
docker compose up -d        # from the repo root: starts MySQL and loads schema.sql + seed_claims.sql on first run
cd backend
npm install
copy .env.example .env      (macOS/Linux: cp .env.example .env)
npm run dev                 # http://localhost:3000/api
```
No Google key needed for development: OCR falls back to Tesseract (bundled, works offline). The backend stops at startup with a clear message if MySQL is not running or has no claims.

Already have the database from before this change? Recreate it so the new claims load: `docker compose down -v` then `docker compose up -d` (this also deletes test decisions).