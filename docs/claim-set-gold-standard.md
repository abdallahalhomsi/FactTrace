# Claim set: gold standard

How the correct answer for every study claim was established and checked.

## Rules

Based on the item selection used by Pennycook, Rand and colleagues: false items come from third-party fact-checkers, true items from mainstream or official sources, and misleading items report real events in a misleading way (Ross, Rand & Pennycook, 2021).

| Label | What counts as the gold standard |
|---|---|
| **true** | At least two independent mainstream or official sources confirm it. |
| **false** | A fact-checking organisation (IFCN or EFCSN signatory) has checked the claim and found it false, or the organisation the claim is about states the opposite. |
| **misleading** | The claim is built on a real, documented fact or event, but leads to a wrong conclusion (for example a fact-checker rated it misleading, inaccurate or lacking context). |

**Scoring uses only true vs not true.** Trust is correct for true claims; Don't trust is correct for false and misleading claims. The false / misleading split describes the kind of misinformation and is reported descriptively (each participant sees only 3 misleading claims, too few for a separate test).

The primary outcome is **truth discernment**: the share of true claims trusted minus the share of not-true claims trusted (already computed by `analyze-study.ts`). Raw accuracy is secondary, because each set has 3 true and 4 not-true claims: a participant who distrusts everything would score 4/7 on accuracy but 0 on discernment. Unsure counts as "not trusted" in discernment and is reported separately as the Unsure rate, so caution is not scored as a mistake.

## Independent labelling

Two team members who did not prepare the claim data (Syeda Manaal Amir, Rand MO Khaled) labelled every claim from its sources alone, without seeing our labels, and without discussing it.

- **Round 1 (26 Nov 2026):** the 14 claims of the first version of the sets.
- **Round 2 (26 Nov 2026):** three changed or new claims (claim_31, claim_45 with new sources, claim_52).

Decisions:

- **Removed:** claim_45 (Pluto) was labelled *true* by three of four labels across both rounds; claim_52 (horror films) was labelled *true* by one labeller. Both would be scored as not true, so neither is used.
- **Added:** claim_31 (Martinelli), labelled *false* by both labellers in round 2.
- **Relabelled:** where both labellers independently agreed with each other but not with our label, their label was adopted: claim_32 (Marie Antoinette) false → **misleading**; claim_51 (burnout) misleading → **false**. Neither change affects scoring.
- **Kept:** claim_38 (vitamin C), labelled false by one labeller and misleading by the other; both are "not true", so scoring is unaffected.

Agreement on the final 14 claims (claim_31 from round 2, all others from round 1):

| | True vs not true (what is scored) | True / false / misleading |
|---|---|---|
| Labeller vs labeller | 13/14, Cohen's kappa 0.85 | 12/14, Cohen's kappa 0.78 |
| Manaal vs final labels | 13/14 | 12/14 |
| Rand vs final labels | 14/14 | 14/14 |

The one disagreement on what is scored is claim_03 (octopus three hearts), labelled false by one labeller although both sources state three hearts; it is kept as true.

A separate claim pretest was not run: claim familiarity is measured for every trial in the main study, and set difficulty is counterbalanced through `set_order`.

## Study sets

Each set has 3 true and 4 not-true claims in the same positions. Matched topics are split across the sets: misattributed quotes (Einstein / Marie Antoinette), WHO claims (processed meat / burnout), viral hoaxes (Martinelli / NASA darkness), work (Finland four-day week / burnout), health (processed meat / vitamin C).

| Set | Pos | Claim | Label | Gold standard |
|---|---|---|---|---|
| A | 1 | claim_11 EU USB-C rule | true | European Commission + 2 news outlets |
| A | 2 | claim_24 Finland four-day week | false | Full Fact |
| A | 3 | claim_39 WHO processed meat = smoking | misleading | Science Feedback (inaccurate, misleading) |
| A | 4 | claim_03 Octopus three hearts | true | Live Science, Smithsonian Magazine |
| A | 5 | claim_33 Einstein insanity quote | false | Check Your Fact (+ Quote Investigator) |
| A | 6 | claim_31 "Martinelli" WhatsApp video | false | Full Fact, Newschecker |
| A | 7 | claim_09 Göbekli Tepe vs Stonehenge | true | Hürriyet Daily News, English Heritage |
| B | 1 | claim_16 Ozone recovery | true | World Meteorological Organization + news |
| B | 2 | claim_25 NASA "six days of darkness" | false | PolitiFact, Lead Stories |
| B | 3 | claim_38 Vitamin C prevents colds | misleading | Science Feedback (lacks context), Cochrane review |
| B | 4 | claim_15 Scotland's unicorn | true | National Trust for Scotland, The Scotsman |
| B | 5 | claim_32 Marie Antoinette "cake" | misleading | Misbar, Britannica |
| B | 6 | claim_51 WHO burnout "medical condition" | false | World Health Organization (28 May 2019), NPR |
| B | 7 | claim_05 Venus day vs year | true | Snopes (true) + news |

Set A has 3 false and 1 misleading; set B has 2 false and 2 misleading. Because scoring only separates true from not true, both sets have the same structure for analysis.

Not used in the sets: claim_40 (Everest) and claim_41 (Istanbul), because no fact-checker has covered either; claim_45 and claim_52 (see above).

## What the app shows at a glance

The app never gives a verdict. For a matched claim it shows the sources, a one-line summary of what each source reports (attributed to the source, without rating labels such as "Rated False"), and factual provenance signals: where the claim comes from, its date, how many independent organisations address it and what kind they are. All signals use the same neutral style, with no warning or positive colours.

Three things the backend can send are switched off for the study (`SHOW_VERDICT_HINTS = false` in `verify.service.ts`): the per-source "supports / contradicts the claim" line, the curated claim summary (which states the answer), and the overall stance. They stay in the database for analysis.

The sources were also checked so that a quick skim is consistent with the gold standard: no source of a not-true claim reads as confirming it, and every true claim has a source that confirms it. The Göbekli Tepe signal gives both ages, since neither headline states the comparison.

## Before the main study

Run `npx tsx src/scripts/check-links.ts` (from `backend`) and open any blocked link by hand.

## References

- Pennycook, G., Binnendyk, J., Newton, C., & Rand, D. G. (2021). A practical guide to doing behavioral research on fake news and misinformation. *Collabra: Psychology, 7*(1). https://doi.org/10.1525/collabra.25293
- Ross, R. M., Rand, D. G., & Pennycook, G. (2021). Beyond "fake news": Analytic thinking and the detection of false and hyperpartisan news headlines. *Judgment and Decision Making, 16*(2), 484–504.
