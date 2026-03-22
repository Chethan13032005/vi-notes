import express from "express";
import { shareSession, verifyCertificate } from "../controllers/session.controller";
import requireAuth from "../middleware/requireAuth";

const router = express.Router();

router.put("/api/sessions/:id/share", requireAuth, shareSession);
router.get("/api/verify/:certificateId", verifyCertificate);

export default router;
