import { Chip } from "@pond/ui";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { libraryHeader } from "@/features/library/state/library-header";
import type { FilterLayout } from "../layout";
import styles from "./styles.module.css";

type FilterChipProps = Omit<ComponentProps<typeof Chip.Filter>, "onOpenChange">;

export function FilterChip(props: FilterChipProps) {
  return (
    <Chip.Filter
      onOpenChange={(open) => {
        if (open) libraryHeader.closePopover();
      }}
      {...props}
    />
  );
}

export function FilterPopup({
  layout,
  className,
  ...props
}: ComponentProps<typeof Chip.Popup> & { layout?: FilterLayout }) {
  return (
    <Chip.Popup
      className={cn(styles.popup, className)}
      data-layout={layout}
      {...props}
    />
  );
}
