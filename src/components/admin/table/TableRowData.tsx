const tableRowDataKey = Symbol('table-row')

export type TableRowData = {
  [tableRowDataKey]: true,
  rowIndex: number
}

export function getTableRowData(rowIndex: number): TableRowData {
  return {
    [tableRowDataKey]: true,
    rowIndex: rowIndex
  }
}

export function isTableRowData(data: Record<string | symbol, unknown>): data is TableRowData {
  return data[tableRowDataKey] === true
}

export function isDraggingTableRowColumn({
  source
} : {
  source: { data: Record<string | symbol, unknown>}
}): boolean {
  return isTableRowData(source.data)
}