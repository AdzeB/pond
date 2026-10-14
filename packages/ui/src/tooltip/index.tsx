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

function Trigger<Payload>(props: Base.Trigger.Props<Payload>) {
  return <Base.Trigger {...props} />;
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
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
  sideOffset = 8,
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

function Arrow(props: Base.Arrow.Props) {
  return <Base.Arrow {...props} />;
}

interface TooltipProps {
  label: ReactNode;
  shortcut?: ReactNode;
  children: ReactElement;
  side?: Base.Positioner.Props["side"];
  align?: Base.Positioner.Props["align"];
  sideOffset?: number;
  delay?: number;
  trackCursorAxis?: Base.Root.Props["trackCursorAxis"];
}

function tooltipContent(label: ReactNode, shortcut?: ReactNode): ReactNode {
  if (shortcut == null) return label;
  return (
    <span className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.shortcut}>{shortcut}</span>
    </span>
  );
}

function TooltipWrapper({
  label,
  shortcut,
  children,
  side,
  align,
  sideOffset,
  delay,
  trackCursorAxis,
}: TooltipProps) {
  return (
    <Root trackCursorAxis={trackCursorAxis}>
      <Trigger delay={delay} render={children} />
      <Portal>
        <Positioner side={side} align={align} sideOffset={sideOffset}>
          <Popup>
            <span className={styles.body}>
              {tooltipContent(label, shortcut)}
            </span>
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
  Label: tooltipContent,
});
