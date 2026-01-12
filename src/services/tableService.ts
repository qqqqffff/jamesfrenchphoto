import { Schema } from '../../amplify/data/resource'
import { TableGroup, Table, TableColumn, ColumnColor, UserTag } from '../types'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { defaultColumnColors } from '../utils'
import { remove, uploadData } from 'aws-amplify/storage'
import { v4 } from 'uuid'

interface GetAllTableGroupsOptions {
  logging?: boolean,
  metrics?: boolean
}
async function getAllTableGroups(client: V6Client<Schema>, options?: GetAllTableGroupsOptions){
  //TODO: convert me to infinite
  let tableGroupsResponse = await client.models.TableGroup.list()
  const tableGroupData = tableGroupsResponse.data
  while(tableGroupsResponse.nextToken) {
    tableGroupsResponse = await client.models.TableGroup.list({ nextToken: tableGroupsResponse.nextToken })
    tableGroupData.push(...tableGroupsResponse.data)
  }


  const mappedGroups: TableGroup[] = await Promise.all(tableGroupData.map(async (group) => {
    let tablesResponse = await group.tables()
    const tablesData = tablesResponse.data
    while(tablesResponse.nextToken) {
      tablesResponse = await group.tables({ nextToken: tablesResponse.nextToken })
      tablesData.push(...tablesResponse.data)
    }

    const tables: Table[] = tablesData
    .sort((a, b) => a.order - b.order)
    .map((table, index) => {
      const mappedTable: Table = {
        ...table,
        order: index,
        columns: [],
      }
      return mappedTable
    })

    const mappedGroup: TableGroup = {
      ...group,
      tables: tables
    }

    return mappedGroup
  }))
  if(options?.logging) console.log(mappedGroups)

  return mappedGroups
}

interface GetTableOptions {
  siUserTags?: boolean,
  logging?: boolean,
  metrics?: boolean
}
async function getTable(client: V6Client<Schema>, id?: string, options?: GetTableOptions) {
  if(!id) return null
  const tableResponse = await client.models.Table.get({ id: id })
  if(!tableResponse || !tableResponse.data) return null

  const mappedColumns: TableColumn[] = await Promise.all((await tableResponse.data.tableColumns()).data.map(async (column) => {
    const color: ColumnColor[] = (await column.color()).data.map((color) => {
      const mappedColor: ColumnColor = {
        ...color,
        bgColor: color.bgColor ?? undefined,
        textColor: color.textColor ?? undefined,
      }
      return mappedColor
    })
    const mappedColumn: TableColumn = {
      ...column,
      values: column.values ? column.values as string[] : [],
      choices: column.choices ? column.choices as string[] : [],
      display: true,
      type: column.type ?? 'value' as 'value',
      tags: column.tag && options?.siUserTags ? (await Promise.all(column.tag.map(async (tag) => {
        if(!tag) return
        const tagResponse = await client.models.UserTag.get({ id: tag })
        if(!tagResponse || !tagResponse.data) return
        const mappedTag: UserTag = {
          ...tagResponse.data,
          color: tagResponse.data.color ?? undefined,
          //nothing else required
          notifications: undefined,
          children: [],
          participants: []
        }
        return mappedTag
      }))).filter((tag) => tag !== undefined) : [],
      color: color,
    }
    return mappedColumn
  }))
  const mappedTable: Table = {
    ...tableResponse.data,
    columns: mappedColumns.sort((a, b) => a.order - b.order),
    }
  return mappedTable
}

export interface CreateTableGroupParams {
  id: string,
  name: string,
  options?: {
    logging?: boolean
  }
}

export interface UpdateTableGroupParams {
  group: TableGroup,
  name?: string,
  options?: {
    logging?: boolean
  }
}

export interface DeleteTableGroupParams {
  group: TableGroup,
  options?: {
    logging?: boolean
  }
}

export interface CreateTableParams {
  id: string,
  name: string,
  tableGroup: TableGroup,
  columns: TableColumn[],
  options?: {
    logging?: boolean
  }
}

export interface UpdateTableParams {
  table: Table,
  name?: string,
  options?: {
    logging?: boolean
  }
}

export interface DeleteTableParams {
  table: Table,
  options?: {
    logging?: boolean
  }
}

//TODO: update me please
export interface CreateTableColumnParams {
  column: TableColumn,
  options?: {
    logging?: boolean
  }
}

export interface UpdateTableColumnParams {
  column: TableColumn,
  header?: string,
  type?: TableColumn['type'],
  choices?: string[] | null,
  tags?: string[],
  tableId?: string,
  order?: number,
  values: string[],
  options?: {
    logging?: boolean
  }
}

export interface CreateChoiceParams {
  column: TableColumn,
  colorId: string,
  choice: string,
  color: string,
  customColor?: [string, string],
  options?: {
    logging?: boolean
  }
}

export interface UpdateChoiceParams {
  column: TableColumn,
  choice: ColumnColor,
  color: string,
  customColor?: [string, string], 
  value: string
  tableValues: string[]
  options?: {
    logging: boolean
  }
}

export interface DeleteChoiceParams {
  columnId: string,
  choices: string[]
  tableValues: string[]
  choiceId: string,
  options?: {
    logging?: boolean
  }
}

export interface AppendTableRowParams {
  table: Table,
  length: number,
  options?: {
    logging?: boolean
  }
}

export interface DeleteTableRowParams {
  table: Table,
  rowIndex: number,
  options?: {
    logging?: boolean
  }
}

export interface DeleteTableColumnParams {
  column: TableColumn,
  table: Table,
  options?: {
    logging?: boolean,
    metric?: boolean
  }
}

export interface UploadColumnFileParams {
  column: TableColumn,
  index: number,
  file?: File,
  options?: {
    logging?: boolean
  }
}

export interface ReorderTableGroupParams {
  tables: Table[],
  originalTables: Table[],
  options?: {
    logging?: boolean
  }
}

//TODO: add previous table columns to decrease api calls
export interface ReorderTableColumnsParams {
  tableColumns: TableColumn[],
  options?: {
    logging?: boolean
  }
}

export interface ReorderTableRowsParams extends ReorderTableColumnsParams { }

export interface ReorderTableMutationParams extends ReorderTableColumnsParams { }

export class TableService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createTableGroupMutation(params: CreateTableGroupParams) {
    const response = await this.client.models.TableGroup.create({ 
      id: params.id,
      name: params.name 
    })
    if(params.options?.logging) console.log(response)
  }

  async updateTableGroupMutation(params: UpdateTableGroupParams) {
    if(params.group.name !== params.name && params.name !== undefined) {
      const response = await this.client.models.TableGroup.update({
        id: params.group.id,
        name: params.name
      })
      if(params.options?.logging) console.log(response)
    }
  }

  async deleteTableGroupMutation(params: DeleteTableGroupParams) {
    const response = await this.client.models.TableGroup.delete({ id: params.group.id })
    if(params.options?.logging) console.log(response)
        
    await Promise.all(params.group.tables.map(async (table) => {
      await this.deleteTableMutation({
        table: table,
        options: {
          logging: params.options?.logging
        }
      })
    }))
  }

  async createTableMutation(params: CreateTableParams): Promise<string | undefined> {
    const response = await this.client.models.Table.create({
      id: params.id,
      name: params.name,
      tableGroupId: params.tableGroup.id,
      order: params.tableGroup.tables.length,
    })
    if(params.options?.logging) console.log(response)
    await Promise.all(params.columns.map(async (column) => {
      await this.createTableColumnMutation({
        column: column
      })
    }))
    if(response && response.data) {
      return response.data.id
    }
  }

  async updateTableMutation(params: UpdateTableParams) {
    if(params.table.name !== params.name && params.name !== undefined){
      const response = await this.client.models.Table.update({
        id: params.table.id,
        name: params.name,
      })
      if(params.options?.logging) console.log(response)
    }
  }

  //TODO: delete all files
  async deleteTableMutation(params: DeleteTableParams) {
    const response = await this.client.models.Table.delete({ id: params.table.id })
    if(params.options?.logging) console.log(response)
    const columnsResponse = await Promise.all(params.table.columns.map(async (column) => {
        const colResponse = await this.client.models.TableColumn.delete({ id: column.id })

        const colorResponse = await Promise.all((column.color ?? []).map(async (color) => {
            const response = await this.client.models.ColumnColorMapping.delete({ id: color.id })
            return response
        }))

        return {
            colResponse: colResponse,
            colorResponse: colorResponse
        }
    }))

    if(params.options?.logging) console.log(columnsResponse)
  }

  async createTableColumnMutation(params: CreateTableColumnParams) {
    const response = await this.client.models.TableColumn.create({
        id: params.column.id,
        header: params.column.header,
        type: params.column.type,
        choices: params.column.choices,
        tag: params.column.tags.map((tag) => tag.id),
        tableId: params.column.tableId,
        order: params.column.order,
        values: params.column.values,
    })
    if(params.options?.logging) console.log(response)
  }

  async updateTableColumnsMutation(params: UpdateTableColumnParams) {
    const valuesCheck = (params.values && params.values.length > 0) ? params.values.reduce((prev, cur, index) => {
      if(prev === false) return false
      if(params.column.values[index] !== cur) return false
      return prev
    }, true) : true
    if(params.options?.logging) console.log(`value check: ${valuesCheck}`)
    const choicesCheck = params.choices ? params.choices?.reduce((prev, cur) => {
      if(prev === false) return false
      if(!params.column.choices?.includes(cur)) return false
      return prev
    }, true) : true
    if(params.options?.logging) console.log(`choices check: ${valuesCheck}`)
    const tagsCheck = (params.tags && params.tags.length > 0) ? params.tags?.reduce((prev, cur) => {
      if(prev === false) return false
      if(!params.column.tags?.map((tag) => tag.id).includes(cur)) return false
      return prev
    }, true) : true
    if(params.options?.logging) console.log(`tags check: ${valuesCheck}`)
    if(!valuesCheck ||
      !choicesCheck ||
      !tagsCheck ||
      params.header !== params.column.header
    ) {
      const response = await this.client.models.TableColumn.update({
        id: params.column.id,
        header: params.header ?? params.column.header,
        values: params.values,
        choices: params.choices === null || (params.choices ?? []).length > 0 ? params.choices : params.column.choices ?? undefined,
        type: params.type ?? params.column.type,
        tag: params.tags ?? params.column.tags.map((tag) => tag.id),
        order: params.order ?? params.column.order
      })
      if(params.options?.logging) console.log(response)
    }
  }

  async createChoiceMutation(params: CreateChoiceParams) {
    const columnResponse = await this.client.models.TableColumn.update({
      id: params.column.id,
      choices: [...(params.column.choices ?? []), params.choice]
    })
    if(params.options?.logging) console.log(columnResponse)

    const createColor = await this.client.models.ColumnColorMapping.create({
      id: params.colorId,
      columnId: params.column.id,
      textColor: params.customColor ? params.customColor[0] : defaultColumnColors[params.color].text,
      bgColor: params.customColor ? params.customColor[1] : defaultColumnColors[params.color].bg,
      value: params.choice
    })

    if(params.options?.logging) console.log(createColor)
  }

  async updateChoiceMutation(params: UpdateChoiceParams) {
    const columnResponse = await this.client.models.TableColumn.update({
      id: params.column.id,
      choices: params.column.choices,
      values: params.tableValues,
    })
    if(params.options?.logging) console.log(columnResponse)
    
    const updateColor = await this.client.models.ColumnColorMapping.update({
      id: params.choice.id,
      textColor: params.customColor ? params.customColor[0] : defaultColumnColors[params.color].text,
      bgColor: params.customColor ? params.customColor[1] : defaultColumnColors[params.color].bg,
      value: params.value
    })
    if(params.options?.logging) console.log(updateColor)
  }

  async deleteChoiceMutation(params: DeleteChoiceParams) {
    const columnResponse = await this.client.models.TableColumn.update({
      id: params.columnId,
      choices: params.choices,
      values: params.tableValues
    })
    if(params.options?.logging) console.log(columnResponse)

    const updateColor = await this.client.models.ColumnColorMapping.delete({
      id: params.choiceId
    })
    if(params.options?.logging) console.log(updateColor)
  }

  async appendTableRowMutation(params: AppendTableRowParams){
    const response = await Promise.all(params.table.columns.map(async (column) => {
      const temp = [...column.values]
      while(temp.length < params.length){
          temp.push('')
      }
      return this.client.models.TableColumn.update({
        id: column.id,
        values: temp
      })
    }))

    if(params.options?.logging) console.log(response)
  }

  async deleteTableRowMutation(params: DeleteTableRowParams) {
    const tempTable: Table = {
      ...params.table,
      columns: params.table.columns.map((column) => ({
        ...column, 
        values: column.values.reduce((prev, cur, index) => {
          if(params.rowIndex === index) return prev
          prev.push(cur)
          return prev
        }, [] as string[]),
        choices: (column.choices ?? []).reduce((prev, cur, index) => {
          if(params.rowIndex === index) return prev
          prev.push(cur)
          return prev
        }, [] as string[])
      }))
    }
    if(params.options?.logging) console.log(tempTable)
    const response = await Promise.all(tempTable.columns.map(async (column) => {
      return this.client.models.TableColumn.update({
        id: column.id,
        values: column.values,
        choices: column.choices
      })
    }))
    if(params.options?.logging) console.log(response)
  }

  async deleteTableColumnMutation(params: DeleteTableColumnParams){
    const start = new Date().getTime()
    const response = await this.client.models.TableColumn.delete({ id: params.column.id })

    if(params.options?.logging) console.log(response)

    const columnMappingResponse = await Promise.all((params.column.color ?? []).map(async (color) => {
      return this.client.models.ColumnColorMapping.delete({ id: color.id })
    }))
    if(params.options?.logging) console.log(columnMappingResponse)

    const orderUpdateResponse = await Promise.all(params.table.columns
      .filter((column) => column.id !== params.column.id)
      .sort((a, b) => a.order - b.order)
      .map(async (column, index) => {
        const response = await this.client.models.TableColumn.update({
          id: column.id,
          order: index,
        })

        return response
      }
    ))
    if(params.options?.logging) console.log(orderUpdateResponse)
    if(params.options?.metric) console.log(`DELETECOLUMN: ${new Date().getTime() - start}ms`)
  }

  async uploadColumnFileMutation(params: UploadColumnFileParams): Promise<string> {
    if((!params.file && params.column.values[params.index] !== '') || 
      params.column.values[params.index] !== ''
    ){
      const deleteResponse = await remove({
        path: params.column.values[params.index]
      })

      if(params.options?.logging) console.log(deleteResponse)

      //deleting
      if(!params.file) {
        const tempValues = [...params.column.values]
        tempValues[params.index] = ''

        const dynamoResponse = await this.client.models.TableColumn.update({
          id: params.column.id,
          values: tempValues
        })

        if(params.options?.logging) console.log(dynamoResponse)

        return ''
      }
    }

    if(params.file) {
      const path = `table-files/${params.column.id}/${v4()}_${params.file.name}`
      const uploadResponse = await uploadData({
        path: path,
        data: params.file
      }).result
      if(params.options?.logging) console.log(uploadResponse)
      
      const temp = [...params.column.values]
      temp[params.index] = path

      const dynamoResponse = await this.client.models.TableColumn.update({
        id: params.column.id,
        values: temp
      })
      if(params.options?.logging) console.log(dynamoResponse)

      return path
    }
    else {
      return ''
    }
  }

  async reorderTableGroupMutation(params: ReorderTableGroupParams) {
    const updateTableGroup = await Promise.all(params.tables.map((table) => {
      const originalTable = params.originalTables.find((oTable) => oTable.id === table.id)

      return originalTable === undefined || (
        originalTable.order !== table.order ||
        originalTable.tableGroupId !== table.tableGroupId
      ) ? this.client.models.Table.update({
        id: table.id,
        order: table.order,
        tableGroupId: table.tableGroupId
      }) : null
    }))

    if(params.options?.logging) console.log(updateTableGroup)
  }

  async reorderTableMutation(params: ReorderTableMutationParams) {
    const updatedTable = await Promise.all(params.tableColumns.map((column) => {
      return this.client.models.TableColumn.update({
        id: column.id,
        values: column.values,
        choices: column.choices
      })
    }))

    if(params.options?.logging) console.log(updatedTable)
  }

  async reorderTableColumnsMutation(params: ReorderTableColumnsParams) {
    const updatedTableColumns = await Promise.all(params.tableColumns.map((tableColumn) => {
      return this.client.models.TableColumn.update({
        id: tableColumn.id,
        order: tableColumn.order,
      })
    }))
    if(params.options?.logging) console.log(updatedTableColumns)
  }

  async reorderTableRowsMutation(params: ReorderTableRowsParams) {
    const updatedTableColumns = await Promise.all(params.tableColumns.map((tableColumn) => {
      return this.client.models.TableColumn.update({
        id: tableColumn.id,
        values: tableColumn.values,
        choices: tableColumn.choices,
      })
    }))
    if(params.options?.logging) console.log(updatedTableColumns)
  }

  getAllTableGroupsQueryOptions = (options?: GetAllTableGroupsOptions) => queryOptions({
    queryKey: ['TableGroups', options],
    queryFn: () => getAllTableGroups(this.client, options)
  })

  getTableQueryOptions = (id?: string, options?: GetTableOptions) => queryOptions({
    queryKey: ['Table', id, options],
    queryFn: () => getTable(this.client, id, options)
  })
}