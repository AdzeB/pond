import { FIELD_META } from "@pond/schema/filters/meta";
import { ColorBody } from "./bodies/color";
import { CreatorBody } from "./bodies/creator";
import { DateBody } from "./bodies/date";
import { EnumBody } from "./bodies/enum";
import { NumberBody } from "./bodies/number";
import { OptionalBody } from "./bodies/optional";
import { StringBody } from "./bodies/string";
import { TagsBody } from "./bodies/tags";
import type { BodyProps } from "./types";

export function Body({ predicate, onChange }: BodyProps) {
  // Creator is an enum field but its options come from live data, not static
  // presets, so it gets a dedicated picker instead of EnumBody.
  if (predicate.field === "creator") {
    return <CreatorBody predicate={predicate} onChange={onChange} />;
  }

  const meta = FIELD_META[predicate.field];
  switch (meta.type) {
    case "stringArray":
      return <TagsBody predicate={predicate} onChange={onChange} />;
    case "enum":
      return <EnumBody predicate={predicate} onChange={onChange} />;
    case "number":
      return <NumberBody predicate={predicate} onChange={onChange} />;
    case "date":
      return <DateBody predicate={predicate} onChange={onChange} />;
    case "optional":
      return <OptionalBody predicate={predicate} onChange={onChange} />;
    case "color":
      return <ColorBody predicate={predicate} onChange={onChange} />;
    default:
      return <StringBody predicate={predicate} onChange={onChange} />;
  }
}
