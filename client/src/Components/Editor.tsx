import { useEffect, useMemo, useState } from "react";
import { AuthUser } from "../App";
import SessionList, { SessionRecord } from "./SessionList";
import { Analysis, KeystrokeEvent, KeystrokeToken, PasteEvent, RawSessionData } from "../types/contracts";
import ReplayPlayer from "./ReplayPlayer";

type EditorProps = {
  user: AuthUser;
  onLogout: () => void;
};

const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

type EditorFontKey = "system" | "mono" | "serif" | "humanist";
type ReportTabKey = "authenticity" | "detection" | "session" | "replay";

const EDITOR_FONT_OPTIONS: Array<{ value: EditorFontKey; label: string; family: string }> = [
  {
    value: "system",
    label: "System Sans",
    family: '"Segoe UI Variable", "Trebuchet MS", "Segoe UI", sans-serif'
  },
  {
    value: "mono",
    label: "Coding Mono",
    family: '"Cascadia Code", "Consolas", "Courier New", monospace'
  },
  {
    value: "serif",
    label: "Classic Serif",
    family: '"Cambria", "Times New Roman", serif'
  },
  {
    value: "humanist",
    label: "Humanist",
    family: '"Gill Sans", "Segoe UI", "Trebuchet MS", sans-serif'
  }
];

export default function Editor({ user, onLogout }: EditorProps) {
  const [text, setText] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [pasteEvents, setPasteEvents] = useState<PasteEvent[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [status, setStatus] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [editorFont, setEditorFont] = useState<EditorFontKey>("system");
  const [editorFontSize, setEditorFontSize] = useState(16);
  const [editorLineHeight, setEditorLineHeight] = useState(1.55);
  const [activeReportTab, setActiveReportTab] = useState<ReportTabKey>("authenticity");
  const statusTone = useMemo(() => {
    const value = status.toLowerCase();
    if (!value) return "success";
    if (
      value.includes("failed") ||
      value.includes("invalid") ||
      value.includes("forbidden") ||
      value.includes("error") ||
      value.includes("could not") ||
      value.includes("no ") ||
      value.includes("not found") ||
      value.includes("mismatch")
    ) {
      return "error";
    }
    return "success";
  }, [status]);

  const editorTypographyStyle = useMemo(
    () =>
      ({
        ["--editor-font-family" as string]:
          EDITOR_FONT_OPTIONS.find((option) => option.value === editorFont)?.family ||
          EDITOR_FONT_OPTIONS[0].family,
        ["--editor-font-size" as string]: `${editorFontSize}px`,
        ["--editor-line-height" as string]: String(editorLineHeight)
      }) as React.CSSProperties,
    [editorFont, editorFontSize, editorLineHeight]
  );

  const avgDelay = useMemo(() => {
    if (keystrokes.length === 0) return 0;
    return (
      keystrokes.reduce((sum, value) => sum + value.delayMs, 0) /
      Math.max(keystrokes.length, 1)
    );
  }, [keystrokes]);

  const toToken = (key: string): KeystrokeToken | null => {
    if (/^[a-zA-Z0-9]$/.test(key)) return "CHAR";
    if (key === "Backspace") return "BACKSPACE";
    if (key === " ") return "SPACE";
    if (key === "Enter") return "ENTER";
    if (key === "Tab") return "TAB";
    if (key === "Delete") return "DELETE";
    if (key.startsWith("Arrow")) return "ARROW";
    return null;
  };

  const renderSegments = useMemo(() => {
    const source = selectedSession ? selectedSession.text || "" : text;
    const segments = (analysis?.segments || [])
      .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end))
      .sort((a, b) => a.start - b.start);

    if (!source) {
      return [
        <span key="empty" className="segment segment-normal">
          No content yet.
        </span>
      ];
    }

    if (segments.length === 0) {
      return [
        <span key="full" className="segment segment-normal" title="No suspicious signal">
          {source}
        </span>
      ];
    }

    const nodes: React.ReactNode[] = [];
    let cursor = 0;

    segments.forEach((segment, index) => {
      const safeStart = Math.max(0, Math.min(source.length, Math.floor(segment.start)));
      const safeEnd = Math.max(0, Math.min(source.length, Math.floor(segment.end)));

      if (safeStart > cursor) {
        nodes.push(
          <span key={`plain-${index}`} className="segment segment-normal" title="Looks normal">
            {source.slice(cursor, safeStart)}
          </span>
        );
      }

      if (safeEnd > safeStart) {
        const className =
          segment.label === "copied"
            ? "segment-copied"
            : segment.label === "ai_suspect"
              ? "segment-ai"
              : "segment-normal";

        nodes.push(
          <span
            key={`seg-${index}-${safeStart}-${safeEnd}`}
            className={`segment ${className}`}
            title={segment.reason}
          >
            {source.slice(safeStart, safeEnd)}
          </span>
        );
      }

      cursor = Math.max(cursor, safeEnd);
    });

    if (cursor < source.length) {
      nodes.push(
        <span key="tail" className="segment segment-normal" title="Looks normal">
          {source.slice(cursor)}
        </span>
      );
    }

    return nodes;
  }, [analysis?.segments, selectedSession, text]);

  const postJson = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error: any = new Error(data?.message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  const putJson = async (url: string, body?: unknown) => {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`
      },
      body: JSON.stringify(body || {})
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error: any = new Error(data?.message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  const deleteJson = async (url: string) => {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error: any = new Error(data?.message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  const getJson = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    });
    const data = await response.json().catch(() => ([]));
    if (!response.ok) {
      const error: any = new Error(data?.message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  const resetEditor = () => {
    setText("");
    setKeystrokes([]);
    setLastTime(null);
    setPasteEvents([]);
    setAnalysis(null);
    setStatus("");
    setShareLink("");
  };

  const loadSessions = async () => {
    try {
      const data = await getJson(`${API_BASE_URL}/api/sessions/user/${user._id}`);
      const nextSessions = Array.isArray(data) ? data : [];
      setSessions(nextSessions);
      setSelectedSession((previous) => {
        if (!previous?._id) return previous;
        const refreshed = nextSessions.find((session) => session._id === previous._id);
        return refreshed || previous;
      });
    } catch (error: any) {
      setStatus(error?.data?.message || error?.message || "Failed to load sessions.");
      setSessions([]);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [user._id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    const token = toToken(e.key);

    if (!token) {
      return;
    }

    const delayMs = lastTime === null ? 0 : now - lastTime;
    setKeystrokes((prev) => [
      ...prev,
      {
        token,
        delayMs,
        time: new Date(now).toISOString()
      }
    ]);

    setLastTime(now);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    const start = e.currentTarget.selectionStart;
    const selectedLength = Math.max(0, e.currentTarget.selectionEnd - start);
    const end = start + pasted.length;

    setPasteEvents((prev) => [
      ...prev,
      {
        length: pasted.length,
        time: new Date().toISOString(),
        start,
        end
      }
    ]);

    if (selectedLength > 0) {
      setStatus("Paste replaced selected text and was logged for authenticity analysis.");
    }
  };

  const save = async () => {
    try {
      const payload: RawSessionData = {
        userId: user._id,
        text,
        keystrokes,
        pasteEvents
      };

      const data = await postJson(`${API_BASE_URL}/api/sessions/save`, payload);

      setAnalysis(data.analysis || null);
      setStatus("Session saved successfully.");
      await loadSessions();
    } catch (error: any) {
      setStatus(error?.data?.message || error?.message || "Failed to save session.");
    }
  };

  const openSession = (session: SessionRecord) => {
    setSelectedSession(session);
    setAnalysis(session.analysis || null);
    setShareLink(session.certificateId ? `${window.location.origin}/verify/${session.certificateId}` : "");
    setActiveReportTab("session");
  };

  const deleteSession = async (session: SessionRecord) => {
    const confirmed = window.confirm("Delete this session permanently? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      await deleteJson(`${API_BASE_URL}/api/sessions/${session._id}`);

      setSessions((prev) => prev.filter((item) => item._id !== session._id));

      if (selectedSession?._id === session._id) {
        setSelectedSession(null);
        setAnalysis(null);
        setShareLink("");
        setActiveReportTab("authenticity");
      }

      setStatus("Session deleted successfully.");
    } catch (error: any) {
      setStatus(error?.data?.message || error?.message || "Failed to delete session.");
    }
  };

  const shareSelectedSession = async () => {
    if (!selectedSession?._id) {
      setStatus("Select a saved session first.");
      return;
    }

    try {
      setIsSharing(true);
      const result = await putJson(
        `${API_BASE_URL}/api/sessions/${selectedSession._id}/share`
      );

      const certificateId =
        typeof result?.certificateId === "string" && result.certificateId
          ? result.certificateId
          : selectedSession.certificateId;

      if (!certificateId) {
        setStatus("Session shared, but certificate id was not returned.");
        return;
      }

      const verifyUrl = `${window.location.origin}/verify/${certificateId}`;
      setShareLink(verifyUrl);

      const updated: SessionRecord = {
        ...selectedSession,
        isPublic: true,
        certificateId,
        score: Number.isFinite(Number(result?.score))
          ? Number(result.score)
          : selectedSession.score
      };

      setSelectedSession(updated);
      setSessions((prev) => prev.map((session) => (session._id === updated._id ? updated : session)));

      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(verifyUrl);
          copied = true;
        }
      } catch (_error) {
        copied = false;
      }

      setStatus(
        copied
          ? "Session shared. Certificate link copied to clipboard."
          : `Session shared. Certificate URL: ${verifyUrl}`
      );
    } catch (error: any) {
      setStatus(error?.data?.message || error?.message || "Failed to share session.");
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareLink) {
      setStatus("No certificate link available yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setStatus("Certificate link copied.");
    } catch (_error) {
      setStatus("Could not access clipboard. Copy the certificate URL manually.");
    }
  };

  const openCertificate = () => {
    const certificateId = selectedSession?.certificateId;
    if (!certificateId) {
      setStatus("This session has no certificate yet. Click Share Session first.");
      return;
    }

    window.open(`/verify/${certificateId}`, "_blank", "noopener,noreferrer");
  };

  const activeKeystrokes = selectedSession ? selectedSession.keystrokes || [] : keystrokes;
  const activePasteEvents = selectedSession ? selectedSession.pasteEvents || [] : pasteEvents;
  const activeText = selectedSession ? selectedSession.text || "" : text;
  const activeAvgDelay =
    activeKeystrokes.length === 0
      ? 0
      : activeKeystrokes.reduce((sum, value) => sum + value.delayMs, 0) /
        activeKeystrokes.length;

  const liveMode = !selectedSession;

  const useLiveEditor = () => {
    setSelectedSession(null);
    setText("");
    setKeystrokes([]);
    setLastTime(null);
    setPasteEvents([]);
    setAnalysis(null);
    setStatus("");
    setShareLink("");
    setActiveReportTab("authenticity");
  };

  return (
    <div className="workspace-grid">
      <SessionList
        sessions={sessions}
        selectedSessionId={selectedSession?._id || null}
        onSelect={openSession}
        onDelete={deleteSession}
      />

      <div className="card editor-card" style={editorTypographyStyle}>
        <div className="row space-between">
          <div>
            <h2>Writing Editor</h2>
            <p>{user.email}</p>
          </div>
          <div className="row">
            <button className="muted-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="editor-toolbar" aria-label="Editor typography controls">
          <label className="control-group">
            Font
            <select
              value={editorFont}
              onChange={(e) => setEditorFont(e.target.value as EditorFontKey)}
              aria-label="Select editor font"
            >
              {EDITOR_FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-group control-range">
            Size: {editorFontSize}px
            <input
              type="range"
              min={13}
              max={22}
              step={1}
              value={editorFontSize}
              onChange={(e) => setEditorFontSize(Number(e.target.value) || 16)}
              aria-label="Adjust editor font size"
            />
          </label>

          <label className="control-group control-range">
            Line Height: {editorLineHeight.toFixed(2)}
            <input
              type="range"
              min={1.35}
              max={2}
              step={0.05}
              value={editorLineHeight}
              onChange={(e) => setEditorLineHeight(Number(e.target.value) || 1.55)}
              aria-label="Adjust editor line height"
            />
          </label>
        </div>

        {!liveMode ? (
          <p className="editor-mode-chip" role="note">
            Viewing a saved session in read-only mode. Click New Live Session to continue capturing keystrokes.
          </p>
        ) : null}

        <div className="row">
          <button onClick={save} disabled={!liveMode}>
            Save Session
          </button>
          <button className="muted-btn" onClick={resetEditor} disabled={!liveMode}>
            Clear Draft
          </button>
          <button className="muted-btn" onClick={useLiveEditor}>
            New Live Session
          </button>
        </div>

        <textarea
          className={`editor-textarea ${liveMode ? "" : "editor-readonly"}`.trim()}
          rows={14}
          value={text}
          disabled={!liveMode}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          aria-label="Writing editor"
          placeholder="Start writing naturally. Typing rhythm and paste metadata will be tracked."
        />

        {status ? (
          <div className={`status-banner ${statusTone}`} role="status" aria-live="polite">
            <p className="status-text">{status}</p>
            <button
              type="button"
              className="muted-btn status-dismiss"
              onClick={() => setStatus("")}
              aria-label="Dismiss status message"
            >
              Dismiss
            </button>
          </div>
        ) : null}

      </div>

      <div className="card report-nav-card" role="tablist" aria-label="Session report sections">
        <h2>Reports</h2>
        <p className="session-count">Select one report view</p>
        <div className="report-nav-list">
          <button
            type="button"
            role="tab"
            aria-selected={activeReportTab === "authenticity"}
            className={`report-nav-btn ${activeReportTab === "authenticity" ? "active" : ""}`}
            onClick={() => setActiveReportTab("authenticity")}
          >
            Authenticity Score
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeReportTab === "detection"}
            className={`report-nav-btn ${activeReportTab === "detection" ? "active" : ""}`}
            onClick={() => setActiveReportTab("detection")}
          >
            Detection Map
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeReportTab === "session"}
            className={`report-nav-btn ${activeReportTab === "session" ? "active" : ""}`}
            onClick={() => setActiveReportTab("session")}
          >
            Selected Session Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeReportTab === "replay"}
            className={`report-nav-btn ${activeReportTab === "replay" ? "active" : ""}`}
            onClick={() => setActiveReportTab("replay")}
          >
            Replay Preview
          </button>
        </div>
      </div>

      <div className="card report-view-card">
        <div className="report-box report-panel" role="tabpanel">
          {activeReportTab === "authenticity" ? (
            <>
              <h3>Authenticity Report</h3>
              <p>
                <strong>Score:</strong> {analysis ? `${analysis.score}%` : "Not analyzed yet"}
              </p>
              <p>
                <strong>Total Keystrokes:</strong> {activeKeystrokes.length}
              </p>
              <p>
                <strong>Paste Count:</strong> {activePasteEvents.length}
              </p>
              <p>
                <strong>Average Typing Delay:</strong> {Math.round(liveMode ? avgDelay : activeAvgDelay)} ms
              </p>
              <p>
                <strong>Inference:</strong>{" "}
                {analysis?.model?.used
                  ? `ML adapter (${analysis.model.provider || "tensorflow-js"})`
                  : "Rule-based (ML fallback)"}
              </p>

              <ul>
                {(analysis?.reasons || ["Save a session to view analysis reasons."]).map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}

          {activeReportTab === "detection" ? (
            <>
              <h3>Detection Map</h3>
              <div className="legend-row">
                <span className="legend-item legend-normal">Normal</span>
                <span className="legend-item legend-copied">Copy/Paste</span>
                <span className="legend-item legend-ai">AI-suspect</span>
              </div>
              <p className="hint-text">
                Underlined ranges indicate detected behavior regions. Hover a highlighted section to see why it was labeled.
              </p>
              <div className="annotated-text">{renderSegments}</div>

              <ul>
                {(analysis?.segments || []).slice(0, 8).map((segment, index) => (
                  <li key={`${segment.label}-${segment.start}-${index}`}>
                    {segment.label.toUpperCase()} range {segment.start} to {segment.end}: {segment.reason}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {activeReportTab === "session" ? (
            selectedSession ? (
              <>
                <h3>Selected Session Details</h3>
                <p>
                  <strong>Created:</strong> {new Date(selectedSession.createdAt).toLocaleString()}
                </p>
                <p>
                  <strong>Certificate:</strong>{" "}
                  {selectedSession.certificateId
                    ? selectedSession.certificateId
                    : "Not shared yet"}
                </p>
                {selectedSession.certificateId ? (
                  <p className="certificate-chip">Public certificate is active for this session.</p>
                ) : null}
                <p>
                  <strong>Text Length:</strong> {activeText.length}
                </p>
                <div className="row share-actions">
                  <button onClick={shareSelectedSession} disabled={isSharing}>
                    {selectedSession.certificateId ? "Refresh Share Link" : "Share Session"}
                  </button>
                  <button className="muted-btn" onClick={openCertificate}>
                    Open Certificate View
                  </button>
                  <button className="muted-btn" onClick={copyShareLink} disabled={!shareLink}>
                    Copy Link
                  </button>
                  <button className="danger-btn" onClick={() => deleteSession(selectedSession)}>
                    Delete Session
                  </button>
                </div>
                {shareLink ? <p className="hint-text">Certificate URL: {shareLink}</p> : null}
                <textarea className="editor-textarea" rows={8} value={activeText} readOnly aria-label="Selected session text" />
              </>
            ) : (
              <>
                <h3>Selected Session Details</h3>
                <p className="hint-text">Select a saved session from the left panel to see details, share options, and deletion actions.</p>
              </>
            )
          ) : null}

          {activeReportTab === "replay" ? (
            <>
              <h3>Replay Preview</h3>
              <p className="hint-text">Replay shows how the current draft or selected session was composed over time.</p>
              <ReplayPlayer
                finalContent={activeText}
                keystrokes={activeKeystrokes}
                pasteEvents={activePasteEvents}
                segments={analysis?.segments}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}