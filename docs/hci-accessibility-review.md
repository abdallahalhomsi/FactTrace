# FactTrace: HCI Accessibility & Usability Review
**CS 449 / CS 549 — Human-Computer Interaction**  
**Sabancı University — Fall 2026–27**  
**Reviewer:** Mazen Zeybek (Student ID: 33539) — Lead UI/UX Designer  
**Scope:** Source-Code Inspection (`mobile/src/`), Figma Design Audit, and Usability Pilot Protocol  
**Date:** November 2026  

---

## 1. Executive Summary

This document represents a targeted **source-code and design review** conducted as part of the CS 449 HCI course requirements. It evaluates the current implementation of **FactTrace** against **WCAG 2.1 Level AA** accessibility standards and established **Human-Computer Interaction (HCI) usability principles** (Nielsen's Heuristics and Cognitive Load Theory).

> [!NOTE]
> **Review Scope Disclaimer:** This review is an analytical code and design audit intended for internal design iteration, not a comprehensive third-party accessibility certification or completed summative usability evaluation. All application code changes described herein are **proposed recommendations** for frontend developer Rand; no React Native application code has been modified in this review.

The findings are structured into four distinct categories:
1. **Confirmed WCAG 2.1 AA Failures**: Mathematically verified contrast ratio violations in light-mode color tokens.
2. **Potential Non-Text Contrast Concerns (WCAG 1.4.11)**: Input container borders requiring rendered UI validation across different physical display environments.
3. **Identified Usability & Cognitive Risks**: Design recommendations to prevent user error, improve rapid scannability, and calibrate trust between search similarity and factual veracity.
4. **Dark Mode Specifications**: Visual design guidelines finalized in Figma, paired with proposed code tokens for subsequent frontend integration.

---

## 2. Technical Accessibility Audit (WCAG 2.1 AA)

All contrast ratios were calculated using the standard sRGB relative luminance formula ($L = 0.2126 R + 0.7152 G + 0.0722 B$) against the primary application background (`#F4F7FB`, relative luminance $L_1 = 0.927$) and card background (`#FFFFFF`, $L = 1.000$).

### 2.1 Confirmed WCAG Contrast Failures

| Element / Token in Code | Current Color | Background | Calculated Ratio | WCAG 2.1 Threshold | Compliance Status | Required Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `COLORS.textSecondary` | `#7A8798` | `#F4F7FB` | **3.40 : 1** | 4.5 : 1 (Normal Text) | ❌ **FAIL** (WCAG 1.4.3) | Update to `#475569` (**7.05 : 1**, passes AAA) |
| `COLORS.textMuted` | `#98A4B3` | `#F4F7FB` | **2.36 : 1** | 4.5 : 1 (Normal Text) | ❌ **FAIL** (WCAG 1.4.3) | Update to `#475569` (**7.05 : 1**) or `#526071` (**5.97 : 1**) |

*Note on intermediate candidate `#64748B`:* The color `#64748B` produces a ratio of **4.43 : 1** on `#F4F7FB`, narrowly missing the 4.5 : 1 requirement for normal text. Consequently, **`#475569`** (Slate 600) is the recommended replacement token, providing **7.05 : 1** on `#F4F7FB` and **7.58 : 1** on `#FFFFFF`, guaranteeing compliance under both AA and AAA standards.

### 2.2 Potential Non-Text Contrast Concern (WCAG 1.4.11)

| Element / Token in Code | Current Color | Adjacent Fill | Calculated Ratio | WCAG 2.1 Threshold | Status & Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Input container border (`border`) | `#DEE5ED` | `#FFFFFF` | **1.27 : 1** | 3.0 : 1 (UI Component) | ⚠️ **Potential Concern** (Requires rendered validation) |

* **Analysis**: In `SignUpScreen.tsx` (line 234) and `LoginScreen.tsx` (lines 230, 260), input containers use `borderColor: COLORS.border` (`#DEE5ED`). Against a white input background (`#FFFFFF`), the contrast ratio is **1.27 : 1** (and **1.18 : 1** against `#F4F7FB`).
* **Evaluation Condition**: Under WCAG 2.1 Success Criterion 1.4.11, visual boundaries required to identify a user interface component must achieve a 3.0 : 1 ratio. If rendered input fields have no distinct background fill or outer card boundary, this constitutes a failure. If surrounding layout structure or active states provide sufficient boundary identification on a physical display, the risk is mitigated.
* **Proposed Remediation**: Setting the active/focused input border state to `#475569` (**7.58 : 1** on white) provides clear visual feedback and removes any ambiguity.

### 2.3 Verified Strengths (Existing Passes in Code)
* **`COLORS.textPrimary` (`#102238`)**: Produces a ratio of **14.94 : 1** on `#F4F7FB`, far exceeding the WCAG AAA requirement (7.0 : 1).
* **Decision Button Touch Targets (`VerificationResultsScreen.tsx`)**: The primary decision buttons (`Trust`, `Don't Trust`, `Unsure`) specify `minHeight: 88` (lines 1572–1581), substantially exceeding Apple Human Interface Guidelines ($44 \times 44\text{ pt}$) and Android Material Design ($48 \times 48\text{ dp}$).
* **Text in Match Badges**: Status badges include explicit text (`STRONG MATCH`, `POSSIBLE MATCH`, `NO MATCH`), ensuring the interface does not communicate status through color alone.

---

## 3. HCI Usability & Ergonomics Review

The recommendations below address cognitive load, scannability, and error prevention based on heuristic inspection.

### 3.1 Status Indicator Dual-Encoding (Rapid Recognition)
* **Current Implementation (`VerificationResultsScreen.tsx`, lines 476–484)**: Status is displayed with uppercase text alongside an 8px colored circle (`matchDot`).
* **Identified Usability Risk**: While text labels prevent a strict WCAG 1.4.1 (Use of Color) violation, an 8px circular dot provides minimal perceptual distinction for users with red-green color vision deficiencies (protanopia/deuteranopia) under rapid scannability conditions.
* **Proposed Recommendation**: Supplement or replace the colored dot with distinct 16px icon glyphs:
  * Strong Match: `checkmark-circle` (Ionicons)
  * Possible / Weak Match: `alert-circle` (Ionicons)
  * No Match: `help-circle` (Ionicons)

### 3.2 Evidence Stance Hierarchy (`EvidenceDetailsScreen.tsx`, lines 702–710)
* **Current Implementation**: The stance of an evidence source (*"Supports the submitted claim"*, *"Contradicts..."*) is rendered as unformatted body text (`fontSize: 13, fontWeight: '700'`).
* **Identified Usability Risk**: Because stance text visually blends with surrounding body paragraphs, users skimming lengthy evidence summaries may misinterpret or overlook whether a source confirms or refutes the claim.
* **Proposed Recommendation**: Render stance designations as dedicated pill badges preceding evidence summaries:
  * `SUPPORTS CLAIM`: Light green container (`rgba(22, 163, 74, 0.12)`), dark green text (`#15803D`), icon `shield-checkmark`.
  * `DISPUTES CLAIM`: Light red container (`rgba(220, 38, 38, 0.12)`), dark red text (`#B91C1C`), icon `close-circle`.
  * `CONTEXT ONLY`: Light blue container (`rgba(37, 99, 235, 0.12)`), dark blue text (`#1D4ED8`), icon `information-circle`.

### 3.3 Semantic Guardrail: Match Score vs. Truth Verdict
* **Critical Design Consideration**: `VerificationResultsScreen.tsx` displays `matchScore` (0–100) prominently adjacent to the match badge.
* **Identified Usability Risk**: Non-expert users frequently conflate algorithmic search similarity with factual truth. If a widely known false myth is stored in the database, the system will correctly return a high similarity score (e.g., "95% match"), which participants may easily misinterpret as "95% true."
* **Proposed Recommendation**:
  1. Add an unambiguous secondary label directly below the score: *"Search similarity to verified database record, not a truth rating."*
  2. Maintain explicit explanatory phrasing: *"Matching record found in database. Review the supporting evidence below to evaluate truthfulness."*

---

## 4. Dark Mode Design Specifications (Figma & Proposed Code Tokens)

To support comfortable verification in low-light environments and reduce glare, dark mode design specifications have been produced in Figma and translated into proposed code tokens.

### 4.1 Proposed Dark Theme Color Tokens
Proposed for addition to `mobile/src/constants/app.ts` under a dedicated `DARK_COLORS` object (not yet active in application runtime):

```typescript
export const DARK_COLORS = {
  // Surface Hierarchy
  background: '#0F172A',      // Slate 900 (Base Canvas)
  surfaceCard: '#1E293B',     // Slate 800 (Cards, Evidence Panels)
  surfaceElevated: '#334155', // Slate 700 (Modals, Popups, Overlays)
  border: '#334155',          // Slate 700 (Subtle dividers)
  borderActive: '#64748B',    // Slate 500 (Active inputs, focused cards)

  // Typography
  textPrimary: '#F8FAFC',     // Slate 50 (Ratio: 14.80:1 on #0F172A)
  textSecondary: '#CBD5E1',   // Slate 300 (Ratio: 10.40:1 on #0F172A)
  textMuted: '#94A3B8',       // Slate 400 (Ratio: 5.80:1 on #0F172A - Passes AA)

  // Accents & Actions
  primaryBlue: '#38BDF8',     // Sky 400 (High-contrast interactive element)
  primaryBlueHover: '#0284C7',
  
  // Status Accents (Dark Mode Adjusted)
  successText: '#86EFAC',     // Light Green
  successBg: 'rgba(34, 197, 94, 0.15)',
  warningText: '#FDE047',     // Light Amber
  warningBg: 'rgba(234, 179, 8, 0.15)',
  errorText: '#FCA5A5',       // Light Red
  errorBg: 'rgba(239, 68, 68, 0.15)',
};
```

### 4.2 Completed Figma Visual Designs

All 10 dark-mode screens have been designed, reviewed, and finalized in Figma:
* **Official Figma Design File:** [FactTrace Mobile UI & Dark Mode (10 Screens)](https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT)

Design layout rules applied across the screens:
1. **Canvas / Background**: Base fill set to `#0F172A` (Slate 900).
2. **Cards (Match Card, Evidence Previews)**: Fills set to `#1E293B` with a 1px border stroke of `#334155` and a corner radius of `16px`. Elevation is communicated through subtle border lightness rather than dark drop shadows.
3. **Buttons**:
   * Primary Action: Background `#0284C7` with `#FFFFFF` text.
   * Secondary / Outlined Action: Background `transparent`, border 1.5px `#475569`, text `#CBD5E1`.
   * Action Row ("Trust" / "Don't Trust" / "Flag"): Button containers sized to prevent text wrapping on single lines.
4. **Modals & Overlays (`SharingIntentionModal.tsx`)**: Backdrop overlay set to `rgba(15, 23, 42, 0.60)` so underlying verification results remain legible beneath the prompt. Equal-width answer buttons (94px each).

---

## 5. Empirical Pilot Usability Protocol

In accordance with **Handbook Section 8**, FactTrace must document an evidence-based design iteration informed by user testing. This protocol outlines a 10-minute pilot session to be conducted with **one university student outside the project team**.

### 5.1 Test Setup & Equipment
* **App State**: FactTrace running on physical mobile device (or interactive Figma prototype).
* **Test Claim Materials**: One printed paper slip with `claim_01` (*"Drinking eight glasses of water a day is required for good health"*).
* **Observer Role**: Observe without prompting; record completion time, points of hesitation, and participant comments verbatim.

### 5.2 Scenario Tasks
1. **Task 1: Capture & Verify (Camera / OCR Flow)**
   * *Prompt*: *"You came across this health claim printed on this sheet. Use FactTrace to scan and verify it."*
   * *Target Behaviors*: Alignment in camera frame, review of OCR text on Review Screen, tapping 'Verify Claim'.
2. **Task 2: Evidence Investigation & Provenance Inspection**
   * *Prompt*: *"Review the results. Based on the app, does the main source support or contradict this claim, and who is the publisher?"*
   * *Target Behaviors*: Scannability of the match card, tapping into Evidence Details, locating source credentials.
3. **Task 3: Accountability Decision & Sharing Intention**
   * *Prompt*: *"Now record your final judgment on whether you trust the claim, and respond to the prompt that follows."*
   * *Target Behaviors*: Selection of Trust / Don't Trust / Unsure; response to the post-verification sharing modal.

### 5.3 Observation Log (To Be Completed During Test)

| Task | Completed? (Yes / No) | Time on Task | Observed Hesitation Points / Friction | Participant Comments (Verbatim) |
| :--- | :--- | :--- | :--- | :--- |
| **Task 1 (Capture)** | *[Pending Test]* | *[Pending Test]* | *[Record any difficulty aiming or editing OCR text]* | *[Record quotes]* |
| **Task 2 (Evidence)** | *[Pending Test]* | *[Pending Test]* | *[Record where participant paused while reading]* | *[Record quotes]* |
| **Task 3 (Decision)** | *[Pending Test]* | *[Pending Test]* | *[Record hesitation between decision options]* | *[Record quotes]* |

---

## 6. Documented Design Iteration (Evidence-Based Workspace)

> [!IMPORTANT]
> The section below will be completed **after** conducting the pilot test with the participant. The handbook requires actual observational evidence to justify the design change.

### Iteration 1: Documented Usability Improvement
* **Observed Empirical Issue**: *[To be documented based on the participant's specific point of hesitation or error in Section 5.3]*
* **HCI Heuristic / Cognitive Cause**: *[E.g., Nielsen #2: Match between system and real world, or #6: Recognition rather than recall]*
* **Concrete Design Modification**: *[Description of the exact UI change made in Figma and React Native in response to the observation]*
* **Validation Outcome**: *[Follow-up check confirming the revision resolved the confusion]*

---

## 7. Actionable Next Steps for Team

1. **For Mazen (Completed & Remaining UI/UX Scope)**:
   * ✅ **Completed**: Designed, reviewed, and finalized all 10 dark-mode screens in [Figma](https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT).
   * ⏳ **Remaining**: Conduct the 10-minute pilot usability test with 1 university student using the Section 5 protocol.
   * ⏳ **Remaining**: Document the resulting evidence-based design iteration in Section 6.
   * ⏳ **Remaining**: Coordinate the proposed color contrast and badge recommendations with Rand.
2. **For Rand & Abdallah (Proposed Frontend Integration)**:
   * Update `mobile/src/constants/app.ts` to replace `#7A8798` and `#98A4B3` with `#475569` to resolve confirmed WCAG AA text contrast failures.
   * Add icon glyphs (`checkmark-circle`, `alert-circle`, `help-circle`) to match status badges in `VerificationResultsScreen.tsx`.
   * Adopt `DARK_COLORS` tokens when implementing dark theme switching in React Native.
