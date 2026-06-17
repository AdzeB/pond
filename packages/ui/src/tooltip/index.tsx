import { Tooltip as Base } from "@base-ui/react/tooltip";
import { clsx } from "clsx";
import type { ReactElement, ReactNode } from "react";
import styles from "./styles.module.css";

function Root(props: Base.Root.Props) {
  return <Base.Root {...props} />;
}

function Provider(props: Base.Provider.Props) {
  return <Base.Provider {...props} />;
}

function Trigger(props: Base.Trigger.Props) {
  return (
    <Base.Trigger
      className={clsx(styles.trigger, props.className)}
      {...props}
    />
  );
}

function Portal(props: Base.Portal.Props) {
  return (
    <Base.Portal className={clsx(styles.portal, props.className)} {...props} />
  );
}

function Viewport(props: Base.Viewport.Props) {
  return (
    <Base.Viewport
      className={clsx(styles.viewport, props.className)}
      {...props}
    />
  );
}

function Positioner({
  className,
  sideOffset = 16,
  ...props
}: Base.Positioner.Props) {
  return (
    <Base.Positioner
      sideOffset={sideOffset}
      className={clsx(styles.positioner, className)}
      {...props}
    />
  );
}

function Popup({ className, ...props }: Base.Popup.Props) {
  return <Base.Popup {...props} className={clsx(styles.popup, className)} />;
}

function Arrow({ className, ...props }: Base.Arrow.Props) {
  return <Base.Arrow className={clsx(styles.arrow, className)} {...props} />;
}

interface TooltipProps {
  label: ReactNode;
  children: ReactElement;
  side?: Base.Positioner.Props["side"];
  align?: Base.Positioner.Props["align"];
  sideOffset?: number;
  delay?: number;
}

function TooltipWrapper({
  label,
  children,
  side,
  align,
  sideOffset,
  delay,
}: TooltipProps) {
  return (
    <Root>
      <Trigger delay={delay} render={children} />
      <Portal>
        <Positioner side={side} align={align} sideOffset={sideOffset}>
          <Popup>
            <Viewport>{label}</Viewport>
          </Popup>
        </Positioner>
      </Portal>
    </Root>
  );
}

export const Tooltip = Object.assign(TooltipWrapper, {
  Root,
  Provider,
  Trigger,
  Portal,
  Viewport,
  Positioner,
  Popup,
  Arrow,
  createHandle: Base.createHandle,
  Handle: Base.Handle,
});
