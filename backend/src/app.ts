//builds the express app: middleware first, then routes, then error handling
//kept separate from server.ts so the app can be tested later without starting a real server

import express from "express"; //web framework
import cors from "cors"; //lets the expo app call the api from another origin
import { ENV } from "./config/env"; //settings
import { router } from "./routes"; //all api routes
import { requestLogger } from "./middleware/requestLogger"; //one log line per request
import { errorHandler, notFound } from "./middleware/errorHandler"; //standard error responses

export function createApp() {
  const app = express(); //new express app

  app.disable("x-powered-by"); //stops express advertising itself in response headers
  app.use(
    cors({
      //"*" in settings means allow any origin, otherwise a comma separated list of allowed origins
      origin: ENV.corsOrigin === "*" ? true : ENV.corsOrigin.split(",").map((o) => o.trim()),
    })
  );
  app.use(requestLogger); //log every request (placed before the json reader so bad bodies are logged too)
  //the ocr route gets a bigger json limit because base64 photos are about a third bigger than the photo itself
  app.use("/api/ocr", express.json({ limit: `${Math.ceil(ENV.maxImageMb * 1.4)}mb` }));
  app.use(express.json({ limit: "100kb" })); //every other route: json bodies over 100kb are rejected

  app.use("/api", router); //all routes live under /api

  app.use(notFound); //any url that did not match a route
  app.use(errorHandler); //must be last so it catches errors from everything above
  return app;
}
