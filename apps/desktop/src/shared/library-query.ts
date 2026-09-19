import { QuerySchema } from "@pond/schema/filters";
import {
  type LocalApiLibraryQueryRequest,
  LocalApiLibraryQueryRequestSchema,
  type LocalApiQueryPage,
} from "@pond/schema/local-api";

export type LibraryQueryRequest = LocalApiLibraryQueryRequest;
export type LibraryQueryPage = LocalApiQueryPage;

export const LibraryFilterSchema = QuerySchema;
export const LibraryQueryRequestSchema = LocalApiLibraryQueryRequestSchema;
