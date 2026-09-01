import { app } from "electron";
import { z } from "zod";
import { assistantSend } from "../../../shared/assistant";
import { type QueryHandlerMap, query } from "./params";

const Params = z.looseObject({});

export const agentQueries: QueryHandlerMap = {
  "agent.keys": query(Params, async () => {
    const { listKeys } = await import("../../core/agent/keys");
    return await listKeys();
  }),

  "agent.saveKey": query(Params, async (params) => {
    const { parseProvider, saveKey } = await import("../../core/agent/keys");
    const provider = parseProvider(String(params.provider ?? ""));
    if (!provider) return { ok: false, error: "Unknown provider." };
    return await saveKey(provider, String(params.key ?? ""));
  }),

  "agent.removeKey": query(Params, async (params) => {
    const { parseProvider, removeKey } = await import("../../core/agent/keys");
    const provider = parseProvider(String(params.provider ?? ""));
    if (!provider) return { ok: false };
    return await removeKey(provider);
  }),

  "agent.setKeyEnabled": query(Params, async (params) => {
    const { parseProvider, setKeyEnabled } = await import(
      "../../core/agent/keys"
    );
    const provider = parseProvider(String(params.provider ?? ""));
    if (!provider) return { ok: false };
    return await setKeyEnabled(provider, Boolean(params.enabled));
  }),

  "agent.verifyKey": query(Params, async (params) => {
    const { parseProvider, verifyKey } = await import("../../core/agent/keys");
    const provider = parseProvider(String(params.provider ?? ""));
    if (!provider) return { ok: false, error: "Unknown provider." };
    return await verifyKey(provider, String(params.key ?? ""));
  }),

  "agent.allowCloud": query(Params, async () => {
    const { allowCloud } = await import("../../core/agent/keys");
    return await allowCloud();
  }),

  "agent.chats": query(Params, async () => {
    const { listChats } = await import("../../core/agent/persist");
    return await listChats();
  }),

  "agent.messages": query(Params, async (params) => {
    const { listMessages } = await import("../../core/agent/persist");
    return await listMessages(String(params.chatId ?? ""));
  }),

  "agent.newChat": query(Params, async () => {
    const { createChat } = await import("../../core/agent/persist");
    return await createChat();
  }),

  "agent.deleteChat": query(Params, async (params) => {
    const { deleteChat } = await import("../../core/agent/persist");
    return await deleteChat(String(params.chatId ?? ""));
  }),

  "agent.send": query(Params, async (params) => {
    const { sendMessage } = await import("../../core/agent/chat");
    return await sendMessage(assistantSend.parse(params));
  }),

  "agent.stop": query(Params, async (params) => {
    const { stopMessage } = await import("../../core/agent/chat");
    return stopMessage(String(params.chatId), String(params.requestId));
  }),

  "agent.searchSaves": query(Params, async (params) => {
    const { searchLibrary, searchLibraryInput } = await import(
      "../../core/agent/tools"
    );
    return searchLibrary(searchLibraryInput.parse(params));
  }),

  "agent.attachments": query(Params, async (params) => {
    const { readSave } = await import("../../core/agent/tools");
    const ids = z.array(z.string()).max(24).parse(params.ids);
    return (await Promise.all(ids.map((id) => readSave({ id })))).flatMap(
      (result) => (result.save ? [result.save] : []),
    );
  }),

  "agent.review": query(Params, async (params) => {
    const { reviewChanges, reviewInput } = await import(
      "../../core/agent/review"
    );
    return reviewChanges(reviewInput.parse(params));
  }),

  "agent.mcpSnippet": query(Params, async () => {
    return {
      command: process.execPath,
      args: ["--mcp"],
      json: JSON.stringify(
        {
          mcpServers: {
            pond: {
              command: process.execPath,
              args: ["--mcp"],
            },
          },
        },
        null,
        2,
      ),
      app: app.getName(),
    };
  }),
};
