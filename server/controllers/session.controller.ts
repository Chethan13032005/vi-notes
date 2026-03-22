import { Types } from "mongoose";
import crypto from "crypto";
import Session, { ISession } from "../models/Session";

async function generateUniqueCertificateId(): Promise<string> {
  // Retry until we get an unused certificate id.
  for (;;) {
    const candidate = "cert_" + crypto.randomBytes(12).toString("hex");
    const exists = await Session.exists({ certificateId: candidate });
    if (!exists) {
      return candidate;
    }
  }
}

export async function shareSession(req: any, res: any): Promise<any> {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!session.certificateId) {
      session.certificateId = await generateUniqueCertificateId();
    }

    session.isPublic = true;

    // Keep top-level score in sync for certificate reads.
    if (typeof session.analysis?.score === "number") {
      session.score = session.analysis.score;
    }

    await session.save();

    return res.status(200).json({
      message: "Session shared successfully",
      certificateId: session.certificateId,
      isPublic: session.isPublic,
      score: session.score
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to share session" });
  }
}

export async function verifyCertificate(req: any, res: any): Promise<any> {
  try {
    const { certificateId } = req.params;

    if (!certificateId) {
      return res.status(400).json({ message: "certificateId is required" });
    }

    const session = (await Session.findOne({
      certificateId,
      isPublic: true
    })
      .select({
        text: 1,
        keystrokes: 1,
        pasteEvents: 1,
        score: 1,
        _id: 0
      })
      .lean()) as Pick<ISession, "text" | "keystrokes" | "pasteEvents" | "score"> | null;

    if (!session) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    return res.status(200).json({
      content: session.text,
      metadata: {
        keystrokes: session.keystrokes,
        pasteEvents: session.pasteEvents
      },
      score: session.score
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to verify certificate" });
  }
}
