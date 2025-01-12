import { createFileRoute } from '@tanstack/react-router'
import {
  getAllPhotoCollectionsQueryOptions,
  getAllWatermarkObjectsQueryOptions,
  getPathQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import PhotoCollectionPannel from '../../../components/admin/PhotoCollectionPannel'
import { useQueries, useQuery } from '@tanstack/react-query'
import { CreateCollectionModal } from '../../../components/modals'
import { useState } from 'react'
import { PhotoCollection } from '../../../types'
import { Progress, TextInput } from 'flowbite-react'
import { textInputTheme } from '../../../utils'
import { HiOutlinePlusCircle } from 'react-icons/hi2'
import CollectionThumbnail from '../../../components/admin/CollectionThumbnail'

export const Route = createFileRoute('/_auth/admin/dashboard/collection')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const availableTags = await context.queryClient.ensureQueryData(getAllUserTagsQueryOptions({ siCollections: false }))
    const watermarkObjects = await context.queryClient.ensureQueryData(getAllWatermarkObjectsQueryOptions())

    return {
      availableTags,
      watermarkObjects
    }
  }
})

function RouteComponent() {
  const { availableTags, watermarkObjects} = Route.useLoaderData()

  const [createCollectionVisible, setCreateCollectionVisible] = useState(false)
  const [filteredItems, setFilteredItems] = useState<PhotoCollection[]>()
  const [selectedCollection, setSelectedCollection] = useState<PhotoCollection>()

  const collections = useQuery(getAllPhotoCollectionsQueryOptions({siTags: false, siSets: false}))
  const coverPaths = useQueries({
    queries: (collections.data ?? [])
        .filter((collection) => collection.coverPath !== undefined)
        .map((collection) => {
            return getPathQueryOptions(collection.coverPath!)
        })
  })
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
  
      console.log(data)
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
      {/* <div className="flex flex-col ms-5 border border-gray-400 rounded-2xl p-2">
          <button
            className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer"
            onClick={() => {}}
          >
            <span className="text-xl ms-4 mb-1">Create New Event</span>
            <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2" />
          </button>

          <div className="w-full border border-gray-200 my-2"></div>

        </div> */}
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
                              collection={collection}
                              coverPath={coverPaths.find((path) => path.data?.[0] === collection.id)?.data?.[1]}
                              onClick={() => setSelectedCollection(collection)}
                              key={index}
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
                            collection={collection}
                            coverPath={coverPaths.find((path) => path.data?.[0] === collection.id)?.data?.[1]}
                            onClick={() => setSelectedCollection(collection)}
                            key={index}
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
          watermarkObjects={watermarkObjects}
          availableTags={availableTags}
        />
      )}
    </>
  )
}
