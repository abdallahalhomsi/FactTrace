//prints one line per request in the terminal, for example "post /api/ocr 200 640ms"
//it never prints request bodies, because those can contain study data

import { NextFunction, Request, Response } from "express"; //express types

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint(); //precise start time
  res.on("finish", () => {
    //runs once the response has been sent
    //the esp32 polls /api/device/state several times a second, so only log those polls when they fail
    if (req.originalUrl.startsWith("/api/device/state") && res.statusCode < 400) return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6; //nanoseconds to milliseconds
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`); //one log line
  });
  next(); //continue to the next middleware
}
