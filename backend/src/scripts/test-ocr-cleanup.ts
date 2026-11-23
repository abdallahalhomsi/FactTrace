//checks cleanOcrText on fixed examples of common ocr problems, no photos or database needed
//usage (from the backend folder): npm run test:ocr-cleanup

import { cleanOcrText } from "../services/ocr.service";

const CASES: { name: string; input: string; expected: string }[] = [
  { name: "clean text stays the same", input: "Drinking eight glasses of water a day is required for good health.", expected: "Drinking eight glasses of water a day is required for good health." },
  { name: "broken lines are joined", input: "Coca-Cola was\ninvented in\n1886 as a medicine.", expected: "Coca-Cola was invented in 1886 as a medicine." },
  { name: "word split across lines is joined", input: "according to misinfor-\nmation online.", expected: "according to misinformation online." },
  { name: "symbol-only lines are removed", input: "~~~\nVaccines cause autism.\n;: ,", expected: "Vaccines cause autism." },
  { name: "noise lines with one letter are removed", input: "| l\nVaccines cause autism.\n~ l ; |", expected: "Vaccines cause autism." },
  { name: "tabs and bullets are removed", input: "•  Bananas\tare\t\tberries.", expected: "Bananas are berries." },
  { name: "turkish letters are kept", input: "Göbekli Tepe\nis 11,000 years old.", expected: "Göbekli Tepe is 11,000 years old." },
  { name: "curly quotes become straight", input: "\u201CEinstein failed math\u201D is a myth.", expected: "\"Einstein failed math\" is a myth." },
  { name: "windows line endings", input: "The Moon\r\nlanding was real.", expected: "The Moon landing was real." },
  { name: "noise only gives empty text", input: "|||\n---\n...", expected: "" },
  { name: "empty input", input: "", expected: "" },
];

let failed = 0;
for (const c of CASES) {
  const actual = cleanOcrText(c.input);
  const ok = actual === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  if (!ok) console.log(`      expected: ${JSON.stringify(c.expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed > 0 ? 1 : 0);