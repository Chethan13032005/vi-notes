import { useEffect, useMemo, useRef, useState } from "react";

type ReplayKeystroke = {
  keyType?: string;
  token?: string;
  timestamp?: string | number;
  time?: string | number;
  delayMs?: number;
};

type ReplayPasteEvent = {
  length: number;
  timestamp?: string | number;
  time?: string | number;
  start?: number;
  end?: number;
};

type ReplayEvent = {
  kind: "CHAR" | "SPACE" | "ENTER" | "BACKSPACE" | "PASTE";
  atMs: number;
  pasteLength?: number;
};

type SegmentData = {
  start: number;
  end: number;
  label: "normal" | "ai_suspect" | "copied";
  reason: string;
};

type ReplayPlayerProps = {
  finalContent: string;
  keystrokes: ReplayKeystroke[];
  pasteEvents: ReplayPasteEvent[];
  segments?: SegmentData[];
};

function toEpochMs(value?: string | number): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKind(raw?: string): ReplayEvent["kind"] | null {
  const token = String(raw || "").toUpperCase().trim();

  if (token === "CHAR") return "CHAR";
  if (token === "SPACE") return "SPACE";
  if (token === "ENTER") return "ENTER";
  if (token === "BACKSPACE") return "BACKSPACE";
  if (token === "PASTE") return "PASTE";

  return null;
}

function buildReplayEvents(
  keystrokes: ReplayKeystroke[],
  pasteEvents: ReplayPasteEvent[]
): ReplayEvent[] {
  const ks = (Array.isArray(keystrokes) ? keystrokes : [])
    .map((k, index) => {
      const kind = normalizeKind(k.keyType || k.token);
      if (!kind) return null;

      const fromTimestamp = toEpochMs(k.timestamp ?? k.time);
      const fallbackDelay = Number(k.delayMs);

      return {
        source: "keystroke" as const,
        index,
        kind,
        atMs:
          fromTimestamp ??
          (Number.isFinite(fallbackDelay) && fallbackDelay >= 0 ? fallbackDelay : index + 1),
        rawAt: fromTimestamp,
        delayMs: Number.isFinite(fallbackDelay) ? fallbackDelay : 0
      };
    })
    .filter(Boolean) as Array<{
    source: "keystroke";
    index: number;
    kind: ReplayEvent["kind"];
    atMs: number;
    rawAt: number | null;
    delayMs: number;
  }>;

  const pe = (Array.isArray(pasteEvents) ? pasteEvents : [])
    .map((p, index) => {
      const at = toEpochMs(p.timestamp ?? p.time);
      const length = Math.max(0, Math.floor(Number(p.length) || 0));
      if (length <= 0) return null;

      return {
        source: "paste" as const,
        index,
        kind: "PASTE" as const,
        atMs: at ?? ks.length + index + 1,
        rawAt: at,
        pasteLength: length
      };
    })
    .filter(Boolean) as Array<{
    source: "paste";
    index: number;
    kind: "PASTE";
    atMs: number;
    rawAt: number | null;
    pasteLength: number;
  }>;

  const all = [...ks, ...pe];

  // If absolute timestamps are present, order by them. Otherwise preserve source order.
  const hasRealTimestamps = all.some((e) => e.rawAt !== null);

  if (hasRealTimestamps) {
    all.sort((a, b) => {
      const aTs = a.rawAt ?? Number.MAX_SAFE_INTEGER;
      const bTs = b.rawAt ?? Number.MAX_SAFE_INTEGER;
      if (aTs !== bTs) return aTs - bTs;
      return a.index - b.index;
    });
  }

  // Convert fallback delay-based entries into monotonic timeline.
  if (!hasRealTimestamps) {
    let cursor = 0;
    for (const event of all) {
      if (event.source === "keystroke") {
        cursor += Math.max(0, event.delayMs || 0);
      } else {
        cursor += 1;
      }
      event.atMs = cursor;
    }
  }

  return all.map((event) => ({
    kind: event.kind,
    atMs: event.atMs,
    pasteLength: event.source === "paste" ? event.pasteLength : undefined
  }));
}

export default function ReplayPlayer({
  finalContent,
  keystrokes,
  pasteEvents,
  segments
}: ReplayPlayerProps) {
  const replayEvents = useMemo(
    () => buildReplayEvents(keystrokes, pasteEvents),
    [keystrokes, pasteEvents]
  );

  const [displayText, setDisplayText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const timeoutRef = useRef<number | null>(null);
  const outputRef = useRef<string[]>([]);
  const contentPtrRef = useRef<number>(0);

  const safeFinal = finalContent || "";

  const clearReplayTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const resetReplay = () => {
    clearReplayTimer();
    outputRef.current = [];
    contentPtrRef.current = 0;
    setDisplayText("");
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const consumeNextChar = () => {
    const next = safeFinal[contentPtrRef.current] || "";
    contentPtrRef.current += 1;
    return next;
  };

  const applyEvent = (event: ReplayEvent) => {
    if (event.kind === "BACKSPACE") {
      if (outputRef.current.length > 0) {
        outputRef.current.pop();
      }
      setDisplayText(outputRef.current.join(""));
      return;
    }

    if (event.kind === "PASTE") {
      const pasteLength = Math.max(0, event.pasteLength || 0);
      for (let i = 0; i < pasteLength; i++) {
        const c = consumeNextChar();
        if (!c) break;
        outputRef.current.push(c);
      }
      setDisplayText(outputRef.current.join(""));
      return;
    }

    if (event.kind === "SPACE") {
      const next = consumeNextChar() || " ";
      outputRef.current.push(next === "\n" ? " " : next);
      setDisplayText(outputRef.current.join(""));
      return;
    }

    if (event.kind === "ENTER") {
      const next = consumeNextChar() || "\n";
      outputRef.current.push(next === "\n" ? "\n" : "\n");
      setDisplayText(outputRef.current.join(""));
      return;
    }

    // CHAR token: use next character from final content.
    const next = consumeNextChar();
    if (next) {
      outputRef.current.push(next);
      setDisplayText(outputRef.current.join(""));
    }
  };

  useEffect(() => {
    clearReplayTimer();

    if (!isPlaying) return;
    if (currentIndex >= replayEvents.length) {
      setIsPlaying(false);
      return;
    }

    const prev = currentIndex > 0 ? replayEvents[currentIndex - 1] : null;
    const current = replayEvents[currentIndex];
    const delay = Math.max(0, (prev ? current.atMs - prev.atMs : 0) / Math.max(0.25, playbackRate));

    timeoutRef.current = window.setTimeout(() => {
      applyEvent(current);
      setCurrentIndex((idx) => idx + 1);
    }, delay);

    return clearReplayTimer;
  }, [isPlaying, currentIndex, playbackRate, replayEvents]);

  useEffect(() => {
    resetReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeFinal, replayEvents.length]);

  const completed = replayEvents.length > 0 && currentIndex >= replayEvents.length;
  const progressPct = replayEvents.length === 0
    ? 0
    : Math.min(100, Math.round((Math.min(currentIndex, replayEvents.length) / replayEvents.length) * 100));

  // Helper to identify segment type at a given position
  const getSegmentAtPosition = (pos: number): SegmentData | null => {
    if (!segments) return null;
    for (const seg of segments) {
      if (pos >= seg.start && pos < seg.end) {
        return seg;
      }
    }
    return null;
  };

  // Render output with segment highlighting
  const renderHighlightedOutput = () => {
    if (!displayText) {
      return <span className="replay-placeholder">Press Play to reconstruct the session...</span>;
    }

    const chars: React.ReactNode[] = [];
    for (let i = 0; i < displayText.length; i++) {
      const seg = getSegmentAtPosition(i);
      const char = displayText[i];
      const key = `char-${i}`;

      if (seg?.label === "copied") {
        chars.push(
          <span key={key} className="segment-copied" title={`Pasted: ${seg.reason}`}>
            {char}
          </span>
        );
      } else if (seg?.label === "ai_suspect") {
        chars.push(
          <span key={key} className="segment-ai-suspect" title={`Suspected AI: ${seg.reason}`}>
            {char}
          </span>
        );
      } else {
        chars.push(
          <span key={key} className="segment-normal">
            {char}
          </span>
        );
      }
    }
    return chars;
  };

  return (
    <div className="replay-card">
      <div className="replay-header">
        <h3>Proof of Work Replay</h3>
        <div className="replay-controls">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            disabled={replayEvents.length === 0 || completed}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={resetReplay}
            className="muted-btn"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="replay-meta-row">
        <span>
          Event {Math.min(currentIndex, replayEvents.length)} / {replayEvents.length}
        </span>
        <label className="replay-speed">
          Speed
          <select
            value={String(playbackRate)}
            onChange={(e) => setPlaybackRate(Number(e.target.value) || 1)}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
          </select>
        </label>
      </div>

      <div className="replay-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
        <div className="replay-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="replay-output">
        {renderHighlightedOutput()}
      </div>
    </div>
  );
}
