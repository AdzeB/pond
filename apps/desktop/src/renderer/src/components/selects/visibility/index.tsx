import type { SourceVisibility } from "@pond/schema/db";
import {
  type EnumOption,
  EnumSelect,
} from "@/components/selects/_shared/enum-select";
import { VISIBILITY_OPTIONS } from "@/lib/sources/registry";

const OPTIONS = VISIBILITY_OPTIONS as readonly EnumOption<SourceVisibility>[];

interface VisibilitySelectProps {
  value: SourceVisibility;
  onValueChange: (value: SourceVisibility) => void;
  className?: string;
  align?: "start" | "center" | "end";
}

export function VisibilitySelect({
  value,
  onValueChange,
  className,
  align,
}: VisibilitySelectProps) {
  return (
    <EnumSelect<SourceVisibility>
      value={value}
      onValueChange={onValueChange}
      options={OPTIONS}
      className={className}
      align={align}
    />
  );
}
