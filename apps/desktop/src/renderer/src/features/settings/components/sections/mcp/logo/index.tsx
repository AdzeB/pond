import { IconCode as Code } from "@pond/icons";
import type { McpHostId } from "@shared/mcp-hosts";
import vscode from "@/assets/logos/agents/vscode.svg";
import anthropic from "@/assets/logos/providers/anthropic.webp";
import google from "@/assets/logos/providers/google.webp";
import openai from "@/assets/logos/providers/openai.webp";
import styles from "./styles.module.css";

const HOST_LOGOS = {
  "claude-code": anthropic,
  "claude-desktop": anthropic,
  codex: openai,
  "gemini-cli": google,
  vscode,
} satisfies Partial<Record<McpHostId, string>>;

export function HostLogo({ id }: { id: McpHostId }) {
  const src = Object.entries(HOST_LOGOS).find(([hostId]) => hostId === id)?.[1];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={20}
        height={20}
        className={styles.logo}
        data-fit={id === "vscode" ? "contain" : undefined}
      />
    );
  }
  return (
    <span className={styles.mark} aria-hidden>
      <Code size={12} />
    </span>
  );
}
