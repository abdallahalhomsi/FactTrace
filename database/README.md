# Database

MySQL 8.0.16 or newer (approved by Dr. Göktaş: curated database, no LLM or ML model).

- `schema.sql` creates all tables. Run it once on an empty database:
  `mysql -u root -p facttrace < database/schema.sql`
- Content tables (what the app shows): `claims`, `sources`, `claim_sources`, `evidence`, `provenance_signals`
- Study tables (what the study measures): `study_sessions`, `decisions`
- All times are stored in UTC. Connect with the timezone set to UTC (for mysql2: `timezone: "Z"`), otherwise times shift by the laptop's offset.

The backend still reads the mock claims in `backend/src/mocks/claims.mock.ts` until it is switched over to MySQL.