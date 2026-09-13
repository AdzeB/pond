import { DataTableBody } from "./body";
import { useDataTable } from "./context";
import { DataTableHeader } from "./header";
import { DataTableHotkeys } from "./hotkeys";
import {
  DataTableActionBar,
  DataTableActionBarDivider,
  DataTableEmpty,
  DataTableExtraRow,
  DataTableRoot,
  DataTableToolbar,
} from "./parts";
import { DataTableProvider } from "./provider";

export type { DataTableProviderProps } from "./provider";

export const DataTable = {
  Provider: DataTableProvider,
  Root: DataTableRoot,
  Header: DataTableHeader,
  Body: DataTableBody,
  Empty: DataTableEmpty,
  ExtraRow: DataTableExtraRow,
  Toolbar: DataTableToolbar,
  ActionBar: DataTableActionBar,
  ActionBarDivider: DataTableActionBarDivider,
  Hotkeys: DataTableHotkeys,
};

export { useDataTable };
