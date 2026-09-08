# Inline Fetch Schedule Implementation Plan

> **For agentic workers:** Use the repository's executing-plans workflow to implement this plan task by task.

**Goal:** Present the global fetch schedule as an editable sentence matching the user's Linear Loops reference.

**Architecture:** Keep ScheduleEditor as the shared editor used by Settings and a browser preview. Preserve the preference contract and current repeat modes unless the user selects start dates and repeat intervals; then extend the shared schema and due-date calculation with backward-compatible optional fields.

**Tech Stack:** React, Pond UI, CSS modules, Zod, Vitest.

## Tasks

- [x] Restyle `features/settings/components/sections/schedule/schedule.tsx` and `schedule.module.css` as a bordered card with compact Schedule/Manual control and inline repeat/time fields. Preserve accessible labels and keyboard input. Weekly day selection remains inline and wraps on narrow screens.
- [x] Resolve requested behavior: if start dates and every-N calendar intervals are wanted, extend `packages/schema/src/prefs.ts`, `src/shared/sync-schedule.ts`, and cron change detection; add tests for future start dates, repeating days/weeks, and old preferences.
- [x] Update `schedule.test.tsx` to cover preserving existing schedules, saving drafts, invalid input, and manual mode.
- [x] Add a schedule preview using the production editor to the existing source-dialog gallery entry, with isolated fixture preferences.
- [x] Verify the rendered result, run schedule tests and typechecking, and build the gallery. Run repository checks and production build for changes to scheduling behavior.

Decision: keep the existing scheduling options. The user delegated this choice; future start dates and new recurrence rules are outside this UI change. Schedule tests (3), renderer typecheck, browser preview, and gallery build verify the implementation.
