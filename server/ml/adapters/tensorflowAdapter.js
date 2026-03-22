let isAdapterInitialized = false;

async function initializeModel() {
  // Placeholder boundary for future TF.js model loading.
  isAdapterInitialized = true;
  return {
    status: "not_loaded",
    provider: "tensorflow-js-placeholder"
  };
}

async function predictAuthenticity(_features) {
  if (!isAdapterInitialized) {
    await initializeModel();
  }

  // Return null to signal fallback to rule-based scoring.
  return null;
}

module.exports = {
  initializeModel,
  predictAuthenticity
};
