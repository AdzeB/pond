# Fetch Schedule Implementation Plan

**Goal:** Replace the frequency list with the selected compact editor and support local daily/weekly scheduling.
**Architecture:** Preserve enabled/intervalHours; add an optional calendar rule to sync.cron. A shared pure due-time function is used by the main scheduler. The renderer edits a draft and saves through the existing preference adapter.
**Tech Stack:** React, CSS modules, Zod, Vitest.

- [x] Add calendar schema with validated HH:mm and nonempty weekdays (0=Sunday).
- [x] Test the shared due-time calculation: disabled schedules, hourly intervals, daily boundaries, weekly days, duplicate prevention, and crossed deadlines.
- [x] Poll every minute; retain hourly pacing/jitter, check calendar rules without jitter, recheck preferences and guards before execution.
- [x] Replace frequency list with compact repeat/interval/time/weekdays form and Save Schedule.
- [x] Update row summaries and gallery title; verify with typecheck, offline checks and builds.
