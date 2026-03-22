const extractFeatures = require("./featureExtractor");
const analyzeSessionRuleBased = require("../utils/analyze");
const detectSegments = require("./segmentDetector");
const tfAdapter = require("./adapters/tensorflowAdapter");

async function analyzeSessionWithPipeline(payload) {
  const features = extractFeatures(payload);

  let modelPrediction = null;
  try {
    modelPrediction = await tfAdapter.predictAuthenticity(features);
  } catch (_error) {
    modelPrediction = null;
  }

  const ruleBased = analyzeSessionRuleBased(payload);
  const resolvedScore =
    modelPrediction && typeof modelPrediction.score === "number"
      ? modelPrediction.score
      : ruleBased.score;

  const analysis = {
    ...ruleBased,
    score: Math.max(0, Math.min(100, Math.round(resolvedScore))),
    model: {
      used: Boolean(modelPrediction),
      provider: "tensorflow-js-placeholder",
      fallback: !modelPrediction
    }
  };

  analysis.segments = detectSegments({
    text: payload?.text,
    pasteEvents: payload?.pasteEvents,
    analysis
  });

  return analysis;
}

module.exports = analyzeSessionWithPipeline;
