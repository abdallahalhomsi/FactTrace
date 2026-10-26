//list of every api route and which controller handles it
//app.ts mounts this under /api, so "/health" here is /api/health in the browser
//new feature routes go here too (for example manaal's /factcheck later)

import { Router } from "express"; //express router
import { getHealth } from "../controllers/health.controller";
import { getConfig } from "../controllers/config.controller";
import { postOcr } from "../controllers/ocr.controller";
import { getClaim, postMatch } from "../controllers/claims.controller";
import { postDecision } from "../controllers/decisions.controller";
import { postVerify } from "../controllers/verify.controller";
import { imageUpload } from "../middleware/upload"; //reads the photo before the ocr controller runs

export const router = Router();

router.get("/health", getHealth); //is the server up
router.get("/config", getConfig); //answer options for the decision and sharing buttons

router.post("/ocr", imageUpload, postOcr); //photo in, text out

router.post("/claims/match", postMatch); //text or qr id in, matching claim id out
router.get("/claims/:id", getClaim); //claim id in, evidence and sources out
router.post("/verify", postVerify); //match and evidence in one call, in the frontend's results format

router.post("/decisions", postDecision); //save the participant's decision
