const router = require("express").Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Session = require("../models/Session");
const analyzeSessionWithPipeline = require("../ml/analyzer");
const validateRawSessionData = require("../utils/validateRawSessionData");

async function generateUniqueCertificateId() {
  for (;;) {
    const candidate = `cert_${crypto.randomBytes(12).toString("hex")}`;
    const exists = await Session.exists({ certificateId: candidate });
    if (!exists) {
      return candidate;
    }
  }
}

router.post("/save", async (req, res) => {
  try {
    const validation = validateRawSessionData(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        message: validation.errors.join("; ") || "Malformed payload"
      });
    }

    const { userId, text, keystrokes, pasteEvents } = validation.data;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    if (!req.user || String(req.user.id) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden: user mismatch" });
    }

    const analysis = await analyzeSessionWithPipeline({
      text,
      keystrokes,
      pasteEvents
    });

    const session = new Session({
      userId,
      text: typeof text === "string" ? text : "",
      keystrokes,
      pasteEvents,
      analysis,
      score: typeof analysis?.score === "number" ? analysis.score : 0,
      createdAt: new Date()
    });

    await session.save();
    return res.status(201).json({
      message: "Saved",
      sessionId: session._id,
      analysis: session.analysis,
      score: session.score
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save session" });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    if (!req.user || String(req.user.id) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden: user mismatch" });
    }

    const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json(sessions);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

router.put("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (!req.user || String(req.user.id) !== String(session.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!session.certificateId) {
      session.certificateId = await generateUniqueCertificateId();
    }

    session.isPublic = true;
    if (typeof session.analysis?.score === "number") {
      session.score = session.analysis.score;
    }

    await session.save();

    return res.json({
      message: "Session shared successfully",
      certificateId: session.certificateId,
      isPublic: session.isPublic,
      score: session.score
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to share session" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (!req.user || String(req.user.id) !== String(session.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Session.deleteOne({ _id: id });
    return res.status(200).json({ message: "Session deleted successfully" });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete session" });
  }
});

module.exports = router;