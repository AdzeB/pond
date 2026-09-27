import { MotionConfig } from "motion/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ProcessingStatusCard } from "./";

it("shows the processing summary counts without treating tasks as distinct items", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(
        <MotionConfig reducedMotion="always">
          <ProcessingStatusCard
            enabled
            status={{
              inflight: 2,
              activeKeys: new Set(["caption:save-1", "ocr:save-1"]),
              failedKeys: new Set(["sensitive-content:save-2"]),
            }}
            onCheck={async () => {}}
          />
        </MotionConfig>,
      );
    });
    expect(host.textContent).toContain("Processing your library");
    expect(host.textContent).toContain("Tasks Running2");
    expect(host.textContent).toContain("Need Retry1");
    expect(host.textContent).not.toContain("Processing 2 items");
    const check = host.querySelector<HTMLButtonElement>("button");
    expect(check?.disabled).toBe(true);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("prevents duplicate checks and recovers when starting a check fails", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let calls = 0;
  let failCheck: (reason: Error) => void = () => {};
  const pending = new Promise<void>((_resolve, reject) => {
    failCheck = reject;
  });
  try {
    await act(async () => {
      root.render(
        <ProcessingStatusCard
          enabled
          status={{ inflight: 0, activeKeys: new Set(), failedKeys: new Set() }}
          onCheck={() => {
            calls += 1;
            return calls === 1 ? pending : Promise.resolve();
          }}
        />,
      );
    });
    const check = host.querySelector<HTMLButtonElement>("button");
    await act(async () => check?.click());
    expect(host.textContent).toContain("Checking your library");
    expect(check?.disabled).toBe(true);
    await act(async () => check?.click());
    expect(calls).toBe(1);
    await act(async () => failCheck(new Error("Unavailable")));
    expect(host.textContent).toContain("Couldn't check your library");
    expect(check?.disabled).toBe(false);
    await act(async () => check?.click());
    expect(calls).toBe(2);
    expect(host.textContent).toContain("Ready for new items");
    expect(host.textContent).not.toContain("up to date");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("keeps the check unavailable until preferences load and processing is enabled", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    for (const loaded of [false, true]) {
      await act(async () => {
        root.render(
          <ProcessingStatusCard
            enabled={false}
            loaded={loaded}
            status={{
              inflight: 0,
              activeKeys: new Set(),
              failedKeys: new Set(),
            }}
            onCheck={async () => {}}
          />,
        );
      });
      expect(host.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
        true,
      );
      expect(host.textContent).toContain(
        loaded ? "Local processing is off" : "Loading processing settings",
      );
    }
  } finally {
    await act(async () => root.unmount());
  }
});
