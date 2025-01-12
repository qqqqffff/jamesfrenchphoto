import { createFileRoute } from '@tanstack/react-router'
import { HiOutlinePlusCircle } from 'react-icons/hi'
import {
  getAllWatermarkObjectsQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import PhotoCollectionPannel from '../../../components/admin/PhotoCollectionPannel'

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

  return (
    <>
      {/* <CreateCollectionModal TODO: move me too
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
      /> */}
      
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
      <div className="grid grid-cols-6 gap-2 mt-4 font-main">
        <div className="flex flex-col ms-5 border border-gray-400 rounded-2xl p-2">
          <button
            className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer"
            onClick={() => {}}
          >
            <span className="text-xl ms-4 mb-1">Create New Event</span>
            <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2" />
          </button>

          <div className="w-full border border-gray-200 my-2"></div>

        </div>
        <div className="col-span-5">
            <PhotoCollectionPannel 
              watermarkObjects={watermarkObjects}
              availableTags={availableTags}
            />
        </div>
      </div>
    </>
  )
}
