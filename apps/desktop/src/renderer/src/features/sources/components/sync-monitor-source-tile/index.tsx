import type { Source } from "@pond/schema/db";
import { BrandTile as Tile } from "@pond/ui";
import { getSourceDef } from "@/features/sources/lib/registry";

export function BrandTile({
  source,
  size = 36,
}: {
  source: Source;
  size?: number;
}) {
  const { icon: Icon, logo } = getSourceDef(source);

  return (
    <Tile size={size}>
      {Icon ? (
        <Icon width={size} height={size} />
      ) : logo ? (
        <img src={logo} alt="" width={size} height={size} />
      ) : null}
    </Tile>
  );
}
