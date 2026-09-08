import { IconGlobe2Outline18 } from "@pond/icons/outline/18";
import type { AssistantProvider } from "@shared/assistant";
import anthropic from "@/assets/logos/providers/anthropic.webp";
import google from "@/assets/logos/providers/google.webp";
import lmstudio from "@/assets/logos/providers/lmstudio.webp";
import ollama from "@/assets/logos/providers/ollama.webp";
import openai from "@/assets/logos/providers/openai.webp";
import styles from "./icons.module.css";

const logos = {
  anthropic,
  openai,
  gemini: google,
  ollama,
  lmstudio,
  compatible: null,
} satisfies Record<AssistantProvider, string | null>;

export function ProviderLogo({
  provider,
  size = 18,
}: {
  provider: AssistantProvider;
  size?: number;
}) {
  const logo = logos[provider];
  return logo ? (
    <img src={logo} alt="" width={size} height={size} className={styles.logo} />
  ) : (
    <IconGlobe2Outline18 width={size} height={size} />
  );
}
