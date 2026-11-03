# FactTrace — UI/UX and Accessibility Review

**CS 449 / CS 549 — Human-Computer Interaction**

---

## 1. Overview

This document summarizes the UI/UX and accessibility work completed for FactTrace. It covers dark-mode designs for the ten main mobile screens, a review of accessibility-related details in the React Native frontend, and recommendations for making verification results easier to understand.

The accessibility findings are based on code and design inspection, **not a complete accessibility test**. Suggested application changes have not been implemented on this branch, and the usability pilot is still pending.

**Figma:** https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT

## 2. Accessibility checks

Text contrast was reviewed because some gray text in the current light theme may be difficult to read. WCAG 2.1 AA requires a contrast ratio of at least **4.5:1 for normal-size text**.

| Color in the app | Background | Contrast | Finding |
| --- | --- | --- | --- |
| `textSecondary` (`#7A8798`) | `#F4F7FB` | **3.40:1** | Below AA for normal text |
| `textMuted` (`#98A4B3`) | `#F4F7FB` | **2.36:1** | Below AA for normal text |
| Suggested replacement `#475569` | `#F4F7FB` | **7.05:1** | Meets AAA for normal text |
| Suggested replacement `#475569` | White (`#FFFFFF`) | **7.58:1** | Meets AAA for normal text |

A darker gray such as `#475569` is recommended for normal text currently using these lighter gray tokens on the listed backgrounds. The screens where these tokens appear should be checked before the values are changed throughout the app.

A possible issue was also identified with text-field borders. The current `#DEE5ED` border has only **1.27:1** contrast against white. This may make input boxes harder to recognize, but the rendered interface and focus states need to be inspected before classifying it as a confirmed WCAG 1.4.11 failure. A darker focus border could make the active field clearer.

The existing frontend also has accessibility strengths: the primary text color has strong contrast (approximately **14.94:1** on the light background); the verification decision buttons specify a `minHeight` of 88 in the reviewed code; and match badges include text labels rather than relying only on color.

Screen-reader behavior, text resizing, and every interaction state have **not** yet been tested. This review does not establish that the entire app meets accessibility standards.

## 3. Course-slide HCI checklist

To connect this review to the principles taught in CS 449 / CS 549, the current implementation was compared against key usability concepts from the lecture slides.

| Usability principle & slide reference | Current finding in FactTrace | Status | Proposed improvement |
| --- | --- | --- | --- |
| **Touch targets (Fitts's Law)**<br>*Week 5 Notes, Slides 8–15* | Core buttons satisfy minimum touch bounds. Decision buttons have a `minHeight` of 88, and the primary scan button is 64. | **Pass** | Maintain current target dimensions in any future layout adjustments. |
| **Color blindness & redundant coding**<br>*Week 3 Notes, Slide 69* | Decision buttons combine text labels, colors, and distinct icons (checkmark, cross, help). Match levels use colored dots with text labels. | **Pass** | Add distinctive icons to match badges as well to reinforce scanning without color. |
| **Visibility of system status**<br>*Week 2 Notes, Slide 11; Week 5, Slide 80* | Clear loading spinners and status messages appear during camera capture, OCR text extraction, and backend verification. | **Pass** | Keep immediate visual feedback across all network and processing states. |
| **Text sizing & legibility**<br>*Week 3 Notes, Slide 26; Supplementary, Slides 15–16* | Several supporting labels across the app are styled between 9px and 10.5px (such as card hints, metadata labels, and provenance details). | **Needs Improvement** | Increase small text to at least 12px to improve readability on smaller mobile screens. |
| **Error recovery & plain language**<br>*Week 2 Notes, Slide 10 (Heuristic #9)* | When network calls fail, the app displays developer instructions (`npm run dev`, `EXPO_PUBLIC_API_BASE_URL`). | **Needs Improvement** | Replace technical debugging text with user-friendly messages and a clear retry action. |
| **Mental models & score interpretation**<br>*Week 3 Notes, Slides 34–38; Week 5, Slides 80–84* | The “92% match” label might be misunderstood by users as a truth rating rather than text similarity to a database record. | **Needs Improvement** | Display a short note clarifying that the percentage measures text similarity, not truthfulness. |
| **User control vs. evaluation protocol**<br>*Week 2 Notes, Slide 9 (Heuristic #3)* | The sharing modal cannot be dismissed without picking an option. This is intentional for collecting complete research trials, but restricts user control. | **Design Tradeoff** | Keep for evaluation data collection, but consider an explicit skip or cancel option for normal app use. |

## 4. Usability recommendations

The following points come from inspecting the interface. **They are design recommendations, not observations from a participant test.**

### Make match statuses easier to scan

The results screen shows labels such as “Strong Match,” “Possible Match,” and “No Match” alongside a small colored dot. Keeping the text and adding a distinct icon for each status (for example, check-circle, alert-circle, and help-circle) could make the states easier to distinguish at a glance without depending on color alone.

### Make evidence stance more obvious

The Evidence Details screen should make it easy to see whether a source **supports**, **disputes**, or provides **context** for a claim. A short labeled badge above the evidence description could make this information more visible.

### Explain the match percentage

A “92% match” could be mistaken for “92% true.” In FactTrace, the percentage represents how closely the submitted text matches a record in the database, **not how true the claim is**. An explanation near the score is recommended:

> Text similarity to a database record — not a truth rating. Review the evidence before deciding.

This distinction matters because the app is intended to help users investigate evidence rather than treat a matching score as a truth verdict.

## 5. Dark-mode Figma designs

Dark-mode designs have been completed for all ten main screens: Home, Camera, Review Claim, Verification Results, Evidence Details, Sharing Intention, Verification History, Profile, Create Account, and Log In.

**Figma file:** https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT

A consistent palette was used across the screens, and layout details were refined, including button widths, status labels, profile spacing, the circular avatar, and back arrows.

| Part of the UI | Color |
| --- | --- |
| Main background | `#0F172A` |
| Cards | `#1E293B` |
| Elevated surfaces | `#334155` |
| Main text | `#F8FAFC` |
| Secondary text | `#CBD5E1` |
| Muted text | `#94A3B8` |
| Accent blue | `#38BDF8` |
| Success / warning / error text | `#86EFAC` / `#FDE047` / `#FCA5A5` |

These colors provide a **design reference** for a possible `DARK_COLORS` theme in `mobile/src/constants/app.ts`. The Figma designs are complete, but this branch **does not implement dark-mode switching** in React Native. Frontend integration would need to be discussed with Rand and the rest of the team.

## 6. Usability pilot — planned

A short pilot with **one student outside the project group** is planned, lasting approximately ten minutes. The goal is to find which parts of the main verification flow are easy to understand and where a new user hesitates.

The proposed test claim is **“Drinking eight glasses of water a day is required for good health.”** It is included in the mock dataset as `claim_01`, marked *misleading* with an overall stance of *contradicts*. Its linked evidence sources are demonstration records, not real external authorities. The scan/OCR and results flow should be checked end to end before the pilot.

The participant will be asked to complete three tasks:

1. **Scan and verify:** Scan the printed claim, review the OCR text, and continue to the results.
2. **Inspect evidence:** Find whether the evidence supports or contradicts the claim and identify the listed publisher.
3. **Decide and share:** Choose Trust, Don't Trust, or Unsure, then answer the sharing question.

The participant should complete the tasks without being told which buttons to press. The observation record will note task completion, hesitation or errors, and relevant participant comments.

| Task | Completed? | Time | Hesitations or errors | Participant's words |
| --- | --- | --- | --- | --- |
| Scan and verify | Pending | Pending | Pending | Pending |
| Inspect evidence | Pending | Pending | Pending | Pending |
| Decide and share | Pending | Pending | Pending | Pending |

## 7. Design iteration — after the pilot

This section remains incomplete until real participant feedback is collected. The design iteration will document:

- **What was observed:** The specific moment when the participant became confused or encountered difficulty.
- **Why it matters:** How the issue affects the verification experience.
- **What changed:** A concrete update to the Figma design or a related recommendation.
- **What happened after the change:** Any follow-up check that was actually performed. If no retest takes place, that limitation will be stated.

Participant feedback and validation results will not be invented or presented as completed before testing.

## 8. Next steps

**Completed:** Ten dark-mode screens in Figma, this accessibility review, and the course-slide HCI checklist. The GitHub branch contains documentation only; no frontend or backend application code was changed as part of this review.

**For team review:** Improvements to light-mode text contrast, small font sizes, developer-facing error messages, match-status icons, evidence labels, explanations of database match scores, and the proposed dark-mode palette.

**Remaining:** Run the usability pilot with a participant, document the findings, and make at least one evidence-based design iteration.
