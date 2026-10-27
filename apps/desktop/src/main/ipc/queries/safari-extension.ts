import type { QueryResult } from "../../../shared/query-contracts";
import type { QueryHandlerMap } from "./params";

export const safariExtensionQueries = {
  async "extension.safariStatus"(): Promise<
    QueryResult<"extension.safariStatus">
  > {
    const { safariExtensionStatus } = await import(
      "../../core/safari-extension"
    );
    return safariExtensionStatus();
  },

  async "extension.openSafari"(): Promise<QueryResult<"extension.openSafari">> {
    const { openSafari } = await import("../../core/safari-extension");
    return openSafari();
  },
} satisfies QueryHandlerMap;
