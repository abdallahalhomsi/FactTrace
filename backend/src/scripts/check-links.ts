//checks that every source link in the database still opens
//usage (mysql running, from the backend folder): npx tsx src/scripts/check-links.ts
//some sites block scripts but work fine in a browser, those are listed separately to open by hand

import "../config/env"; //loads backend/.env so the mysql settings are used
import { RowDataPacket } from "mysql2/promise"; //row type for query results
import { pool } from "../db/mysql"; //reads the source list, closed at the end

const TIMEOUT_MS = 15000; //give slow sites 15 seconds before calling them broken
const AT_ONCE = 5; //how many links are checked at the same time

type Result = { sourceId: string; url: string; status: "ok" | "blocked" | "broken"; detail: string };

//opens one link like a browser would and sorts the answer into ok, blocked or broken
async function check(sourceId: string, url: string): Promise<Result> {
  try {
    const res = await fetch(url, {
      redirect: "follow", //follow moved pages to their new address
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
    });
    if (res.ok) return { sourceId, url, status: "ok", detail: String(res.status) };
    //401, 403 and 429 usually mean the site refuses scripts, not that the page is gone
    if ([401, 403, 429].includes(res.status)) return { sourceId, url, status: "blocked", detail: String(res.status) };
    return { sourceId, url, status: "broken", detail: String(res.status) };
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } };
    //the cause code says what went wrong, for example ENOTFOUND means the website address no longer exists
    return { sourceId, url, status: "broken", detail: e.name === "TimeoutError" ? "timed out" : (e.cause?.code ?? e.message) };
  }
}

async function main(): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT source_id, url FROM sources ORDER BY source_id");
  console.log(`checking ${rows.length} links...\n`);

  const results: Result[] = [];
  for (let i = 0; i < rows.length; i += AT_ONCE) {
    const batch = rows.slice(i, i + AT_ONCE);
    results.push(...(await Promise.all(batch.map((r) => check(r.source_id, r.url)))));
  }

  const blocked = results.filter((r) => r.status === "blocked");
  const broken = results.filter((r) => r.status === "broken");
  console.log(`ok: ${results.length - blocked.length - broken.length}`);
  console.log(`blocked for scripts (open these in a browser to check): ${blocked.length}`);
  for (const r of blocked) console.log(`  ${r.sourceId}  ${r.detail}  ${r.url}`);
  console.log(`broken (need a new link): ${broken.length}`);
  for (const r of broken) console.log(`  ${r.sourceId}  ${r.detail}  ${r.url}`);

  await pool.end();
  process.exit(broken.length === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(`could not run the check: ${(err as Error).message}`);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
