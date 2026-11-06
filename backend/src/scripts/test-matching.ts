//tests claim matching on every claim in the database, without the app or the api
//usage (mysql running, from the backend folder): npx tsx src/scripts/test-matching.ts
//strict checks must all pass, reworded checks show how well matching copes with people's own words

import "../config/env"; //loads backend/.env so the mysql settings are used
import { pool } from "../db/mysql"; //closed at the end so the script can exit
import { listClaimsForMatching, loadClaims } from "../services/claim.service"; //claims from mysql
import { matchClaim } from "../services/match.service"; //the matching being tested

//removes accents and the turkish dotless i, like someone typing on a keyboard without turkish letters
function plain(text: string): string {
  return text.replace(/ı/g, "i").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

//swaps the last two letters of the two longest words, like small reading or typing mistakes
function typos(text: string): string {
  const words = text.split(" ");
  const longest = words.map((w, i) => ({ w, i })).filter((x) => x.w.length > 4).sort((a, b) => b.w.length - a.w.length).slice(0, 2);
  for (const { w, i } of longest) words[i] = w.slice(0, -2) + w.slice(-1) + w.slice(-2, -1);
  return words.join(" ");
}

//keeps only the first half of the claim, like a partly scanned sentence
function firstHalf(text: string): string {
  const words = text.replace(/\.$/, "").split(" ");
  return words.slice(0, Math.max(3, Math.floor(words.length / 2) + 1)).join(" ");
}

//the study claims said in different words, the way a participant might type them
const REWORDED: Record<string, string> = {
  claim_01: "It takes roughly eight minutes for sunlight to get to Earth",
  claim_19: "People swallow about eight spiders every year in their sleep",
  claim_11: "New phones in the EU have to use USB-C chargers since December 2024",
  claim_24: "Finland plans a four day work week with six hour days",
  claim_39: "According to the WHO processed meat is just as bad as smoking",
  claim_03: "An octopus has three hearts",
  claim_33: "Einstein defined insanity as doing the same thing over and over and expecting a different result",
  claim_40: "Everest is the tallest mountain in the world",
  claim_09: "Gobekli Tepe in Turkey is over twice as old as Stonehenge",
  claim_16: "The UN says the ozone layer will recover within a few decades",
  claim_25: "NASA says the Earth will be dark for six days this December",
  claim_38: "Vitamin C every day stops you from catching colds",
  claim_15: "The unicorn is the national animal of Scotland",
  claim_32: "Marie Antoinette said let them eat cake",
  claim_41: "Istanbul is the only city on two continents",
  claim_05: "On Venus a day lasts longer than a year",
};

//sentences that are not in the database and must never match anything
const UNRELATED = [
  "The moon is made of cheese",
  "Sabancı University will close in December",
  "Drinking milk makes your bones weaker",
  "Turkey won the football world cup in 2002",
  "Bananas are a good source of potassium",
  "Coffee is the most traded commodity in the world",
  "NASA landed on Mars in 1969",
  "Einstein was born in Germany",
];

async function main(): Promise<void> {
  const count = await loadClaims();
  const claims = listClaimsForMatching();
  console.log(`loaded ${count} claims\n`);

  let failed = 0; //strict checks that went wrong
  const fail = (msg: string) => { failed++; console.log(`  FAIL ${msg}`); };

  for (const c of claims) {
    //exact text, no accents, typos and half the text must all find this claim
    const exact = await matchClaim({ source: "manual", claimText: c.text });
    if (exact.status !== "MATCH" || exact.claimId !== c.claimId) fail(`${c.claimId} exact text gave ${exact.status} ${exact.claimId}`);
    const noAccents = await matchClaim({ source: "manual", claimText: plain(c.text) });
    if (noAccents.status !== "MATCH" || noAccents.claimId !== c.claimId) fail(`${c.claimId} without accents gave ${noAccents.status} ${noAccents.claimId}`);
    for (const [name, text] of [["typos", typos(c.text)], ["first half", firstHalf(c.text)]]) {
      const r = await matchClaim({ source: "manual", claimText: text });
      if (r.status === "NO_MATCH" || r.claimId !== c.claimId) fail(`${c.claimId} ${name} gave ${r.status} ${r.claimId} for "${text}"`);
    }
    //unedited ocr text with low confidence must be a weak match, so the app asks "is this the claim you saw?"
    const lowOcr = await matchClaim({ source: "ocr", claimText: c.text, originalOcrText: c.text, ocrConfidence: 0.3 });
    if (lowOcr.status !== "WEAK_MATCH" || lowOcr.reason !== "low_ocr_confidence" || lowOcr.claimId !== c.claimId) {
      fail(`${c.claimId} low ocr confidence gave ${lowOcr.status} ${lowOcr.claimId}`);
    }
  }
  console.log(`strict checks on ${claims.length} claims (exact, no accents, typos, first half, low ocr): ${failed === 0 ? "all passed" : `${failed} failed`}`);

  //unrelated sentences must not match any claim
  let unrelatedFailed = 0;
  for (const text of UNRELATED) {
    const r = await matchClaim({ source: "manual", claimText: text });
    if (r.status !== "NO_MATCH") { unrelatedFailed++; fail(`unrelated "${text}" gave ${r.status} ${r.claimId}`); }
  }
  console.log(`unrelated sentences: ${unrelatedFailed === 0 ? "none matched (correct)" : `${unrelatedFailed} matched by mistake`}\n`);

  //reworded study claims: not pass or fail, this shows how forgiving matching is with a participant's own words
  console.log("reworded study claims:");
  for (const [claimId, text] of Object.entries(REWORDED)) {
    const r = await matchClaim({ source: "manual", claimText: text });
    const found = r.claimId === claimId ? "right claim" : r.claimId ? `WRONG claim ${r.claimId}` : "not found";
    if (r.claimId && r.claimId !== claimId) failed++; //matching the wrong claim is always a failure
    console.log(`  ${claimId}  ${r.status.padEnd(10)} score ${r.score.toFixed(2)}  ${found}  "${text}"`);
  }

  await pool.end();
  console.log(failed === 0 ? "\nall strict checks passed" : `\n${failed} problems found`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(`could not run the test: ${(err as Error).message}`);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
