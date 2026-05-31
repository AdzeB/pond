import { type SQL, sql } from "drizzle-orm";
import { saves } from "../../db";

export function tagsExists(needle: SQL): SQL {
  return sql`exists (
    select 1 from json_each(${saves.tags}) where ${needle}
  )`;
}

export function tagsDistinctCount(needle: SQL): SQL {
  return sql`(
    select count(distinct lower(value)) from json_each(${saves.tags})
    where ${needle}
  )`;
}

export function durationProjection(): SQL {
  return sql`coalesce(
    cast(json_extract(${saves.rawJson}, '$.capture.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.youtube.durationSec') as real),
    cast(json_extract(${saves.rawJson}, '$.youtube.ytdlp.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.tiktok.durationSec') as real),
    cast(json_extract(${saves.rawJson}, '$.tiktok.ytdlp.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.twitter.ytdlp.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.twitter.media[0].durationSec') as real),
    cast(json_extract(${saves.rawJson}, '$.instagram.ytdlp.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.instagram.media[0].durationSec') as real),
    cast(json_extract(${saves.rawJson}, '$.pinterest.ytdlp.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.arena.ytdlp.duration') as real),
    cast(json_extract(${saves.rawJson}, '$.cosmos.ytdlp.duration') as real)
  )`;
}
