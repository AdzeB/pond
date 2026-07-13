import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

interface PageProps extends React.ComponentPropsWithoutRef<"div"> {
  width?: "narrow" | "medium" | "wide";
  inset?: number;
}

function Page({ className, width, inset, style, ...props }: PageProps) {
  return (
    <div
      className={cn(styles.page, className)}
      data-width={width}
      data-inset={inset}
      style={
        {
          ...style,
          ...(inset ? { "--settings-padding-inline-inset": `${inset}px` } : {}),
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

interface HeaderProps extends React.ComponentPropsWithoutRef<"header"> {}

function Header({ className, ...props }: HeaderProps) {
  return <header className={cn(styles.header, className)} {...props} />;
}

interface HeaderTextProps extends React.ComponentPropsWithoutRef<"div"> {}

function HeaderText({ className, ...props }: HeaderTextProps) {
  return <div className={cn(styles["header-text"], className)} {...props} />;
}

interface TitleProps extends React.ComponentPropsWithoutRef<"h1"> {}

function Title({ className, ...props }: TitleProps) {
  return <h1 className={cn(styles.title, className)} {...props} />;
}

interface DescriptionProps extends React.ComponentPropsWithoutRef<"p"> {}

function Description({ className, ...props }: DescriptionProps) {
  return <p className={cn(styles.description, className)} {...props} />;
}

interface ColumnsProps extends React.ComponentPropsWithoutRef<"div"> {}

function Columns({ className, ...props }: ColumnsProps) {
  return <div className={cn(styles.columns, className)} {...props} />;
}

interface SectionProps extends React.ComponentPropsWithoutRef<"div"> {
  span?: "full";
}

function Section({ className, span, ...props }: SectionProps) {
  return (
    <div
      className={cn(styles.section, className)}
      data-span={span}
      {...props}
    />
  );
}

interface SectionTitleProps extends React.ComponentPropsWithoutRef<"h2"> {}

function SectionTitle({ className, ...props }: SectionTitleProps) {
  return <h2 className={cn(styles["section-title"], className)} {...props} />;
}

interface ListProps extends React.ComponentPropsWithoutRef<"div"> {}

function List({ className, ...props }: ListProps) {
  return <div className={cn(styles.list, className)} {...props} />;
}

interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {}

function Item({ className, ...props }: ItemProps) {
  return <div className={cn(styles.item, className)} {...props} />;
}

interface ItemDetailsProps extends React.ComponentPropsWithoutRef<"div"> {}

function ItemDetails({ className, ...props }: ItemDetailsProps) {
  return <div className={cn(styles.details, className)} {...props} />;
}

interface ItemTitleProps extends React.ComponentPropsWithoutRef<"h3"> {}

function ItemTitle({ className, ...props }: ItemTitleProps) {
  return <h3 className={cn(styles["item-title"], className)} {...props} />;
}

interface ItemDescriptionProps extends React.ComponentPropsWithoutRef<"p"> {}

function ItemDescription({ className, ...props }: ItemDescriptionProps) {
  return <p className={cn(styles["item-description"], className)} {...props} />;
}

interface ItemControlProps extends React.ComponentPropsWithoutRef<"div"> {}

function ItemControl({ className, ...props }: ItemControlProps) {
  return <div className={cn(styles.control, className)} {...props} />;
}

interface EmptyProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

/** Shared empty-state row styled to match a single list card. */
function Empty({
  title,
  description,
  action,
  className,
  ...props
}: EmptyProps) {
  return (
    <div className={cn(styles.empty, className)} {...props}>
      <div className={styles.details}>
        <h3 className={styles["item-title"]}>{title}</h3>
        {description ? (
          <p className={styles["item-description"]}>{description}</p>
        ) : null}
      </div>
      {action ? <div className={styles.control}>{action}</div> : null}
    </div>
  );
}

export const Settings = {
  Page: Page,
  Header: Header,
  HeaderText: HeaderText,
  Title: Title,
  Description: Description,
  Columns: Columns,
  Section: Section,
  SectionTitle: SectionTitle,
  List: List,
  Item: Item,
  ItemDetails: ItemDetails,
  ItemTitle: ItemTitle,
  ItemDescription: ItemDescription,
  ItemControl: ItemControl,
  Empty: Empty,
};
