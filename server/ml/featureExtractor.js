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

function extractFeatures({ text, keystrokes, pasteEvents }) {
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

  const avgDelay = average(safeKeystrokes);
  const delayVariance = variance(safeKeystrokes, avgDelay);

  return {
    textLength: safeText.length,
    keystrokeCount: safeKeystrokes.length,
    pasteCount: safePasteEvents.length,
    avgDelay,
    delayVariance,
    textToKeystrokeRatio: safeText.length / Math.max(safeKeystrokes.length, 1)
  };
}

module.exports = extractFeatures;
