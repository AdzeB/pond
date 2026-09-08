import type { ReactElement } from "react";
import { Tooltip } from "../tooltip";

export function ActionHint({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return <Tooltip label={label}>{children}</Tooltip>;
}
