import { Input as BaseInput } from "@base-ui/react/input";
import { Menu as Base } from "@base-ui/react/menu";
import { IconCaretRightFill12 as CaretRight } from "@pond/icons/fill/12";
import { clsx as cn } from "clsx";
import { forwardRef } from "react";
import { Button, type ButtonProps } from "../button";
import { Checkbox } from "../checkbox";
import { Keyboard } from "../keyboard";
import { Switch } from "../switch";
import { type MenuItemSpec, renderMenuSpec } from "./items";

import styles from "./styles.module.css";

function Root(props: Base.Root.Props) {
  return <Base.Root {...props} />;
}

type TriggerProps = Base.Trigger.Props &
  Pick<ButtonProps, "variant" | "size" | "icon" | "rounding">;

function Trigger({
  className,
  variant,
  size,
  icon,
  rounding,
  ...props
}: TriggerProps) {
  return (
    <Base.Trigger
      render={
        props.render ? (
          props.render
        ) : (
          <Button
            size={size}
            icon={icon}
            rounding={rounding}
            variant={variant}
            className={cn(styles.trigger, className)}
          />
        )
      }
      {...props}
    />
  );
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
}

function Positioner({
  className,
  sideOffset = 6,
  ...props
}: Base.Positioner.Props) {
  return (
    <Base.Positioner
      sideOffset={sideOffset}
      data-type="menu"
      className={cn(styles.positioner, className)}
      {...props}
    />
  );
}

function Popup({ className, ...props }: Base.Popup.Props) {
  return <Base.Popup {...props} className={cn(styles.popup, className)} />;
}

const Surface = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  function Surface({ className, ...props }, ref) {
    return <div ref={ref} className={cn(styles.popup, className)} {...props} />;
  },
);

function Row({
  className,
  highlighted = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { highlighted?: boolean }) {
  return (
    <button
      type={type}
      data-highlighted={highlighted || undefined}
      className={cn(styles.item, className)}
      {...props}
    />
  );
}

function SectionLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(styles["group-label"], className)} {...props} />;
}

function Viewport({ className, ...props }: Base.Viewport.Props) {
  return (
    <Base.Viewport className={cn(styles.viewport, className)} {...props} />
  );
}

function Arrow({ className, ...props }: Base.Arrow.Props) {
  return <Base.Arrow className={cn(styles.arrow, className)} {...props} />;
}

type ItemProps = Base.Item.Props & {
  stale?: boolean;
};

function Item({ className, stale = false, ...props }: ItemProps) {
  return (
    <Base.Item
      data-stale={stale}
      className={cn(styles.item, className)}
      {...props}
    />
  );
}

function LinkItem({ className, ...props }: Base.LinkItem.Props) {
  return <Base.LinkItem className={cn(styles.item, className)} {...props} />;
}

function ItemIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(styles["item-icon"], className)}
      {...props}
    />
  );
}

function ItemLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(styles["item-label"], className)} {...props} />;
}

function ItemKeyboard({
  className,
  ...props
}: React.ComponentProps<typeof Keyboard.Shortcut>) {
  return (
    <Keyboard.Shortcut
      density="flat"
      className={cn(styles["item-keyboard"], className)}
      {...props}
    />
  );
}

function Group(props: Base.Group.Props) {
  return <Base.Group {...props} />;
}

function GroupLabel({ className, ...props }: Base.GroupLabel.Props) {
  return (
    <Base.GroupLabel
      className={cn(styles["group-label"], className)}
      {...props}
    />
  );
}

function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn(styles.separator, className)} {...props} />;
}

function RadioGroup(props: Base.RadioGroup.Props) {
  return <Base.RadioGroup {...props} />;
}

function RadioItem({ className, ...props }: Base.RadioItem.Props) {
  return <Base.RadioItem className={cn(styles.item, className)} {...props} />;
}

function RadioItemIndicator({
  className,
  ...props
}: Base.RadioItemIndicator.Props) {
  return (
    <Base.RadioItemIndicator
      className={cn(styles.indicator, className)}
      {...props}
    />
  );
}

function CheckboxItem({ className, ...props }: Base.CheckboxItem.Props) {
  return (
    <Base.CheckboxItem className={cn(styles.item, className)} {...props} />
  );
}

function SwitchItemIndicator({
  className,
  keepMounted = true,
  ...props
}: Base.CheckboxItemIndicator.Props) {
  return (
    <Base.CheckboxItemIndicator
      keepMounted={keepMounted}
      className={cn(styles.indicator, className)}
      render={(renderProps, state) => (
        <Switch.Root
          checked={state.checked}
          readOnly
          tabIndex={-1}
          aria-hidden
          {...renderProps}
        />
      )}
      {...props}
    />
  );
}

function CheckboxItemIndicator({
  className,
  keepMounted = true,
  ...props
}: Base.CheckboxItemIndicator.Props) {
  return (
    <Base.CheckboxItemIndicator
      keepMounted={keepMounted}
      className={cn(styles.indicator, className)}
      render={(renderProps, state) => (
        <Checkbox.Root
          size="sm"
          checked={state.checked}
          readOnly
          tabIndex={-1}
          aria-hidden
          {...renderProps}
        >
          <Checkbox.Indicator />
        </Checkbox.Root>
      )}
      {...props}
    />
  );
}

function SubmenuRoot(props: Base.SubmenuRoot.Props) {
  return <Base.SubmenuRoot {...props} />;
}

function SubmenuTrigger({ className, ...props }: Base.SubmenuTrigger.Props) {
  return (
    <Base.SubmenuTrigger className={cn(styles.item, className)} {...props}>
      {props.children}
      <CaretRight width={6} height={6} style={{ color: "var(--ds-gray-9)" }} />
    </Base.SubmenuTrigger>
  );
}

function SecondaryLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn(styles["secondary-label"], className)} {...props} />
  );
}

function Items({ items }: { items: MenuItemSpec[] }) {
  return (
    <>
      {renderMenuSpec(items, {
        Item,
        ItemIcon,
        ItemLabel,
        ItemKeyboard,
        CheckboxItem,
        CheckboxItemIndicator,
        LinkItem,
        Separator,
        Group,
        GroupLabel,
        SubmenuRoot,
        SubmenuTrigger,
        Portal,
        Positioner,
        Popup,
      })}
    </>
  );
}

function Input({ className, onKeyDown, ...props }: BaseInput.Props) {
  return (
    <BaseInput
      type="search"
      spellCheck={false}
      className={cn(styles.input, className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.stopPropagation();
        }
      }}
      {...props}
    />
  );
}

export const Menu = {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Surface,
  Viewport,
  Arrow,
  Item,
  Row,
  LinkItem,
  ItemIcon,
  ItemLabel,
  ItemKeyboard,
  Input,
  SecondaryLabel,
  Group,
  GroupLabel,
  SectionLabel,
  Separator,
  RadioGroup,
  RadioItem,
  RadioItemIndicator,
  CheckboxItem,
  CheckboxItemIndicator,
  SwitchItemIndicator,
  SubmenuRoot,
  SubmenuTrigger,
  Items,
};

export type { MenuItemSpec } from "./items";
