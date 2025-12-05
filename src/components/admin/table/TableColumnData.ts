import { TableColumn } from "../../../types";

const tableColumnDataKey = Symbol('table-column')

export type TableColumnData = {
  [tableColumnDataKey]: true,
  columnId: TableColumn['id']
}

export function getTableColumnData(tableColumn: TableColumn): TableColumnData {
  return {
    [tableColumnDataKey]: true,
    columnId: tableColumn.id
  }
}

export function isTableColumnData(data: Record<string | symbol, unknown>): data is TableColumnData {
  return data[tableColumnDataKey] === true
}

export function isDraggingTableColumn({
  source
} : {
  source: { data: Record<string | symbol, unknown>}
}): boolean {
  return isTableColumnData(source.data)
}
