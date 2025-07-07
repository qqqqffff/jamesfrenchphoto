import { createFileRoute } from '@tanstack/react-router'
import { getAllTimeslotsByDateQueryOptions } from '../../../services/timeslotService'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { currentDate, DAY_OFFSET } from '../../../utils'
import { Participant, Timeslot, UserTag } from '../../../types'
import { Label, Progress } from 'flowbite-react'
import { ControlComponent } from '../../../components/admin/ControlPanel'
import { HiOutlinePencil, HiOutlinePlusCircle } from 'react-icons/hi2'
import { SlotComponent } from '../../../components/timeslot/Slot'
import { CreateTimeslotModal, EditTimeslotModal } from '../../../components/modals'
import { CustomDatePicker } from '../../../components/common/CustomDatePicker'
import { getAllParticipantsQueryOptions, getAllUserTagsQueryOptions } from '../../../services/userService'
import { TagNavigator } from '../../../components/timeslot/TagNavigator'

export const Route = createFileRoute('/_auth/admin/dashboard/scheduler')({
  component: RouteComponent,
})

function RouteComponent() {
  const [activeDate, setActiveDate] = useState<Date>(new Date(currentDate.getTime() + DAY_OFFSET))
  const [activeTag, setActiveTag] = useState<UserTag>()
  const [timeslots, setTimeslots] = useState<Timeslot[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const timeslotQuery = useQuery(getAllTimeslotsByDateQueryOptions(activeDate))

  const tagsQuery = useQuery(getAllUserTagsQueryOptions({ 
    siCollections: false,
    siNotifications: false,
    siPackages: undefined,
    siParticipants: false,
    siTimeslots: true
  }))

  const participantQuery = useQuery(getAllParticipantsQueryOptions({
    siCollections: false,
    siNotifications: false,
    siTags: {
      siChildren: false,
      siCollections: false,
      siPackages: false,
      siTimeslots: true
    },
    siTimeslot: true,
  }))

  const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
  const [editTimeslotVisible, setEditTimeslotVisible] = useState<Timeslot | undefined>()

  useEffect(() => {
    if(timeslotQuery.data) {
      setTimeslots(timeslotQuery.data)
    }
  }, [
    timeslotQuery.data
  ])

  useEffect(() => {
    if(tagsQuery.data) {
      setTags(tagsQuery.data)
    }
  }, [
    tagsQuery.data
  ])

  useEffect(() => {
    if(participantQuery.data) {
      setParticipants(participantQuery.data)
    }
  }, [
    participantQuery.data
  ])


  return (
    <>
      <CreateTimeslotModal 
        open={createTimeslotVisible} 
        onClose={() => {
          setActiveDate(new Date(activeDate))
          setCreateTimeslotVisible(false)
        }} 
        day={activeDate} 
        timeslots={timeslots}
        timeslotQuery={timeslotQuery}
        parentUpdateTimeslots={setTimeslots}
        parentUpdateTags={setTags}
        tags={tags}
      />
      {editTimeslotVisible && (
        <EditTimeslotModal 
          open={editTimeslotVisible !== undefined} 
          onClose={() => {
            setEditTimeslotVisible(undefined)
          }} 
          timeslot={editTimeslotVisible} 
          timeslotQuery={timeslotQuery}
          existingTimeslots={timeslots}
          tags={tags}
          participantQuery={participantQuery}
          participants={participants}
          parentUpdateTags={setTags}
          parentUpdateTimeslots={setTimeslots}
          parentUpdateParticipants={setParticipants}
        />
      )}
      <div className="flex flex-row gap-4 font-main my-2 h-[98vh]">
        <div className="flex flex-col ms-4 border border-gray-400 rounded-lg px-6 py-2 gap-2 min-w-[275px] h-full">
          <div className="flex flex-row gap-1 w-full justify-between">
            <span className="text-2xl underline underline-offset-4 mb-2">Timeslot Date</span>
          </div>
          { timeslotQuery.isLoading &&
            (
              <Progress progress={100} textLabel="Loading..." textLabelPosition='inside' labelText size="lg"/>
            )
          }
          <CustomDatePicker 
            selectDate={(date) => {
              if(date) {
                setActiveDate(date)
              }
            }}
            selectedDate={activeDate}
            tags={tags}
          />
          <TagNavigator 
            setActiveTag={setActiveTag}
            activeTag={activeTag}
          />
          <ControlComponent 
            className="mt-2" 
            name={
              <div className='flex flex-row gap-3'>
                {timeslots.length > 0 ? `Update Timeslot${timeslots.length > 1 ? 's' : ''}` : `Create Timeslot(s)`}
                {timeslots.length <= 0 ? (
                  <HiOutlinePlusCircle size={20} className="mt-0.5 me-1"/>
                ) : (
                  <HiOutlinePencil size={16} className="mt-0.5 me-1" />
                )}
              </div>
            } 
            fn={() => {
              setCreateTimeslotVisible(true)
            }} 
            type={true} 
            disabled={activeDate.getTime() < currentDate.getTime()}
          />
        </div>
        <div className="border border-gray-400 rounded-lg py-4 px-2 h-full overflow-auto w-full">
          <div className="grid gap-2 grid-cols-3">
            {timeslots.length > 0 ?
              (timeslots.map((timeslot, index) => {
                return (
                  <button 
                    key={index}
                    onClick={() => {
                      setEditTimeslotVisible(timeslot)
                    }}>
                    <SlotComponent 
                      className="hover:bg-gray-200" 
                      timeslot={timeslot} 
                      participant={participants.find((participant) => participant.id === timeslot.participantId)} 
                      tag={timeslot.tag} 
                      key={index} 
                    />
                  </button>
                )
              })
            ) : (
              <div className="flex flex-row w-full items-center justify-center col-start-2">
                <Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
