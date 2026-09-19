import { Clipboard, showToast, Toast } from "@raycast/api";
import { enqueueUrl, validatedUrl } from "./pond-api";

export default async function SaveClipboard() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving Clipboard URL",
  });
  try {
    const url = validatedUrl((await Clipboard.readText()) ?? "");
    const result = await enqueueUrl(url);
    toast.style = Toast.Style.Success;
    toast.title = result.created ? "Saved to Pond" : "Already in Pond";
    toast.message = new URL(url).hostname;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Save Clipboard URL";
    toast.message =
      error instanceof Error ? error.message : "Try again with Pond open.";
  }
}
