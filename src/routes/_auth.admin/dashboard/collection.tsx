import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getAllPhotoCollectionsQueryOptions,
  getAllWatermarkObjectsQueryOptions,
  getPhotoCollectionByIdQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { PhotoCollectionPannel } from '../../../components/admin/collection/PhotoCollectionPannel'
import { useQuery } from '@tanstack/react-query'
import { CreateCollectionModal } from '../../../components/modals'
import { useState } from 'react'
import { PhotoCollection, PhotoSet, Watermark } from '../../../types'
import { Progress, TextInput, Tooltip } from 'flowbite-react'
import { textInputTheme } from '../../../utils'
import { HiOutlinePlusCircle } from 'react-icons/hi2'
import { CollectionThumbnail } from '../../../components/admin/collection/CollectionThumbnail'

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
    let collection: PhotoCollection | undefined
    let set: PhotoSet | undefined
    if(context.collection){
      collection = await context.queryClient.ensureQueryData(getPhotoCollectionByIdQueryOptions(context.collection))
      if(collection && context.set) {
        set = collection.sets.find((set) => context.set === set.id)
      }
    }else{
      collection = undefined
    }
    return {
      availableTags,
      watermarkObjects,
      collection,
      set,
      auth: context.auth,
      collectionConsole: context.console ?? 'sets'
    }
  }
})

function RouteComponent() {
  const { availableTags, watermarkObjects, collection, set, auth, collectionConsole } = Route.useLoaderData()
  const navigate = useNavigate()

  const [watermarks, setWatermarks] = useState<Watermark[]>(watermarkObjects)
  const [createCollectionVisible, setCreateCollectionVisible] = useState(false)
  const [filteredItems, setFilteredItems] = useState<PhotoCollection[]>()
  const [selectedCollection, setSelectedCollection] = useState<PhotoCollection | undefined>(collection)

  const collections = useQuery(getAllPhotoCollectionsQueryOptions({
    siTags: true, 
    siSets: true, 
    siPaths: true,
    metric: true,
  }))

  function filterItems(term: string): undefined | void {
    if (!term || !collections.data || collections.data.length <= 0) {
      setFilteredItems(undefined)
      return
    }

    const normalSearchTerm = term.trim().toLocaleLowerCase()

    const data: PhotoCollection[] = collections.data
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

  return (
    <>
      <CreateCollectionModal
        open={createCollectionVisible}
        onClose={() => setCreateCollectionVisible(false)}
        onSubmit={async (collection) => {
          if (collection) {
            collections.refetch()
            // setSelectedCollection(collection)
          }
          //TODO: error handle
        }}
        availableTags={availableTags}
      />
      
      {/* <ConfirmationModal TODO: move me
        title={'Delete Collection'}
        body={`Deleting Event <b>${selectedCollection?.name}</b> will delete <b>ALL</b> collections,\n and <b>ALL</b> associated photos. This action <b>CANNOT</b> be undone!`}
        denyText={'Cancel'}
        confirmText={'Delete'}
        confirmAction={async () => {
          if (selectedCollection) {
            setLoading(true)
            deleteCollection.mutate({ collection: selectedCollection})
            setSelectedCollection(undefined)
          } else {
            //TODO: error handle
          }
        }}
        open={deleteConfirmationVisible}
        onClose={() => setDeleteConfirmationVisible(false)}
      /> */}
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
              {collections.isLoading ? (
                <div className="self-center col-start-2 flex flex-row items-center justify-center min-w-[200px]">
                  <Progress
                    progress={100}
                    textLabel="Loading..."
                    textLabelPosition="inside"
                    labelText
                    size="lg"
                    className="min-w-[200px]"
                  />
                </div>
              ) : (
                collections.data && collections.data.length > 0 ? (
                  filteredItems ? (
                    filteredItems.length > 0 ? (
                      filteredItems
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((collection, index) => {
                          return (
                            <CollectionThumbnail 
                              collectionId={collection.id}
                              cover={collection.coverPath}
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
                        <span >No results!</span>
                      </div>
                    )
                  ) : (
                    collections.data
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((collection, index) => {
                        return (
                          <CollectionThumbnail 
                            collectionId={collection.id}
                            cover={collection.coverPath}
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
              )}
            </div>
          </div>
        </div>
      ) : (
        <PhotoCollectionPannel 
          coverPath={selectedCollection.coverPath}
          collection={selectedCollection}
          updateParentCollection={setSelectedCollection}
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
                'sets' as 'sets'
              )
            )
          }
        />
      )}
    </>
  )
}
