import { generateClient } from 'aws-amplify/api'
import { Schema } from '../../amplify/data/resource'
import { TableGroup, Table, TableColumn, ColumnColor, UserTag } from '../types'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'

const client = generateClient<Schema>()

interface GetAllTableGroupsOptions {
    logging?: boolean,
    metrics?: boolean
}
async function getAllTableGroups(client: V6Client<Schema>, options?: GetAllTableGroupsOptions){
    const mappedGroups: TableGroup[] = await Promise.all((await client.models.TableGroup.list()).data.map(async (group) => {
        const tables: Table[] = (await group.tables()).data.map((table) => {
            const mappedTable: Table = {
                ...table,
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
    if(!id) return
    const tableResponse = await client.models.Table.get({ id: id })
    if(!tableResponse || !tableResponse.data) return

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
                }
                return mappedTag
            }))).filter((tag) => tag !== undefined) : [],
            color: color,
        }
        return mappedColumn
    }))
    const mappedTable: Table = {
        ...tableResponse.data,
        columns: mappedColumns,
     }
    return mappedTable
}

export interface CreateTableGroupParams {
    name: string,
    options?: {
        logging?: boolean
    }
}
export async function createTableGroupMutation(params: CreateTableGroupParams) {
    const response = await client.models.TableGroup.create({ name: params.name })
    if(params.options?.logging) console.log(response)
}

export interface UpdateTableGroupParams {
    group: TableGroup,
    name?: string,
    options?: {
        logging?: boolean
    }
}
export async function updateTableGroupMutation(params: UpdateTableGroupParams) {
    if(params.group.name !== params.name && params.name !== undefined) {
        const response = await client.models.TableGroup.update({
            id: params.group.id,
            name: params.name
        })
        if(params.options?.logging) console.log(response)
    }
}

export interface DeleteTableGroupParams {
    id: string,
    options?: {
        logging?: boolean
    }
}
export async function deleteTableGroupMutation(params: DeleteTableGroupParams) {
    const response = await client.models.TableGroup.delete({ id: params.id })
    if(params.options?.logging) console.log(response)
}

export interface CreateTableParams {
    name: string,
    tableGroupId: string,
    options?: {
        logging?: boolean
    }
}
export async function createTableMutation(params: CreateTableParams): Promise<string | undefined> {
    const response = await client.models.Table.create({
        name: params.name,
        tableGroupId: params.tableGroupId,
    })
    if(response && response.data) {
        return response.data.id
    }
}

export interface UpdateTableParams {
    table: Table,
    name?: string,
    options?: {
        logging?: boolean
    }
}
export async function updateTableMutation(params: UpdateTableParams) {
    if(params.table.name !== params.name && params.name !== undefined){
        const response = await client.models.Table.update({
            id: params.table.id,
            name: params.name,
        })
        if(params.options?.logging) console.log(response)
    }
}

export interface DeleteTableParams {
    id: string,
    options?: {
        logging?: boolean
    }
}
export async function deleteTableMutation(params: DeleteTableParams) {
    const response = await client.models.Table.delete({ id: params.id })
    if(params.options?.logging) console.log(response)
}

export interface CreateTableColumnParams {
    header: string,
    type: 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file',
    choices?: string[],
    tags?: string[],
    tableId: string,
    options?: {
        logging?: boolean
    }
}
export async function createTableColumnMutation(params: CreateTableColumnParams): Promise<string | undefined> {
    const response = await client.models.TableColumn.create({
        header: params.header,
        type: params.type,
        choices: params.choices,
        tag: params.tags,
        tableId: params.tableId
    })
    if(response && response.data) {
        return response.data.id
    }
}

export interface UpdateTableColumnParams  extends Partial<CreateTableColumnParams> {
    column: TableColumn,
    values: string[]
}
export async function updateTableColumnsMutation(params: UpdateTableColumnParams) {
    const valuesCheck = params.values.reduce((prev, cur, index) => {
        if(prev === false) return false
        if(params.column.values[index] !== cur) return false
        return prev
    }, true)
    const choicesCheck = params.choices?.reduce((prev, cur) => {
        if(prev === false) return false
        if(!params.column.choices?.includes(cur)) return false
        return prev
    }, true)
    const tagsCheck = params.tags?.reduce((prev, cur) => {
        if(prev === false) return false
        if(!params.column.tags?.map((tag) => tag.id).includes(cur)) return false
        return prev
    }, true)
    if(!valuesCheck ||
        !choicesCheck ||
        !tagsCheck ||
        params.header !== params.column.header
    ) {
        const response = await client.models.TableColumn.update({
            id: params.column.id,
            header: params.header ?? params.column.header,
            values: params.values,
            choices: params.column.type === 'choice' || params.type === 'choice' ? ( 
                params.choices ?? params.column.choices
            ): undefined,
            type: params.type ?? params.column.type,
            tag: params.tags ?? params.column.tags.map((tag) => tag.id),
        })
        if(params.options?.logging) console.log(response)
    }
}


export const getAllTableGroupsQueryOptions = (options?: GetAllTableGroupsOptions) => queryOptions({
    queryKey: ['TableGroups', client, options],
    queryFn: () => getAllTableGroups(client, options)
})

export const getTableQueryOptions = (id?: string, options?: GetTableOptions) => queryOptions({
    queryKey: ['Table', client, id, options],
    queryFn: () => getTable(client, id, options)
})