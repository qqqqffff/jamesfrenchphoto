import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getAllPhotoCollectionsQueryOptions,
  getAllWatermarkObjectsQueryOptions,
  getPathQueryOptions,
  getPhotoCollectionByIdQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { PhotoCollectionPanel } from '../../../components/admin/collection/PhotoCollectionPanel'
import { useQueries, useQuery, UseQueryResult, useSuspenseQuery } from '@tanstack/react-query'
import { CreateCollectionModal, LoadingModal } from '../../../components/modals'
import { Suspense, useEffect, useState } from 'react'
import { PhotoCollection, ShareTemplate, Watermark } from '../../../types'
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
  page?: number
}

export const Route = createFileRoute('/_auth/admin/dashboard/collection')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): CollectionSearchParams => ({
    collection: (search.collection as string) || undefined,
    set: (search.set as string) || undefined,
    console: (search.console as string) || undefined,
    page: (search.page as number) || undefined
  }),
  beforeLoad: ({ search }) => search,
  loader: ({ context }) => {
    return {
      set: context.set,
      collection: context.collection,
      auth: context.auth,
      collectionConsole: context.console ?? 'sets',
    }
  },
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  const [photoCollections, setPhotoCollections] = useState<PhotoCollection[]>([])
  const [watermarks, setWatermarks] = useState<Watermark[]>([])
  const [shareTemplates, setShareTemplates] = useState<ShareTemplate[]>([])
  const [createCollectionVisible, setCreateCollectionVisible] = useState(false)
  const [filteredItems, setFilteredItems] = useState<PhotoCollection[]>()
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>()
  const [selectedCollection, setSelectedCollection] = useState<PhotoCollection | undefined>()

  const tagsPromise = useSuspenseQuery(getAllUserTagsQueryOptions({ siCollections: false }))
  const watermarkQuery = useQuery(getAllWatermarkObjectsQueryOptions({ resolveUrl: false }))
  const shareTemplatesQuery = useQuery(getAllShareTemplatesQueryOptions())

  //TODO: convert me to an infinite query and conditional enabling
  const collectionsQuery = useQuery(getAllPhotoCollectionsQueryOptions({ 
    siTags: false,
    siPaths: false,
    siSets: false,
  }))
  const collectionQuery = useQuery(getPhotoCollectionByIdQueryOptions(selectedCollectionId, {
      siSets: true,
      siTags: true,
      participantId: data.auth.user?.profile.activeParticipant?.id
    }
  ))

  useEffect(() => {
    if(watermarkQuery.data) {
      setWatermarks(watermarkQuery.data)
    }
  }, [watermarkQuery.data])

  useEffect(() => {
    if(shareTemplatesQuery.data) {
      setShareTemplates(shareTemplatesQuery.data)
    }
  }, [shareTemplatesQuery.data])

  useEffect(() => {
    if(collectionsQuery.data) {
      setPhotoCollections(collectionsQuery.data)
    }
  }, [collectionsQuery.data])

  useEffect(() => {
    if(data.collection) {
      setSelectedCollectionId(data.collection)
    }
    else {
      setSelectedCollectionId(undefined)
    }
  }, [data.collection])

  useEffect(() => {
    if(collectionQuery.data) {
      setSelectedCollection(collectionQuery.data)
    }
    else {
      setSelectedCollection(undefined)
    }
  }, [collectionQuery.data])

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

  const coverPaths: Record<string, UseQueryResult<[string | undefined, string] | undefined, Error>> = 
    Object.fromEntries(
      useQueries({
        queries: photoCollections
          .filter((collection) => collection.id !== selectedCollection?.id)
          .map((collection) => 
            getPathQueryOptions(collection.coverPath, collection.id)
          )
      }).map((query, index) => {
        return [
          photoCollections[index].id,
          query
        ]
      })
    )

  const selectedCoverPath = useQuery(
    getPathQueryOptions(selectedCollection?.coverPath, selectedCollection?.id)
  )

  return (
    <>
      <Suspense 
        fallback={
          <LoadingModal 
            open={createCollectionVisible}
            header={`${selectedCollection ? 'Create' : 'Update'} Collection`}
            size='2xl'
            className='font-main'
            onClose={() => setCreateCollectionVisible(false)}
          />
        }
      >
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
        />
      </Suspense>
      {selectedCollectionId ? (
        collectionQuery.isPending || !selectedCollection ? (
          <div className="flex flex-col w-full items-center justify-center mt-2">
            <div className="w-[80%] flex flex-col">
              <div className='border border-gray-400 rounded-2xl p-4 mt-4 justify-items-center '>
                <div className="self-center grid grid-cols-2 min-w-[200px]">
                  <span className='flex flex-row-reverse'>Loading Collection</span>
                  <Loading className='self-start'/>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PhotoCollectionPanel 
            coverPath={selectedCoverPath}
            collection={selectedCollection}
            updateParentCollection={setSelectedCollection}
            updateParentCollections={setPhotoCollections}
            set={selectedCollection.sets.find((set) => set.id === data.set)}
            watermarkObjects={watermarks}
            updateWatermarkObjects={setWatermarks}
            availableTags={tagsPromise.data}
            auth={data.auth}
            parentActiveConsole={
              data.collectionConsole === 'favorites' ? (
                'favorites' as 'favorites'
              ) : (
              data.collectionConsole === 'watermarks' ? (
                'watermarks' as 'watermarks'
              ) : (
              data.collectionConsole === 'share' ? (
                'share' as 'share'
              ) : (
              data.collectionConsole === 'users' ? (
                'users' as 'users'
              ) : (
              data.collectionConsole === 'cover' ? (
                'cover' as 'cover'
              ) : (
                'sets' as 'sets'
              )))))
            }
            shareTemplates={shareTemplates}
            updateShareTemplates={setShareTemplates}
          />
        )
      ) : (
        collectionsQuery.isPending ? (
          <div className="flex flex-col w-full items-center justify-center mt-2">
            <div className="w-[80%] flex flex-col">
              <div className='border border-gray-400 rounded-2xl p-4 mt-4 justify-items-center '>
                <div className="self-center grid grid-cols-2 min-w-[200px]">
                  <span className='flex flex-row-reverse'>Loading Collections List</span>
                  <Loading className='self-start'/>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
                          const path = coverPaths[collection.id]
                          return (
                            <CollectionThumbnail 
                              collectionId={collection.id}
                              cover={path}
                              onClick={() => {
                                navigate({to: '.', search: { collection: collection.id }})
                                setSelectedCollection(collection)
                                setSelectedCollectionId(collection.id)
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
                        const path = coverPaths[collection.id]
                        return (
                          <CollectionThumbnail 
                            collectionId={collection.id}
                            cover={path}
                            onClick={() => {
                              navigate({to: '.', search: { collection: collection.id }})
                              setSelectedCollection(collection)
                              setSelectedCollectionId(collection.id)
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
                )}
              </div>
            </div>
          </div>
        )
      )}
    </>
  )
}
