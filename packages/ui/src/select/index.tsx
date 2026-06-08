import { Select as Base } from "@base-ui/react/select";
import { IconChevronExpandYOutline12 as Expand } from "@pond/icons/outline/12";
import { IconCheckOutline18 as Check } from "@pond/icons/outline/18";
import { cn } from "../_shared/cn";
import popupStyles from "../_shared/popup.module.css";
import styles from "./styles.module.css";

function Root<Value, Multiple extends boolean | undefined = false>(
  props: Base.Root.Props<Value, Multiple>,
) {
  return <Base.Root {...props} />;
}

function Label({ className, ...props }: Base.Label.Props) {
  return <Base.Label className={cn(styles.label, className)} {...props} />;
}

function Trigger({ className, ...props }: Base.Trigger.Props) {
  return (
    <Base.Trigger className={cn(styles.trigger, className)} {...props}>
      {props.children}
      <Icon>
        <Expand size={10} />
      </Icon>
    </Base.Trigger>
  );
}

function Value({ className, ...props }: Base.Value.Props) {
  return <Base.Value className={cn(styles.value, className)} {...props} />;
}

function Icon({ className, ...props }: Base.Icon.Props) {
  return <Base.Icon className={cn(styles.icon, className)} {...props} />;
}

function Backdrop({ className, ...props }: Base.Backdrop.Props) {
  return (
    <Base.Backdrop className={cn(styles.backdrop, className)} {...props} />
  );
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
}

function Positioner({ className, ...props }: Base.Positioner.Props) {
  return (
    <Base.Positioner
      sideOffset={6}
      align="end"
      side="bottom"
      className={cn(popupStyles.positioner, className)}
      {...props}
    />
  );
}

function Popup({ className, ...props }: Base.Popup.Props) {
  return (
    <Base.Popup
      {...props}
      data-type="select"
      className={cn(popupStyles.popup, className)}
    />
  );
}

function List({ className, ...props }: Base.List.Props) {
  return <Base.List className={cn(styles.list, className)} {...props} />;
}

function Arrow({ className, ...props }: Base.Arrow.Props) {
  return <Base.Arrow className={cn(popupStyles.arrow, className)} {...props} />;
}

function Item({ className, ...props }: Base.Item.Props) {
  return <Base.Item className={cn(popupStyles.item, className)} {...props} />;
}

function ItemText({ className, ...props }: Base.ItemText.Props) {
  return (
    <Base.ItemText
      className={cn(popupStyles["item-label"], className)}
      {...props}
    />
  );
}

function ItemIndicator({ className, ...props }: Base.ItemIndicator.Props) {
  return (
    <Base.ItemIndicator
      className={cn(popupStyles.indicator, className)}
      {...props}
    >
      <Check width={14} height={14} />
    </Base.ItemIndicator>
  );
}

function Group(props: Base.Group.Props) {
  return <Base.Group {...props} />;
}

function GroupLabel({ className, ...props }: Base.GroupLabel.Props) {
  return (
    <Base.GroupLabel
      className={cn(
        popupStyles["group-label"],
        popupStyles["group-label-sticky"],
        className,
      )}
      {...props}
    />
  );
}

function Separator({ className, ...props }: Base.Separator.Props) {
  return (
    <Base.Separator
      className={cn(popupStyles.separator, className)}
      {...props}
    />
  );
}

export const Select = {
  Root,
  Label,
  Trigger,
  Value,
  Icon,
  Backdrop,
  Portal,
  Positioner,
  Popup,
  List,
  Arrow,
  Item,
  ItemText,
  ItemIndicator,
  Group,
  GroupLabel,
  Separator,
};
