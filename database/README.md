# Database

MySQL 8.0.16 or newer (approved by Dr. Göktaş: curated database, no LLM or ML model).

- `schema.sql` creates all tables. `seed_claims.sql` loads the 50 study claims. Docker runs both on first start (`docker compose up -d`), or by hand:
  `mysql -u root -p facttrace < database/schema.sql` then `mysql -u root -p facttrace < database/seed_claims.sql`
- Content tables (what the app shows): `claims`, `sources`, `claim_sources`, `evidence`, `provenance_signals`
- Study tables (what the study measures): `study_sessions`, `decisions`
- All times are stored in UTC. Connect with the timezone set to UTC (for mysql2: `timezone: "Z"`), otherwise times shift by the laptop's offset.

## The claims
- 50 real claims: 18 true, 16 false, 16 misleading. Each one is checked against fact checks or official sources, has at least 2 sources, and at least one evidence summary taken from a source that was read.
- `study_set` and `study_position` mark the 16 claims participants see: 2 practice, set A (7) and set B (7), each set 3 true / 2 false / 2 misleading. The other 34 stay in the database as extras and so matching has to pick the right claim among many.
- The backend loads all active claims into memory when it starts, so restart it after changing claims.
- To recreate the database with new claims: `docker compose down -v` then `docker compose up -d` (this deletes saved decisions too).

## Checks
Run these from the `backend` folder while MySQL is running:
- `npx tsx src/scripts/test-matching.ts` tests matching on every claim (exact text, no accents, typos, half the text, low OCR confidence, unrelated sentences, and the study claims reworded). Run it after changing claims or matching.
- `npx tsx src/scripts/check-links.ts` opens every source link. "Blocked" links refuse scripts but usually work in a browser, so open those by hand. "Broken" links need replacing.
