import type { Query } from "@pond/schema/filters/types";
import { Group } from "../group";
import type { RuleChoices } from "../types";

interface RuleEditorProps {
  query: Query;
  choices: RuleChoices;
  onChange: (query: Query) => void;
  onRemove?: () => void;
  path?: string;
}

export function RuleEditor({
  query,
  choices,
  onChange,
  onRemove,
  path = "Rules",
}: RuleEditorProps) {
  return (
    <Group
      query={query}
      choices={choices}
      onChange={onChange}
      onRemove={onRemove}
      path={path}
    />
  );
}
