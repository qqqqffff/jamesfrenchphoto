import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Package, UserTag } from "../types";
import { downloadData, getUrl } from "aws-amplify/storage";
import { queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

async function getPackagesByUserTags(client: V6Client<Schema>, tags: UserTag[]): Promise<Package[]> {
    console.log('api call')
    const packages: Package[] = (await Promise.all(tags.map(async (tag) => {
        const packagesResponse = await client.models.Package.listPackageByTagId({
            tagId: tag.id,
        })
        const mappedPackages: Package[] = await Promise.all(packagesResponse.data.map(async (pack) => {
            const mappedPackage: Package = {
                ...pack,
                tag: tag,
                pdfPath: (await getUrl({
                    path: pack.pdfPath
                })).url.toString()
            }
            return mappedPackage
        }))
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
    const packageResponse = await client.models.Package.list()
    const mappedPackages: Package[] = (await Promise.all(packageResponse.data.map(async (pack) => {
        const tagResponse = await pack.tag()
        if(!tagResponse || !tagResponse.data) return
        const mappedPackage: Package = {
            ...pack,
            tag: {
                ...tagResponse.data,
                color: tagResponse.data.color ?? undefined,
            },
            pdfPath: (await getUrl({
                path: pack.pdfPath
            })).url.toString(),
        }
        return mappedPackage
    }))).filter((tag) => tag !== undefined)
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