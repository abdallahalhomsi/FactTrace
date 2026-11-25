# Claim set: gold standard

How the correct answer for every study claim is established, and how the two sets are checked before the main study.

## Rules

Based on the item selection used by Pennycook, Rand and colleagues: false items come from third-party fact-checkers, true items from mainstream or official sources, misleading items report real events in a misleading way (Ross, Rand & Pennycook, 2021), and items are pretested before use (Pennycook, Binnendyk, Newton & Rand, 2021).

| Label | What counts as the gold standard |
|---|---|
| **true** | At least two independent mainstream or official sources confirm it. |
| **false** | A fact-checking organisation (IFCN or EFCSN signatory) has checked the claim and found it false. |
| **misleading** | The claim is built on a real, documented fact or event, and either a fact-checker rated it in the misleading family (misleading, inaccurate, lacks context, mixture, half true), or the organisation it is about has itself corrected or defined the distorted part. |

A claim whose only fact-check gives a different verdict than our label (for example Snopes rating a "misleading" claim *False*) is not used.

## Study sets

Each set: 3 true, 2 false, 2 misleading, in the same positions. Misleading items in both sets follow the same pattern: a real finding or announcement stretched into a wrong conclusion ("The WHO says...", "A university study found...").

| Set | Pos | Claim | Label | Gold standard |
|---|---|---|---|---|
| A | 1 | claim_11 EU USB-C rule | true | European Commission + 2 news outlets |
| A | 2 | claim_24 Finland four-day week | false | Full Fact |
| A | 3 | claim_39 WHO processed meat = smoking | misleading | Science Feedback (inaccurate, misleading) |
| A | 4 | claim_03 Octopus three hearts | true | Live Science, Smithsonian Magazine |
| A | 5 | claim_33 Einstein insanity quote | false | Check Your Fact (+ Quote Investigator) |
| A | 6 | claim_45 Pluto "too small" | misleading | International Astronomical Union, NASA JPL (planet definition) |
| A | 7 | claim_09 Göbekli Tepe vs Stonehenge | true | Hürriyet Daily News, English Heritage |
| B | 1 | claim_16 Ozone recovery | true | World Meteorological Organization + news |
| B | 2 | claim_25 NASA "six days of darkness" | false | PolitiFact, Lead Stories |
| B | 3 | claim_38 Vitamin C prevents colds | misleading | Science Feedback (lacks context), Cochrane review |
| B | 4 | claim_15 Scotland's unicorn | true | National Trust for Scotland, The Scotsman |
| B | 5 | claim_31 "Martinelli" WhatsApp video | false | Full Fact, Newschecker |
| B | 6 | claim_52 Horror films and weight loss | misleading | Snopes (Mixture) |
| B | 7 | claim_05 Venus day vs year | true | Snopes (true) + news |

Removed from the sets: claim_40 (Everest) and claim_41 (Istanbul), because no fact-checker has covered either; claim_32 (Marie Antoinette) and claim_51 (burnout) after labelling round 1 (below).

## Before the main study

1. **Independent labelling.** Two team members who did not write a claim each label all 14 study claims (true / false / misleading) from the sources alone, without seeing `correct_answer`. Report agreement (Cohen's kappa). A claim the two labellers and the database do not all agree on is discussed, and replaced if the disagreement stays.
2. **Pretest.** About 10 to 15 people who will not take part in the main study (add them to the exclusion list) rate each claim: "Have you seen this claim before?" (yes / no / unsure) and "How likely is it that this claim is true?" (1 to 7). Replace any claim almost everyone has seen or rates at the very top or bottom of the scale, and check that sets A and B have similar average ratings.
3. **Links.** Run `npx tsx src/scripts/check-links.ts` (from `backend`) and open any blocked link by hand.

## Labelling round 1 (26 Nov 2026)

Labellers: Syeda Manaal Amir, Rand MO Khaled. Agreement between them 11/14, Cohen's kappa 0.67; agreement with the database 10/14 and 11/14.

| Claim | Labels | Decision |
|---|---|---|
| claim_51 burnout | both False (database: misleading) | replaced by claim_52 |
| claim_32 Marie Antoinette | both Misleading (database: false) | replaced by claim_31 |
| claim_03 octopus | one False | to confirm with the labeller (sources agree on three hearts) |
| claim_38 vitamin C | split False / Misleading | kept; Science Feedback rates it "lack of context" |
| claim_45 Pluto | split Misleading / True | kept; sources replaced (HowStuffWorks and a broken IAU link) |

Round 2: the same labellers label claim_31, claim_52 and claim_45 (new sources).

## References

- Pennycook, G., Binnendyk, J., Newton, C., & Rand, D. G. (2021). A practical guide to doing behavioral research on fake news and misinformation. *Collabra: Psychology, 7*(1). https://doi.org/10.1525/collabra.25293
- Ross, R. M., Rand, D. G., & Pennycook, G. (2021). Beyond "fake news": Analytic thinking and the detection of false and hyperpartisan news headlines. *Judgment and Decision Making, 16*(2), 484–504.
