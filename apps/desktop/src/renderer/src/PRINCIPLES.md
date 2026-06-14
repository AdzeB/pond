# Design principles

pond borrows its sensibility from Family's three values — **simplicity**, **fluidity**,
and **delight** — and translates them from an iOS wallet into a macOS/Electron desktop
app. Simplicity keeps pond accessible, fluidity keeps it oriented, and delight makes it
feel cared for. Together they are how we respect the user's time, intelligence, and
emotional experience.

This is shared vocabulary, not a rulebook to follow blindly. When in doubt, optimise for
the feeling described here.

## The three principles

### Simplicity — gradual revelation

Show the fundamentals; reveal everything else as it becomes relevant. Complexity stays
out of sight and out of mind until the user reaches for it. Think of walking through a
doorway: you glimpse a room from afar, and it resolves into detail as you enter.

On the desktop this lives in our overlays. Base UI `Menu`, `ContextMenu`, `Popover`,
`Drawer`, and `Dialog` are pond's "trays" — each surfaces a single focused action or
piece of content, layered on top of the current context rather than navigating away from
it.

### Fluidity — seamless transitions

Treat the app as one continuous space with consistent physical rules. Every motion should
help the user understand their path from A to B. We fly instead of teleport: a transition
should clarify what changed and where things went, never just decorate.

### Delight — selective emphasis

Delight is deliberate, not sprinkled everywhere. It earns its place by surprise and
novelty, which is why it belongs most in the corners of the app, not the highways. The
goal is to make pond feel human and considered, and to reward the user's investment.

## iOS to desktop translation

| Family (iOS) | pond (desktop) |
| --- | --- |
| Dynamic tray system | Base UI `Menu` / `Popover` / `Drawer` / `Dialog` overlays |
| Tray emerges from a button, preserving context | Popovers/menus anchored to their trigger; detail opens as an overlay, not a route swap |
| Tray title + back/close icon | Overlay header (title + close), submenu back navigation |
| Each tray = one action or one piece of content | One focused job per overlay/section |
| Tray theme adapts to context (dark flow -> dark tray) | Overlays inherit the active theme tokens |
| Directional tab motion (tap left -> slides left) | Directional route/media transitions in the same direction as the action |
| Continue -> Confirm text morph (shared letters) | Morphing labels/counts (`AppliedBadge`, position counter) rather than hard swaps |
| Wallet cards travel between screens | `save-card` -> detail modal continuity; persistent header/footer/side panel across saves |
| Confetti after wallet backup | One-time celebratory flourish on rare success (completed backfill) |
| Skeuomorphic trash | Cards tumble toward the trash action on delete |
| Animated arrow in empty browser state | Guiding affordance in the library empty state |

## The Delight-Impact Curve

Potential for delight **increases** as feature-usage frequency **decreases**. The
specialness of a moment fades with repetition.

- **Rare + significant** (creating a pond, a successful backup/export, empty states,
  first-run moments): high-intensity, memorable moments are worth it.
- **Frequent** (hover, selection, typing, opening saves): restrained polish only. Doing
  too much here turns delight into friction.

When deciding how much delight to add, ask how often the user will see it. The less often,
the more you can afford.

## Do / don't

- **Do** reveal depth progressively — submenus, side panels, overlays — instead of showing
  everything at once.
- **Do** make transitions directional and purposeful: motion should explain the change.
- **Do** keep persistent elements consistent. If a component occupies a space and will
  persist into the next phase, it must not duplicate, remount, or re-animate. Only the
  content that actually changed should transition.
- **Do** vary an overlay's height/shape between steps so progression is unmistakable.
- **Do** pull from the shared motion vocabulary — `--ds-duration-*` / `--ds-easing-*`
  tokens and the presets in [`lib/motion.ts`](./lib/motion.ts) — rather than one-off
  values.
- **Do** respect reduced motion. The global `MotionConfig reducedMotion="user"` in
  [`App.tsx`](./App.tsx) and the `data-reduce-motion` CSS overrides in
  [`styles.css`](./styles.css) must cover every new animation. Nothing may depend on
  motion to be legible.
- **Don't** add motion for its own sake, or animate a component that's already on screen
  and staying put.
- **Don't** use full-screen/route swaps for transient actions that belong in an overlay.
- **Don't** spend high-intensity delight on high-frequency interactions.
