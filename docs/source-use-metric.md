# Source-use metric

One definition for both conditions, so FactTrace and the browser baseline can be compared directly.

## Definition

**Source use = the number of distinct evidence sources the participant inspected before the final decision.**

- **Evidence source:** one article, report, fact check or official page about the claim.
- **Inspected:** the participant opened the source itself, not just saw its title or snippet in a list.
- **Distinct:** each source counts once per trial, however often it was opened.
- **Before the final decision:** only sources opened before the participant tapped Trust / Don't Trust / Unsure. The sharing question comes after the decision and is not part of the task.
- **Practice trials are excluded** from the analysis (`is_practice = 1`).

## How each condition counts it

| | FactTrace | Browser |
|---|---|---|
| Counts as inspected | Tapping **View source** on a source card (opens that source's details), or **Open Original Source** | Opening a web page with content about the claim |
| Does not count | Seeing the source cards on the results screen | Search result pages, or seeing a result title or snippet without opening it |
| Distinct by | Source ID (`src_39a`) | Article or page (see the coding rules below) |
| Recorded by | The app, automatically | The screen recording, coded by two people. Study trials no longer ask participants to list sources in the app (typing them made browser trials slower); outside the study the list still works |
| Stored in | `decisions.sources_opened`, `sources_opened_count` | `browser_source_coding` (coder1, coder2, final); `decisions.sources_opened` stays empty in study browser trials |

**View Full Evidence is hidden during study trials.** It shows every source in full without opening any of them one by one, which would make the FactTrace count too low. Outside the study the button works as before.

## Which browser number is used

The **screen-recording count** is the only measure for the browser condition. A self-report can miss pages or list pages that were not really read, and typing each source took 10 to 20 s, which made the browser condition look slower for a reason that is not about the tool (system test #10). A browser trial without a final count is left out of source use, and both analysis scripts warn about it.

## How it works: one participant from start to finish

In the browser condition the participant leaves the app and searches in the phone's browser, so the app cannot see which websites they open. So we record the phone screen and count the sources from the video.

**Once, before the study (about 5 minutes):** add Screen Recording to Control Center on the study phone and turn on Do Not Disturb (details in the next section).

**During the session (example: P07):**
1. P07 fills in the participant information form.
2. The researcher swipes down and taps the record button before **Start Trial 1**.
3. P07 does all 16 trials as normal. The recording captures every website they open.
4. At **Study complete**, the researcher stops the recording.
5. The researcher copies the video to the study laptop with a cable, renames it `P07_browser.mp4` and deletes it from the phone.

**After all participants are done:**
1. On the laptop, `npm run coding -- sheet` makes two spreadsheets, one per coder. Each lists every browser trial:

   | participant_id | trial_index | claim | trial_start_time | decision_time | source_count | notes |
   |---|---|---|---|---|---|---|
   | P07 | 10 | Since December 2024, new phones… | 14:32:05 | 14:34:40 | | |
   | P07 | 11 | Finland is introducing… | 14:35:02 | 14:37:15 | | |

2. Two team members each take one sheet. Each opens `P07_browser.mp4`, finds 14:32:05 on the phone's clock in the video, watches until 14:34:40, counts the different websites P07 opened (using the coding rules below) and writes the number in `source_count`. They work separately and do not discuss their counts, so the study can show the counting is reliable.
3. Both sheets are loaded with `npm run coding -- import coder1 …` and `import coder2 …`.
4. `npm run coding -- agreement` shows how often the two coders gave the same number (for example "90% exact agreement, ICC = 0.92") and lists the trials where they disagreed.
5. `npm run coding -- finalize` saves every agreed trial as the final count.
6. The coders rewatch the disagreements together, agree a number and load it with `import final`.
7. The videos are deleted.

The analysis then uses these final video counts as source use for the browser condition.

**The ICC** is one number from 0 to 1 showing how well the two coders agreed. It goes in the method section, for example: "Two coders independently counted the sources in the screen recordings (ICC = 0.92)." Report the value from before the coders discussed their disagreements, because it shows they agreed independently.

**Who does what:**

| Step | Who |
|---|---|
| Database table, coding sheets, agreement calculation, analysis | Done (software) |
| Turn on Screen Recording and Do Not Disturb on the phone | Team, once |
| Start and stop the recording each session | Researcher running the session |
| Watch the videos and count the sources | Two team members, separately |
| Run the coding commands | Anyone, on the study laptop |

## Not tested yet: check in the pilot

The software side was tested with made-up coder counts for the test participants (P95, P96): sheets, import, agreement, finalize and the analysis all work. **The recording itself has not been tested on the study phone yet.** In the pilot, check that:

- [ ] the phone keeps recording while the participant switches between FactTrace and the browser
- [ ] the status bar clock is readable in the video (on some iPhones the recording indicator covers it); if not, use the time shown in the video player instead and note the recording start time
- [ ] the video copies to the laptop by cable and plays
- [ ] a coder can count the sources for one trial from the video using the coding rules
- [ ] no notifications appear during the recording

## Screen recording on the study phone

**Set up once, before the first participant (iPhone):**
1. Settings → Control Center → add **Screen Recording**.
2. Turn on a **Focus / Do Not Disturb** mode for study sessions, so no notifications (names, messages) end up in the recordings.
3. Check there is enough free storage: about 1–2 GB for a 30-minute session.
4. Make sure the status bar clock is visible while recording. Coders use it to find each trial.

On Android: pull down Quick Settings → **Screen record** (add the tile if it is missing), and turn on Do Not Disturb.

**Each session:**
1. Start the recording after the participant information form, before **Start Trial 1**. Stop it at **Study complete**. That gives one file per participant, and coders skip the FactTrace trials.
2. Check the file saved, then copy it straight to the study laptop with a cable (not iCloud, Google Photos or a shared drive).
3. Name it by participant code only: `P07_browser.mp4`. Store it in one local folder that is not synced and not inside the repository.
4. Delete it from the phone, including **Recently Deleted**.

## Coding workflow

Run from the `backend` folder while MySQL is running:

1. `npm run coding -- sheet` creates `exports/coding/browser_coding_coder1.csv` and `..._coder2.csv`. They list every browser study trial with its claim and the clock times of trial start and decision, so the coder can find it in the video. They show no answers and no participant decisions, so nothing can influence the count.
2. Each coder fills in `source_count` (and `notes` when unsure) in their own sheet, using the rules below, without talking to the other coder.
3. `npm run coding -- import coder1 path/to/sheet.csv`, then the same for `coder2`.
4. `npm run coding -- agreement` shows exact agreement, mean difference, ICC(2,1) and the list of trials where the coders disagree.
5. `npm run coding -- finalize` saves every trial where both coders agree as the final count.
6. The coders rewatch the disagreements together and agree a number. Put those in a sheet with `participant_id, trial_index, source_count, notes` and run `npm run coding -- import final that-sheet.csv`.
7. `agreement` again: it should list no trial that "needs a final count". The analysis (`analyze-study.ts`) now uses the final video count for browser trials, and warns if any trial still has none.
8. Delete the recordings (see above) and write the deletion date in the study log.

Report the ICC from step 4 (before discussion) in the paper.

## Coding rules for the browser screen recordings

The two coders use these rules separately, without discussing them, and record one number per trial.

1. Start counting when the trial starts in the app. Stop when the participant taps their decision.
2. Count a page when it is opened and its content is shown, even briefly.
3. Do **not** count:
   - search engine result pages (Google, Bing and so on)
   - pages that fail to load, or are closed before any content appears
   - the FactTrace app itself
4. Count each article once per trial, even if it is opened again, or reached through a different link or a mobile or AMP version of the same article.
5. Two different articles on the same website count as **two** sources.
6. If a coder cannot tell from the video, write the count they are sure of and add a note.

After coding, compare the two counts per trial, report agreement (ICC or Cohen's kappa), and settle disagreements by discussion. Delete the recordings once the counts are final (see the privacy procedure).
