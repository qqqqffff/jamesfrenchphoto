import { Table } from "../../../types"

const tableListDataKey = Symbol('table-list')

export type TableListData = {
  [tableListDataKey]: true,
  tableId: Table['id']
}

export function getTableListData(table: Table): TableListData {
  return {
    [tableListDataKey]: true,
    tableId: table.id
  }
}

export function isTableListData(data: Record<string | symbol, unknown>): data is TableListData {
  return data[tableListDataKey] === true
}

export function isDraggingTableList({
  source
} : {
  source: { data: Record<string | symbol, unknown>}
}): boolean {
  return isTableListData(source.data)
}