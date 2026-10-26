//this file loads the settings from backend/.env and gives the rest of the code one place to read them from
//server.ts imports this file first, so every other file sees the .env values

import path from "path"; //node helper for building file paths that work on windows and mac
import dotenv from "dotenv"; //library that reads a .env file into process.env

//read backend/.env (two folders up from this file, which is the same in src and dist)
//quiet: true stops dotenv from printing a message every time the server starts
dotenv.config({ path: path.join(__dirname, "../../.env"), quiet: true });

//turns a text value like "3000" into a number, or uses the fallback if it is missing or not a number
function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10); //"" gives nan, which fails the check below
  return Number.isFinite(n) && n > 0 ? n : fallback; //only accept real positive numbers
}

//all settings the backend uses, with safe defaults so the server runs even without a .env file
export const ENV = {
  nodeEnv: process.env.NODE_ENV ?? "development", //"production" hides error details from responses
  port: toInt(process.env.PORT, 3000), //port the server listens on
  corsOrigin: process.env.CORS_ORIGIN ?? "*", //which websites may call the api, "*" means any (fine for expo go and ngrok)
  maxImageMb: toInt(process.env.MAX_IMAGE_MB, 10), //biggest photo we accept, in megabytes
};

//true when running in production mode
export const isProd = ENV.nodeEnv === "production";
