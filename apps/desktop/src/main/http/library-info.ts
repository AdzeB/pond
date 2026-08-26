import type { Context } from "hono";
import { libraryInfo } from "../ops";

export async function libraryInfoHandler(c: Context) {
  return c.json({
    status: "success",
    data: await libraryInfo(),
  });
}
