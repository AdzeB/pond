import { QuerySchema } from "@pond/schema/filters";
import {
  type ApiLibraryQueryRequest,
  ApiLibraryQueryRequestSchema,
  type ApiQueryPage,
} from "@pond/schema/api";

export type LibraryQueryRequest = ApiLibraryQueryRequest;
export type LibraryQueryPage = ApiQueryPage;

export const LibraryFilterSchema = QuerySchema;
export const LibraryQueryRequestSchema = ApiLibraryQueryRequestSchema;
