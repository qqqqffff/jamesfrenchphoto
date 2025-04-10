import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getAllPhotoCollectionsQueryOptions,
  getAllWatermarkObjectsQueryOptions,
  getPathQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { PhotoCollectionPannel } from '../../../components/admin/collection/PhotoCollectionPannel'
import { useQueries } from '@tanstack/react-query'
import { CreateCollectionModal } from '../../../components/modals'
import { useEffect, useState } from 'react'
import { PhotoCollection, PhotoSet, ShareTemplate, Watermark } from '../../../types'
import { TextInput, Tooltip } from 'flowbite-react'
import { textInputTheme } from '../../../utils'
import { HiOutlinePlusCircle } from 'react-icons/hi2'
import { CollectionThumbnail } from '../../../components/admin/collection/CollectionThumbnail'
import { getAllShareTemplatesQueryOptions } from '../../../services/shareService'
import Loading from '../../../components/common/Loading'

interface CollectionSearchParams {
  collection?: string,
  set?: string,
  console?: string,
}

export const Route = createFileRoute('/_auth/admin/dashboard/collection')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): CollectionSearchParams => ({
    collection: (search.collection as string) || undefined,
    set: (search.set as string) || undefined,
    console: (search.console as string) || 'sets'
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context }) => {
    const availableTags = await context.queryClient.ensureQueryData(getAllUserTagsQueryOptions({ siCollections: false }))
    const watermarkObjects = await context.queryClient.ensureQueryData(getAllWatermarkObjectsQueryOptions({ resolveUrl: false }))
    const shareTemplates = await context.queryClient.ensureQueryData(getAllShareTemplatesQueryOptions())
    let collection: PhotoCollection | undefined
    let set: PhotoSet | undefined
    //TODO: convert me to infinite query
    const collections = await context.queryClient.ensureQueryData(getAllPhotoCollectionsQueryOptions({
      siTags: true,
      siSets: true,
      siPaths: true
    }))

    if(context.collection){
      collection = collections.find((col) => col.id === context.collection)
      if(collection && context.set) {
        set = collection.sets.find((set) => context.set === set.id)
      }
    }

    return {
      availableTags,
      watermarkObjects,
      collection,
      set,
      auth: context.auth,
      collectionConsole: context.console ?? 'sets',
      templates: shareTemplates,
      collections: collections
    }
  },
  pendingComponent: () => (
    <div className="flex flex-col w-full items-center justify-center mt-2">
      <div className="w-[80%] flex flex-col">
        <div className='border border-gray-400 rounded-2xl p-4 mt-4 justify-items-center '>
          <div className="self-center grid grid-cols-2 min-w-[200px]">
            <span className='flex flex-row-reverse'>Loading Collections</span>
            <Loading className='self-start'/>
          </div>
        </div>
      </div>
    </div>
  )
})

function RouteComponent() {
  const { 
    availableTags, 
    watermarkObjects, 
    collection, 
    set, 
    auth, 
    collectionConsole,
    templates,
    collections
  } = Route.useLoaderData()
  const navigate = useNavigate()

  const [photoCollections, setPhotoCollections] = useState<PhotoCollection[]>(collections)
  const [watermarks, setWatermarks] = useState<Watermark[]>(watermarkObjects)
  const [shareTemplates, setShareTemplates] = useState<ShareTemplate[]>(templates)
  const [createCollectionVisible, setCreateCollectionVisible] = useState(false)
  const [filteredItems, setFilteredItems] = useState<PhotoCollection[]>()
  const [selectedCollection, setSelectedCollection] = useState<PhotoCollection | undefined>(collection)

  useEffect(() => {
    if(collection !== selectedCollection){
      setSelectedCollection(collection)
    }
    if(collections.some((parentCollection) => !photoCollections.some((childCollection) => childCollection.id === parentCollection.id))) {
      setPhotoCollections(collections)
    }
  }, [collection, collections])

  function filterItems(term: string): undefined | void {
    if (!term) {
      setFilteredItems(undefined)
      return
    }

    const normalSearchTerm = term.trim().toLocaleLowerCase()

    const data: PhotoCollection[] = photoCollections
      .filter((item) => {
        let filterResult = false
        try {
          filterResult = item.name
            .trim()
            .toLocaleLowerCase()
            .includes(normalSearchTerm)
        } catch (err) {
          return false
        }
        return filterResult
      })
      .filter((item) => item !== undefined)

    setFilteredItems(data)
  }

  const coverPaths = useQueries({
    queries: photoCollections
      .map((collection) => 
        getPathQueryOptions(collection.coverPath, collection.id)
      )
  }).map((query, index) => {
    return {
      id: photoCollections[index].id,
      query: photoCollections[index].coverPath ? query : undefined
    }
  })

  return (
    <>
      <CreateCollectionModal
        open={createCollectionVisible}
        onClose={() => setCreateCollectionVisible(false)}
        onSubmit={async (collection) => {
          if (collection) {
            setPhotoCollections([...photoCollections, collection])
            setSelectedCollection(collection)
            navigate({ to: '.', search: { collection: collection.id }})
          }
          //TODO: error handle
        }}
        availableTags={availableTags}
      />
      {!selectedCollection ? (
        <div className="flex flex-col w-full items-center justify-center mt-2">
          <div className="w-[80%] flex flex-col">
            <div className='flex flex-row w-full justify-between'>
              <TextInput
                className="self-center w-[60%] max-w-[400px] ms-4"
                theme={textInputTheme}
                sizing='lg'
                placeholder="Search"
                onChange={(event) => filterItems(event.target.value)}
              />
              <button
                className="flex flex-row gap-4 border border-gray-300 items-center justify-between hover:bg-gray-100 rounded-xl py-2 me-4"
                onClick={() => {setCreateCollectionVisible(true)}}
              >
                <span className="text-xl ms-4">Create New Collection</span>
                <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2" />
              </button>
            </div>
            <div className='grid grid-cols-3 border border-gray-400 rounded-2xl p-4 mt-4 justify-items-center '>
              {photoCollections && photoCollections.length > 0 ? (
                  filteredItems ? (
                    filteredItems.length > 0 ? (
                      filteredItems
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((collection, index) => {
                          const path = coverPaths?.find((path) => path.id === collection.id)
                          return (
                            <CollectionThumbnail 
                              collectionId={collection.id}
                              cover={path?.query}
                              onClick={() => {
                                navigate({to: '.', search: { collection: collection.id }})
                                setSelectedCollection(collection)
                              }}
                              key={index}
                              contentChildren={(
                                <div className="flex flex-row gap-1 font-thin opacity-90 items-center justify-start">
                                  <Tooltip content={(<p>Collection Has {collection.published ? 'Been Published' : 'Not Been Published'}</p>)}>
                                    <p className={`${collection.published ? 'text-green-400' : 'text-gray-600 italic'}`}>{collection.name}</p>
                                  </Tooltip>
                                  <p>&bull;</p>
                                  <p>Items: {collection.items}</p>
                                  <p>&bull;</p>
                                  <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
                                </div>
                              )}
                            />
                          )
                        })
                    ) : (
                      <div className="self-center col-start-2 flex flex-row items-center justify-center">
                        <span>No results!</span>
                      </div>
                    )
                  ) : (
                    photoCollections
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((collection, index) => {
                        const path = coverPaths?.find((path) => path.id === collection.id)
                        return (
                          <CollectionThumbnail 
                            collectionId={collection.id}
                            cover={path?.query}
                            onClick={() => {
                              navigate({to: '.', search: { collection: collection.id }})
                              setSelectedCollection(collection)
                            }}
                            key={index}
                            contentChildren={(
                              <div className="flex flex-row gap-1 font-thin opacity-90 items-center justify-start">
                                <Tooltip content={(<p>Collection Has {collection.published ? 'Been Published' : 'Not Been Published'}</p>)}>
                                  <p className={`${collection.published ? 'text-green-400' : 'text-gray-600 italic'}`}>{collection.name}</p>
                                </Tooltip>
                                <p>&bull;</p>
                                <p>Items: {collection.items}</p>
                                <p>&bull;</p>
                                <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
                              </div>
                            )}
                          />
                        )
                      })
                  )
                ) : (
                  <div className="self-center col-start-2 flex flex-row items-center justify-center">
                    <span >No collections yet!</span>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      ) : (
        <PhotoCollectionPannel 
          coverPath={coverPaths?.find((path) => path.id === selectedCollection.id)?.query}
          collection={selectedCollection}
          updateParentCollection={setSelectedCollection}
          updateParentCollections={setPhotoCollections}
          set={set}
          watermarkObjects={watermarks}
          updateWatermarkObjects={setWatermarks}
          availableTags={availableTags}
          auth={auth}
          parentActiveConsole={
            collectionConsole === 'favorites' ? (
              'favorites' as 'favorites'
            ) : (
            collectionConsole === 'watermarks' ? (
              'watermarks' as 'watermarks'
            ) : (
            collectionConsole === 'share' ? (
              'share' as 'share'
            ) : (
            collectionConsole === 'users' ? (
              'users' as 'users'
            ) : (
            collectionConsole === 'cover' ? (
              'cover' as 'cover'
            ) : (
              'sets' as 'sets'
            )))))
          }
          shareTemplates={shareTemplates}
          updateShareTemplates={setShareTemplates}
        />
      )}
    </>
  )
}
