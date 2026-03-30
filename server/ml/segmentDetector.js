function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const ordered = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [ordered[0]];

  for (let i = 1; i < ordered.length; i += 1) {
    const current = ordered[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function toRanges(text, pasteEvents) {
  const max = text.length;
  const rawRanges = (Array.isArray(pasteEvents) ? pasteEvents : [])
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

  return mergeRanges(rawRanges);
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

function segmentRiskLabel(segmentText, analysis, start, end) {
  const stats = analysis?.stats || {};
  let aiRisk = 0;
  if ((analysis?.score || 100) < 60) aiRisk += 1;
  if ((stats.textToKeystrokeRatio || 0) > 1.2) aiRisk += 1;
  if ((stats.delayVariance || 0) > 0 && (stats.delayVariance || 0) < 180) aiRisk += 1;
  if (segmentText.length > 140) aiRisk += 1;
  if (avgWordLength(segmentText) > 6.3 && punctuationRatio(segmentText) < 0.02) aiRisk += 1;

  if (aiRisk >= 3) {
    return {
      label: "ai_suspect",
      reason: `Pattern in character range ${start}-${end} looks AI-assisted`
    };
  }

  return {
    label: "normal",
    reason: `Human-written pattern detected in character range ${start}-${end}`
  };
}

function detectSegments({ text, pasteEvents, analysis }) {
  const safeText = typeof text === "string" ? text : "";
  const pasteRanges = toRanges(safeText, pasteEvents);
  const sentenceRanges = splitSentences(safeText);
  const segments = [];

  for (const item of sentenceRanges) {
    const { start, end, sentence } = item;
    const overlappingCopies = pasteRanges.filter((range) => overlap(start, end, range.start, range.end));

    if (overlappingCopies.length === 0) {
      const result = segmentRiskLabel(sentence, analysis, start, end);
      segments.push({
        start,
        end,
        label: result.label,
        reason: result.reason
      });
      continue;
    }

    let cursor = start;
    for (const copyRange of overlappingCopies) {
      const copiedStart = Math.max(start, copyRange.start);
      const copiedEnd = Math.min(end, copyRange.end);

      if (copiedStart > cursor) {
        const beforeText = safeText.slice(cursor, copiedStart);
        const beforeResult = segmentRiskLabel(beforeText, analysis, cursor, copiedStart);
        segments.push({
          start: cursor,
          end: copiedStart,
          label: beforeResult.label,
          reason: beforeResult.reason
        });
      }

      if (copiedEnd > copiedStart) {
        segments.push({
          start: copiedStart,
          end: copiedEnd,
          label: "copied",
          reason: `Copied text detected between character ${copiedStart} and ${copiedEnd}`
        });
      }

      cursor = Math.max(cursor, copiedEnd);
    }

    if (cursor < end) {
      const afterText = safeText.slice(cursor, end);
      const afterResult = segmentRiskLabel(afterText, analysis, cursor, end);
      segments.push({
        start: cursor,
        end,
        label: afterResult.label,
        reason: afterResult.reason
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
