import { clsx as cn } from "clsx";
import { forwardRef } from "react";
import styles from "./styles.module.css";

interface PageProps extends React.ComponentPropsWithoutRef<"div"> {
  inset?: number;
}

interface PageStyle extends React.CSSProperties {
  "--settings-padding-inline-inset"?: string;
}

function Page({ className, inset, style, ...props }: PageProps) {
  const pageStyle: PageStyle = { ...style };
  if (inset) pageStyle["--settings-padding-inline-inset"] = `${inset}px`;
  return (
    <div
      className={cn(styles.page, className)}
      data-inset={inset}
      style={pageStyle}
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

interface SectionDetailsProps extends React.ComponentPropsWithoutRef<"div"> {}

function SectionDetails({ className, ...props }: SectionDetailsProps) {
  return (
    <div className={cn(styles["section-details"], className)} {...props} />
  );
}

interface SectionTitleProps extends React.ComponentPropsWithoutRef<"h2"> {}

function SectionTitle({ className, ...props }: SectionTitleProps) {
  return <h2 className={cn(styles["section-title"], className)} {...props} />;
}

interface SectionActionProps extends React.ComponentPropsWithoutRef<"div"> {}

function SectionAction({ className, ...props }: SectionActionProps) {
  return <div className={cn(styles["section-action"], className)} {...props} />;
}

interface SectionDescriptionProps extends React.ComponentPropsWithoutRef<"p"> {}

function SectionDescription({ className, ...props }: SectionDescriptionProps) {
  return (
    <p className={cn(styles["section-description"], className)} {...props} />
  );
}

interface ListProps extends React.ComponentPropsWithoutRef<"div"> {}

const List = forwardRef<HTMLDivElement, ListProps>(function List(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn(styles.list, className)} {...props} />;
});

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

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn(styles.card, className)} {...props} />;
});

interface CardTitleProps extends React.ComponentPropsWithoutRef<"h3"> {}

function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn(styles["card-title"], className)} {...props} />;
}

interface CardDescriptionProps extends React.ComponentPropsWithoutRef<"p"> {}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={cn(styles["card-description"], className)} {...props} />;
}

interface CardActionProps extends React.ComponentPropsWithoutRef<"div"> {}

function CardAction({ className, ...props }: CardActionProps) {
  return <div className={cn(styles["card-action"], className)} {...props} />;
}

interface CardContentProps extends React.ComponentPropsWithoutRef<"div"> {}

function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn(styles["card-content"], className)} {...props} />;
}

interface CardFooterProps extends React.ComponentPropsWithoutRef<"div"> {}

function CardFooter({ className, ...props }: CardFooterProps) {
  return <div className={cn(styles["card-footer"], className)} {...props} />;
}

export const Settings = {
  Page: Page,
  Header: Header,
  HeaderText: HeaderText,
  Title: Title,
  Description: Description,
  Columns: Columns,
  Section: Section,
  SectionDetails: SectionDetails,
  SectionTitle: SectionTitle,
  SectionDescription: SectionDescription,
  SectionAction: SectionAction,
  List: List,
  Item: Item,
  ItemDetails: ItemDetails,
  ItemTitle: ItemTitle,
  ItemDescription: ItemDescription,
  ItemControl: ItemControl,
  Card: Card,
  CardTitle: CardTitle,
  CardDescription: CardDescription,
  CardAction: CardAction,
  CardContent: CardContent,
  CardFooter: CardFooter,
};
