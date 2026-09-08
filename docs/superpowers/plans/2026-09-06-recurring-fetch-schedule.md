# Recurring Fetch Schedule Implementation Plan

**Goal:** Implement Starting [date] every [N] [unit] at [time] with weekly day selection, manual mode, and a next-fetch preview.

**Architecture:** Add an optional validated recurrence to the existing sync cron contract, retaining legacy fields. A shared pure next-occurrence function drives both due checks and preview. Calendar recurrence uses local time; months clamp to their final day. The main scheduler retains offline/storage gating and skips pre-launch deadlines.

**Tech Stack:** Zod, TypeScript, React, CSS modules, Vitest.

- [x] Extend packages/schema/src/prefs.ts with recurrence (startDate, every, unit, time, days). Validate real dates and integer interval 1–999.
- [x] Extend apps/desktop/src/shared/sync-schedule.ts with next-occurrence computation and tests for future starts, intervals, multiweek days, month ends, manual mode and once-only deadlines.
- [x] Update apps/desktop/src/main/crons.ts rule change tracking and exclude anchored recurrence from legacy random jitter.
- [x] Update the schedule editor and CSS: date/count/unit/time sentence, weekday choices, manual persistence, computed preview and honest pending/error feedback. Preserve old schedules on initial display.
- [x] Update UI tests for recurrence payloads and invalid/weekly/manual states.
- [x] Run focused Vitest, type checks, pnpm check, pnpm build and gallery build; inspect the isolated preview.

Proceed inline under the user's implementation authorization. No merge or push is part of this task.

Verification limitation: all automated checks passed; the final visual preview remains unverified while the Mac is locked.
