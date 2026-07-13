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
  size?: number;
}

export function ProviderLogo({ provider, size = 16 }: Props) {
  const Logo = LOGOS[provider];
  return <Logo width={size} height={size} />;
}
