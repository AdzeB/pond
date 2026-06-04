import { Button } from "@base-ui/react/button";
import { Collapsible } from "@base-ui/react/collapsible";
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

interface GroupProps extends Collapsible.Root.Props {}

function Group({ ...props }: GroupProps) {
  return <Collapsible.Root className={styles.group} {...props} />;
}

interface GroupHeaderProps extends Collapsible.Trigger.Props {}

function GroupHeader({ ...props }: GroupHeaderProps) {
  return <Collapsible.Trigger className={styles["group-header"]} {...props} />;
}

interface GroupContentProps extends Collapsible.Panel.Props {}

function GroupContent({ ...props }: GroupContentProps) {
  return <Collapsible.Panel className={styles["group-content"]} {...props} />;
}

export const Sidebar = {
  Provider,
  Root,
  Toolbar,
  Header,
  Item,
  Group,
  GroupHeader,
  GroupContent,
};
