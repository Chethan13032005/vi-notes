function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / values.length;
}

function variance(values, mean) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const total = values.reduce((sum, value) => {
    const delta = Number(value || 0) - mean;
    return sum + delta * delta;
  }, 0);
  return total / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function analyzeSession({ text, keystrokes, pasteEvents }) {
  const safeText = typeof text === "string" ? text : "";
  const safeKeystrokes = Array.isArray(keystrokes)
    ? keystrokes
        .map((k) => {
          if (typeof k === "number") return k;
          if (k && typeof k === "object") return Number(k.delayMs);
          return NaN;
        })
        .filter((delay) => Number.isFinite(delay) && delay >= 0)
    : [];
  const safePasteEvents = Array.isArray(pasteEvents) ? pasteEvents : [];

  const reasons = [];
  let score = 100;

  const avgDelay = average(safeKeystrokes);
  const delayVariance = variance(safeKeystrokes, avgDelay);
  const textLength = safeText.length;
  const keystrokeCount = safeKeystrokes.length;
  const textToKeystrokeRatio = textLength / Math.max(keystrokeCount, 1);
  const pasteCount = safePasteEvents.length;

  if (pasteCount > 0) {
    const penalty = Math.min(35, pasteCount * 12);
    score -= penalty;
    reasons.push(`Paste activity detected (${pasteCount} event${pasteCount > 1 ? "s" : ""})`);
  }

  if (avgDelay > 0 && avgDelay < 45 && keystrokeCount > 30) {
    score -= 20;
    reasons.push("Typing speed appears unusually fast");
  }

  if (keystrokeCount > 20 && delayVariance < 120) {
    score -= 15;
    reasons.push("Typing rhythm variance is unusually low");
  }

  if (textToKeystrokeRatio > 1.4 && textLength > 200) {
    score -= 20;
    reasons.push("Text length is high relative to keystroke activity");
  }

  if (delayVariance > 1000 && avgDelay >= 80 && avgDelay <= 700) {
    reasons.push("Natural typing variation detected");
  }

  if (reasons.length === 0) {
    reasons.push("Behavior is consistent with normal human writing");
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    reasons,
    stats: {
      avgDelay,
      delayVariance,
      textLength,
      keystrokeCount,
      pasteCount,
      textToKeystrokeRatio
    }
  };
}

module.exports = analyzeSession;
