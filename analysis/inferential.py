"""Inferential analysis for the FactTrace main study.

Reads the CSV files written by `npm run export` (backend/exports/ by default) and prints:
  1. FactTrace vs browser for every dependent variable: normality of the paired differences (Shapiro-Wilk),
     a paired t-test or, if the differences are not normal, a Wilcoxon signed-rank test, an effect size,
     a 95% confidence interval, and Holm-corrected p values.
  2. Carry-over checks: order x tool and set x tool (do the app-minus-browser differences depend on
     which tool came first, or on which claim set was used with the app?).
  3. First-block analysis: block 1 only, FactTrace participants vs browser participants (between subjects),
     the fallback if the order x tool check shows carry-over.
  4. Trial-level linear mixed-effects models: tool as fixed effect, participant and claim as crossed random
     intercepts, order, block and claim set as covariates.

Practice trials are never analysed. Scoring matches config/study.ts and analyze-study.ts:
Trust is correct for true claims, Don't trust for false and misleading claims, Unsure is never correct.

Run:  python analysis/inferential.py [exports folder]
Needs: pip install -r analysis/requirements.txt

The exports folder holds participant data: never commit it.
"""

from __future__ import annotations

import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf

ALPHA = 0.05

# dependent variables, in the order they are tested and reported
# name: (column in the participant table, label, primary?)
DVS = {
    "truth_discernment": ("Truth discernment (trust rate true - trust rate false/misleading)", True),
    "accuracy": ("Accuracy (proportion correct, Unsure counts as wrong)", False),
    "unsure_rate": ("Unsure rate", False),
    "sharing_discernment": ("Sharing discernment (mean sharing true - mean sharing false/misleading)", False),
    "time_s": ("Verification time per claim (s)", False),
    "sources": ("Sources inspected per claim (browser: screen-recording count by two coders)", False),
    "sus": ("SUS score (0 to 100)", False),
    "tlx": ("Raw NASA-TLX (0 to 100)", False),
}

# the Holm family: every secondary DV is corrected together; the primary DV is tested on its own at ALPHA.
# change this list if the written hypotheses (H1a to H1f) name a different family
HOLM_FAMILY = [name for name, (_, primary) in DVS.items() if not primary]


# ---------------------------------------------------------------- loading

def load(folder: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    trials = pd.read_csv(folder / "trials.csv", encoding="utf-8-sig")
    questionnaires_path = folder / "questionnaires.csv"
    questionnaires = (
        pd.read_csv(questionnaires_path, encoding="utf-8-sig")
        if questionnaires_path.exists()
        else pd.DataFrame()
    )

    trials["is_practice"] = trials["is_practice"].astype(str).str.lower().isin(["1", "true"])
    trials = trials[~trials["is_practice"]].copy()
    trials = trials[trials["trial_index"].notna() & trials["correct_answer"].notna()]

    # a retried save can store the same trial twice: keep the first one received
    sort_col = "received_at" if "received_at" in trials.columns else "started_at"
    trials = trials.sort_values(sort_col).drop_duplicates(["participant_id", "trial_index"], keep="first")

    trials["tool"] = trials["study_condition"]
    trials["is_true"] = (trials["correct_answer"] == "true").astype(int)
    trials["trust"] = (trials["decision"] == "trust").astype(int)
    trials["unsure"] = (trials["decision"] == "unsure").astype(int)
    trials["correct"] = np.where(
        trials["is_true"] == 1, trials["decision"] == "trust", trials["decision"] == "dont_trust"
    ).astype(int)
    trials["sharing"] = pd.to_numeric(trials["sharing_intention"], errors="coerce")
    # time to decision: the device's server-clock time (t3 - t0) when there was a press, else the app's own time
    app_time = pd.to_numeric(trials["duration_ms"], errors="coerce")
    device_time = (pd.to_numeric(trials["device_time_to_decision_ms"], errors="coerce")
                   if "device_time_to_decision_ms" in trials else pd.Series(np.nan, index=trials.index))
    trials["time_s"] = device_time.fillna(app_time) / 1000
    trials["undo_count"] = (pd.to_numeric(trials["undo_count"], errors="coerce").fillna(0)
                            if "undo_count" in trials else 0)
    # source use: FactTrace counts the sources opened in the app; the browser condition uses the count agreed by
    # two coders from the screen recording (docs/source-use-metric.md), the same rule as analyze-study.ts;
    # the participant's own list is used only while a browser trial has no final count yet (reported below)
    app_sources = pd.to_numeric(trials["sources_opened_count"], errors="coerce")
    video_sources = (pd.to_numeric(trials["browser_video_source_count"], errors="coerce")
                     if "browser_video_source_count" in trials else pd.Series(np.nan, index=trials.index))
    is_browser = trials["study_condition"] == "browser"
    trials["browser_self_report_only"] = is_browser & video_sources.isna()
    trials["sources"] = np.where(is_browser & video_sources.notna(), video_sources, app_sources)

    # block 1 is the tool the participant used first
    first_tool = np.where(trials["condition_order"] == "app_first", "app", "browser")
    trials["block"] = np.where(trials["tool"] == first_tool, 1, 2)
    return trials, questionnaires


def participant_table(trials: pd.DataFrame, questionnaires: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (pid, tool), g in trials.groupby(["participant_id", "tool"]):
        true_g = g[g["is_true"] == 1]
        false_g = g[g["is_true"] == 0]
        rows.append({
            "participant_id": pid,
            "tool": tool,
            "condition_order": g["condition_order"].iloc[0],
            "set_order": g["set_order"].iloc[0],
            "claim_set": g["claim_set"].iloc[0] if "claim_set" in g else np.nan,
            "block": g["block"].iloc[0],
            "trials": len(g),
            "truth_discernment": true_g["trust"].mean() - false_g["trust"].mean()
            if len(true_g) and len(false_g) else np.nan,
            "accuracy": g["correct"].mean(),
            "unsure_rate": g["unsure"].mean(),
            "sharing_discernment": true_g["sharing"].mean() - false_g["sharing"].mean()
            if len(true_g) and len(false_g) else np.nan,
            "time_s": g["time_s"].mean(),
            "sources": g["sources"].mean(),
        })
    table = pd.DataFrame(rows)

    if not questionnaires.empty:
        q = questionnaires.rename(columns={"study_condition": "tool", "sus_score": "sus", "tlx_raw": "tlx"})
        table = table.merge(q[["participant_id", "tool", "sus", "tlx"]], on=["participant_id", "tool"], how="left")
    else:
        table["sus"] = np.nan
        table["tlx"] = np.nan
    return table


# ---------------------------------------------------------------- tests

def holm(pvalues: list[float]) -> list[float]:
    """Holm-Bonferroni adjusted p values, in the original order."""
    m = len(pvalues)
    order = np.argsort(pvalues)
    adjusted = np.empty(m)
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvalues[i]))
        adjusted[i] = running
    return adjusted.tolist()


def hedges_g(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = len(a), len(b)
    pooled = np.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
    if pooled == 0:
        return float("nan")
    correction = 1 - 3 / (4 * (na + nb) - 9)
    return (a.mean() - b.mean()) / pooled * correction


def is_normal(values: np.ndarray) -> tuple[bool, float]:
    """Shapiro-Wilk; with fewer than 3 values, or all values equal, normality cannot be tested."""
    if len(values) < 3 or np.ptp(values) == 0:
        return True, float("nan")
    p = stats.shapiro(values).pvalue
    return p >= ALPHA, p


def paired_test(app: np.ndarray, browser: np.ndarray) -> dict:
    diff = app - browser
    n = len(diff)
    if n == 0:  # for example no questionnaire answers yet
        return {"n": 0, "mean_app": np.nan, "mean_browser": np.nan, "mean_diff": np.nan,
                "test": "no pairs", "p": float("nan")}
    result = {"n": n, "mean_app": app.mean(), "mean_browser": browser.mean(), "mean_diff": diff.mean()}
    if n < 2:
        return {**result, "test": "too few pairs", "p": float("nan")}

    sd = diff.std(ddof=1)
    half = stats.t.ppf(1 - ALPHA / 2, n - 1) * sd / np.sqrt(n)
    result["ci_low"], result["ci_high"] = diff.mean() - half, diff.mean() + half
    normal, result["shapiro_p"] = is_normal(diff)

    if np.all(diff == 0):
        return {**result, "test": "no differences", "p": 1.0, "effect": 0.0, "effect_name": "-"}

    if normal:
        t = stats.ttest_rel(app, browser)
        result.update(test=f"paired t({n - 1}) = {t.statistic:.2f}", p=t.pvalue,
                      effect=diff.mean() / sd if sd > 0 else float("nan"), effect_name="Cohen's dz")
    else:
        w = stats.wilcoxon(app, browser, zero_method="wilcox")
        nonzero = diff[diff != 0]
        ranks = stats.rankdata(np.abs(nonzero))
        r = (ranks[nonzero > 0].sum() - ranks[nonzero < 0].sum()) / ranks.sum()
        result.update(test=f"Wilcoxon W = {w.statistic:.1f}", p=w.pvalue, effect=r,
                      effect_name="rank-biserial r")
    return result


def two_group_test(a: np.ndarray, b: np.ndarray) -> dict:
    """Between-subjects comparison: Welch t if both groups look normal, else Mann-Whitney U."""
    result = {"n_a": len(a), "n_b": len(b), "mean_a": a.mean() if len(a) else np.nan,
              "mean_b": b.mean() if len(b) else np.nan}
    if len(a) < 2 or len(b) < 2:
        return {**result, "test": "too few participants", "p": float("nan")}
    if np.ptp(np.concatenate([a, b])) == 0:
        return {**result, "test": "no variation", "p": 1.0, "effect": 0.0, "effect_name": "-"}
    normal = is_normal(a)[0] and is_normal(b)[0]
    if normal:
        t = stats.ttest_ind(a, b, equal_var=False)
        return {**result, "test": f"Welch t = {t.statistic:.2f}", "p": t.pvalue,
                "effect": hedges_g(a, b), "effect_name": "Hedges g"}
    u = stats.mannwhitneyu(a, b, alternative="two-sided")
    return {**result, "test": f"Mann-Whitney U = {u.statistic:.1f}", "p": u.pvalue,
            "effect": 2 * u.statistic / (len(a) * len(b)) - 1, "effect_name": "rank-biserial r"}


# ---------------------------------------------------------------- report sections

def fmt(value, digits=3) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "n/a"
    return f"{value:.{digits}f}"


def fmt_p(p) -> str:
    """p value with its sign, written after "p": "p = 0.042" or "p < .001"."""
    if p is None or np.isnan(p):
        return "= n/a"
    return "< .001" if p < 0.001 else f"= {p:.3f}"


def wide(table: pd.DataFrame, dv: str) -> pd.DataFrame:
    w = table.pivot(index="participant_id", columns="tool", values=dv)
    meta = table.drop_duplicates("participant_id").set_index("participant_id")[["condition_order", "set_order"]]
    return w.join(meta)


def section_paired(table: pd.DataFrame) -> None:
    print("1. FACTTRACE VS BROWSER (paired, within subjects)\n")
    results = {}
    for dv in DVS:
        w = wide(table, dv)
        if "app" not in w or "browser" not in w:
            continue
        w = w.dropna(subset=["app", "browser"])
        results[dv] = paired_test(w["app"].to_numpy(float), w["browser"].to_numpy(float))

    family = [dv for dv in HOLM_FAMILY if dv in results and not np.isnan(results[dv]["p"])]
    for dv, p_adj in zip(family, holm([results[dv]["p"] for dv in family])):
        results[dv]["p_holm"] = p_adj

    for dv, r in results.items():
        label, primary = DVS[dv]
        print(f"{label}{'  [PRIMARY]' if primary else ''}")
        print(f"  n = {r['n']} | FactTrace {fmt(r['mean_app'])} | browser {fmt(r['mean_browser'])} | "
              f"difference {fmt(r['mean_diff'])} [95% CI {fmt(r.get('ci_low'))}, {fmt(r.get('ci_high'))}]")
        print(f"  Shapiro-Wilk on differences p {fmt_p(r.get('shapiro_p', np.nan))} -> {r['test']}, "
              f"p {fmt_p(r['p'])}" + (f", Holm p {fmt_p(r['p_holm'])}" if "p_holm" in r else
                                        " (primary, no correction)" if primary else ""))
        if "effect" in r:
            print(f"  {r['effect_name']} = {fmt(r['effect'], 2)}")
        print()
    print(f"Holm family ({len(family)} tests): {', '.join(family)}\n")


def section_carryover(table: pd.DataFrame) -> None:
    print("2. CARRY-OVER CHECKS (difference = FactTrace minus browser, compared between groups)\n")
    print("A significant result means the tool effect depends on the order (or set), so report the\n"
          "first-block analysis (section 3) next to the paired results.\n")
    for dv in DVS:
        w = wide(table, dv).dropna(subset=["app", "browser"]) if dv in table else None
        if w is None or w.empty or "app" not in w:
            continue
        w["diff"] = w["app"] - w["browser"]
        # which claim set was used with FactTrace: Set A when (app first and A first) or (browser first and B first)
        w["app_set"] = np.where((w["condition_order"] == "app_first") == (w["set_order"] == "a_first"), "A", "B")
        order = two_group_test(w.loc[w["condition_order"] == "app_first", "diff"].to_numpy(float),
                               w.loc[w["condition_order"] == "browser_first", "diff"].to_numpy(float))
        sets = two_group_test(w.loc[w["app_set"] == "A", "diff"].to_numpy(float),
                              w.loc[w["app_set"] == "B", "diff"].to_numpy(float))
        print(f"{DVS[dv][0]}")
        print(f"  order x tool: FactTrace first {fmt(order['mean_a'])} (n {order['n_a']}) vs browser first "
              f"{fmt(order['mean_b'])} (n {order['n_b']}) -> {order['test']}, p {fmt_p(order['p'])}")
        print(f"  set x tool:   Set A with FactTrace {fmt(sets['mean_a'])} (n {sets['n_a']}) vs Set B "
              f"{fmt(sets['mean_b'])} (n {sets['n_b']}) -> {sets['test']}, p {fmt_p(sets['p'])}")
        print()


def section_first_block(table: pd.DataFrame) -> None:
    print("3. FIRST-BLOCK ANALYSIS (block 1 only, between subjects, no carry-over possible)\n")
    first = table[table["block"] == 1]
    for dv in DVS:
        a = first.loc[first["tool"] == "app", dv].dropna().to_numpy(float)
        b = first.loc[first["tool"] == "browser", dv].dropna().to_numpy(float)
        if len(a) == 0 and len(b) == 0:
            continue
        r = two_group_test(a, b)
        print(f"{DVS[dv][0]}")
        print(f"  FactTrace {fmt(r['mean_a'])} (n {r['n_a']}) vs browser {fmt(r['mean_b'])} (n {r['n_b']}) -> "
              f"{r['test']}, p {fmt_p(r['p'])}" +
              (f", {r['effect_name']} = {fmt(r['effect'], 2)}" if "effect" in r else ""))
    print("\nThis has half the data of the paired test and much less power: use it as a check, not the main result.\n")


def fit_mixed(formula: str, data: pd.DataFrame, title: str, terms: list[str]) -> None:
    """Linear mixed model with crossed random intercepts for participant and claim."""
    data = data.copy()
    data["one"] = 1
    print(title)
    print(f"  {formula}  +  random intercepts: participant, claim  (n trials = {len(data)})")
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            model = smf.mixedlm(formula, data, groups="one", re_formula="0",
                                vc_formula={"participant": "0 + C(participant_id)", "claim": "0 + C(claim_id)"})
            fit = model.fit(reml=True, method=["powell", "lbfgs"])  # powell is the most reliable for crossed effects
        ci = fit.conf_int()
        for term in terms:
            if term in fit.params:
                print(f"  {term}: {fmt(fit.params[term])} [95% CI {fmt(ci.loc[term, 0])}, "
                      f"{fmt(ci.loc[term, 1])}], p {fmt_p(fit.pvalues[term])}")
        print(f"  random-intercept variances: participant {fmt(fit.vcomp[0], 4)}, claim {fmt(fit.vcomp[1], 4)}")
        if not fit.converged:
            print("  warning: the model did not converge; with few participants trust the paired tests more")
        elif any("boundary" in str(w.message).lower() for w in caught):
            print("  note: a random-intercept variance is close to zero; the estimates are still valid")
    except Exception as error:  # small or degenerate data sets can make the fit fail
        print(f"  could not fit: {error}")
    print()


def section_mixed(trials: pd.DataFrame) -> None:
    print("4. TRIAL-LEVEL MIXED-EFFECTS MODELS (tool fixed; participant and claim random;\n"
          "   order, block and claim set as covariates: the standard crossover model of treatment, sequence and period)\n")
    data = trials.copy()
    data["tool_app"] = (data["tool"] == "app").astype(int)
    data["block2"] = (data["block"] == 2).astype(int)
    data["set_b"] = (data["claim_set"] == "B").astype(int)
    data["order_browser_first"] = (data["condition_order"] == "browser_first").astype(int)

    covariates = "order_browser_first + block2 + set_b"
    fit_mixed(f"trust ~ tool_app * is_true + {covariates}", data,
              "Trust (0/1, linear probability model): tool_app:is_true is the change in truth discernment",
              ["tool_app:is_true", "tool_app", "is_true", "order_browser_first", "block2", "set_b"])
    fit_mixed(f"correct ~ tool_app + {covariates}", data, "Correct decision (0/1)",
              ["tool_app", "order_browser_first", "block2", "set_b"])
    data["log_time"] = np.log(data["time_s"].clip(lower=0.5))
    fit_mixed(f"log_time ~ tool_app + {covariates}", data,
              "Verification time (log seconds): exp(coefficient) is the time ratio FactTrace / browser",
              ["tool_app", "order_browser_first", "block2", "set_b"])


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "backend" / "exports"
    if not (folder / "trials.csv").exists():
        sys.exit(f"No trials.csv in {folder}. Run `npm run export` in backend/ first.")

    trials, questionnaires = load(folder)
    if trials.empty:
        sys.exit("No study trials found (practice trials are excluded).")

    table = participant_table(trials, questionnaires)
    complete = table.groupby("participant_id")["tool"].nunique()
    print("=" * 78)
    print("FACTTRACE STUDY: INFERENTIAL ANALYSIS")
    print("=" * 78)
    print(f"Participants: {table['participant_id'].nunique()} "
          f"({int((complete == 2).sum())} with both conditions). Study trials: {len(trials)}. Practice excluded.")
    missing_coding = int(trials["browser_self_report_only"].sum())
    if missing_coding:
        print(f"WARNING: {missing_coding} browser trials have no final screen-recording source count yet; their "
              "self-reported count is used. Code all recordings (npm run coding) before the final analysis.")
    undos = trials.groupby("tool")["undo_count"].sum()
    print("Undone presses (slips corrected with Undo): " +
          ", ".join(f"{'FactTrace' if tool == 'app' else 'browser'} {int(n)}" for tool, n in undos.items()))
    groups = table.drop_duplicates("participant_id").groupby(["condition_order", "set_order"]).size()
    print("Group sizes: " + ", ".join(f"{o}/{s}: {n}" for (o, s), n in groups.items()) + "\n")

    section_paired(table)
    section_carryover(table)
    section_first_block(table)
    section_mixed(trials)

    print("Notes: p values are two-sided, alpha = .05. A non-significant result is not evidence of no difference:\n"
          "report the confidence intervals and effect sizes with every test.")


if __name__ == "__main__":
    main()
