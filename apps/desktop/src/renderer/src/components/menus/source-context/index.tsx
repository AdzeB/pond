import { IconNavigationVerticalFill18 as Customize } from "@pond/icons/fill/18";
import { IconCheckOutline18 as Check } from "@pond/icons/outline/18";
import type { SourceVisibility } from "@pond/schema/db";
import { ContextMenu } from "@pond/ui";
import type { ReactElement } from "react";
import { VISIBILITY_OPTIONS } from "@/lib/sources/registry";

function VisibilityRadioGroup({
  value,
  onChange,
}: {
  value: SourceVisibility;
  onChange: (next: SourceVisibility) => void;
}) {
  return (
    <ContextMenu.RadioGroup
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as SourceVisibility);
      }}
    >
      {VISIBILITY_OPTIONS.map((option) => (
        <ContextMenu.RadioItem
          key={option.value}
          value={option.value}
          closeOnClick
        >
          <ContextMenu.ItemLabel>{option.label}</ContextMenu.ItemLabel>
          <ContextMenu.ItemIcon>
            <ContextMenu.RadioItemIndicator>
              <Check width={14} height={14} />
            </ContextMenu.RadioItemIndicator>
          </ContextMenu.ItemIcon>
        </ContextMenu.RadioItem>
      ))}
    </ContextMenu.RadioGroup>
  );
}

interface SourceContextMenuProps {
  visibility: SourceVisibility;
  onVisibilityChange: (next: SourceVisibility) => void;
  onCustomize: () => void;
  children: ReactElement;
}

export function SourceContextMenu({
  visibility,
  onVisibilityChange,
  onCustomize,
  children,
}: SourceContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <VisibilityRadioGroup
              value={visibility}
              onChange={onVisibilityChange}
            />
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={onCustomize}>
              <ContextMenu.ItemIcon>
                <Customize width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Customize sources</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
