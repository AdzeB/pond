import { Toast as Base } from "@base-ui/react/toast";
import { cn } from "../lib/cn";
import styles from "./styles.module.css";

function Provider(props: Base.Provider.Props) {
  return <Base.Provider {...props} />;
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
}

function Viewport({ className, ...props }: Base.Viewport.Props) {
  return (
    <Base.Viewport className={cn(styles.viewport, className)} {...props} />
  );
}

function Positioner(props: Base.Positioner.Props) {
  return <Base.Positioner {...props} />;
}

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.popup, className)} {...props} />;
}

function Content({ className, ...props }: Base.Content.Props) {
  return <Base.Content className={cn(styles.content, className)} {...props} />;
}

function Title({ className, ...props }: Base.Title.Props) {
  return <Base.Title className={cn(styles.title, className)} {...props} />;
}

function Description({ className, ...props }: Base.Description.Props) {
  return (
    <Base.Description
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function Action(props: Base.Action.Props) {
  return <Base.Action {...props} />;
}

function Close({ className, ...props }: Base.Close.Props) {
  return <Base.Close className={cn(styles.close, className)} {...props} />;
}

function Arrow(props: Base.Arrow.Props) {
  return <Base.Arrow {...props} />;
}

export const useToast = Base.useToastManager;

export const Toast = {
  Provider,
  Portal,
  Viewport,
  Positioner,
  Root,
  Content,
  Title,
  Description,
  Action,
  Close,
  Arrow,
  useToast,
  createToastManager: Base.createToastManager,
};
