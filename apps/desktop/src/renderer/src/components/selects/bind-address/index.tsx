import {
  type EnumOption,
  EnumSelect,
} from "@/components/selects/_shared/enum-select";

export type BindAddress = "loopback" | "lan";

const OPTIONS: readonly EnumOption<BindAddress>[] = [
  { value: "loopback", label: "Loopback (127.0.0.1)" },
  { value: "lan", label: "LAN (0.0.0.0)" },
];

interface BindAddressSelectProps {
  value: BindAddress;
  onValueChange: (value: BindAddress) => void;
}

export function BindAddressSelect({
  value,
  onValueChange,
}: BindAddressSelectProps) {
  return (
    <EnumSelect<BindAddress>
      value={value}
      onValueChange={onValueChange}
      options={OPTIONS}
    />
  );
}
