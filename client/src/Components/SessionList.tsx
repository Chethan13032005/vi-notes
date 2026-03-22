import { Analysis, KeystrokeEvent, PasteEvent } from "../types/contracts";

export type SessionRecord = {
  _id: string;
  text: string;
  keystrokes: KeystrokeEvent[];
  pasteEvents: PasteEvent[];
  isPublic?: boolean;
  certificateId?: string;
  score?: number;
  analysis?: Analysis;
  createdAt: string;
};

type SessionListProps = {
  sessions: SessionRecord[];
  selectedSessionId: string | null;
  onSelect: (session: SessionRecord) => void;
};

function previewText(text: string) {
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "(Empty session)";
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}...` : trimmed;
}

function formatScore(score?: number) {
  if (!Number.isFinite(Number(score))) return "N/A";
  return `${Math.round(Number(score))}%`;
}

export default function SessionList({
  sessions,
  selectedSessionId,
  onSelect
}: SessionListProps) {
  return (
    <div className="card session-list">
      <h2>Previous Sessions</h2>
      {sessions.length === 0 ? <p>No sessions saved yet.</p> : null}

      {sessions.map((session) => (
        <button
          key={session._id}
          className={`session-item ${selectedSessionId === session._id ? "active" : ""}`}
          onClick={() => onSelect(session)}
        >
          <div className="session-item-top">
            <strong>{previewText(session.text)}</strong>
            {session.certificateId ? (
              <span className="session-chip session-chip-public">Shared</span>
            ) : (
              <span className="session-chip">Private</span>
            )}
          </div>
          <span>{new Date(session.createdAt).toLocaleString()}</span>
          <span className="session-meta">Authenticity Score: {formatScore(session.score)}</span>
        </button>
      ))}
    </div>
  );
}
