import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Package, UserTag } from "../types";
import { downloadData, getUrl } from "aws-amplify/storage";
import { queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

//TODO: fix me please
async function getPackagesByUserTags(client: V6Client<Schema>, tags: UserTag[]): Promise<Package[]> {
    console.log('api call')
    const packages: Package[] = (await Promise.all(tags.map(async (tag) => {
        const packagesResponse = await client.models.Package.listPackageByTagId({
            tagId: tag.id,
        })
        const mappedPackages: Package[] = []
        return mappedPackages
    }))).reduce((prev, cur) => {
        cur.forEach((pack) => {
            if(prev.find((pa) => pa.id === pack.id) === undefined) {
                prev.push(pack)
            }
        })
        return prev
    }, [])
    return packages
}

async function getAllPackages(client: V6Client<Schema>){
    console.log('api call')
    const mappedPackages: Package[] = []
    return mappedPackages
}

async function getPackageDataFromPath(path: string){
    console.log('api call')

    const result = await downloadData({
        path: path,
    }).result

    const file = new File([await result.body.blob()], path.substring(path.indexOf('_') + 1), { type: result.contentType })

    return file
}

export const getPackagesByUserTagsQueryOptions = (tags: UserTag[]) => queryOptions({
    queryKey: ['package', client, tags],
    queryFn: () => getPackagesByUserTags(client, tags)
})

export const getAllPackagesQueryOptions = () => queryOptions({
    queryKey: ['package', client],
    queryFn: () => getAllPackages(client)
})

export const getPackageDataFromPathQueryOptions = (path: string) => queryOptions({
    queryKey: ['packagePath', path],
    queryFn: () => getPackageDataFromPath(path)
})