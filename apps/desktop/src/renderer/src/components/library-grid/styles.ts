import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  empty: {
    maxWidth: 420,
    paddingBlock: 60,
    paddingInline: 0,
    marginBlock: 0,
    marginInline: "auto",
    fontSize: 13,
    lineHeight: 1.6,
    color: "var(--ds-gray-11)",
    textAlign: "center",
  },
  grid: {
    padding: 0,
    margin: 0,
    contain: "layout",
    listStyle: "none",
    position: "relative",
  },
});
