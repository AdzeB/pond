import { PromptInput } from "@pond/ui";
import type { ComponentProps } from "react";

export function ComposerInput(props: ComponentProps<"textarea">) {
  return <PromptInput.Input {...props} />;
}
