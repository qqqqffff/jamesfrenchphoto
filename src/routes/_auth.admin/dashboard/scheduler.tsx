import { createFileRoute } from '@tanstack/react-router'
import { TimeslotService } from '../../../services/timeslotService'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { compareDate, currentDate } from '../../../utils'
import { Participant, Timeslot, UserTag } from '../../../types'
import { Label, Progress, Tooltip } from 'flowbite-react'
import { ControlComponent } from '../../../components/admin/ControlPanel'
import { SlotComponent } from '../../../components/timeslot/Slot'
import { CreateTimeslotModal, EditTimeslotModal } from '../../../components/modals'
import { CustomDatePicker } from '../../../components/common/CustomDatePicker'
import { UserService } from '../../../services/userService'
import { TagNavigator } from '../../../components/timeslot/TagNavigator'
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'
import { TagService } from '../../../services/tagService'
import { DateTime } from 'luxon'
import { HiOutlineMinusCircle } from "react-icons/hi"
import { HiOutlineChevronRight, HiOutlinePencil, HiOutlinePlus } from 'react-icons/hi2'

interface SchedulerSearchParams {
  date: string
}

export const Route = createFileRoute('/_auth/admin/dashboard/scheduler')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): SchedulerSearchParams => ({
    date: (search.date as string) || DateTime.fromJSDate(currentDate).setZone('America/Chicago').toFormat('MM-dd-yyyy')
  }),
  beforeLoad: ({ search }) => search,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>
    return {
      TimeslotService: new TimeslotService(client),
      UserService: new UserService(client),
      TagService: new TagService(client),
      date: new Date(context.date),
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const [activeDate, setActiveDate] = useState<Date>(data.date)
  const [activeTag, setActiveTag] = useState<UserTag>()
  const [timeslots, setTimeslots] = useState<Timeslot[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
  const [editTimeslotVisible, setEditTimeslotVisible] = useState<Timeslot | undefined>()
  const [sidePannelExpanded, setSidePanelExpanded] = useState(true)

  const timeslotQuery = useQuery(data.TimeslotService.getAllTimeslotsByDateQueryOptions(activeDate, { siTag: true }))
  
  const tagsQuery = useInfiniteQuery(data.TagService.getAllUserTagsQueryOptions(
    { 
      siCollections: false,
      siNotifications: false,
      siPackages: undefined,
      siParticipants: false,
      siTimeslots: true
    }
  ))

  const participantQuery = useQuery(data.UserService.getAllParticipantsQueryOptions({
    siCollections: false,
    siNotifications: false,
    siTags: {
      siChildren: false,
      siPackages: false,
      siTimeslots: true
    },
    siTimeslot: true,
  }))

  useEffect(() => {
    if(timeslotQuery.data) {
      setTimeslots(timeslotQuery.data)
    }
    if(tagsQuery.data) {
      setTags(tagsQuery.data.pages.reduce((prev, cur) => {
        prev.push(...cur.tags.filter((tag) => !prev.some((pTag) => pTag.id === tag.id)))
        return prev
      }, [] as UserTag[]))
    }
    if(participantQuery.data) {
      setParticipants(participantQuery.data)
    }
    if(!compareDate(activeDate, data.date)) {
      setActiveDate(data.date)
    }
  }, [
    timeslotQuery.data,
    tagsQuery.data,
    participantQuery.data,
    data.date,
  ])

  function ActionButtonWrapper(props: { children: JSX.Element }) {
    if(activeDate.getTime() < currentDate.getTime()) {
      return (
        <Tooltip
          theme={{ target: undefined }}
          placement='bottom-start'
          style='light'
          arrow={false}
          content={(<span className='text-gray-500 italic text-sm whitespace-nowrap'>Cannot create or modify timeslots before today's date</span>)}
        >
          {props.children}
        </Tooltip>
      )
    }
    return props.children
  }


  return (
    <>
      <CreateTimeslotModal 
        TimeslotService={data.TimeslotService}
        open={createTimeslotVisible} 
        onClose={() => {
          setActiveDate(new Date(activeDate))
          setCreateTimeslotVisible(false)
        }} 
        day={activeDate} 
        navigate={navigate}
        timeslots={timeslots}
        parentUpdateTimeslots={setTimeslots}
        parentUpdateTags={setTags}
        tags={tags}
        tagsQuery={tagsQuery}
      />
      {editTimeslotVisible && (
        <EditTimeslotModal 
          UserService={data.UserService}
          TimeslotService={data.TimeslotService}
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
      <div className="flex flex-row gap-4 my-2 mx-4 h-[100vh]">
        <div className={`flex flex-col border border-gray-400 gap-2 rounded-2xl ${sidePannelExpanded ? 'min-w-[300px] p-4 w-[300px]' : 'w-[50px] max-w-[50px]'} transition-all duration-300 ease-in-out`}>
          <div className={`flex flex-row items-center w-full justify-between ${sidePannelExpanded ? 'border-b border-b-gray-400 pb-2' : ''}`}>
            <span className={`text-2xl text-start ${sidePannelExpanded ? 'ps-4 pe-2' : 'rotate-90 mt-12 ms-[-26px]'} transition-all duration-300 ease-in-out`}>Timeslots{sidePannelExpanded ? '' : ':'}</span>
            {sidePannelExpanded && (
              <button
                className='hover:text-gray-500 rounded-full'
                onClick={() => setSidePanelExpanded(!sidePannelExpanded)}
              >
                <HiOutlineMinusCircle size={24} />
              </button>
            )}
          </div>
          {sidePannelExpanded ? (
            <div className='flex flex-col w-full gap-2'>
              {timeslotQuery.isLoading && (
                <Progress progress={100} textLabel="Loading..." textLabelPosition='inside' labelText size="lg" />
              )}
              <CustomDatePicker 
                selectDate={(date) => {
                  if(date) {
                    navigate({ to: '.', search: { date: DateTime.fromJSDate(date).toFormat('MM-dd-yyyy') }})
                  }
                }}
                selectedDate={activeDate}
                fetchMonthTimeslots={data.TimeslotService}
              />
              <div className='w-full flex'>
                <TagNavigator 
                  activeDate={activeDate}
                  setActiveTag={setActiveTag}
                  setActiveDate={setActiveDate}
                  activeTag={activeTag}
                  tags={tags}
                  tagsQuery={tagsQuery}
                />
              </div>
              <ActionButtonWrapper>
                <ControlComponent 
                  className="mt-1 w-full" 
                  name={
                    <div>
                      {timeslots.length > 0 ? `Update Timeslot${timeslots.length > 1 ? 's' : ''}` : `Create Timeslot(s)`}
                    </div>
                  } 
                  fn={() => {
                    setCreateTimeslotVisible(true)
                  }} 
                  type={true} 
                  disabled={activeDate.getTime() < currentDate.getTime()}
                />
              </ActionButtonWrapper>
              <ControlComponent 
                className='mt-1 w-full'
                name={
                  <div>
                    <span>Go To Today</span>
                  </div>
                }
                fn={() => {
                  navigate({ to: '.', search: { date: DateTime.fromJSDate(currentDate).toFormat('MM-dd-yyyy') }})
                }}
                type={true}
                disabled={activeDate.getTime() === currentDate.getTime()}
              />
            </div>
          ) : (
            <div className='flex flex-col gap-2'>
              <span className='rotate-90 whitespace-nowrap mt-12 font-bold'>{DateTime.fromJSDate(activeDate).toFormat('MM-dd-yyyy')}</span>
              <div className='mt-16 flex flex-row justify-center'>
                <CustomDatePicker 
                  selectDate={(date) => {
                    if(date) {
                      navigate({ to: '.', search: { date: DateTime.fromJSDate(date).toFormat('MM-dd-yyyy') }})
                    }
                  }}
                  selectedDate={activeDate}
                  fetchMonthTimeslots={data.TimeslotService}
                  small
                />
              </div>
              <div className='flex flex-row justify-center'>
                <TagNavigator 
                  activeDate={activeDate}
                  setActiveTag={setActiveTag}
                  setActiveDate={setActiveDate}
                  activeTag={activeTag}
                  tags={tags}
                  tagsQuery={tagsQuery}
                  small
                />
              </div>
              <div className='flex flex-row justify-center'>
                <button
                  className='p-1 border rounded-lg enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:border-gray-400 focus:outline-none focus:ring-2'
                  onClick={() =>  setCreateTimeslotVisible(true)}
                  disabled={activeDate.getTime() < currentDate.getTime()}
                >
                  {timeslots.length > 0 ? (
                    <HiOutlinePencil size={24} className='text-gray-900' />
                  ) : (
                    <HiOutlinePlus size={24} className='text-gray-900' />
                  )}
                </button>
              </div>
              <button
                className='ms-2 hover:text-gray-500 p-1'
                onClick={() => setSidePanelExpanded(true)}
              >
                <HiOutlineChevronRight size={24} />
              </button>
            </div>
          )}
        </div>
        <div className="border border-gray-400 rounded-2xl py-4 px-2 h-full overflow-auto w-full">
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
