# Analysis

Two scripts, both read only study data (practice trials are excluded):

| Script | What it gives | Run |
|---|---|---|
| `backend/src/scripts/analyze-study.ts` | Descriptive results per participant and per condition, straight from MySQL | `npx tsx src/scripts/analyze-study.ts` in `backend/` |
| `analysis/inferential.py` | The tests for the report: paired tests, carry-over checks, first-block analysis, mixed-effects models | see below |

## Inferential analysis

```bash
cd backend && npm run export          # writes backend/exports/*.csv (participant data: never commit)
cd .. && pip install -r analysis/requirements.txt
python analysis/inferential.py        # or: python analysis/inferential.py path/to/exports
```

What it does, in order:

1. **FactTrace vs browser** for each DV (truth discernment is the primary outcome; accuracy, Unsure rate, sharing discernment, time, sources, SUS, raw TLX). Shapiro-Wilk on the paired differences decides the test: paired t-test (Cohen's dz) if normal, else Wilcoxon signed-rank (rank-biserial r). Mean difference with a 95% CI. The primary DV is tested at alpha .05; the secondary DVs are Holm-corrected as one family (edit `HOLM_FAMILY` if the written hypotheses define it differently).
2. **Carry-over checks**: the FactTrace-minus-browser difference compared between order groups (order x tool) and between the set used with FactTrace (set x tool). Welch t or Mann-Whitney U.
3. **First-block analysis**: block 1 only, between subjects. Report it if step 2 shows an order effect.
4. **Linear mixed-effects models** on trial-level data: tool fixed, participant and claim as crossed random intercepts, order, block and claim set as covariates (treatment, sequence and period: the standard crossover model). In the trust model, `tool_app:is_true` is the change in truth discernment.

Time to decision uses the device's server-clock time (trial start to the final press) when there was a press, and the app's time otherwise. The number of undone presses (slips) per condition is printed at the top.

Tested on simulated data (24 participants): recovers a simulated effect and gives non-significant results when there is none.
