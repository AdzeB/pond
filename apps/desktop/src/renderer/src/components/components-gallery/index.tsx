import { IconChevronLeftOutline12 as ChevronLeft } from "@pond/icons/outline/12";
import { Shell } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SECTIONS } from "./demos";
import styles from "./styles.module.css";

export function ComponentsGallery() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(SECTIONS[0]?.id ?? "");

  useEffect(() => {
    const content = contentRef.current;
    const root = content?.parentElement;
    if (!content || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { root, rootMargin: "0px 0px -65% 0px", threshold: 0 },
    );

    for (const section of SECTIONS) {
      const el = content.querySelector(`#${section.id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Shell.Body style={{ height: "100dvh" }}>
      <Shell.Aside className={styles.aside}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.back}>
            <ChevronLeft />
            Back to Library
          </Link>
          <span className={styles.navTitle}>Components</span>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={styles.navLink}
              data-active={active === section.id}
              onClick={() => scrollTo(section.id)}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </Shell.Aside>

      <Shell.Main>
        <div ref={contentRef} className={styles.content}>
          <header className={styles.intro}>
            <h1 className={styles.title}>Pond UI</h1>
            <p className={styles.subtitle}>
              A living gallery of every component in the <code>@pond/ui</code>{" "}
              package.
            </p>
            <span className={styles.count}>{SECTIONS.length} components</span>
          </header>

          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={styles.section}
            >
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <p className={styles.sectionDescription}>
                  {section.description}
                </p>
              </div>
              <div className={styles.stage}>{section.render()}</div>
            </section>
          ))}
        </div>
      </Shell.Main>
    </Shell.Body>
  );
}
