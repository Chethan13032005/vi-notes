import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReplayPlayer from "../Components/ReplayPlayer";

type VerifyKeystroke = {
  keyType?: string;
  token?: string;
  timestamp?: string | number;
  time?: string | number;
  delayMs?: number;
};

type VerifyPasteEvent = {
  length: number;
  timestamp?: string | number;
  time?: string | number;
  start?: number;
  end?: number;
};

type VerifyResponse = {
  content: string;
  metadata: {
    keystrokes: VerifyKeystroke[];
    pasteEvents: VerifyPasteEvent[];
  };
  score: number;
  segments?: Array<{
    start: number;
    end: number;
    label: "normal" | "ai_suspect" | "copied";
    reason: string;
  }>;
};

function toEpochMs(value?: string | number): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + "m " + String(seconds).padStart(2, "0") + "s";
}

export default function CertificateView() {
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { certificateId = "" } = useParams<{ certificateId: string }>();

  const verifyUrl = useMemo(() => {
    if (!certificateId) return "";
    return `${window.location.origin}/verify/${certificateId}`;
  }, [certificateId]);

  useEffect(() => {
    if (!certificateId) {
      setStatus("error");
      setMessage("Invalid certificate URL. Expected /verify/:certificateId");
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(
          "http://localhost:5000/api/verify/" + encodeURIComponent(certificateId),
          { signal: controller.signal }
        );

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.message || "Failed to fetch certificate");
        }

        const normalized: VerifyResponse = {
          content: typeof body?.content === "string" ? body.content : "",
          metadata: {
            keystrokes: Array.isArray(body?.metadata?.keystrokes)
              ? body.metadata.keystrokes
              : [],
            pasteEvents: Array.isArray(body?.metadata?.pasteEvents)
              ? body.metadata.pasteEvents
              : []
          },
          score: Number.isFinite(Number(body?.score)) ? Number(body.score) : 0,
          segments: Array.isArray(body?.segments) ? body.segments : []
        };

        setData(normalized);
        setStatus("success");
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        setStatus("error");
        setMessage(error?.message || "Unable to load certificate");
      }
    };

    load();

    return () => controller.abort();
  }, [certificateId]);

  const metrics = useMemo(() => {
    if (!data) {
      return {
        durationMs: 0,
        charCount: 0,
        keystrokeCount: 0,
        pasteCount: 0
      };
    }

    const events = [
      ...data.metadata.keystrokes
        .map((k) => toEpochMs(k.timestamp ?? k.time))
        .filter((n): n is number => n !== null),
      ...data.metadata.pasteEvents
        .map((p) => toEpochMs(p.timestamp ?? p.time))
        .filter((n): n is number => n !== null)
    ].sort((a, b) => a - b);

    const durationMs =
      events.length > 1 ? Math.max(0, events[events.length - 1] - events[0]) : 0;

    return {
      durationMs,
      charCount: data.content.length,
      keystrokeCount: data.metadata.keystrokes.length,
      pasteCount: data.metadata.pasteEvents.length
    };
  }, [data]);

  const copyCertificateLink = async () => {
    if (!verifyUrl) return;

    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (_error) {
      setCopied(false);
    }
  };

  return (
    <main className="certificate-page">
      <div className="certificate-shell">
        <header className="certificate-header card">
          <p className="kicker">
            Vi-Notes Authenticity Certificate
          </p>
          <h1>Verified Writing Proof</h1>
          <p className="certificate-id">Certificate ID: {certificateId || "N/A"}</p>
          <div className="row share-actions">
            <button className="muted-btn" type="button" onClick={copyCertificateLink} disabled={!verifyUrl}>
              {copied ? "Copied" : "Copy Certificate Link"}
            </button>
          </div>
        </header>

        {status === "loading" ? (
          <div className="card certificate-state">
            Loading certificate...
          </div>
        ) : null}

        {status === "error" ? (
          <div className="card certificate-error">
            {message || "Certificate not found."}
          </div>
        ) : null}

        {status === "success" && data ? (
          <section className="certificate-section">
            <div className="card certificate-score-card">
              <p className="kicker">
                Authenticity Score
              </p>
              <div className="certificate-score">{Math.round(data.score)}%</div>
            </div>

            <div className="certificate-metrics">
              <div className="card metric-card">
                <p>Duration</p>
                <strong>
                  {formatDuration(metrics.durationMs)}
                </strong>
              </div>
              <div className="card metric-card">
                <p>Characters</p>
                <strong>{metrics.charCount}</strong>
              </div>
              <div className="card metric-card">
                <p>Keystrokes</p>
                <strong>{metrics.keystrokeCount}</strong>
              </div>
              <div className="card metric-card">
                <p>Paste Events</p>
                <strong>{metrics.pasteCount}</strong>
              </div>
            </div>

            <ReplayPlayer
              finalContent={data.content}
              keystrokes={data.metadata.keystrokes}
              pasteEvents={data.metadata.pasteEvents}
              segments={data.segments}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
