# Built desktop gallery performance

Measured 8 September 2026 on Apple M4 Max, 48 GiB RAM, Electron 42.4.0. Real built main/preload/renderer ran in isolated POND_SANDBOX directories. No user library, native HTTP socket, or global shortcut registration was used.

| Items | Gallery startup | Folder p95 | Keyword p95 | Folder + keyword p95 |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 764 ms | 9.5 ms | 19.5 ms | 12.4 ms |
| 10,000 | 791 ms | 47.9 ms | 32.9 ms | 26.6 ms |
| 100,000 | 1095 ms | 105.7 ms | 156.0 ms | 162.6 ms |

Startup means mounted gallery cards plus one decoded card image, polled every 20 ms. Each first-page sample includes saves.queryPage and saves.getMany hydration. Every query asserted the expected total and row count; first pages contained at most 250 Saves. Screenshots visually confirmed mixed gallery content.

## Renderer follow-up

After adding renderer instrumentation to the reusable harness, a 1,000-item run measured 174.7 ms from Electron text insertion through the 100 ms search debounce and two animation frames after matching cards mounted. Programmatic gallery scrolling covered 7,311 px over 3,008 ms: 354 of 356 frames, or 99.44%, completed within 16.67 ms. Frame p95 was 9.3 ms and the slowest frame was 25.1 ms.

This follow-up validates the measurement path and covers one unsigned development run on the same 48 GiB M4 Max. It does not satisfy the 10k/100k, signed-package, 16 GiB release targets or measure human input latency.

## Limits

- Unsigned development build, not packaged signed distribution.
- 48 GiB Apple M4 Max host, not the proposed 16 GiB baseline.
- One launch sample per scale; startup clock begins at harness main entry, excludes OS process creation.
- Fresh Chromium profile and populated SQLite index; OS filesystem caches were not evicted.
- Repeated actual PNG/GIF/MP4/note fixtures via hardlinks; not heterogeneous production media.
- The initial three-scale query measurements include renderer IPC request, SQL first-page/count and getMany row hydration, but no search debounce or post-search paint.
- The renderer follow-up covers one 1,000-item run and uses programmatic scrolling.
- 20 samples per query operation after one priming request, uncontrolled other host workload.

## Runtime findings

- Sidebar totals use loaded pool (250 All and 13 folder members at every scale).
- Note cards repeatedly call saves.ensureTextCover without required force; Zod rejects the request.
- Tags registry is empty despite manual imports receiving qa tags; reported for manual import synchronization.

## Evidence

- [All measurements](./2026-09-08-gallery-performance.json)
- [Harness](/tmp/pond-gallery-perf.cjs)
- [Fixture generator](/tmp/pond-gallery-seed.cjs)
- [1000-item screenshot](/tmp/pond-gallery-perf-1000-SvwdmE/gallery.png)
- [10000-item screenshot](/tmp/pond-gallery-perf-10000-HPPYRv/gallery.png)
- [100000-item screenshot](/tmp/pond-gallery-perf-100000-8y0vMe/gallery.png)

The three runtime findings were subsequently fixed in the working tree. The timing samples above predate those fixes and are retained as the initial measured baseline.
