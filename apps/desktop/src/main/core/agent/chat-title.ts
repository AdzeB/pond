import { planAssistantTurn } from "./plan";

function concise(text: string): string | undefined {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  const title = normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
  if (title.length <= 48) return title;
  const prefix = title.slice(0, 47);
  const boundary = prefix.lastIndexOf(" ");
  const truncated = boundary > 24 ? prefix.slice(0, boundary) : prefix;
  return `${truncated.replace(/\s+(?:and|or|the|a|an|of|for|in|with)$/i, "")}…`;
}

export function chatTitle(content: string): string | undefined {
  const plan = planAssistantTurn({ latest: content, hasSearch: true });
  if (plan.intent === "recent") return "Recent Saves";
  if (plan.intent === "search" && plan.query) {
    if (/\bcompare\b/i.test(content)) return concise(`Compare ${plan.query}`);
    if (plan.edit) return concise(`Organize ${plan.query}`);
    if (/\bsummari[sz]e\b/i.test(content))
      return concise(`${plan.query} summary`);
    return concise(`${plan.query} references`);
  }
  const firstSentence = content.trim().split(/[.!?]\s+/, 1)[0] ?? "";
  return concise(
    firstSentence
      .replace(/^(?:please\s+)?(?:can|could|would) you\s+/i, "")
      .replace(/[.!?]+$/, ""),
  );
}
