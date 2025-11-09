import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CollectionService } from '../../../services/collectionService'
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
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'

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
    const client = context.client as V6Client<Schema>
    return {
      CollectionService: new CollectionService(client),
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
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>()
  const [selectedCollection, setSelectedCollection] = useState<PhotoCollection | undefined>()
  const [search, setSearch] = useState<string>('')
  const [expandedTitle, setExpandedTitle] = useState<string>()

  const tagsPromise = useSuspenseQuery(getAllUserTagsQueryOptions({ siCollections: false }))
  const watermarkQuery = useQuery(data.CollectionService.getAllWatermarkObjectsQueryOptions({ resolveUrl: false }))
  const shareTemplatesQuery = useQuery(getAllShareTemplatesQueryOptions())

  //TODO: convert me to an infinite query and conditional enabling
  const collectionsQuery = useQuery(data.CollectionService.getAllPhotoCollectionsQueryOptions({ 
    siTags: false,
    siPaths: false,
    siSets: false,
  }))
  const collectionQuery = useQuery(data.CollectionService.getPhotoCollectionByIdQueryOptions(selectedCollectionId, {
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

  const filteredItems = photoCollections
    .filter((item) => {
      let filterResult = false
      try {
        filterResult = item.name
          .trim()
          .toLocaleLowerCase()
          .includes(search)
      } catch (err) {
        return false
      }
      return filterResult
    })
    .filter((item) => item !== undefined)

  const coverPaths: Record<string, UseQueryResult<[string | undefined, string] | undefined, Error>> = 
    Object.fromEntries(
      useQueries({
        queries: photoCollections
          .filter((collection) => collection.id !== selectedCollection?.id)
          .map((collection) => 
            data.CollectionService.getPathQueryOptions(collection.coverPath, collection.id)
          )
      }).map((query, index) => {
        return [
          photoCollections[index].id,
          query
        ]
      })
    )

  const selectedCoverPath = useQuery(
    data.CollectionService.getPathQueryOptions(selectedCollection?.coverPath, selectedCollection?.id)
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
          CollectionService={data.CollectionService}
          open={createCollectionVisible}
          onClose={() => setCreateCollectionVisible(false)}
          onSubmit={async (collection) => {
            if (collection) {
              setPhotoCollections([...photoCollections, collection])
              setSelectedCollection(collection)
              navigate({ to: '.', search: { collection: collection.id }})
            }
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
            CollectionService={data.CollectionService}
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
                  onChange={(event) => setSearch(event.target.value)}
                  value={search}
                />
                <button
                  className="flex flex-row gap-4 border border-gray-300 items-center justify-between hover:bg-gray-100 rounded-xl py-2 me-4"
                  onClick={() => {setCreateCollectionVisible(true)}}
                >
                  <span className="text-xl ms-4">Create New Collection</span>
                  <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2" />
                </button>
              </div>
              <div className='grid grid-cols-3 border border-gray-400 rounded-2xl py-8 mt-4 justify-items-center gap-y-10 max-h-[90vh] overflow-y-auto'>
                {photoCollections && photoCollections.length > 0 ? (
                  search && filteredItems.length === 0 ? (
                    <div className="self-center col-start-2 flex flex-row items-center justify-center">
                      <span className='italic text-xl font-light'>No Collections Found</span>
                    </div>
                  ) : (
                    filteredItems
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((collection, index) => {
                        const path = coverPaths[collection.id]
                        return (
                          <CollectionThumbnail 
                            CollectionService={data.CollectionService}
                            collectionId={collection.id}
                            cover={path}
                            onClick={() => {
                              navigate({to: '.', search: { collection: collection.id }})
                              setSelectedCollection(collection)
                              setSelectedCollectionId(collection.id)
                            }}
                            key={index}
                            contentChildren={(
                              <div className="flex flex-row gap-1 font-thin opacity-90 justify-start">
                                <Tooltip
                                  theme={{ target: undefined }} 
                                  style='light' 
                                  placement='bottom' 
                                  content={(<p>Collection Is {collection.published ? '' : 'Not '}Published</p>)}
                                >
                                  <p 
                                    onMouseEnter={() => setExpandedTitle(collection.id)}
                                    onMouseLeave={() => setExpandedTitle(undefined)}
                                    className={`
                                      max-w-[180px] hover:cursor-pointer
                                      ${expandedTitle === collection.id ? '' : 'truncate'}
                                      ${collection.published ? 'text-green-400' : 'text-gray-600 italic'} 
                                    `}
                                  >{collection.name}</p>
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
        )
      )}
    </>
  )
}
