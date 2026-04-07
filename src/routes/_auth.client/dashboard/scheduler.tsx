import { createFileRoute, redirect } from '@tanstack/react-router'
import { TimeslotService } from '../../../services/timeslotService'
import { useEffect, useState } from 'react'
import { currentDate, formatTimeslotDates } from '../../../utils'
import { APIMutationResponse, Timeslot, UserTag } from '../../../types'
import { ConfirmTimeslotModal, UnregisterTimeslotModal } from '../../../components/modals'
import { useQuery } from '@tanstack/react-query'
import { SlotComponent } from '../../../components/timeslot/Slot'
import useWindowDimensions from '../../../hooks/windowDimensions'
import SmallSizeTimeslot from '../../../components/timeslot/SmallSizeTimeslot'
import FullSizeTimeslot from '../../../components/timeslot/FullSizeTimeslot'
import { useAuth } from '../../../auth'
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'
import { Alert, Tooltip } from 'flowbite-react'
import { PaymentService } from '../../../services/paymentService'

interface SchedulerParams {
  tagId?: string
}

//TODO: rework logic so that even with a current registration can replace that registration with a new timeslot
//TODO: implement cancelation / successful purchase logic for a route containing a timeslot id
//TODO: implement loading logic based on the query handlers
export const Route = createFileRoute('/_auth/client/dashboard/scheduler')({
  validateSearch: (search: Record<string, unknown>): SchedulerParams => ({
    tagId: (search.tagId as string) || undefined
  }),
  beforeLoad: ({ search }) => search,
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>

    return {
      TimeslotService: new TimeslotService(client),
      PaymentService: new PaymentService(client),
      tagId: context.tagId
    }
  }
})

function RouteComponent() {
  const auth = useAuth()
  const data = Route.useLoaderData()

  const tempProfile = auth.user?.profile
  const tempParticipant = auth.user?.profile.activeParticipant
  
  if(tempProfile === undefined || tempParticipant === undefined) throw redirect({ to: '/client/dashboard' })
  
  const userProfile = tempProfile
  const participant = tempParticipant
  const userTags = participant.userTags

  const timeslotsQuery = useQuery(data.TimeslotService.getAllTimeslotsByUserTagListQueryOptions(userTags))

  //getting the most recently created userTag
  const [activeTag, setActiveTag] = useState<UserTag>(
    userTags.find((tag) => tag.id === data.tagId) ?? 
    userTags.reduce((prev, cur) => {
      if(new Date(cur.createdAt).getTime() > new Date(prev.createdAt).getTime()) return cur
      return prev
    }, userTags[0])
  )

  const [activeDate, setActiveDate] = useState<Date>(currentDate)
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot>()
  const [registrationResponse, setRegistrationResponse] = useState<APIMutationResponse>()
  const [timeslots, setTimeslots] = useState<Timeslot[]>([])
  
  const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
  const [unregisterConfirmationVisible, setUnegisterConfirmationVisible] = useState(false)

  const { width } = useWindowDimensions()


  //automatically setting date based on the closest date to present
  useEffect(() => {
    const timeslotsData = (timeslotsQuery.data ?? [])
      .filter((timeslot) => timeslot !== undefined)
      .filter((timeslot) => timeslot.tag?.id === activeTag.id)
      .sort((a, b) => {
        if(a.start.getTime() < currentDate.getTime()) {
          return -1
        }
        else if(b.start.getTime() < currentDate.getTime()) {
          return 1
        }
        return a.start.getTime() - b.start.getTime()
      })

    const foundTag = userTags.find((tag) => tag.id === data.tagId)
    let activeDate = currentDate

    if(timeslotsData.length > 0 && timeslotsData[0].start !== undefined) { 
      activeDate = timeslotsData[0].start
    }

    //only add newly fetched timeslots otherwise preserve what currently exists in state
    setTimeslots(prevTimeslots => (timeslotsQuery.data ?? []).reduce((prev, cur) => {
      if(!prev.some((timeslot) => timeslot.id === cur.id)) {
        prev.push(cur)
      }
      return prev
    }, prevTimeslots))
    setActiveDate(activeDate) 
    setActiveTag(prev => activeTag.id !== data.tagId && foundTag !== undefined ? foundTag : prev)
  }, [
    timeslotsQuery.data, 
    activeTag,
    data.tagId,
  ])

  function FormattedTimeslots() {
    return timeslots
      .filter((timeslot) => timeslot !== undefined)
      .filter((timeslot) => {
        return activeDate.toISOString().includes(timeslot.start.toISOString().substring(0, timeslot.start.toISOString().indexOf('T')))
      })
      .reduce((prev, cur) => {
        if(!prev.some((timeslot) => timeslot.id === cur.id)) {
          prev.push(cur)
        }
        return prev
      }, [] as Timeslot[])
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((timeslot, index) => {
        const tag = userProfile.participant
          .find((participant) => participant.id === userProfile.activeParticipant?.id)
          ?.userTags?.find((tag) => tag.id === timeslot.tag?.id)
        
        const selected = (
          (userProfile.activeParticipant?.id ?? userProfile.participant[0].id ?? participant.id) === timeslot.participantId || 
          (userProfile.email === timeslot.register)
        ? 'bg-gray-200' : '')
        const alreadyRegistered = timeslots
          .find((tagTimeslot) => (
            (tagTimeslot?.participantId === participant.id || tagTimeslot?.register === userProfile.email) && 
            tagTimeslot?.tag?.id === tag?.id
          ))
        
        let participantDisabled = 
          (timeslot.register !== undefined && userProfile.email !== timeslot.register) &&
          (timeslot.participantId !== undefined && (userProfile.activeParticipant?.id ?? userProfile.participant[0].id ?? participant.id) !== timeslot.participantId)
        let pastedDateDisabled = currentDate.getTime() > activeDate.getTime()
        let alreadyRegisteredDisabled = (alreadyRegistered !== undefined && timeslot.id !== alreadyRegistered.id)

        let disabled = 
          participantDisabled ||
          pastedDateDisabled ||
          alreadyRegisteredDisabled

        const disabledText = disabled ? 'line-through cursor-not-allowed' : ''

        return (
          <button key={index} onClick={() => {
            if(alreadyRegistered === undefined) {
              setRegisterConfirmationVisible(true)
              setSelectedTimeslot(timeslot)
            }
            else if(alreadyRegistered !== undefined){
              setUnegisterConfirmationVisible(true)
              setSelectedTimeslot(timeslot)
            }
          }} disabled={disabled} className={`${selected} rounded-lg enabled:hover:bg-gray-300 ${disabledText}`}>
            {disabled ? (
              <Tooltip
                style='light'
                placement='bottom'
                theme={{ target: undefined }}
                content={(<span className='text-xs italic whitespace-nowrap font-sans'>{pastedDateDisabled ? 'You can only register for future timeslots.' : alreadyRegisteredDisabled ? 'Only one timeslot is allowed per user.' : 'This timeslot has been taken by another user.'}</span>)}
              >
                <SlotComponent timeslot={{...timeslot, tag: tag }} tag={tag} participant={null} />
              </Tooltip>
            ) : (
              <SlotComponent timeslot={{...timeslot, tag: tag }} tag={tag} participant={null} />
            )}
          </button>
        )
      })
  }

  function FormattedRegisteredTimeslots(){
    return timeslots
      .filter((timeslot) => timeslot !== undefined)
      .filter((timeslot) => timeslot.participantId === participant.id)
      .map((timeslot, index) => {
        const tag = userTags.find((tag) => tag.id === timeslot.tag?.id)
        const color = tag?.color ?? 'black'

        return (
          <div className={`flex flex-col text-${color} text-sm`} key={index}>
              <span className="underline underline-offset-2">
                  {timeslot.tag ? tag?.name : 'Undefined'}
              </span>
              <button 
                onClick={() => {
                  setUnegisterConfirmationVisible(true)
                  setSelectedTimeslot(timeslot)
                }} 
                className='hover:line-through'
              >
                  {`${new Date(timeslot.start).toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}: ${formatTimeslotDates(timeslot)}`}
              </button>
          </div>
        )
      })
  }

  return (
    <>
      {selectedTimeslot && (
        <>
          <ConfirmTimeslotModal 
            open={registerConfirmationVisible}
            onClose={() => setRegisterConfirmationVisible(false)}
            auth={auth}
            user={userProfile}
            TimeslotService={data.TimeslotService}
            PaymentService={data.PaymentService}
            timeslot={selectedTimeslot}
            participant={participant}
            setRegistrationResponse={setRegistrationResponse}
            setTimeslots={setTimeslots}
          />
          <UnregisterTimeslotModal 
            open={unregisterConfirmationVisible}
            onClose={() => setUnegisterConfirmationVisible(false)}
            auth={auth}
            user={userProfile}
            TimeslotService={data.TimeslotService}
            timeslot={selectedTimeslot}
            participant={participant}
            setRegistrationResponse={setRegistrationResponse}
            setTimeslots={setTimeslots}
          />
        </>
      )}
      {registrationResponse !== undefined && (
        <div className={`relative top-8 ${ width > 1200 ? 'left-[20%] w-[60%]' : 'left-[12.5%] w-[75%]'} z-10`}>
          <Alert 
            color={registrationResponse.status === 'Success' ? 'green' : 'red'}
            className='absolute w-full opacity-80'
            onDismiss={() => {
              setRegistrationResponse(undefined)
            }}
          >{registrationResponse.status === 'Success' ? 'Success' : registrationResponse.error ?? 'Failed to register. Please try again later.'}</Alert>
        </div>
      )} 
      {width > 1200 ? (
        <FullSizeTimeslot 
          timeslots={
            timeslots
            .filter((timeslot) => timeslot !== undefined)
            .map((timeslot) => ({
              ...timeslot,
              tag: userProfile.participant
                .find((participant) => participant.id === userProfile.activeParticipant?.id)
                ?.userTags.find((tag) => tag.id === timeslot.tag?.id)
            }))
          }
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          tags={userTags}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          width={width}
          formatTimeslot={FormattedTimeslots}
          formatRegisteredTimeslot={() => (FormattedRegisteredTimeslots() ?? [])}
          loading={timeslotsQuery.isLoading}
        />
      ) : (
        <SmallSizeTimeslot
          timeslots={
            timeslots
            .filter((timeslot) => timeslot !== undefined)
            .map((timeslot) => ({
              ...timeslot,
              tag: userProfile.participant
                .find((participant) => participant.id === userProfile.activeParticipant?.id)
                ?.userTags.find((tag) => tag.id === timeslot.tag?.id)
            }))
          }
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          tags={userTags}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          width={width}
          formatTimeslot={FormattedTimeslots}
          formatRegisteredTimeslot={() => (FormattedRegisteredTimeslots() ?? [])}
          loading={timeslotsQuery.isLoading}
        />
      )}
    </>
    
  )
}
