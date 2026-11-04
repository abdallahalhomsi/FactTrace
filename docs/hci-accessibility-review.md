# FactTrace — UI/UX and Accessibility Review

**CS 449 / CS 549 — Human-Computer Interaction**

---

## 1. Overview

This document summarizes the UI/UX, accessibility, and usability review completed for FactTrace. It covers dark-mode designs for the ten main mobile screens, a code inspection of accessibility details in the React Native frontend, an HCI checklist based on course lecture principles, and findings from an initial usability pilot session with an external participant.

The accessibility findings are based on code and design inspection, **not a complete accessibility test**. The design improvements proposed in this document have not been implemented in the application code on this branch.

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

## 6. Usability pilot findings

A pilot session was conducted with one participant outside the FactTrace team using the test claim *“Drinking eight glasses of water a day is required for good health”* (`claim_01`). The participant walked through the core verification flow: scanning the printed claim, reviewing the text, inspecting the matched result and evidence, and selecting a decision.

No task completion times or formal measurements were recorded. Findings were limited to what was directly observed during the session:

1. **Home screen crowding:** The participant noted that the Home screen felt crowded, with too much information competing for attention.
2. **Unresponsive source URL:** On the Evidence Details screen, the participant tapped the blue URL text displayed above the “Open Original Source” button expecting it to open the source, but nothing happened.
3. **General experience:** The participant reported that the rest of the verification experience was good and easy to follow.

## 7. Evidence-based design iteration

Based on the participant's direct feedback and principles from the course lecture slides, two interface improvements are proposed. These have not yet been implemented in the application code.

### 1. Home screen decluttering (Aesthetic and Minimalist Design)
- **Observed issue:** The participant noted that the Home screen felt crowded and had too much information competing for attention. The screen currently contains seven separate vertical blocks, including decorative diagrams and marketing cards.
- **Course principles:** Nielsen’s Heuristic #8 (*Aesthetic and minimalist design*, Week 2 Notes, Slide 10) and Visual Search complexity / Hick's Law (Week 5 Notes, Slides 40–46). Extra units of information diminish the visibility of primary actions.
- **Proposed improvements:** Simplify the hero card by removing decorative elements, and remove the redundant “Why FactTrace?” marketing cards. All existing navigation (Scan a Claim, Enter Claim Manually, Verification History, Browser Comparison, and Account Login) is preserved while giving the primary scan action clear visual prominence.

### 2. Source URL touch interaction (Affordance and Gulf of Execution)
- **Observed issue:** The participant tapped the blue source URL expecting it to open, but only the button below was interactive.
- **Course principles:** Affordance and Signifiers (Supplementary Materials, Slides 26–27) and Norman’s Gulf of Execution (Week 5 Notes, Slides 79–84). Blue URL text carries an established perceived affordance of clickability. When tapping produces no result, the user's intention fails to map to an executable action.
- **Proposed improvements:** Make the blue URL text tappable by wrapping it in a touchable component that calls the existing `openSource()` handler. For demonstration records (such as mock `example.org` links), show a brief notice explaining that the source is a demonstration record for evaluation purposes.

## 8. Next steps

**Completed:** Ten dark-mode screens in Figma, the accessibility review, the course-slide HCI checklist, the usability pilot with one external participant, and documented proposed improvements based on real feedback. The GitHub branch contains documentation only; no frontend or backend application code was changed as part of this review.

**For team review:** Proposed improvements to light-mode text contrast, small font sizes, developer-facing error messages, Home screen decluttering, source URL tap interaction, match-status icons, explanations of database match scores, and the proposed dark-mode palette.
