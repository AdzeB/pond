import {
  IconComputerOutline18,
  IconGlobe2Outline18,
  IconOrbitSparkleOutline18,
  IconServerOutline18,
  IconStarOutline18,
  IconWandSparkleOutline18,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import type { AssistantProvider } from "@shared/assistant";

export const PROVIDER_ICONS = {
  anthropic: IconOrbitSparkleOutline18,
  openai: IconWandSparkleOutline18,
  gemini: IconStarOutline18,
  ollama: IconComputerOutline18,
  lmstudio: IconServerOutline18,
  compatible: IconGlobe2Outline18,
} satisfies Record<AssistantProvider, IconComponent>;
