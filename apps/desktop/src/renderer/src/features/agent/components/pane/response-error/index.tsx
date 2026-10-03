import { IconTriangleWarningOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import styles from "./styles.module.css";

const OPENAI_BILLING_URL =
  "https://platform.openai.com/settings/organization/billing/";

export interface ResponseErrorCopy {
  title: string;
  description: string;
  action?: {
    label: string;
    url: string;
  };
}

export function responseErrorCopy(error: string): ResponseErrorCopy {
  if (/no credits remaining|insufficient_quota/i.test(error)) {
    return {
      title: "No API credits remaining",
      description:
        "Add credits in your provider's billing settings, then try again.",
      ...(error.includes("platform.openai.com")
        ? {
            action: {
              label: "Open Billing",
              url: OPENAI_BILLING_URL,
            },
          }
        : {}),
    };
  }
  if (/rate limit|too many requests/i.test(error)) {
    return {
      title: "The model is rate limited",
      description: "Wait a moment, then try again.",
    };
  }
  if (/invalid api key|incorrect api key|authentication/i.test(error)) {
    return {
      title: "Couldn't authenticate with the model provider",
      description: "Check your API key in Agent Settings, then try again.",
    };
  }
  return {
    title: "Couldn't finish this response",
    description: "Check your Agent provider settings, then try again.",
  };
}

export function ResponseError({ error }: { error: string }) {
  const copy = responseErrorCopy(error);
  return (
    <div className={styles.notice} role="alert">
      <IconTriangleWarningOutline18 className={styles.icon} />
      <div className={styles.content}>
        <span className={styles.title}>{copy.title}</span>
        <span className={styles.description}>{copy.description}</span>
      </div>
      {copy.action ? (
        <Button
          variant="secondary"
          size="xs"
          onClick={() => void window.pond.openExternal(copy.action?.url ?? "")}
        >
          {copy.action.label}
        </Button>
      ) : null}
    </div>
  );
}
