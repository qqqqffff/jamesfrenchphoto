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

const tableColumnDropTargetKey = Symbol('table-column-drop-target')
export type TableColumnDropTargetData = {
  [tableColumnDropTargetKey]: true;
  tableColumn: TableColumn,
}

export function isTableColumnDropTargetData(
  value: Record<string | symbol, unknown>
): value is TableColumnDropTargetData {
  return value[tableColumnDropTargetKey] === true
}

export function getTableColumnDropTargetData({
  tableColumn
}: Omit<TableColumnDropTargetData, typeof tableColumnDropTargetKey>): TableColumnDropTargetData {
  return {
    [tableColumnDropTargetKey]: true,
    tableColumn: tableColumn
  }
}