import styles from "./styles.module.css";

interface BodyProps extends React.ComponentPropsWithoutRef<"body"> {}

function Body({ ...props }: BodyProps) {
  return <body className={styles.root} {...props} />;
}

interface MainProps extends React.ComponentPropsWithoutRef<"main"> {}

function Main({ ...props }: MainProps) {
  return <main className={styles.main} {...props} />;
}

interface HeaderProps extends React.ComponentPropsWithoutRef<"header"> {}

function Header({ ...props }: HeaderProps) {
  return <header className={styles.header} {...props} />;
}

interface AsideProps extends React.ComponentPropsWithoutRef<"aside"> {}

function Aside({ ...props }: AsideProps) {
  return <aside className={styles.aside} {...props} />;
}

interface DragProps extends React.ComponentPropsWithoutRef<"div"> {}

function Drag({ ...props }: DragProps) {
  return <div className={styles.drag} {...props} />;
}

export const Shell = {
  Body,
  Main,
  Header,
  Aside,
  Drag,
};
