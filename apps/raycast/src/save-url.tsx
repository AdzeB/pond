import {
  Action,
  ActionPanel,
  Form,
  type LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { enqueueUrl, PondApiError, validatedUrl } from "./pond-api";

interface SaveUrlArguments {
  url?: string;
}

interface SaveUrlValues {
  url: string;
}

export default function SaveUrl(
  props: LaunchProps<{ arguments: SaveUrlArguments }>,
) {
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();

  async function submit(values: SaveUrlValues) {
    setSubmitting(true);
    setUrlError(undefined);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving URL",
    });
    try {
      const url = validatedUrl(values.url);
      const result = await enqueueUrl(url);
      toast.style = Toast.Style.Success;
      toast.title = result.created ? "Saved to Pond" : "Already in Pond";
      toast.message = new URL(url).hostname;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Try again with Pond open.";
      toast.style = Toast.Style.Failure;
      toast.title =
        error instanceof PondApiError ? "Could Not Save URL" : "Invalid URL";
      toast.message = message;
      setUrlError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Pond" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        defaultValue={props.arguments.url}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
    </Form>
  );
}
