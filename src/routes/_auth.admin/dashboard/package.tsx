import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BuilderPanel } from '../../../components/admin/package/BuilderPanel'
import { Package, PackageItem, UserTag } from '../../../types'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { PackageService } from '../../../services/packageService'
import { CollectionService } from '../../../services/collectionService'
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'

export const Route = createFileRoute('/_auth/admin/dashboard/package')({
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>

    return {
      CollectionService: new CollectionService(client),
      PackageService: new PackageService(client),
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const [packages, setPackages] = useState<Package[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [allPackageItems, setAllPackageItems] = useState<PackageItem[]>([])

  const tagsQuery = useQuery(getAllUserTagsQueryOptions({ 
    siCollections: true, 
    siNotifications: false, 
    siTimeslots: true,
    siPackages: { }
  }))

  const packageItemsInfiniteQuery = useInfiniteQuery(data.PackageService.getInfinitePackageItemsQueryOptions({
    siCollectionItems: false
  }))

  //TODO: focus query based on selected tags and available user's collections
  const collectionQuery = useQuery(data.CollectionService.getAllPhotoCollectionsQueryOptions({
    siPaths: false,
    siSets: false,
    siTags: false
  }))

  const packagesQuery = useQuery(data.PackageService.getAllPackagesQueryOptions({
    siPackageItems: undefined
  }))

  useEffect(() => {
    if(packageItemsInfiniteQuery.data && (packageItemsInfiniteQuery.data.pages.length ?? 0) > 0) {
      setAllPackageItems(packageItemsInfiniteQuery.data.pages[
        packageItemsInfiniteQuery.data.pages.length - 1
      ].memo)
    }
  }, [packageItemsInfiniteQuery.data])

  useEffect(() => {
    if(packagesQuery.data && packagesQuery.data.length > 0) {
      setPackages(packagesQuery.data)
    }
  }, [packagesQuery.data])

  useEffect(() => {
    if(tagsQuery.data) {
      if(!tags.some((tag) => tagsQuery.data.some((pTag) => pTag.id === tag.id)) ||
        !tagsQuery.data.some((pTag) => tags.some((tag) => tag.id === pTag.id))
      ) {
        setTags(tagsQuery.data)
      }
    }
  }, [tagsQuery.data])
  
  return (
    <>
      <BuilderPanel 
        PackageService={data.PackageService}
        packages={packages}
        packagesQuery={packagesQuery}
        parentUpdatePackages={setPackages}
        tags={tags}
        parentUpdateTags={setTags}
        allPackageItems={allPackageItems}
        allPackageItemsQuery={packageItemsInfiniteQuery}
        collectionListQuery={collectionQuery}
      />
    </>
  )
}
