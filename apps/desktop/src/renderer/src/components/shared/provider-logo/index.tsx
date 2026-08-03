import {
  IconComputerOutline18 as Bundled,
  IconGlobeOutline18 as Custom,
} from "@pond/icons/outline/18";
import {
  IconProviderAnthropic,
  IconProviderDeepseek,
  IconProviderGoogle,
  IconProviderGroq,
  IconProviderLmstudio,
  IconProviderMistral,
  IconProviderOllama,
  IconProviderOpenai,
  IconProviderOpenrouter,
  IconProviderPerplexity,
  IconProviderTogether,
  IconProviderXai,
} from "@pond/icons/providers";
import type { IconComponent } from "@pond/icons/types";
import type { AiProviderId } from "@pond/schema";
import styles from "./styles.module.css";

/** bundled/custom have no brand mark: on-device falls back to a computer, a user-supplied endpoint to a globe. */
const LOGOS: Record<AiProviderId, IconComponent> = {
  bundled: Bundled,
  ollama: IconProviderOllama,
  lmstudio: IconProviderLmstudio,
  custom: Custom,
  openai: IconProviderOpenai,
  anthropic: IconProviderAnthropic,
  google: IconProviderGoogle,
  groq: IconProviderGroq,
  mistral: IconProviderMistral,
  xai: IconProviderXai,
  deepseek: IconProviderDeepseek,
  openrouter: IconProviderOpenrouter,
  together: IconProviderTogether,
  perplexity: IconProviderPerplexity,
};

interface Props {
  provider: AiProviderId;
  /** Tile box size; the glyph is scaled inside it. */
  size?: number;
}

export function ProviderLogo({ provider, size = 16 }: Props) {
  const Logo = LOGOS[provider];
  const glyph = Math.round(size * 0.62);
  return (
    <span
      className={styles.tile}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Logo width={glyph} height={glyph} />
    </span>
  );
}
