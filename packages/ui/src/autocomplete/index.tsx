import { Autocomplete as Base } from "@base-ui/react/autocomplete";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

const Root = Base.Root;

function Value(props: Base.Value.Props) {
  return <Base.Value {...props} />;
}

function Trigger({ className, ...props }: Base.Trigger.Props) {
  return <Base.Trigger className={cn(styles.trigger, className)} {...props} />;
}

function Input({ className, ...props }: Base.Input.Props) {
  return <Base.Input className={cn(styles.input, className)} {...props} />;
}

function InputGroup({ className, ...props }: Base.InputGroup.Props) {
  return (
    <Base.InputGroup
      className={cn(styles["input-group"], className)}
      {...props}
    />
  );
}

function Icon({ className, ...props }: Base.Icon.Props) {
  return <Base.Icon className={cn(styles.icon, className)} {...props} />;
}

function Clear({ className, ...props }: Base.Clear.Props) {
  return <Base.Clear className={cn(styles.clear, className)} {...props} />;
}

function List({ className, ...props }: Base.List.Props) {
  return <Base.List className={cn(styles.list, className)} {...props} />;
}

function Status({ className, ...props }: Base.Status.Props) {
  return <Base.Status className={cn(styles.status, className)} {...props} />;
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
}

function Backdrop({ className, ...props }: Base.Backdrop.Props) {
  return (
    <Base.Backdrop className={cn(styles.backdrop, className)} {...props} />
  );
}

function Positioner({ className, ...props }: Base.Positioner.Props) {
  return (
    <Base.Positioner className={cn(styles.positioner, className)} {...props} />
  );
}

function Popup({ className, ...props }: Base.Popup.Props) {
  return <Base.Popup className={cn(styles.popup, className)} {...props} />;
}

function Arrow({ className, ...props }: Base.Arrow.Props) {
  return <Base.Arrow className={cn(styles.arrow, className)} {...props} />;
}

function Group({ className, ...props }: Base.Group.Props) {
  return <Base.Group className={cn(styles.group, className)} {...props} />;
}

function GroupLabel({ className, ...props }: Base.GroupLabel.Props) {
  return (
    <Base.GroupLabel
      className={cn(styles["group-label"], className)}
      {...props}
    />
  );
}

function Item({ className, ...props }: Base.Item.Props) {
  return <Base.Item className={cn(styles.item, className)} {...props} />;
}

function Row({ className, ...props }: Base.Row.Props) {
  return <Base.Row className={cn(styles.row, className)} {...props} />;
}

function Collection(props: Base.Collection.Props) {
  return <Base.Collection {...props} />;
}

function Empty({ className, ...props }: Base.Empty.Props) {
  return <Base.Empty className={cn(styles.empty, className)} {...props} />;
}

function Separator({ className, ...props }: Base.Separator.Props) {
  return (
    <Base.Separator className={cn(styles.separator, className)} {...props} />
  );
}

export const Autocomplete = {
  Root,
  Value,
  Trigger,
  Input,
  InputGroup,
  Icon,
  Clear,
  List,
  Status,
  Portal,
  Backdrop,
  Positioner,
  Popup,
  Arrow,
  Group,
  GroupLabel,
  Item,
  Row,
  Collection,
  Empty,
  Separator,
  useFilter: Base.useFilter,
  useFilteredItems: Base.useFilteredItems,
};
