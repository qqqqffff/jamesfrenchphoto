import { createFileRoute } from '@tanstack/react-router'
import { Dropdown, Progress, TextInput } from 'flowbite-react'
import { useState } from 'react'
import { HiOutlinePlusCircle } from 'react-icons/hi'
import {
  HiEllipsisHorizontal,
  HiOutlineMinusCircle,
  HiOutlinePencil,
} from 'react-icons/hi2'
import { Event } from '../../../types'
import {
  ConfirmationModal,
  CreateCollectionModal,
  CreateEventModal,
} from '../../../components/modals'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  getAllWatermarkObjectsQueryOptions,
} from '../../../services/collectionService'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { textInputTheme } from '../../../utils'
import {
  deleteEventMutation,
  getAllEventsQueryOptions,
} from '../../../services/eventService'
import { EventPannel } from '../../../components/admin/EventPannel'

export const Route = createFileRoute('/_auth/admin/dashboard/collection')({
  component: RouteComponent,
})

function RouteComponent() {
  const [createEventModalVisible, setCreateEventModalVisible] = useState(false)
  const [
    createPhotoCollectionModalVisible,
    setCreatePhotoCollectionModalVisible,
  ] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event>()
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false)
  const [loading, setLoading] = useState(false)
  const [filteredItems, setFilteredItems] = useState<Event[]>()

  const availableTags = useQuery(
    getAllUserTagsQueryOptions({ siCollections: false }),
  )
  const eventList = useQuery(getAllEventsQueryOptions({ siCollections: false }))
  const watermarkObjects = useQuery(getAllWatermarkObjectsQueryOptions())
  const deleteEvent = useMutation({
    mutationFn: (eventId: string) => deleteEventMutation(eventId),
    onSettled: async (data) => {
      if (data) {
        setSelectedEvent(undefined)
      }
      await eventList.refetch()
      setLoading(false)
    },
  })

  function filterItems(term: string): undefined | void {
    if (!term || !eventList.data || eventList.data.length <= 0) {
      setFilteredItems(undefined)
      return
    }

    const normalSearchTerm = term.trim().toLocaleLowerCase()

    const data: Event[] = eventList.data
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
      <CreateEventModal
        open={createEventModalVisible}
        onClose={() => setCreateEventModalVisible(false)}
        onSubmit={async (event) => {
          if (event !== undefined) {
            console.log(event)
            setLoading(true)
            await eventList.refetch()
            setLoading(false)
            setSelectedEvent(undefined)
          } else {
            //TODO: error handle
          }
        }}
        event={selectedEvent}
      />
      <CreateCollectionModal
        eventId={selectedEvent?.id ?? ''}
        open={createPhotoCollectionModalVisible}
        onClose={() => setCreatePhotoCollectionModalVisible(false)}
        onSubmit={async (collection) => {
          if (collection) {
            setLoading(true)
            await eventList.refetch()
            setLoading(false)
          }
          //TODO: error handle
        }}
        availableTags={availableTags.data ?? []}
      />
      <ConfirmationModal
        title={'Delete Event'}
        body={`Deleting Event <b>${selectedEvent?.name}</b> will delete <b>ALL</b> collections,\n and <b>ALL</b> associated photos. This action <b>CANNOT</b> be undone!`}
        denyText={'Cancel'}
        confirmText={'Delete'}
        confirmAction={async () => {
          if (selectedEvent) {
            setLoading(true)
            deleteEvent.mutate(selectedEvent.id)
            setSelectedEvent(undefined)
          } else {
            //TODO: error handle
          }
        }}
        open={deleteConfirmationVisible}
        onClose={() => setDeleteConfirmationVisible(false)}
      />
      <div className="grid grid-cols-6 gap-2 mt-4 font-main">
        <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
          <button
            className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer"
            onClick={() => setCreateEventModalVisible(true)}
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

          {!eventList.isLoading && !loading ? (
            eventList.data && eventList.data.length > 0 ? (
              (filteredItems ?? eventList.data).map((event, index) => {
                const selectedEventClass = selectedEvent?.id === event.id ? 'bg-gray-200 hover:bg-gray-300 border-2 border-sky-300' : 'hover:bg-gray-100 border-2 border-transparent'
                return (
                  <div className="flex flex-col" key={index}>
                    <div className="flex flex-row">
                      <button
                        type="button"
                        className={`flex flex-row w-full items-center justify-start rounded-2xl py-1 bg-gray ${selectedEventClass}`}
                        onClick={() => {
                          setSelectedEvent(event)
                        }}
                      >
                        <span className="text-xl ms-4 mb-1">{event.name}</span>
                      </button>
                      <Dropdown
                        label={
                          <HiEllipsisHorizontal
                            size={24}
                            className="hover:border-gray-400 hover:border rounded-full"
                          />
                        }
                        inline
                        arrowIcon={false}
                      >
                        <Dropdown.Item
                          onClick={() => {
                            setCreateEventModalVisible(true)
                            setSelectedEvent(event)
                          }}
                        >
                          <HiOutlinePencil className="me-1" />
                          Rename Event
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            setCreatePhotoCollectionModalVisible(true)
                            setSelectedEvent(event)
                          }}
                        >
                          <HiOutlinePlusCircle className="me-1" />
                          Create Photo Collection
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => {
                            setDeleteConfirmationVisible(true)
                            setSelectedEvent(event)
                          }}
                        >
                          <HiOutlineMinusCircle className="me-1" />
                          Delete Event
                        </Dropdown.Item>
                      </Dropdown>
                    </div>
                  </div>
                )
              })
            ) : (
              <span className="text-gray-400">No events</span>
            )
          ) : (
            <Progress
              progress={100}
              textLabel="Loading..."
              textLabelPosition="inside"
              labelText
              size="lg"
            />
          )}
        </div>
        <div className="col-span-5">
          {selectedEvent === undefined ? (
            <div className="w-[80%] border border-gray-400 rounded-lg p-2 flex flex-row items-center justify-center">
              Click An Event to View It's Collections
            </div>
          ) : 
            watermarkObjects.isLoading ||
            availableTags.isLoading ? (
            <div className="w-[80%] border border-gray-400 rounded-lg p-2 flex flex-row items-center justify-center">
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
