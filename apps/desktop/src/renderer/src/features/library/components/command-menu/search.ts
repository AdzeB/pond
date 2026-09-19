import { sourceLabel } from "@pond/schema";
import type { Save } from "@/features/saves/types";
import { COMMANDS } from "./commands";
import type { CommandSpec } from "./types";

function scoreCommand(command: CommandSpec, query: string): number {
  if (!query) return 1;
  const label = command.label.toLowerCase();
  const haystack =
    `${label} ${command.detail ?? ""} ${command.keywords}`.toLowerCase();
  if (label === query) return 5;
  if (label.startsWith(query)) return 4;
  if (label.includes(query)) return 3;
  if (haystack.includes(query)) return 2;
  const words = query.split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word)) ? 1 : 0;
}

export function matchingCommands(query: string): CommandSpec[] {
  const normalized = query.trim().toLowerCase();
  return COMMANDS.map((command) => ({
    command,
    score: scoreCommand(command, normalized),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ command }) => command);
}

export function saveLabel(save: Save): string {
  return (
    save.title?.trim() ||
    save.description?.trim() ||
    save.notes?.trim() ||
    save.url
  );
}

export function saveDetail(save: Save): string {
  const source = sourceLabel(save.source);
  return save.author?.trim() ? `${source} · ${save.author.trim()}` : source;
}
