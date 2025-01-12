import { createFileRoute } from '@tanstack/react-router'
import { Dropdown, Progress, TextInput } from 'flowbite-react'
import { useState } from 'react'
import { HiOutlinePlusCircle } from 'react-icons/hi'
import {
  HiEllipsisHorizontal,
  HiOutlineMinusCircle,
  HiOutlinePencil,
} from 'react-icons/hi2'
import {
  ConfirmationModal,
  CreateCollectionModal,
} from '../../../components/modals'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  deleteCollectionMutation,
  DeleteCollectionParams,
  getAllPhotoCollectionsQueryOptions,
  getAllWatermarkObjectsQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { textInputTheme } from '../../../utils'
import { EventPannel } from '../../../components/admin/PhotoCollectionPannel'
import { PhotoCollection } from '../../../types'

export const Route = createFileRoute('/_auth/admin/dashboard/collection')({
  component: RouteComponent,
})

function RouteComponent() {
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false)
  const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)

  const [selectedCollection, setSelectedCollection] = useState<PhotoCollection>()
  const [loading, setLoading] = useState(false)
  const [filteredItems, setFilteredItems] = useState<PhotoCollection[]>()

  const availableTags = useQuery(
    getAllUserTagsQueryOptions({ siCollections: false }),
  )
  const collectionList = useQuery(getAllPhotoCollectionsQueryOptions({ siTags: false, siSets: true }))
  const watermarkObjects = useQuery(getAllWatermarkObjectsQueryOptions())
  const deleteCollection = useMutation({
    mutationFn: (params: DeleteCollectionParams) => deleteCollectionMutation(params),
    onSettled: async (data) => {
      if (data) {
        setSelectedCollection(undefined)
      }
      await collectionList.refetch()
      setLoading(false)
    },
  })

  function filterItems(term: string): undefined | void {
    if (!term || !collectionList.data || collectionList.data.length <= 0) {
      setFilteredItems(undefined)
      return
    }

    const normalSearchTerm = term.trim().toLocaleLowerCase()

    const data: PhotoCollection[] = collectionList.data
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
        open={createPhotoCollectionModalVisible}
        onClose={() => setCreatePhotoCollectionModalVisible(false)}
        onSubmit={async (collection) => {
          if (collection) {
            setLoading(true)
            await collectionList.refetch()
            setLoading(false)
          }
          //TODO: error handle
        }}
        availableTags={availableTags.data ?? []}
      />
      <ConfirmationModal
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
      />
      <div className="grid grid-cols-6 gap-2 mt-4 font-main">
        <div className="flex flex-col ms-5 border border-gray-400 rounded-2xl p-2">
          <button
            className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer"
            onClick={() => {}}
          >
            <span className="text-xl ms-4 mb-1">Create New Event</span>
            <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2" />
          </button>

          <TextInput
            className="self-center w-[80%]"
            theme={textInputTheme}
            sizing="sm"
            placeholder="Search"
            onChange={(event) => filterItems(event.target.value)}
          />
          <div className="w-full border border-gray-200 my-2"></div>

        </div>
        <div className="col-span-5">
          {selectedEvent === undefined ? (
            <div className={`w-[80%] border border-gray-400 rounded-2xl p-2 flex flex-row items-center justify-center me-4`}>
              Click An Event to View It's Collections
            </div>
          ) : 
            watermarkObjects.isLoading ||
            availableTags.isLoading ? (
            <div className={`w-[80%] border border-gray-400 rounded-2xl p-2 flex flex-row items-center justify-center me-4`}>
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
            <EventPannel
              event={selectedEvent}
              watermarkObjects={watermarkObjects.data ?? []}
              availableTags={availableTags.data ?? []}
            />
          )}
        </div>
      </div>
    </>
  )
}
