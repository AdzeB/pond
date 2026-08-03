import styles from "./styles.module.css";

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}

export function Section({ title, ...props }: SectionProps) {
  return (
    <section className={styles.section} {...props}>
      <h3 className={styles.title}>{title}</h3>
      {props.children}
    </section>
  );
}
