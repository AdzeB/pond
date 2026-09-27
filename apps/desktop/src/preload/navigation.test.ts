import { expect, it, vi } from "vitest";
import { createNavigationMailbox } from "./navigation";

it("delivers the latest startup navigation once the renderer subscribes", () => {
  const mailbox = createNavigationMailbox();
  mailbox.receive("/save/first");
  mailbox.receive("/save/latest");
  const listener = vi.fn();
  const unsubscribe = mailbox.subscribe(listener);
  expect(listener).toHaveBeenCalledExactlyOnceWith("/save/latest");
  unsubscribe();
  mailbox.subscribe(listener);
  expect(listener).toHaveBeenCalledOnce();
});

it("delivers live navigation and buffers while the renderer is unmounted", () => {
  const mailbox = createNavigationMailbox();
  const listener = vi.fn();
  const unsubscribe = mailbox.subscribe(listener);
  mailbox.receive("/save/live");
  expect(listener).toHaveBeenCalledExactlyOnceWith("/save/live");
  unsubscribe();
  mailbox.receive("/save/reopened");
  expect(listener).toHaveBeenCalledOnce();
  mailbox.subscribe(listener);
  expect(listener).toHaveBeenLastCalledWith("/save/reopened");
});
