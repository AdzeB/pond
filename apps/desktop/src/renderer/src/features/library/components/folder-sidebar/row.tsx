import { Sidebar } from "@pond/ui";
import { formatCount } from "./counts";

export function Row({
  label,
  active,
  icon,
  count,
  depth = 0,
  className,
  draggable,
  onClick,
  onDoubleClick,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  count?: number;
  depth?: number;
  className?: string;
  draggable?: boolean;
  onClick: () => void;
  onDoubleClick?: React.MouseEventHandler<HTMLElement>;
  onDrop?: React.DragEventHandler<HTMLElement>;
  onDragOver?: React.DragEventHandler<HTMLElement>;
  onDragLeave?: React.DragEventHandler<HTMLElement>;
  onDragStart?: React.DragEventHandler<HTMLElement>;
  onDragEnd?: React.DragEventHandler<HTMLElement>;
}) {
  return (
    <Sidebar.Item
      className={className}
      data-status={active ? "active" : undefined}
      data-depth={depth || undefined}
      draggable={draggable}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {icon ? <Sidebar.Icon>{icon}</Sidebar.Icon> : null}
      {label}
      {count != null ? (
        <Sidebar.Count>{formatCount(count)}</Sidebar.Count>
      ) : null}
    </Sidebar.Item>
  );
}
