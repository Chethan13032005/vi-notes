export type KeystrokeToken =
  | "CHAR"
  | "BACKSPACE"
  | "SPACE"
  | "ENTER"
  | "TAB"
  | "DELETE"
  | "ARROW";

export type KeystrokeEvent = {
  token: KeystrokeToken;
  delayMs: number;
  time: string;
};

export type PasteEvent = {
  length: number;
  time: string;
  start?: number;
  end?: number;
};

export type AnalyzedSegment = {
  start: number;
  end: number;
  label: "normal" | "ai_suspect" | "copied";
  reason: string;
};

export type Analysis = {
  score: number;
  reasons: string[];
  stats?: {
    avgDelay?: number;
    delayVariance?: number;
    textLength?: number;
    keystrokeCount?: number;
    pasteCount?: number;
    textToKeystrokeRatio?: number;
  };
  model?: {
    used?: boolean;
    provider?: string;
    fallback?: boolean;
  };
  segments?: AnalyzedSegment[];
};

export type RawSessionData = {
  userId: string;
  text: string;
  keystrokes: KeystrokeEvent[];
  pasteEvents: PasteEvent[];
};
