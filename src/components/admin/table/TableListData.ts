import { Table, TableGroup } from "../../../types"

const tableListDataKey = Symbol('table-list')
const tableGroupDataKey = Symbol('table-group')

export type TableListData = {
  [tableListDataKey]: true,
  tableId: Table['id']
}

export type TableGroupData = {
  [tableGroupDataKey]: true,
  tableGroupId: TableGroup['id']
}

export function getTableListData(table: Table): TableListData {
  return {
    [tableListDataKey]: true,
    tableId: table.id
  }
}

export function getTableGroupData(tableGroup: TableGroup): TableGroupData {
  return {
    [tableGroupDataKey]: true,
    tableGroupId: tableGroup.id
  }
}

export function isTableListData(data: Record<string | symbol, unknown>): data is TableListData {
  return data[tableListDataKey] === true
}

export function isTableGroupData(data: Record<string | symbol, unknown>): data is TableGroupData {
  return data[tableGroupDataKey] === true
}

export function isDraggingTableList({
  source
} : {
  source: { data: Record<string | symbol, unknown>}
}): boolean {
  return isTableListData(source.data)
}