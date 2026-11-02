# FactTrace — UI/UX and Accessibility Review

**CS 449 / CS 549 — Human-Computer Interaction**

---

## 1. What I worked on

My part of FactTrace focuses on the interface and how people understand the verification results. I completed dark-mode designs for the ten main mobile screens in Figma. I also looked through the React Native frontend to identify accessibility issues and parts of the experience that could be clearer.

This is a review of the code and designs, **not a complete accessibility test**. The changes I suggest here have not been implemented in the app by this branch. I also haven't run the usability pilot yet.

**Figma:** https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT

## 2. Accessibility checks

I started with text contrast, since some of the gray text in our light theme may be difficult to read. WCAG 2.1 AA requires a contrast ratio of at least **4.5:1 for normal-size text**.

| Color in the app | Background | Contrast | My finding |
| --- | --- | --- | --- |
| `textSecondary` (`#7A8798`) | `#F4F7FB` | **3.40:1** | Below AA for normal text |
| `textMuted` (`#98A4B3`) | `#F4F7FB` | **2.36:1** | Below AA for normal text |
| Suggested replacement `#475569` | `#F4F7FB` | **7.05:1** | Meets AAA for normal text |
| Suggested replacement `#475569` | White (`#FFFFFF`) | **7.58:1** | Meets AAA for normal text |

I recommend using a darker gray like `#475569` where the existing light gray tokens are used for normal text on these backgrounds. Before changing the tokens everywhere, we should check the screens where they appear.

I also found a possible issue with text-field borders. The current `#DEE5ED` border has only **1.27:1** contrast against white. This might make input boxes hard to recognize, but I'd need to inspect the rendered app and focus states before calling it a confirmed WCAG 1.4.11 failure. A darker focus border would make the active field clearer.

The frontend already does some things well: the primary text color has strong contrast (around **14.94:1** on the light background); the verification decision buttons have a `minHeight` of 88 in the code I reviewed; and match badges include text labels instead of relying only on color.

I have **not** tested screen readers, text resizing, or every interaction state yet, so I don't want to claim that the whole app passes accessibility standards.

## 3. Usability improvements I recommend

These are things I noticed from looking at the interface. **They are design recommendations, not observations from a real participant test yet.**

### Make the match statuses easier to scan

The results screen uses words such as “Strong Match,” “Possible Match,” and “No Match” alongside a small colored dot. I would keep the text and add a different icon to each status (for example, check-circle, alert-circle, and help-circle). This would make the statuses easier to tell apart at a glance without depending on color alone.

### Make the evidence stance more obvious

When someone opens Evidence Details, they should quickly understand whether a source **supports**, **disputes**, or only gives **context** for the claim. I'd make that information more visible with a short labeled badge above the evidence description.

### Explain the match percentage

I think “92% match” could be misunderstood as “92% true.” In FactTrace, the number means how closely the submitted text matches a record in the database, **not how true the claim is**. I recommend showing an explanation next to it, such as:

> Text similarity to a database record — not a truth rating. Review the evidence before deciding.

This matters because the app is meant to help users investigate sources rather than just trust a score.

## 4. Dark-mode Figma designs

I finished the dark-mode designs for all ten main screens: Home, Camera, Review Claim, Verification Results, Evidence Details, Sharing Intention, Verification History, Profile, Create Account, and Log In.

**Figma file:** https://www.figma.com/design/YNwaYpHs4NycdOqFUOayoT

I used a consistent palette across the screens and fixed small issues with buttons, status labels, profile spacing, the circular avatar, and back arrows.

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

These colors are a **design reference** for a possible `DARK_COLORS` theme in `mobile/src/constants/app.ts`. The designs are complete in Figma, but this branch **does not implement dark-mode switching** in React Native. Rand and the team would need to decide how to connect the theme to the existing frontend.

## 5. Usability pilot — planned

I plan to test the main flow with **one student outside our group**, in a short session of around ten minutes. The idea is to see what someone understands easily and where they hesitate.

I'll use the claim **“Drinking eight glasses of water a day is required for good health.”** It is in our mock dataset as `claim_01`, with the answer marked *misleading* and an overall stance of *contradicts*. The linked evidence sources are demonstration records, not real external authorities. Before the pilot, I'll check that the scan/OCR and results flow works end to end.

I'll ask the participant to do three things:

1. **Scan and verify:** Scan the printed claim, review the OCR text, and continue to the results.
2. **Inspect evidence:** Find whether the evidence supports or contradicts the claim and identify the listed publisher.
3. **Decide and share:** Choose Trust, Don't Trust, or Unsure, then answer the sharing question.

I won't tell them which buttons to press. I'll note whether each task was completed, where they paused or made mistakes, and anything useful they said.

| Task | Completed? | Time | Hesitations or errors | Participant's words |
| --- | --- | --- | --- | --- |
| Scan and verify | Pending | Pending | Pending | Pending |
| Inspect evidence | Pending | Pending | Pending | Pending |
| Decide and share | Pending | Pending | Pending | Pending |

## 6. Design iteration — after the pilot

I haven't completed this part yet because I need real feedback first. After testing, I'll document:

- **What I observed:** The specific moment the participant got confused or stuck.
- **Why it matters:** How the issue affects the verification experience.
- **What I changed:** A concrete update to the Figma design or recommendation.
- **What happened after the change:** Any follow-up check I actually perform. If I can't retest, I'll say so.

I don't want to invent feedback or claim that an improvement has been validated before testing it.

## 7. What happens next

**Done:** Ten dark-mode screens in Figma and this initial accessibility/usability review. The GitHub branch contains documentation only; I haven't changed frontend or backend code.

**For Rand and Abdallah to review:** Better light-mode text contrast, clearer match-status icons and evidence labels, the explanation of database match scores, and the proposed dark-mode palette.

**Still on my side:** Run the pilot with a participant, document what happened, and make at least one design iteration based on the results.
