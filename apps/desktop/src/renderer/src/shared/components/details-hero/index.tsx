import { IconDotsFill } from "@pond/icons";
import { Menu, type MenuItemSpec } from "@pond/ui";
import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { SpecMenu } from "@/shared/components/spec-context-menu";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"div"> {}

function Root({ className, ...props }: RootProps) {
  return <div className={cn(styles.root, className)} {...props} />;
}

interface MediaProps extends ComponentPropsWithoutRef<"div"> {}

function Media({ className, ...props }: MediaProps) {
  return <div className={cn(styles.media, className)} {...props} />;
}

interface ActionsProps {
  items: MenuItemSpec[];
  "aria-label": string;
}

function Actions({ items, "aria-label": label }: ActionsProps) {
  if (items.length === 0) return null;
  return (
    <SpecMenu align="start" buildItems={() => items}>
      <Menu.Trigger
        className={styles.actions}
        variant="secondary"
        size="sm"
        rounding="pill"
        icon
        aria-label={label}
      >
        <IconDotsFill size={12} />
      </Menu.Trigger>
    </SpecMenu>
  );
}

interface CopyProps extends ComponentPropsWithoutRef<"div"> {}

function Copy({ className, ...props }: CopyProps) {
  return <div className={cn(styles.copy, className)} {...props} />;
}

interface TitleProps extends ComponentPropsWithoutRef<"h2"> {}

function Title({ className, ...props }: TitleProps) {
  return <h2 className={cn(styles.title, className)} {...props} />;
}

interface DescriptionProps extends ComponentPropsWithoutRef<"p"> {
  tone?: "error" | "warning";
}

function Description({ className, tone, ...props }: DescriptionProps) {
  return (
    <p
      className={cn(styles.description, className)}
      data-tone={tone}
      {...props}
    />
  );
}

export const DetailsHero = { Root, Media, Actions, Copy, Title, Description };
