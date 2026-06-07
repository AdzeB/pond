import {
  type EnumOption,
  EnumSelect,
} from "@/components/selects/_shared/enum-select";
import {
  FREQUENCY_OPTIONS,
  type SyncFrequency,
} from "@/lib/utils/sync-helpers";

const OPTIONS = FREQUENCY_OPTIONS as readonly EnumOption<SyncFrequency>[];

interface FrequencySelectProps {
  value: SyncFrequency;
  onValueChange: (value: SyncFrequency) => void;
  disabled?: boolean;
}

export function FrequencySelect({
  value,
  onValueChange,
  disabled,
}: FrequencySelectProps) {
  return (
    <EnumSelect<SyncFrequency>
      value={value}
      onValueChange={onValueChange}
      options={OPTIONS}
      placeholder="Daily"
      disabled={disabled}
    />
  );
}
