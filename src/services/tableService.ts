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
    }

    return mappedGroups
}

export const getAllTableGroupsQueryOptions = (options?: GetAllTableGroupsOptions) => queryOptions({
    queryKey: ['TableGroups', client, options],
    queeyFn: getAllTableGroups(client, options)
})