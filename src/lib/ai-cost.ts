const DEFAULT_INPUT_MINOR_PER_MILLION = 80;
const DEFAULT_OUTPUT_MINOR_PER_MILLION = 160;

export function estimateTokens(text: string) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateAnswerCostMinor({
  promptText,
  completionText,
}: {
  promptText: string;
  completionText: string;
}) {
  const promptTokens = estimateTokens(promptText);
  const completionTokens = estimateTokens(completionText);
  const inputMinorPerMillion = Number(process.env.AI_INPUT_MINOR_PER_MILLION || DEFAULT_INPUT_MINOR_PER_MILLION);
  const outputMinorPerMillion = Number(process.env.AI_OUTPUT_MINOR_PER_MILLION || DEFAULT_OUTPUT_MINOR_PER_MILLION);
  const estimatedCostMinor =
    (promptTokens / 1_000_000) * inputMinorPerMillion
    + (completionTokens / 1_000_000) * outputMinorPerMillion;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostMinor,
  };
}
