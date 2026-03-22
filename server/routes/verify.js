const router = require("express").Router();
const Session = require("../models/Session");

router.get("/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;
    if (!certificateId) {
      return res.status(400).json({ message: "certificateId is required" });
    }

    const session = await Session.findOne({
      certificateId,
      isPublic: true
    })
      .select({
        text: 1,
        keystrokes: 1,
        pasteEvents: 1,
        score: 1,
        "analysis.segments": 1,
        _id: 0
      })
      .lean();

    if (!session) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    return res.json({
      content: session.text || "",
      metadata: {
        keystrokes: Array.isArray(session.keystrokes) ? session.keystrokes : [],
        pasteEvents: Array.isArray(session.pasteEvents) ? session.pasteEvents : []
      },
      score: Number.isFinite(Number(session.score)) ? Number(session.score) : 0,
      segments: Array.isArray(session.analysis?.segments) ? session.analysis.segments : []
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to verify certificate" });
  }
});

module.exports = router;
