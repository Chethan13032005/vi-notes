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
  onDelete: (session: SessionRecord) => void;
  panelHeight?: number | null;
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
  onSelect,
  onDelete,
  panelHeight
}: SessionListProps) {
  return (
    <div className="card session-list" style={panelHeight ? { height: `${Math.max(320, Math.floor(panelHeight))}px` } : undefined}>
      <h2>Previous Sessions</h2>
      <p className="session-count">{sessions.length} total session(s)</p>
      {sessions.length === 0 ? <p>No sessions saved yet.</p> : null}

      {sessions.map((session) => (
        <div
          key={session._id}
          className={`session-item ${selectedSessionId === session._id ? "active" : ""}`}
        >
          <div className="session-item-top">
            <strong>{previewText(session.text)}</strong>
            <div className="session-item-actions-top">
              {session.certificateId ? (
                <span className="session-chip session-chip-public">Shared</span>
              ) : (
                <span className="session-chip">Private</span>
              )}
              <button
                type="button"
                className="danger-btn"
                onClick={() => onDelete(session)}
                aria-label={`Delete session from ${new Date(session.createdAt).toLocaleString()}`}
              >
                Delete
              </button>
            </div>
          </div>
          <span>{new Date(session.createdAt).toLocaleString()}</span>
          <span className="session-meta">Authenticity Score: {formatScore(session.analysis?.score ?? session.score)}</span>
          <div className="session-item-actions">
            <button
              type="button"
              className="muted-btn session-open-btn"
              onClick={() => onSelect(session)}
              aria-label={`Open session from ${new Date(session.createdAt).toLocaleString()}`}
            >
              Open Session
            </button>
            {session.certificateId ? (
              <button
                type="button"
                className="muted-btn"
                onClick={() => window.open(`/verify/${session.certificateId}`, '_blank')}
                aria-label="Open certificate"
              >
                Open Certificate
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
