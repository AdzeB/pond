import { IconPlusOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  CompositeAttachmentAdapter,
  type CreateAttachment,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  useLocalRuntime,
} from "@pond/ui/assistant-runtime";
import { Composer, ComposerView } from "@pond/ui/composer";
import { ErrorNotice } from "@pond/ui/error-notice";
import { ConversationView } from "@pond/ui/thread";
import { useEffect, useState } from "react";
import styles from "./assistant-example.module.css";
import sampleImage from "./attachment-sample.jpg";

const samples: CreateAttachment[] = [
  {
    id: "sample-image",
    type: "image",
    name: "Photography reference.jpg",
    contentType: "image/jpeg",
    content: [{ type: "image", image: sampleImage }],
  },
  {
    id: "sample-document",
    type: "document",
    name: "Composition notes.txt",
    contentType: "text/plain",
    content: [
      {
        type: "text",
        text: "Leave space around the subject. Follow the light.",
      },
    ],
  },
];
const adapter: ChatModelAdapter = {
  async run() {
    return {
      content: [
        {
          type: "text",
          text: "Your attachments are included in this local preview.",
        },
      ],
    };
  },
};

export function AssistantAttachmentsExample() {
  const [error, setError] = useState("");
  const runtime = useLocalRuntime(adapter, {
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
    },
  });
  useEffect(() => {
    const composer = runtime.thread.composer;
    for (const sample of samples) {
      if (
        !composer.getState().attachments.some((item) => item.id === sample.id)
      ) {
        void composer
          .addAttachment(sample)
          .catch(() => setError("Could not load sample attachments."));
      }
    }
  }, [runtime]);
  return (
    <div className={styles.samples}>
      <AssistantRuntimeProvider runtime={runtime}>
        <ConversationView
          empty={null}
          composer={
            <ComposerView
              toolbar={
                <Composer.AddAttachment
                  aria-label="Add Attachment"
                  render={<Button icon size="xs" variant="ghost" />}
                >
                  <IconPlusOutline18 />
                </Composer.AddAttachment>
              }
            />
          }
        />
      </AssistantRuntimeProvider>
      {error && <ErrorNotice title={error} />}
      <p className={styles.note}>
        Preview an attachment or add an image or text file. Sending stays local.
      </p>
    </div>
  );
}
