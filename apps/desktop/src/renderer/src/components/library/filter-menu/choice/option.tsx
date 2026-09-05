import type { Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import type { FilterOption } from "../options";
import { isChoiceSelected, selectChoice } from "../selection";
import { excludeGestures } from "./exclude";
import { ChoiceIndicator } from "./indicator";

export function ChoiceOption({
  option,
  rows,
  matching,
  count,
  onChange,
}: {
  option: FilterOption;
  rows: Predicate[];
  matching: "any" | "all";
  count: number;
  onChange: (rows: Predicate[]) => void;
}) {
  const excluded = isChoiceSelected(rows, option.predicate, "exclude");
  const included = isChoiceSelected(rows, option.predicate, matching);
  const exclude = () =>
    onChange(
      selectChoice(
        rows,
        option.predicate,
        !excluded && !included,
        included ? matching : "exclude",
      ),
    );
  return (
    <Menu.CheckboxItem
      closeOnClick={false}
      checked={included || excluded}
      data-excluded={excluded || undefined}
      aria-description={excluded ? "Excluded" : undefined}
      {...excludeGestures(exclude)}
      onCheckedChange={(next) =>
        onChange(
          selectChoice(
            rows,
            option.predicate,
            next,
            excluded ? "exclude" : matching,
          ),
        )
      }
    >
      <ChoiceIndicator excluded={excluded} />
      <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
      <Menu.SecondaryLabel>{count}</Menu.SecondaryLabel>
    </Menu.CheckboxItem>
  );
}
