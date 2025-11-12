import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { TimeslotService, RegisterTimeslotMutationParams } from '../../../services/timeslotService'
import { useEffect, useState } from 'react'
import { currentDate, formatTime, normalizeDate, sortDatesAround } from '../../../utils'
import { Timeslot } from '../../../types'
import { ConfirmationModal } from '../../../components/modals'
import NotificationComponent from '../../../components/timeslot/NotificationComponent'
import { useMutation, useQuery } from '@tanstack/react-query'
import { SlotComponent } from '../../../components/timeslot/Slot'
import useWindowDimensions from '../../../hooks/windowDimensions'
import SmallSizeTimeslot from '../../../components/timeslot/SmallSizeTimeslot'
import FullSizeTimeslot from '../../../components/timeslot/FullSizeTimeslot'
import { useAuth } from '../../../auth'
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'

export const Route = createFileRoute('/_auth/client/dashboard/scheduler')({
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>

    return {
      TimeslotService: new TimeslotService(client)
    }
  }
})

function RouteComponent() {
  const {
    user,
    updateProfile,
  } = useAuth()
  const data = Route.useLoaderData()
  const router = useRouter()

  const tempProfile = user?.profile
  const tempParticipant = user?.profile.activeParticipant
  
  if(tempProfile === undefined || tempParticipant === undefined) throw redirect({ to: '/client/dashboard' })
  
  const userProfile = tempProfile
  const participant = tempParticipant
  const userTags = participant.userTags
  const userEmail = userProfile.email

  const timeslots = useQuery(data.TimeslotService.getAllTimeslotsByUserTagListQueryOptions(userTags.map((tag) => tag.id)))

  const [activeDate, setActiveDate] = useState<Date>(sortDatesAround(
    (timeslots.data ?? []).map((timeslot) => {
      return normalizeDate(timeslot.start)
    }), currentDate)[0] ?? currentDate)
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot>()
  
  const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
  const [unregisterConfirmationVisible, setUnegisterConfirmationVisible] = useState(false)

  const [notify, setNotify] = useState(true)
  const { width } = useWindowDimensions()

  //automatically setting date based on the closest date to present
  useEffect(() => {
    if((timeslots.data ?? []).length > 0) { 
      setActiveDate(sortDatesAround(
        (timeslots.data ?? []).map((timeslot) => {
          return normalizeDate(timeslot.start)
        }), currentDate).reduce((prev, cur) => {
          if(prev.getTime() < currentDate.getTime() && cur.getTime() >= currentDate.getTime()) {
            return cur
          }
          return prev
        })
      )
    }
  }, [timeslots.data])

  const registerTimeslot= useMutation({
    mutationFn: (params: RegisterTimeslotMutationParams) => data.TimeslotService.registerTimeslotMutation(params)
  })

  function FormattedTimeslots() {
    return (timeslots.data ?? [])
      .filter((timeslot) => {
        return activeDate.toISOString().includes(timeslot.start.toISOString().substring(0, timeslot.start.toISOString().indexOf('T')))
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .reduce((prev, cur) => {
        if(!prev.some((timeslot) => timeslot.id === cur.id)) {
          prev.push(cur)
        }
        return prev
      }, [] as Timeslot[])
      .map((timeslot, index) => {
        const tag = userProfile.participant
          .find((participant) => participant.id === userProfile.activeParticipant?.id)
          ?.userTags?.find((tag) => tag.id === timeslot.tag?.id)
        
        const selected = (
          (userProfile.activeParticipant?.id ?? userProfile.participant[0].id ?? participant.id) === timeslot.participantId || 
          (userProfile.email === timeslot.register)
        ? 'bg-gray-200' : '')
        const alreadyRegistered = (timeslots.data ?? [])
          .find((tagTimeslot) => (
            (tagTimeslot.participantId === participant.id || tagTimeslot.register === userProfile.email) && 
            tagTimeslot?.tag?.id === tag?.id
          ))
        
        let disabled = 
          (
            (timeslot.register !== undefined && userProfile.email !== timeslot.register) &&
            (timeslot.participantId !== undefined && (userProfile.activeParticipant?.id ?? userProfile.participant[0].id ?? participant.id) !== timeslot.participantId)
          ) || 
          currentDate > activeDate ||
          (alreadyRegistered !== undefined && timeslot.id !== alreadyRegistered.id)

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
            <SlotComponent timeslot={{...timeslot, tag: tag }} tag={tag} participant={null} />
          </button>
        )
      })
  }

  function FormattedRegisteredTimeslots(){
    return (timeslots.data ?? [])
      .filter((timeslot) => timeslot.participantId === participant.id)
      .map((timeslot, index) => {
        const color = timeslot.tag?.color ?? 'black'

        return (
          <div className={`flex flex-col text-${color} text-sm`} key={index}>
              <span className="underline underline-offset-2">
                  {timeslot.tag ? timeslot.tag.name : 'Undefined'}
              </span>
              <button 
                onClick={() => {
                  setUnegisterConfirmationVisible(true)
                  setSelectedTimeslot(timeslot)
                }} 
                className='hover:line-through'
              >
                  {`${new Date(timeslot.start).toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}: ${new Date(timeslot.start).toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} - ${new Date(timeslot.end).toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}`}
              </button>
          </div>
        )
      })
  }

  return (
    <>
      <ConfirmationModal 
        open={registerConfirmationVisible} 
        onClose={() => setRegisterConfirmationVisible(false)} 
        confirmText="Schedule"
        denyText="Back"
        confirmAction={async () => {
          if(selectedTimeslot && userEmail && participant && userTags) {
            const newTimeslot: Timeslot = {
              ...selectedTimeslot,
              register: userEmail,
              participantId: participant.id,
            }
            await registerTimeslot.mutateAsync({
              timeslot: newTimeslot,
              notify: notify,
            })
            
            const updatedTimeslot = participant.timeslot ?? []
            updatedTimeslot.push({
              ...selectedTimeslot,
            })

            updateProfile({
              ...userProfile,
              participant: userProfile.participant.map((upPart) => {
                if(upPart.id === participant.id) {
                  return {
                    ...participant,
                    timeslot: updatedTimeslot
                  }
                }
                return upPart
              }),
              activeParticipant: {
                ...participant,
                timeslot: updatedTimeslot
              }
            })

            timeslots.refetch()
            router.invalidate()
          }
        }}
        children={(<NotificationComponent setNotify={setNotify} email={userEmail} notify={notify} />)}
        title="Confirm Timeslot Selection" 
        body={`<b>Registration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nMake sure that this is the right timeslot for you, since you only have one!\nRescheduling is only allowed up until one day in advance.`}
      />
      <ConfirmationModal open={unregisterConfirmationVisible} onClose={() => setUnegisterConfirmationVisible(false)}
        confirmText="Confirm"
        denyText="Back"
        confirmAction={async () => {
          if(selectedTimeslot && userEmail && participant && userTags) {
            await registerTimeslot.mutateAsync({
              timeslot: {
                ...selectedTimeslot,
                register: undefined,
                participantId: undefined,
              },
              notify: false
            })
            const updatedTimeslot = (participant.timeslot ?? [])
              .filter((timeslot) => timeslot.id !== selectedTimeslot.id)

            updateProfile({
              ...userProfile,
              participant: userProfile.participant.map((upPart) => {
                if(upPart.id === participant.id) {
                  return {
                    ...participant,
                    timeslot: updatedTimeslot
                  }
                }
                return upPart
              }),
              activeParticipant: {
                ...participant,
                timeslot: updatedTimeslot
              }
            })

            timeslots.refetch()
            router.invalidate()
          }
        }}
        title="Confirm Unregistration" body={`<b>Unregistration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nAre you sure you want to unregister from this timeslot?`} 
      />
      {width > 1200 ? (
        <FullSizeTimeslot 
          timeslots={(timeslots.data ?? []).map((timeslot) => ({
            ...timeslot,
            tag: userProfile.participant
              .find((participant) => participant.id === userProfile.activeParticipant?.id)
              ?.userTags.find((tag) => tag.id === timeslot.tag?.id)
          }))}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          width={width}
          formatTimeslot={FormattedTimeslots}
          formatRegisteredTimeslot={() => (FormattedRegisteredTimeslots() ?? [])}
          loading={timeslots.isLoading}
        />
      ) : (
        <SmallSizeTimeslot
          timeslots={(timeslots.data ?? []).map((timeslot) => ({
            ...timeslot,
            tag: userProfile.participant
              .find((participant) => participant.id === userProfile.activeParticipant?.id)
              ?.userTags.find((tag) => tag.id === timeslot.tag?.id)
          }))}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          width={width}
          formatTimeslot={FormattedTimeslots}
          formatRegisteredTimeslot={() => (FormattedRegisteredTimeslots() ?? [])}
          loading={timeslots.isLoading}
        />
      )}
    </>
    
  )
}
