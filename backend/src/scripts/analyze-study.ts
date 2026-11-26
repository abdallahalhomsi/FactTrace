import "dotenv/config";
import { pool } from "../db/mysql";

type Condition =
  | "app"
  | "browser";

type CorrectAnswer =
  | "true"
  | "false"
  | "misleading";

type Decision =
  | "trust"
  | "dont_trust"
  | "unsure";

interface DecisionRow {
  participant_id: string;

  study_condition: Condition;

  trial_index:
    | number
    | null;

  is_practice:
    | number
    | boolean;

  claim_familiarity:
    | number
    | boolean
    | null;

  claim_id:
    | string
    | null;

  claim_text:
    string;

  decision:
    string;

  sharing_intention:
    string;

  sources_opened_count:
    number;

  browser_self_report_only:
    number
    | boolean;

  duration_ms:
    number;

  correct_answer:
    CorrectAnswer | null;

  was_correct:
    number
    | boolean
    | null;
}

interface ParticipantConditionMetrics {
  participantId: string;

  condition: Condition;

  trialCount: number;

  familiarClaimRate:
    number | null;

  trustRateTrue:
    number | null;

  trustRateFalseMisleading:
    number | null;

  truthDiscernment:
    number | null;

  accuracy:
    number | null;

  unsureRate:
    number | null;

  meanSharingTrue:
    number | null;

  meanSharingFalseMisleading:
    number | null;

  sharingDiscernment:
    number | null;

  meanVerificationTimeSeconds:
    number | null;

  meanSourcesInspected:
    number | null;
}

interface ConditionSummary {
  condition: Condition;

  participants: number;

  meanTruthDiscernment:
    number | null;

  meanAccuracy:
    number | null;

  meanUnsureRate:
    number | null;

  meanSharingDiscernment:
    number | null;

  meanVerificationTimeSeconds:
    number | null;

  meanSourcesInspected:
    number | null;
}

function mean(
  values: number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    values.length
  );
}

function proportion(
  values: boolean[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const positive =
    values.filter(
      Boolean,
    ).length;

  return (
    positive /
    values.length
  );
}

function round(
  value:
    number | null,
  decimals = 3,
): number | null {
  if (
    value === null
  ) {
    return null;
  }

  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value *
        multiplier,
    ) /
    multiplier
  );
}

function asBoolean(
  value:
    number
    | boolean
    | null,
): boolean | null {
  if (
    value === null
  ) {
    return null;
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  return value === 1;
}

function sharingScore(
  value: string,
): number | null {
  const numeric =
    Number(value);

  if (
    !Number.isInteger(
      numeric,
    ) ||
    numeric < 1 ||
    numeric > 7
  ) {
    return null;
  }

  return numeric;
}

function validDecision(
  value: string,
): value is Decision {
  return (
    value ===
      "trust" ||
    value ===
      "dont_trust" ||
    value ===
      "unsure"
  );
}

function calculateMetrics(
  participantId: string,
  condition: Condition,
  rows: DecisionRow[],
): ParticipantConditionMetrics {
  /*
   * Practice trials must NOT be included
   * in the study outcome analysis.
   */
  const trials =
    rows.filter(
      row =>
        !asBoolean(
          row.is_practice as
            number | boolean,
        ),
    );

  const trueTrials =
    trials.filter(
      row =>
        row.correct_answer ===
        "true",
    );

  const falseMisleadingTrials =
    trials.filter(
      row =>
        row.correct_answer ===
          "false" ||
        row.correct_answer ===
          "misleading",
    );

  /*
   * TRUTH DISCERNMENT
   *
   * Trust rate on true claims
   * MINUS
   * Trust rate on false/misleading claims.
   */
  const trustRateTrue =
    proportion(
      trueTrials.map(
        row =>
          row.decision ===
          "trust",
      ),
    );

  const trustRateFalseMisleading =
    proportion(
      falseMisleadingTrials.map(
        row =>
          row.decision ===
          "trust",
      ),
    );

  const truthDiscernment =
    trustRateTrue !==
      null &&
    trustRateFalseMisleading !==
      null
      ? trustRateTrue -
        trustRateFalseMisleading
      : null;

  /*
   * RAW ACCURACY
   *
   * was_correct should already contain:
   *
   * Trust + true = correct
   * Don't Trust + false/misleading = correct
   * Unsure = incorrect
   */
  const scorableAccuracyRows =
    trials.filter(
      row =>
        row.was_correct !==
        null,
    );

  const accuracy =
    proportion(
      scorableAccuracyRows.map(
        row =>
          asBoolean(
            row.was_correct,
          ) === true,
      ),
    );

  /*
   * UNSURE RATE
   */
  const decisionRows =
    trials.filter(
      row =>
        validDecision(
          row.decision,
        ),
    );

  const unsureRate =
    proportion(
      decisionRows.map(
        row =>
          row.decision ===
          "unsure",
      ),
    );

  /*
   * SHARING DISCERNMENT
   *
   * Mean sharing for true claims
   * MINUS
   * Mean sharing for false/misleading.
   *
   * Higher positive score means the
   * participant is more willing to share
   * true claims than false/misleading ones.
   */
  const sharingTrue =
    trueTrials
      .map(
        row =>
          sharingScore(
            row.sharing_intention,
          ),
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  const sharingFalseMisleading =
    falseMisleadingTrials
      .map(
        row =>
          sharingScore(
            row.sharing_intention,
          ),
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  const meanSharingTrue =
    mean(
      sharingTrue,
    );

  const meanSharingFalseMisleading =
    mean(
      sharingFalseMisleading,
    );

  const sharingDiscernment =
    meanSharingTrue !==
      null &&
    meanSharingFalseMisleading !==
      null
      ? meanSharingTrue -
        meanSharingFalseMisleading
      : null;

  /*
   * VERIFICATION TIME
   *
   * duration_ms converted to seconds.
   */
  const verificationTimes =
    trials
      .map(
        row =>
          Number(
            row.duration_ms,
          ) / 1000,
      )
      .filter(
        value =>
          Number.isFinite(
            value,
          ) &&
          value >= 0,
      );

  /*
   * SOURCE USE
   *
   * Number of distinct sources recorded
   * for each trial.
   */
  const sourceCounts =
    trials
      .map(
        row =>
          Number(
            row.sources_opened_count,
          ),
      )
      .filter(
        value =>
          Number.isFinite(
            value,
          ) &&
          value >= 0,
      );

  /*
   * CLAIM FAMILIARITY
   *
   * Not a primary DV.
   * Kept as a descriptive/covariate measure.
   */
  const familiarityRows =
    trials
      .map(
        row =>
          asBoolean(
            row.claim_familiarity,
          ),
      )
      .filter(
        (
          value,
        ): value is boolean =>
          value !== null,
      );

  return {
    participantId,

    condition,

    trialCount:
      trials.length,

    familiarClaimRate:
      round(
        proportion(
          familiarityRows,
        ),
      ),

    trustRateTrue:
      round(
        trustRateTrue,
      ),

    trustRateFalseMisleading:
      round(
        trustRateFalseMisleading,
      ),

    truthDiscernment:
      round(
        truthDiscernment,
      ),

    accuracy:
      round(
        accuracy,
      ),

    unsureRate:
      round(
        unsureRate,
      ),

    meanSharingTrue:
      round(
        meanSharingTrue,
      ),

    meanSharingFalseMisleading:
      round(
        meanSharingFalseMisleading,
      ),

    sharingDiscernment:
      round(
        sharingDiscernment,
      ),

    meanVerificationTimeSeconds:
      round(
        mean(
          verificationTimes,
        ),
      ),

    meanSourcesInspected:
      round(
        mean(
          sourceCounts,
        ),
      ),
  };
}

function summarizeCondition(
  condition: Condition,
  metrics:
    ParticipantConditionMetrics[],
): ConditionSummary {
  const conditionRows =
    metrics.filter(
      row =>
        row.condition ===
        condition,
    );

  const collect =
    (
      key:
        keyof ParticipantConditionMetrics,
    ): number[] =>
      conditionRows
        .map(
          row =>
            row[
              key
            ],
        )
        .filter(
          (
            value,
          ): value is number =>
            typeof value ===
            "number" &&
            Number.isFinite(
              value,
            ),
        );

  return {
    condition,

    participants:
      conditionRows.length,

    meanTruthDiscernment:
      round(
        mean(
          collect(
            "truthDiscernment",
          ),
        ),
      ),

    meanAccuracy:
      round(
        mean(
          collect(
            "accuracy",
          ),
        ),
      ),

    meanUnsureRate:
      round(
        mean(
          collect(
            "unsureRate",
          ),
        ),
      ),

    meanSharingDiscernment:
      round(
        mean(
          collect(
            "sharingDiscernment",
          ),
        ),
      ),

    meanVerificationTimeSeconds:
      round(
        mean(
          collect(
            "meanVerificationTimeSeconds",
          ),
        ),
      ),

    meanSourcesInspected:
      round(
        mean(
          collect(
            "meanSourcesInspected",
          ),
        ),
      ),
  };
}

function formatPercent(
  value:
    number | null,
): string {
  if (
    value === null
  ) {
    return "N/A";
  }

  return `${(
    value * 100
  ).toFixed(1)}%`;
}

function formatNumber(
  value:
    number | null,
  decimals = 2,
): string {
  if (
    value === null
  ) {
    return "N/A";
  }

  return value.toFixed(
    decimals,
  );
}

async function main() {
  const [rawRows] =
    await pool.query(
      `
      SELECT
        d.participant_id,
        d.study_condition,
        d.trial_index,
        d.is_practice,
        d.claim_familiarity,
        d.claim_id,
        d.claim_text,
        d.decision,
        d.sharing_intention,
        -- browser source use comes from the screen-recording count agreed by the two coders;
        -- the participant's self-report is only used while a trial has no final count yet
        CASE
          WHEN d.study_condition = 'browser' AND bc.source_count IS NOT NULL
            THEN bc.source_count
          ELSE d.sources_opened_count
        END AS sources_opened_count,
        (d.study_condition = 'browser' AND bc.source_count IS NULL) AS browser_self_report_only,
        d.duration_ms,
        d.correct_answer,
        d.was_correct
      FROM decisions d
      LEFT JOIN browser_source_coding bc
        ON bc.participant_id = d.participant_id
        AND bc.trial_index = d.trial_index
        AND bc.coder = 'final'
      ORDER BY
        d.participant_id,
        d.study_condition,
        d.trial_index
      `,
    );

  const rows =
    rawRows as
      DecisionRow[];

  if (
    rows.length === 0
  ) {
    console.log(
      "No study decisions found.",
    );

    await pool.end();

    return;
  }

  /*
   * Group rows by participant + condition.
   */
  const groups =
    new Map<
      string,
      DecisionRow[]
    >();

  for (
    const row of rows
  ) {
    const key =
      `${row.participant_id}::${row.study_condition}`;

    const current =
      groups.get(
        key,
      ) ?? [];

    current.push(
      row,
    );

    groups.set(
      key,
      current,
    );
  }

  const participantMetrics:
    ParticipantConditionMetrics[] =
    [];

  for (
    const [
      key,
      groupRows,
    ] of groups
  ) {
    const [
      participantId,
      condition,
    ] =
      key.split(
        "::",
      ) as [
        string,
        Condition,
      ];

    const metrics =
      calculateMetrics(
        participantId,
        condition,
        groupRows,
      );

    /*
     * Ignore a participant-condition group
     * if it contains only practice trials.
     */
    if (
      metrics.trialCount >
      0
    ) {
      participantMetrics.push(
        metrics,
      );
    }
  }

  participantMetrics.sort(
    (
      a,
      b,
    ) => {
      const participantCompare =
        a.participantId.localeCompare(
          b.participantId,
        );

      if (
        participantCompare !==
        0
      ) {
        return participantCompare;
      }

      return a.condition.localeCompare(
        b.condition,
      );
    },
  );

  console.log(
    "\n==============================================",
  );

  console.log(
    "FACTTRACE STUDY ANALYSIS",
  );

  console.log(
    "==============================================\n",
  );

  console.log(
    "Practice trials excluded.\n",
  );

  console.log(
    "PARTICIPANT × CONDITION RESULTS\n",
  );

  for (
    const row of
      participantMetrics
  ) {
    console.log(
      `${row.participantId} — ${row.condition.toUpperCase()}`,
    );

    console.log(
      `  Trials: ${row.trialCount}`,
    );

    console.log(
      `  Familiar claims: ${formatPercent(
        row.familiarClaimRate,
      )}`,
    );

    console.log(
      `  Trust rate — true claims: ${formatPercent(
        row.trustRateTrue,
      )}`,
    );

    console.log(
      `  Trust rate — false/misleading: ${formatPercent(
        row.trustRateFalseMisleading,
      )}`,
    );

    console.log(
      `  Truth discernment: ${formatNumber(
        row.truthDiscernment,
        3,
      )}`,
    );

    console.log(
      `  Accuracy: ${formatPercent(
        row.accuracy,
      )}`,
    );

    console.log(
      `  Unsure rate: ${formatPercent(
        row.unsureRate,
      )}`,
    );

    console.log(
      `  Mean sharing — true: ${formatNumber(
        row.meanSharingTrue,
      )}`,
    );

    console.log(
      `  Mean sharing — false/misleading: ${formatNumber(
        row.meanSharingFalseMisleading,
      )}`,
    );

    console.log(
      `  Sharing discernment: ${formatNumber(
        row.sharingDiscernment,
      )}`,
    );

    console.log(
      `  Mean verification time: ${formatNumber(
        row.meanVerificationTimeSeconds,
      )} sec`,
    );

    console.log(
      `  Mean sources inspected: ${formatNumber(
        row.meanSourcesInspected,
      )}`,
    );

    console.log();
  }

  const appSummary =
    summarizeCondition(
      "app",
      participantMetrics,
    );

  const browserSummary =
    summarizeCondition(
      "browser",
      participantMetrics,
    );

  console.log(
    "==============================================",
  );

  console.log(
    "CONDITION DESCRIPTIVE SUMMARY",
  );

  console.log(
    "==============================================\n",
  );

  for (
    const summary of [
      appSummary,
      browserSummary,
    ]
  ) {
    console.log(
      summary.condition ===
      "app"
        ? "FACTTRACE"
        : "BROWSER",
    );

    console.log(
      `  Participants: ${summary.participants}`,
    );

    console.log(
      `  Mean truth discernment: ${formatNumber(
        summary.meanTruthDiscernment,
        3,
      )}`,
    );

    console.log(
      `  Mean accuracy: ${formatPercent(
        summary.meanAccuracy,
      )}`,
    );

    console.log(
      `  Mean Unsure rate: ${formatPercent(
        summary.meanUnsureRate,
      )}`,
    );

    console.log(
      `  Mean sharing discernment: ${formatNumber(
        summary.meanSharingDiscernment,
      )}`,
    );

    console.log(
      `  Mean verification time: ${formatNumber(
        summary.meanVerificationTimeSeconds,
      )} sec`,
    );

    console.log(
      `  Mean sources inspected: ${formatNumber(
        summary.meanSourcesInspected,
      )}`,
    );

    console.log();
  }

  console.log(
    "----------------------------------------------",
  );

  console.log(
    "METRIC DEFINITIONS",
  );

  console.log(
    "----------------------------------------------",
  );

  console.log(
    "Truth discernment = Trust rate(true) - Trust rate(false/misleading)",
  );

  console.log(
    "Accuracy = proportion of correct verification decisions",
  );

  console.log(
    "Unsure rate = proportion of decisions marked Unsure",
  );

  console.log(
    "Sharing discernment = mean sharing(true) - mean sharing(false/misleading)",
  );

  console.log(
    "Verification time = mean duration_ms converted to seconds",
  );

  console.log(
    "Source use = mean distinct sources inspected per trial (browser: screen-recording count agreed by two coders)",
  );

  const browserWithoutVideoCount =
    rows.filter(
      row =>
        !Boolean(Number(row.is_practice)) &&
        Boolean(Number(row.browser_self_report_only)),
    ).length;

  if (browserWithoutVideoCount > 0) {
    console.log(
      `WARNING: ${browserWithoutVideoCount} browser study trial(s) have no final video count yet, so their source use is the participant's self-report. Run "npm run coding -- agreement".`,
    );
  }

  console.log();

  await pool.end();
}

main().catch(
  async error => {
    console.error(
      "Analysis failed:",
      error,
    );

    try {
      await pool.end();
    } catch {
      // Ignore cleanup failure.
    }

    process.exit(1);
  },
);