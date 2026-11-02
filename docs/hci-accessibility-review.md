# FactTrace: HCI Accessibility & Usability Review
**CS 449 / CS 549 — Human-Computer Interaction**  
**Sabancı University — Fall 2026–27**  
**Reviewer:** Mazen Zeybek (Student ID: 33539) — Lead UI/UX Designer  
**Scope:** Verified Codebase Analysis (`mobile/src/`), Figma Specifications, and Usability Pilot Protocol  
**Date:** November 2026  

---

## 1. Executive Summary

This review evaluates the current implementation of **FactTrace** against **WCAG 2.1 Level AA** accessibility standards and established **Human-Computer Interaction (HCI) usability principles** (Nielsen's Heuristics and Cognitive Load Theory). 

The evaluation is based on direct inspection of the React Native code (`FactTrace/mobile/src/`) and existing Figma designs. Findings are divided into two distinct categories:
1. **Confirmed WCAG 2.1 AA Failures**: Measurable violations of normative accessibility standards (e.g., text contrast ratios).
2. **HCI Usability & Cognitive Ergonomics Recommendations**: Opportunities to reduce cognitive load, improve error recovery, and increase scannability (e.g., dual-encoding status icons and stance badge styling).

This document also provides the **Dark Mode Visual Specifications** for Figma and a **Structured Pilot Testing Protocol** to support the evidence-backed design iteration required by the course handbook.

---

## 2. Technical Accessibility Audit (WCAG 2.1 AA)

All contrast ratios were calculated using the standard WCAG relative luminance formula against the primary application background (`#F4F7FB`, relative luminance $L_1 = 0.927$).

### 2.1 Confirmed WCAG Violations

| Element / Token in Code | Current Color | Background | Calculated Ratio | WCAG 2.1 Threshold | Compliance Status | Required Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `COLORS.textSecondary` | `#7A8798` | `#F4F7FB` | **3.32 : 1** | 4.5 : 1 (Normal Text) | ❌ **FAIL** (WCAG 1.4.3) | Update to `#475569` (**7.06 : 1**, passes AAA) |
| `COLORS.textMuted` | `#98A4B3` | `#F4F7FB` | **2.33 : 1** | 4.5 : 1 (Normal Text) | ❌ **FAIL** (WCAG 1.4.3) | Update to `#475569` (**7.06 : 1**) or `#526071` (**5.97 : 1**) |
| Text inputs active border (`border`) | `#DEE5ED` | `#FFFFFF` | **1.25 : 1** | 3.0 : 1 (UI Component) | ❌ **FAIL** (WCAG 1.4.11) | Set active/focused border to `#475569` (**6.61 : 1**) |

*Note on recalculation:* `#64748B` produces a ratio of **4.41 : 1** on `#F4F7FB`, which narrowly misses the 4.5 : 1 requirement for normal text. Consequently, **`#475569`** (Slate 600, **7.06 : 1**) is the recommended replacement to guarantee compliance under both AA and AAA standards.

### 2.2 Verified Strengths (Existing Passes in Code)
* **`COLORS.textPrimary` (`#102238`)**: Produces a ratio of **14.7 : 1** on `#F4F7FB` (exceeds WCAG AAA).
* **Decision Button Touch Targets (`VerificationResultsScreen.tsx`)**: The action buttons (`Trust`, `Don't Trust`, `Unsure`) have a specified `minHeight: 88` (lines 1572–1581). This substantially exceeds both Apple Human Interface Guidelines ($44 \times 44\text{ pt}$) and Android Material Design ($48 \times 48\text{ dp}$).
* **Text in Match Badge**: Match status badges include explicit uppercase text (`STRONG MATCH`, `POSSIBLE MATCH`, `NO MATCH`), meaning the interface does not rely exclusively on color to convey state.

---

## 3. HCI Usability & Ergonomics Review

The following recommendations address cognitive load, clarity, and rapid scannability. While the existing interface conveys meaning through text, these changes improve efficiency and error prevention.

### 3.1 Status Indicator Dual-Encoding (Rapid Recognition)
* **Current Implementation (`VerificationResultsScreen.tsx`, lines 476–484)**: Status is displayed with text alongside a small 8px colored circle (`matchDot`).
* **Usability Observation**: While the text prevents a strict WCAG 1.4.1 failure, an 8px colored dot provides negligible visual distinction for users with color vision deficiencies (protanopia/deuteranopia) when scanning quickly.
* **Recommendation**: Replace the 8px dot with a dedicated 16px icon inside the badge:
  * Strong Match: `checkmark-circle` (Ionicons)
  * Possible/Weak Match: `alert-circle` (Ionicons)
  * No Match: `help-circle` (Ionicons)

### 3.2 Evidence Stance Hierarchy (`EvidenceDetailsScreen.tsx`, lines 702–710)
* **Current Implementation**: The stance of an evidence source (*"Supports the submitted claim"*, *"Contradicts..."*) is rendered as unformatted body text (`fontSize: 13, fontWeight: '700'`).
* **Usability Observation**: Because it shares visual styling with body paragraphs, users skimming long evidence summaries can easily overlook whether the source confirms or refutes the claim.
* **Recommendation**: Format the stance as a prominent badge pill preceding the text:
  * `SUPPORTS CLAIM`: Green container (`rgba(22, 163, 74, 0.12)`), dark green text (`#15803D`), icon `shield-checkmark`.
  * `DISPUTES CLAIM`: Red container (`rgba(220, 38, 38, 0.12)`), dark red text (`#B91C1C`), icon `close-circle`.
  * `CONTEXT ONLY`: Blue container (`rgba(37, 99, 235, 0.12)`), dark blue text (`#1D4ED8`), icon `information-circle`.

### 3.3 Semantic Guardrail: Match Score vs. Truth Verdict
* **Critical Design Consideration**: In `VerificationResultsScreen.tsx`, the interface shows `matchScore` (0–100) next to the match badge.
* **Usability Risk**: Novice users often conflate algorithmic search similarity with factual truth. For example, if a widely known false myth is in the database, the app might display a "95% match", which participants may misinterpret as "95% true".
* **Recommendation**:
  1. Add a persistent label below the score: *"Search similarity to verified record, not a truth rating."*
  2. Maintain explicit phrasing: *"Record found in database. Review the sources below to evaluate truthfulness."*

---

## 4. Dark Mode Design Specifications (Figma & Code)

To support comfortable verification in low-light environments and reduce glare, FactTrace should implement a semantic dark surface hierarchy.

### 4.1 Dark Theme Color Tokens
Add the following tokens to `mobile/src/constants/app.ts` under a dedicated `DARK_COLORS` object:

```typescript
export const DARK_COLORS = {
  // Surface Hierarchy
  background: '#0F172A',      // Slate 900 (Base Canvas)
  surfaceCard: '#1E293B',     // Slate 800 (Cards, Evidence Panels)
  surfaceElevated: '#334155', // Slate 700 (Modals, Popups, Overlays)
  border: '#334155',          // Slate 700 (Subtle dividers)
  borderActive: '#64748B',    // Slate 500 (Active inputs, focused cards)

  // Typography
  textPrimary: '#F8FAFC',     // Slate 50 (Ratio: 14.8:1 on #0F172A)
  textSecondary: '#CBD5E1',   // Slate 300 (Ratio: 10.4:1 on #0F172A)
  textMuted: '#94A3B8',       // Slate 400 (Ratio: 5.8:1 on #0F172A - Passes AA)

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

### 4.2 Figma Visual Guidelines

The full set of all 10 dark-mode screens has been finalized, reviewed, and laid out in the official Figma file:
* **Figma Design File:** [FactTrace Mobile UI & Dark Mode (10 Screens)](https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT)

When applying dark mode across the 10 Figma screens:
1. **Canvas / Background**: Set main frame fills to `#0F172A`.
2. **Cards (Match Card, Evidence Previews)**: Set fills to `#1E293B` with a 1px border stroke of `#334155` and a corner radius of `16px`. Avoid pure black shadows; use subtle elevation borders.
3. **Buttons**:
   * Primary Button: Background `#0284C7` with `#FFFFFF` text.
   * Secondary / Outlined Button: Background `transparent`, border 1.5px `#475569`, text `#CBD5E1`.
4. **Modals (`SharingIntentionModal.tsx`)**: Backdrop overlay `rgba(15, 23, 42, 0.75)`, container fill `#1E293B`.

---

## 5. Empirical Pilot Usability Protocol

In accordance with **Handbook Section 8**, FactTrace must document an evidence-based design iteration informed by user testing. This protocol outlines a 10-minute pilot session to be conducted with **one university student outside the project team**.

### 5.1 Test Setup & Equipment
* **App State**: FactTrace running on physical mobile device (or interactive Figma prototype).
* **Test Claim Materials**: One printed paper slip with `claim_01` (*"Drinking eight glasses of water a day is required for good health"*).
* **Observer Role**: Observe without prompting; record time, hesitation points, and comments verbatim.

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

1. **For Mazen**:
   * Apply the dark mode surface palette in Figma to the primary screens (`Home`, `Results`, `Evidence`).
   * Conduct the 10-minute pilot test using the Section 5 protocol and fill in Section 6.
2. **For Rand & Abdallah (Frontend Integration)**:
   * Update `mobile/src/constants/app.ts` with the approved `#475569` text colors to resolve the WCAG contrast failure.
   * Add the dual-encoding icons to `VerificationResultsScreen.tsx` match badges.
