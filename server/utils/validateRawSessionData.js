function toIsoString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function validateRawSessionData(payload) {
  const errors = [];
  const userId = typeof payload?.userId === "string" ? payload.userId.trim() : "";
  const text = typeof payload?.text === "string" ? payload.text : "";

  const keystrokesInput = Array.isArray(payload?.keystrokes) ? payload.keystrokes : [];
  const keystrokes = keystrokesInput
    .map((item) => {
      const token = typeof item?.token === "string" ? item.token : "";
      const delayMs = Number(item?.delayMs);
      const time = toIsoString(item?.time);

      const allowedTokens = new Set([
        "CHAR",
        "BACKSPACE",
        "SPACE",
        "ENTER",
        "TAB",
        "DELETE",
        "ARROW"
      ]);

      if (!allowedTokens.has(token)) return null;
      if (!Number.isFinite(delayMs) || delayMs < 0) return null;
      if (!time) return null;

      return {
        token,
        delayMs,
        time: new Date(time)
      };
    })
    .filter(Boolean);

  if (keystrokes.length !== keystrokesInput.length) {
    errors.push("keystrokes contains malformed entries");
  }

  const pasteInput = Array.isArray(payload?.pasteEvents) ? payload.pasteEvents : [];
  const pasteEvents = pasteInput
    .map((item) => {
      const length = Number(item?.length);
      const timeIso = toIsoString(item?.time);
      const start = item?.start;
      const end = item?.end;

      if (!Number.isFinite(length) || length < 0) return null;
      if (!timeIso) return null;

      const parsedStart =
        typeof start === "number" && Number.isFinite(start) ? Math.floor(start) : undefined;
      const parsedEnd =
        typeof end === "number" && Number.isFinite(end) ? Math.floor(end) : undefined;

      return {
        length: Math.floor(length),
        time: new Date(timeIso),
        start: parsedStart,
        end: parsedEnd
      };
    })
    .filter(Boolean);

  if (pasteEvents.length !== pasteInput.length) {
    errors.push("pasteEvents contains malformed entries");
  }

  if (!userId) {
    errors.push("userId is required");
  }

  return {
    ok: errors.length === 0,
    errors,
    data: {
      userId,
      text,
      keystrokes,
      pasteEvents
    }
  };
}

module.exports = validateRawSessionData;
