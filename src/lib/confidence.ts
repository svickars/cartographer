/** Elements tagged `low` are dropped from image prompts to reduce hallucinated geography. */
export function keepForPrompt(confidence: string): boolean {
  return confidence.trim().toLowerCase() !== 'low'
}
