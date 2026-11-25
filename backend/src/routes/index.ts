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
import { postSession } from "../controllers/sessions.controller";
import { getStudyAssignment, getStudyClaims } from "../controllers/study.controller"; //study claims and group assignment
import { getState, getStatus, postTrial, postEnd, postDecision as postDeviceDecision } from "../controllers/device.controller"; //esp32 device

export const router = Router();

router.get("/health", getHealth); //is the server up
router.get("/config", getConfig); //answer options for the decision and sharing buttons

router.post("/ocr", imageUpload, postOcr); //photo in, text out

router.post("/claims/match", postMatch); //text or qr id in, matching claim id out
router.get("/claims/:id", getClaim); //claim id in, evidence and sources out
router.post("/verify", postVerify); //match and evidence in one call, in the frontend's results format

router.post("/decisions", postDecision); //save the participant's decision
router.post("/sessions", postSession);
router.get("/study/claims", getStudyClaims); //practice claims and the two study sets, in order
router.get("/study/assignment", getStudyAssignment); //counterbalanced group for a participant

router.get("/device/state", getState); //esp32 reads the light state
router.get("/device/status", getStatus); //app checks the button press and whether the device is connected
router.post("/device/trial", postTrial); //app starts a trial in either condition
router.post("/device/end", postEnd); //app ends the session, light off
router.post("/device/decision", postDeviceDecision); //esp32 sends a button press
