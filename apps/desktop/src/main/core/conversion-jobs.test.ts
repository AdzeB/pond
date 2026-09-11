import { expect, it } from "vitest";
import { ConversionPresetSchema } from "../../shared/conversion-contracts";
import { createConversionJobs } from "./conversion-jobs";

const preset = ConversionPresetSchema.parse({
  id: "web",
  name: "Web",
  format: "webp",
});
it("cancels a running conversion and never starts the remaining selection", async () => {
  const began = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  const resolved: string[] = [];
  const jobs = createConversionJobs({
    scope: () => "fixture",
    async resolve(id) {
      resolved.push(id);
      return id;
    },
    async convert({ signal }) {
      began.resolve();
      await new Promise<void>((_, reject) =>
        signal.addEventListener(
          "abort",
          () => {
            finished.resolve();
            reject(new Error("Cancelled"));
          },
          { once: true },
        ),
      );
      return "unused";
    },
  });
  const job = jobs.start({
    ids: ["a", "b"],
    fileIndex: 0,
    preset,
    directory: "/output",
  });
  await began.promise;
  jobs.cancel(job.id);
  await finished.promise;
  await Promise.resolve();
  await Promise.resolve();
  expect(jobs.status(job.id)?.status).toBe("cancelled");
  expect(resolved).toEqual(["a"]);
  expect(jobs.status(job.id)?.outputs).toEqual([]);
});
it("reports completed outputs separately from a failed file", async () => {
  const done = Promise.withResolvers<void>();
  const jobs = createConversionJobs({
    scope: () => "fixture",
    async resolve(id) {
      return id;
    },
    async convert({ source }) {
      if (source === "bad") {
        done.resolve();
        throw new Error("Unsupported file");
      }
      return `${source}.webp`;
    },
  });
  const job = jobs.start({
    ids: ["good", "bad", "never"],
    fileIndex: 0,
    preset,
    directory: "/output",
  });
  await done.promise;
  await Promise.resolve();
  await Promise.resolve();
  expect(jobs.status(job.id)).toMatchObject({
    status: "failed",
    completed: 1,
    outputs: ["good.webp"],
    error: "Unsupported file",
  });
});
