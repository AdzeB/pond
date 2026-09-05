export interface ProviderModel {
  id: string;
  name: string;
}

const TOKENS = new Map([
  ["gpt", "GPT"],
  ["chatgpt", "ChatGPT"],
]);

export function displayName(id: string): string {
  return id
    .replace(/^models\//, "")
    .split(/[-_/]/)
    .filter(Boolean)
    .map((part) => {
      const token = TOKENS.get(part.toLowerCase());
      if (token) return token;
      if (/^\d/.test(part)) return part;
      if (part.length <= 2) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function chosenModelId(
  provider: string,
  prefs: {
    modelIds?: Record<string, string>;
    ollamaModelId?: string;
    lmstudioModelId?: string;
    compatibleModelId?: string;
  },
): string {
  const fromMap = prefs.modelIds?.[provider]?.trim();
  if (fromMap) return fromMap;
  if (provider === "ollama") return prefs.ollamaModelId?.trim() ?? "";
  if (provider === "lmstudio") return prefs.lmstudioModelId?.trim() ?? "";
  if (provider === "compatible") return prefs.compatibleModelId?.trim() ?? "";
  return "";
}
