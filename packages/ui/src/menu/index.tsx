import { Input as BaseInput } from "@base-ui/react/input";
import { Menu as Base } from "@base-ui/react/menu";
import { IconCaretRightFill12 as CaretRight } from "@pond/icons/fill/12";
import { IconCheckOutline12 as Check } from "@pond/icons/outline/12";
import { cn } from "../_shared/cn";
import popupStyles from "../_shared/popup.module.css";
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

function Portal({ className, ...props }: Base.Portal.Props) {
  return <Base.Portal className={cn(styles.portal, className)} {...props} />;
}

function Positioner({
  className,
  sideOffset = 6,
  ...props
}: Base.Positioner.Props) {
  return (
    <Base.Positioner
      sideOffset={sideOffset}
      className={cn(styles.positioner, className)}
      {...props}
    />
  );
}

function Popup({ className, ...props }: Base.Popup.Props) {
  return <Base.Popup {...props} className={cn(popupStyles.popup, className)} />;
}

function Arrow({ className, ...props }: Base.Arrow.Props) {
  return <Base.Arrow className={cn(popupStyles.arrow, className)} {...props} />;
}

interface ItemProps extends React.ComponentProps<"div"> {
  stale?: boolean;
}

function Item({ className, stale = false, ...props }: ItemProps) {
  return (
    <Base.Item
      data-stale={stale}
      className={cn(popupStyles.item, className)}
      {...props}
    />
  );
}

function ItemIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(popupStyles["item-icon"], className)}
      {...props}
    />
  );
}

function ItemLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn(popupStyles["item-label"], className)} {...props} />
  );
}

function ItemKbd({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(popupStyles["item-kbd"], className)} {...props} />;
}

function Group(props: Base.Group.Props) {
  return <Base.Group {...props} />;
}

function GroupLabel({ className, ...props }: Base.GroupLabel.Props) {
  return (
    <Base.GroupLabel
      className={cn(popupStyles["group-label"], className)}
      {...props}
    />
  );
}

function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn(popupStyles.separator, className)} {...props} />;
}

function RadioGroup(props: Base.RadioGroup.Props) {
  return <Base.RadioGroup {...props} />;
}

function RadioItem({ className, ...props }: Base.RadioItem.Props) {
  return (
    <Base.RadioItem className={cn(popupStyles.item, className)} {...props} />
  );
}

function RadioItemIndicator({
  className,
  ...props
}: Base.RadioItemIndicator.Props) {
  return (
    <Base.RadioItemIndicator
      className={cn(popupStyles.indicator, className)}
      {...props}
    />
  );
}

function CheckboxItem({ className, ...props }: Base.CheckboxItem.Props) {
  return (
    <Base.CheckboxItem className={cn(popupStyles.item, className)} {...props} />
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
      className={cn(className)}
      render={(renderProps, state) => (
        <span {...renderProps}>
          <Switch.Root
            checked={state.checked}
            readOnly
            tabIndex={-1}
            aria-hidden
            render={<span />}
          />
        </span>
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
      className={cn(className)}
      render={(renderProps, state) => (
        <span {...renderProps}>
          <Checkbox.Root
            checked={state.checked}
            readOnly
            tabIndex={-1}
            aria-hidden
          >
            <Checkbox.Indicator>
              <Check width={12} height={12} />
            </Checkbox.Indicator>
          </Checkbox.Root>
        </span>
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
    <Base.SubmenuTrigger className={cn(popupStyles.item, className)} {...props}>
      {props.children}
      <CaretRight width={8} height={8} style={{ marginLeft: "auto" }} />
    </Base.SubmenuTrigger>
  );
}

function SecondaryLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(popupStyles["secondary-label"], className)}
      {...props}
    />
  );
}

function Input({ className, ...props }: BaseInput.Props) {
  return (
    <BaseInput
      type="search"
      spellCheck={false}
      className={cn(styles.input, className)}
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
