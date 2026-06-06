import { Button } from "@base-ui/react/button";
import { Collapsible } from "@base-ui/react/collapsible";
import { Link, type LinkProps } from "@tanstack/react-router";

import styles from "./styles.module.css";

interface ProviderProps extends React.ComponentPropsWithoutRef<"div"> {}

function Provider({ ...props }: ProviderProps) {
  return <div className={styles.provider} {...props} />;
}

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {}

function Root({ ...props }: RootProps) {
  return <div className={styles.root} {...props} />;
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

function Toolbar({ ...props }: ToolbarProps) {
  return <div className={styles.toolbar} {...props} />;
}

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {}

function Header({ ...props }: HeaderProps) {
  return <div className={styles.header} {...props} />;
}

interface ItemProps extends Button.Props {}

function Item({ ...props }: ItemProps) {
  return <Button className={styles.item} {...props} />;
}

interface AnchorProps extends LinkProps {}

function Anchor({ ...props }: AnchorProps) {
  return <Link className={styles.item} {...props} />;
}

interface IconProps extends React.ComponentPropsWithoutRef<"span"> {}

function Icon({ ...props }: IconProps) {
  return <span className={styles.icon} {...props} />;
}

interface GroupProps extends React.ComponentPropsWithoutRef<"div"> {}

function Group({ ...props }: GroupProps) {
  return <div className={styles.group} {...props} />;
}

interface CollapsibleGroupProps extends Collapsible.Root.Props {}

function CollapsibleGroup({ ...props }: CollapsibleGroupProps) {
  return (
    <Collapsible.Root defaultOpen={true} className={styles.group} {...props} />
  );
}

interface GroupHeaderProps extends Collapsible.Trigger.Props {}

function GroupHeader({ ...props }: GroupHeaderProps) {
  return <Collapsible.Trigger className={styles["group-header"]} {...props} />;
}

interface GroupContentProps extends Collapsible.Panel.Props {}

function GroupContent({ ...props }: GroupContentProps) {
  return <Collapsible.Panel className={styles["group-content"]} {...props} />;
}

interface FooterProps extends React.ComponentPropsWithoutRef<"div"> {}

function Footer({ ...props }: FooterProps) {
  return <div className={styles.footer} {...props} />;
}

export const Sidebar = {
  Provider,
  Root,
  Toolbar,
  Header,
  Item,
  Icon,
  Anchor,
  Group,
  CollapsibleGroup,
  GroupHeader,
  GroupContent,
  Footer,
};
