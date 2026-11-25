//checks the SUS and raw NASA-TLX scoring on fixed answers with known scores, no database needed
//usage (from the backend folder): npm run test:questionnaire

import { rawTlx, susScore } from "../services/questionnaire.service";
import { TlxRatings } from "../types/api";

const tlx = (mental: number, physical: number, temporal: number, performance: number, effort: number, frustration: number): TlxRatings =>
  ({ mental, physical, temporal, performance, effort, frustration });

const CASES: { name: string; actual: number; expected: number }[] = [
  //SUS: odd items (answer - 1), even items (5 - answer), sum x 2.5
  { name: "SUS best answers (5 on odd, 1 on even) give 100", actual: susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), expected: 100 },
  { name: "SUS worst answers (1 on odd, 5 on even) give 0", actual: susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), expected: 0 },
  { name: "SUS all neutral (3) gives 50", actual: susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), expected: 50 },
  { name: "SUS all 5 gives 50 (odd items +4, even items 0)", actual: susScore([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), expected: 50 },
  { name: "SUS mixed answers give 77.5", actual: susScore([4, 2, 4, 1, 4, 2, 5, 2, 4, 3]), expected: 77.5 },
  //raw TLX: mean of the six subscales
  { name: "TLX all 0 gives 0", actual: rawTlx(tlx(0, 0, 0, 0, 0, 0)), expected: 0 },
  { name: "TLX all 100 gives 100", actual: rawTlx(tlx(100, 100, 100, 100, 100, 100)), expected: 100 },
  { name: "TLX mixed ratings give the mean", actual: rawTlx(tlx(50, 10, 30, 20, 45, 5)), expected: 26.67 },
];

let failed = 0;
for (const c of CASES) {
  const ok = c.actual === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  if (!ok) console.log(`      expected: ${c.expected}\n      actual:   ${c.actual}`);
}
console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed > 0 ? 1 : 0);
