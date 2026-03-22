function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function toRanges(text, pasteEvents) {
  const max = text.length;
  return (Array.isArray(pasteEvents) ? pasteEvents : [])
    .map((event) => {
      const start = Number(event?.start);
      const end = Number(event?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      if (end <= start) return null;
      return {
        start: Math.max(0, Math.min(max, Math.floor(start))),
        end: Math.max(0, Math.min(max, Math.floor(end)))
      };
    })
    .filter(Boolean);
}

function splitSentences(text) {
  const ranges = [];
  const regex = /[^.!?\n]+[.!?\n]*/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0] || "";
    const start = match.index;
    const end = start + sentence.length;
    if (end > start) {
      ranges.push({ start, end, sentence });
    }
  }

  if (ranges.length === 0 && text.length > 0) {
    ranges.push({ start: 0, end: text.length, sentence: text });
  }

  return ranges;
}

function avgWordLength(sentence) {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const chars = words.reduce((sum, word) => sum + word.length, 0);
  return chars / words.length;
}

function punctuationRatio(sentence) {
  if (!sentence) return 0;
  const punctuation = sentence.match(/[.,!?;:()\-]/g) || [];
  return punctuation.length / Math.max(sentence.length, 1);
}

function detectSegments({ text, pasteEvents, analysis }) {
  const safeText = typeof text === "string" ? text : "";
  const pasteRanges = toRanges(safeText, pasteEvents);
  const sentenceRanges = splitSentences(safeText);
  const segments = [];

  for (const item of sentenceRanges) {
    const { start, end, sentence } = item;

    const isCopied = pasteRanges.some((range) => overlap(start, end, range.start, range.end));
    if (isCopied) {
      segments.push({
        start,
        end,
        label: "copied",
        reason: `Copied text detected between character ${start} and ${end}`
      });
      continue;
    }

    const stats = analysis?.stats || {};
    let aiRisk = 0;
    if ((analysis?.score || 100) < 60) aiRisk += 1;
    if ((stats.textToKeystrokeRatio || 0) > 1.2) aiRisk += 1;
    if ((stats.delayVariance || 0) > 0 && (stats.delayVariance || 0) < 180) aiRisk += 1;
    if (sentence.length > 140) aiRisk += 1;
    if (avgWordLength(sentence) > 6.3 && punctuationRatio(sentence) < 0.02) aiRisk += 1;

    if (aiRisk >= 3) {
      segments.push({
        start,
        end,
        label: "ai_suspect",
        reason: `Pattern in character range ${start}-${end} looks AI-assisted`
      });
    } else {
      segments.push({
        start,
        end,
        label: "normal",
        reason: `Character range ${start}-${end} shows normal writing behavior`
      });
    }
  }

  if (segments.length === 0 && safeText.length === 0) {
    segments.push({
      start: 0,
      end: 0,
      label: "normal",
      reason: "Empty text"
    });
  }

  return segments;
}

module.exports = detectSegments;
