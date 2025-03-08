import { generateClient } from 'aws-amplify/api'
import { v4 } from 'uuid'
import { Schema } from '../../amplify/data/resource'
import { TableGroup, Table, TableColumn, ColumnColorDisplay } from '../types'
import { getUrl, remove, uploadData } from 'aws-amplify/storage'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'

const client = generateClient<Schema>()

interface GetAllTableGroupsOptions {
    logging: boolean,
    metrics: boolean
}
async function getAllTableGroups(client: V6Client<Schema>, options: GetAllTableGroupsOptions){
    const mappedGroups: TableGroup[] = await Promise.all((await client.models.TableGroup.list()).data.map(async (group) => {
        const tables: Table[] = (await group.tables()).map((table) => {
            const mappedTable: Table = {
                ...table,
                tableColumns: [],
            }
            return mappedTable
        })

        const mappedGroup: TableGroup = {
            ...group,
            groupTables: tables
        }

        return mappedGroup
    }))

    return mappedGroups
}

interface GetTableOptions {
    logging: boolean,
    metrics: boolean
}
async function getTable(client: V6Client<Schema>, id?: string, options?: GetTableOptions) {
    if(!id) return
    const tableResponse = await client.models.Table.get({ id: id })
    if(!tableResponse || !tableResponse.data) return

    const mappedColumns: TableColumn[] = await Promise.all((await tableResponse.data.columns()).map(async (column) => {
        const color: ColumnColorDisplay[] = (await column.color()).map((color) => {
            const mappedColor: ColumnColorDisplay = {
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
            type: column.type ?? 'value' as 'value',
            display: column.display ?? true,
            tag: column.tag ? column.tag as string[] : [],
            columnColorDisplay: color,
        }
    }))
    const mappedTable: Table = {
        ...tableResponse.data,
        columns: mappedColumns,
     }
    return mappedTable
}

export const getAllTableGroupsQueryOptions = (options?: GetAllTableGroupsOptions) => queryOptions({
    queryKey: ['TableGroups', client, options],
    queryFn: getAllTableGroups(client, options)
})

export const getTableQueryOptions = (id?: string, options?: GetTableOptions) => queryOptipns({
    queryKey: ['Table', client, id, options],
    queryFn: getTable(client, id, options)
})