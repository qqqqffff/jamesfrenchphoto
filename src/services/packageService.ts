import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Package, PackageItem, UserTag } from "../types";
import { downloadData } from "aws-amplify/storage";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

interface GetAllPackagesByUserTagsOptions {
    siPackageItems?: boolean
    siCollectionItems?: boolean
}
async function getPackagesByUserTags(client: V6Client<Schema>, tags: UserTag[], options?: GetAllPackagesByUserTagsOptions): Promise<Package[]> {
    console.log('api call')
    //tag to package relationship is one to one -> no memo required
    const packages: Package[] = (await Promise.all(tags.map(async (tag) => {
        //secondary indexes always return a list even if it is a one to one relationship
        let packagesResponse = await client.models.Package.listPackageByTagId({
            tagId: tag.id,
        })
        const packageData = packagesResponse.data

        const mappedPackages: Package[] = await Promise.all(packageData.map(async (pack) => {
            const items: PackageItem[] = []

            if(options?.siPackageItems) {
                let itemsResponse = await pack.items()
                const itemsData = itemsResponse.data

                while(itemsResponse.nextToken) {
                    itemsResponse = await pack.items({ nextToken: itemsResponse.nextToken })
                    itemsData.push(...itemsResponse.data)
                }

                items.push(...await Promise.all(itemsData.map(async (item) => {
                    const collectionIds: string[] = []

                    if(options?.siCollectionItems) {
                        let collectionResponse = await item.itemCollections()
                        const collectionData = collectionResponse.data

                        while(collectionResponse.nextToken) {
                            collectionResponse = await item.itemCollections({ nextToken: collectionResponse.nextToken })
                            collectionData.push(...collectionResponse.data)
                        }

                        collectionIds.push(...collectionData.map((data) => {
                            return data.collectionId
                        }))
                    }
                    const mappedItem: PackageItem = {
                        ...item,
                        description: item.description ?? undefined,
                        max: item.max ?? undefined,
                        price: item.price ?? undefined,
                        discount: item.discount ?? undefined,
                        quantities: item.quantity ?? undefined,
                        hardCap: item.hardCap ?? undefined,
                        collectionIds: collectionIds,
                    }
                    return mappedItem
                })))
            }

            const mappedPackage: Package = {
                ...pack,
                items: items,
                parentTagId: (await pack.packageParentTag()).data?.tagId ?? '',
                pdfPath: pack.pdfPath ?? undefined,
                description: pack.description ?? undefined,
            }

            return mappedPackage
        }))
        return mappedPackages
    }))).reduce((prev, cur) => {
        cur.forEach((pack) => {
            if(!prev.some((pa) => pa.id === pack.id)) {
                prev.push(pack)
            }
        })
        return prev
    }, [])
    return packages
}

export interface GetInfinitePackagesData {
    memo: Package[],
    nextToken?: string,
    previous: boolean,
}
interface GetInfinitePackagesOptions extends GetAllPackagesByUserTagsOptions {
    maxItems: number
}
async function getInfinitePackages(client: V6Client<Schema>, initial: GetInfinitePackagesData, options?: GetInfinitePackagesOptions): Promise<GetInfinitePackagesData> {
    const response = await client.models.Package.listPackageByFlagAndCreatedAt(
        {
            flag: 'true',
        },
        {
            sortDirection: 'DESC',
            limit: options?.maxItems ?? 20,
            nextToken: initial.nextToken,
        }
    )

    const newPackages: Package[] = (await Promise.all(response.data
        .filter((pack) => !initial.memo.some((pPack) => pPack.id === pack.id))
        .map(async (pack) => {
            const items: PackageItem[] = []

            if(options?.siPackageItems) {
                let itemsResponse = await pack.items()
                const itemsData = itemsResponse.data

                while(itemsResponse.nextToken) {
                    itemsResponse = await pack.items({ nextToken: itemsResponse.nextToken })
                    itemsData.push(...itemsResponse.data)
                }

                items.push(...await Promise.all(itemsData.map(async (item) => {
                    const collectionIds: string[] = []

                    if(options?.siCollectionItems) {
                        let collectionResponse = await item.itemCollections()
                        const collectionData = collectionResponse.data

                        while(collectionResponse.nextToken) {
                            collectionResponse = await item.itemCollections({ nextToken: collectionResponse.nextToken })
                            collectionData.push(...collectionResponse.data)
                        }

                        collectionIds.push(...collectionData.map((data) => {
                            return data.collectionId
                        }))
                    }

                    const mappedItem: PackageItem = {
                        ...item,
                        description: item.description ?? undefined,
                        max: item.max ?? undefined,
                        price: item.price ?? undefined,
                        discount: item.discount ?? undefined,
                        quantities: item.quantity ?? undefined,
                        hardCap: item.hardCap ?? undefined,
                        collectionIds: collectionIds,
                    }
                    return mappedItem
                })))
            }

            const mappedPackage: Package = {
                ...pack,
                items: items,
                parentTagId: (await pack.packageParentTag()).data?.tagId ?? '',
                pdfPath: pack.pdfPath ?? undefined,
                description: pack.description ?? undefined,
            }

            return mappedPackage
        })
    ))

    const newMemo: Package[] = [...initial.memo, ...newPackages]

    const returnData: GetInfinitePackagesData = {
        memo: newMemo,
        nextToken: response.nextToken ?? undefined,
        previous: false,
    }

    return returnData
}

export interface GetInfinitePackageItemsData {
    memo: PackageItem[],
    nextToken?: string,
    previous: boolean,
}
interface GetInfinitePackageItemsOptions {
    siCollectionItems?: boolean,
    maxItems?: number
}
//TODO: implement me please
async function getInfinitePackageItems(client: V6Client<Schema>, initial: GetInfinitePackageItemsData, options?: GetInfinitePackageItemsOptions): Promise<GetInfinitePackageItemsData> {
    const response = await client.models.PackageItem.listPackageItemByFlagAndCreatedAt(
        {
            flag: 'true'
        },
        {
            sortDirection: 'DESC',
            limit: options?.maxItems ?? 32,
            nextToken: initial.nextToken,
        }
    )

    const newPackageItems = (await Promise.all(response.data.map(async (item) => {
        const collectionIds: string[] = []

        if(options?.siCollectionItems) {
            let collectionResponse = await item.itemCollections()
            const collectionData = collectionResponse.data

            while(collectionResponse.nextToken) {
                collectionResponse = await item.itemCollections({ nextToken: collectionResponse.nextToken })
                collectionData.push(...collectionResponse.data)
            }

            collectionIds.push(...collectionData.map((data) => {
                return data.collectionId
            }))
        }

        const mappedItem: PackageItem = {
            ...item,
            description: item.description ?? undefined,
            max: item.max ?? undefined,
            price: item.price ?? undefined,
            discount: item.discount ?? undefined,
            quantities: item.quantity ?? undefined,
            hardCap: item.hardCap ?? undefined,
            collectionIds: collectionIds,
        }

        return mappedItem
    })))

    const newMemo: PackageItem[] = [...initial.memo, ...newPackageItems]

    const returnData: GetInfinitePackageItemsData = {
        memo: newMemo,
        nextToken: response.nextToken ?? undefined,
        previous: false
    }
    
    return returnData
}

async function getPackageDataFromPath(path: string){
    console.log('api call')

    const result = await downloadData({
        path: path,
    }).result

    const file = new File([await result.body.blob()], path.substring(path.indexOf('_') + 1), { type: result.contentType })

    return file
}

export interface CreatePackageParams {
    pack: Package,
    options?: {
        logging?: boolean,
        metric?: boolean
    }
}
export async function createPackageMutation(params: CreatePackageParams) {
    const start = new Date()
    const createPackageResponse = await client.models.Package.create({
        id: params.pack.id,
        name: params.pack.name,
        tagId: params.pack.tagId,
        createdAt: new Date().toISOString(),
        //optionals
        description: params.pack.description,
        pdfPath: params.pack.pdfPath
    })
    if(params.options?.logging) console.log(createPackageResponse)

    const createPackageItemsResponses = await Promise.all(params.pack.items.map(async (item) => {
        const collectionItemsResponses = await Promise.all(item.collectionIds.map((id) => {
            return client.models.PackageItemCollection.create({ 
                collectionId: id, 
                packageItemId: item.id 
            })
        }))

        return [
            collectionItemsResponses, 
            await client.models.PackageItem.create({
                id: item.id,
                name: item.name,
                packageId: params.pack.id,
                order: item.order,
                //optionals
                description: item.description,
                quantity: item.quantities,
                max: item.max,
                price: item.price,
                discount: item.discount,
                createdAt: new Date().toISOString()
            })
        ]
    }))

    if(params.options?.logging) console.log(createPackageItemsResponses)
    if(params.options?.metric) console.log(`CREATEPACKAGE:${new Date().getTime() - start.getTime()}ms`)
}

export interface UpdatePackageParams {
    pack: Package,
    name: string,
    tagId: string,
    description?: string,
    items: PackageItem[],
    pdfPath?: string,
    options?: {
        logging?: boolean,
        metric?: boolean
    }
}
export async function updatePackageMutation(params: UpdatePackageParams) {
    const start = new Date()

    const newItems: Record<string, PackageItem> = Object.fromEntries(params.items
        .filter((item) => !params.pack.items.some((pItem) => pItem.id === item.id))
        .map((item) => ([item.id, item]))
    )

    const packItems: Record<string, PackageItem> = Object.fromEntries(params.pack.items.map((item) => ([item.id, item])))

    const removedItems = params.pack.items.filter((item) => !params.items.some((pItem) => pItem.id === item.id))

    const differentItemCollections = params.items.some((item) => 
        packItems[item.id].collectionIds.some((id) => !item.collectionIds.some((nId) => nId === id)) ||
        item.collectionIds.some((id) => !packItems[item.id].collectionIds.some((nId) => nId === id))
    )

    const currentItemConnections: Record<string, [string, string][]> = differentItemCollections ?
        Object.fromEntries(await Promise.all(params.pack.items.map(async (item) => {
            let collectionItemsResponse = await client.models.PackageItemCollection
                .listPackageItemCollectionByPackageItemId({ packageItemId: item.id })
            const collectionItemsData = collectionItemsResponse.data

            while(collectionItemsResponse.nextToken) {
                collectionItemsResponse = await client.models.PackageItemCollection
                    .listPackageItemCollectionByPackageItemId(
                        { packageItemId: item.id }, 
                        { nextToken: collectionItemsResponse.nextToken }
                    )
                collectionItemsData.push(...collectionItemsResponse.data)
            }
            
            const connectionIds: [string, string][] = collectionItemsData
                .map((connections) => ([connections.id, connections.collectionId]))

            return ([ item.id, connectionIds ])
        }))) : []

    const itemUpdatesResponse = await Promise.all(params.items.map(async (item) => {
        if(newItems[item.id]) {
            const collectionItemsResponses = await Promise.all(item.collectionIds.map(async (id) => {
                return client.models.PackageItemCollection.create({ 
                    collectionId: id, 
                    packageItemId: item.id 
                })
            }))
            return [
                collectionItemsResponses,
                await client.models.PackageItem.create({
                    id: item.id,
                    name: item.name,
                    packageId: params.pack.id,
                    order: item.order,
                    //optionals
                    description: item.description,
                    quantity: item.quantities,
                    max: item.max,
                    price: item.price,
                    discount: item.discount,
                    createdAt: new Date().toISOString()
                })
            ]
        }
        else if(
            packItems[item.id].name !== item.name ||
            packItems[item.id].description !== item.description ||
            packItems[item.id].order !== item.order ||
            packItems[item.id].quantities !== item.quantities ||
            packItems[item.id].collectionIds.some((id) => !item.collectionIds.some((nId) => nId === id)) ||
            item.collectionIds.some((id) => !packItems[item.id].collectionIds.some((nId) => nId === id)) ||
            packItems[item.id].max !== item.max ||
            packItems[item.id].price !== item.price ||
            packItems[item.id].discount !== item.discount
        ) {
            const removedCollectionItems = await Promise.all(packItems[item.id].collectionIds
                .filter((id) => !item.collectionIds.some((nId) => nId === id))
                .map((id) => {
                    const foundConnectionId = currentItemConnections[item.id].find((connection) => connection[1] === id)?.[0]

                    if(foundConnectionId) {
                        return client.models.PackageItemCollection.delete({ id: foundConnectionId })
                    }
                })
            )

            const newCollectionItems = await Promise.all(item.collectionIds
                .filter((id) => !packItems[item.id].collectionIds.some((oId) => oId === id))
                .map((id) => {
                    return client.models.PackageItemCollection.create({
                        packageItemId: item.id,
                        collectionId: id
                    })
                })
            )

            return [
                removedCollectionItems,
                newCollectionItems,
                await client.models.PackageItem.update({
                    id: item.id,
                    name: item.name,
                    packageId: params.pack.id,
                    order: item.order,
                    //optionals
                    description: item.description,
                    quantity: item.quantities,
                    max: item.max,
                    price: item.price,
                    discount: item.discount,
                })
            ]
        }
    }))

    if(params.options?.logging) console.log(itemUpdatesResponse)

    const removedItemsResponse = await Promise.all(removedItems.map((item) => client.models.PackageItem.delete({ id: item.id })))

    if(params.options?.logging) console.log(removedItemsResponse)

    if(
        params.pack.name !== params.name ||
        params.pack.description !== params.description ||
        params.pack.tagId !== params.tagId ||
        params.pack.pdfPath !== params.pdfPath
    ) {
        const response = await client.models.Package.update({
            id: params.pack.id,
            name: params.name,
            description: params.description,
            tagId: params.tagId
        })

        if(params.options?.logging) console.log(response)
    }

    if(params.options?.metric) console.log(`UPDATEPACKAGE:${new Date().getTime() - start.getTime()}ms`)
}

export interface DeletePackageParams {
    pack: Package
    options?: {
        logging?: boolean,
        metric?: boolean
    }
}
export async function deletePackageMutation(params: DeletePackageParams) {
    const start = new Date()

    const deletePackResponse = await client.models.Package.delete({ id: params.pack.id })
    if(params.options?.logging) console.log(deletePackResponse)

    const itemConnectionDeletions = await Promise.all(params.pack.items.map(async (item) => {
        let connectionResponse = await client.models.PackageItemCollection
            .listPackageItemCollectionByPackageItemId({ packageItemId: item.id })
        const connectionData = connectionResponse.data

        while(connectionResponse.nextToken) {
            connectionResponse = await client.models.PackageItemCollection
                .listPackageItemCollectionByPackageItemId({ packageItemId: item.id }, { nextToken: connectionResponse.nextToken })
            connectionData.push(...connectionResponse.data)
        }

        return [
            await client.models.PackageItem.delete({ id: item.id }),
            await Promise.all(connectionData.map((connection) => (
                client.models.PackageItemCollection.delete({ id: connection.id })
            )))
        ]
    }))
    if(params.options?.logging) console.log(itemConnectionDeletions)
    if(params.options?.metric) console.log(`DELETEPACKAGEMUTATION:${new Date().getTime() - start.getTime()}ms`)
}

export const getPackagesByUserTagsQueryOptions = (tags: UserTag[]) => queryOptions({
    queryKey: ['package', client, tags],
    queryFn: () => getPackagesByUserTags(client, tags)
})

export const getAllPackagesQueryOptions = (options?: GetInfinitePackagesOptions) => infiniteQueryOptions({
    queryKey: ['package', client, options],
    queryFn: ({ pageParam }) => getInfinitePackages(client, pageParam, options),
    getNextPageParam: (lastPage) => lastPage.nextToken ? lastPage : undefined,
    initialPageParam: ({
        memo: [] as Package[]
    } as GetInfinitePackagesData),
    refetchOnWindowFocus: false,
})

export const getAllPackageItemsQueryOptions = (options?: GetInfinitePackageItemsOptions) => infiniteQueryOptions({
    queryKey: ['packageItems', client, options],
    queryFn: ({ pageParam }) => getInfinitePackageItems(client, pageParam, options),
    getNextPageParam: (lastPage) => lastPage.nextToken ? lastPage : undefined,
    initialPageParam: ({
        memo: [] as PackageItem[]
    } as GetInfinitePackageItemsData),
    refetchOnWindowFocus: false,
})

export const getPackageDataFromPathQueryOptions = (path: string) => queryOptions({
    queryKey: ['packagePath', path],
    queryFn: () => getPackageDataFromPath(path)
})