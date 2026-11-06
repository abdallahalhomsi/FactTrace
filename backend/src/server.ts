//entry point: starts the server
//the env import must stay first so backend/.env is loaded before any other file reads settings

import { ENV } from "./config/env"; //settings (also loads .env)
import { createApp } from "./app"; //the express app
import { checkConnection } from "./db/mysql"; //checks mysql is reachable before loading claims
import { loadClaims } from "./services/claim.service"; //reads the claims from mysql into memory
const app = createApp(); //build the app

//the claims must be loaded before the first request, otherwise every claim would look like a no match
//so the server stops with a clear message if mysql is not reachable or the claims are missing
async function start(): Promise<void> {
  try {
    await checkConnection();
    const count = await loadClaims();
    if (count === 0) throw new Error("the claims table is empty, load database/seed_claims.sql");
    console.log(`[mysql] loaded ${count} claims`);
  } catch (err) {
    console.error(`[mysql] could not load claims: ${(err as Error).message}`);
    console.error("start the database first (docker compose up -d from the repo root) and check MYSQL_PASSWORD in backend/.env");
    process.exit(1);
  }

  //listen on 0.0.0.0 (every network card) so phones on the same wifi or through ngrok can reach the laptop
  const server = app.listen(ENV.port, "0.0.0.0", () => {
    console.log(`FactTrace backend listening on http://localhost:${ENV.port}/api (${ENV.nodeEnv})`);
  });

  //print a clear message instead of a long crash if the port is already used (usually the server is already running)
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${ENV.port} is already in use. Stop the other server or set a different PORT in backend/.env`);
    } else {
      console.error("Server failed to start:", err);
    }
    process.exit(1); //stop with an error code
  });

  //close cleanly on ctrl+c so the port is freed straight away
  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}

start();