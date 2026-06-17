import { Input as BaseInput } from "@base-ui/react/input";
import { Menu as Base } from "@base-ui/react/menu";
import { IconCaretRightFill12 as CaretRight } from "@pond/icons/fill/12";
import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import { Button, type ButtonProps } from "../button";
import { Checkbox } from "../checkbox";
import { Switch } from "../switch";

import styles from "./styles.module.css";

function Root(props: Base.Root.Props) {
  return <Base.Root {...props} />;
}

type TriggerProps = Base.Trigger.Props &
  Pick<ButtonProps, "variant" | "size" | "icon">;

function Trigger({ className, variant, size, icon, ...props }: TriggerProps) {
  return (
    <Base.Trigger
      render={
        props.render ? (
          props.render
        ) : (
          <Button
            size={size}
            icon={icon}
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

function ItemKbd({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(styles["item-kbd"], className)} {...props} />;
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
          checked={state.checked}
          readOnly
          tabIndex={-1}
          aria-hidden
          {...renderProps}
        >
          <Checkbox.Indicator>
            <Check strokeWidth={2} />
          </Checkbox.Indicator>
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
      <CaretRight width={8} height={8} style={{ marginLeft: "auto" }} />
    </Base.SubmenuTrigger>
  );
}

function SecondaryLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn(styles["secondary-label"], className)} {...props} />
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
        // Stop printable keys bubbling so Base UI's menu typeahead doesn't eat them;
        // navigation keys still reach the menu.
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
  Arrow,
  Item,
  ItemIcon,
  ItemLabel,
  ItemKbd,
  Input,
  SecondaryLabel,
  Group,
  GroupLabel,
  Separator,
  RadioGroup,
  RadioItem,
  RadioItemIndicator,
  CheckboxItem,
  CheckboxItemIndicator,
  SwitchItemIndicator,
  SubmenuRoot,
  SubmenuTrigger,
};
