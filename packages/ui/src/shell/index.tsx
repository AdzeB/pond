import { clsx as cn } from "clsx";
import { useEffect, useState } from "react";
import styles from "./styles.module.css";

interface BodyProps extends React.ComponentPropsWithoutRef<"div"> {}

function Body({ className, ...props }: BodyProps) {
  return <div className={cn(styles.body, className)} {...props} />;
}

interface MainProps extends React.ComponentPropsWithRef<"main"> {}

function Main({ className, ...props }: MainProps) {
  return (
    <main
      className={cn(styles.main, className)}
      {...props}
      data-scroll-viewport=""
    />
  );
}

interface HeaderProps extends React.ComponentPropsWithoutRef<"header"> {}

function Header({ className, ...props }: HeaderProps) {
  return <header className={cn(styles.header, className)} {...props} />;
}

interface AsideProps extends React.ComponentPropsWithoutRef<"aside"> {}

function Aside({ className, ...props }: AsideProps) {
  return <aside className={cn(styles.aside, className)} {...props} />;
}

interface DragProps extends React.ComponentPropsWithoutRef<"div"> {}

function Drag({ ...props }: DragProps) {
  return <div className={styles.drag} {...props} />;
}

interface EmptyProps extends React.ComponentPropsWithoutRef<"p"> {}

function Empty({ className, ...props }: EmptyProps) {
  return <p className={cn(styles.empty, className)} {...props} />;
}

interface MaskProps extends React.ComponentPropsWithoutRef<"div"> {}

function Mask({ ...props }: MaskProps) {
  const [top, setTop] = useState(false);
  const [bottom, setBottom] = useState(false);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      setTop(window.scrollY > 0);
      setBottom(
        window.innerHeight - window.scrollY - document.body.offsetHeight > 0,
      );
    });
  }, []);

  return (
    <div
      data-top={top}
      data-bottom={bottom}
      className={styles.mask}
      {...props}
    />
  );
}

export const Shell = {
  Body,
  Main,
  Header,
  Aside,
  Mask,
  Drag,
  Empty,
};
