import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { getAllTimeslotsByUserTagListQueryOptions, registerTimeslotMutation } from '../../../services/timeslotService'
import { useState } from 'react'
import { currentDate, formatTime, sortDatesAround } from '../../../utils'
import { Timeslot } from '../../../types'
import { ConfirmationModal } from '../../../components/modals'
import NotificationComponent from '../../../components/timeslot/NotificationComponent'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SlotComponent } from '../../../components/timeslot/Slot'
import useWindowDimensions from '../../../hooks/windowDimensions'
import SmallSizeTimeslot from '../../../components/timeslot/SmallSizeTimeslot'
import FullSizeTimeslot from '../../../components/timeslot/FullSizeTimeslot'

export const Route = createFileRoute('/_auth/client/dashboard/scheduler')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const activeParticipant = context.auth.user?.profile.activeParticipant
    const userEmail = context.auth.user?.attributes.email
    const userProfile = context.auth.user?.profile
    if(!activeParticipant || !userEmail || !userProfile) throw redirect({ to: '/client/dashboard' })
    const userTags = activeParticipant.userTags
    const participant = activeParticipant

    const updateProfile = context.auth.updateProfile
    
    return {
      userEmail,
      userTags,
      participant,
      updateProfile,
      userProfile
    }
  }
})

function RouteComponent() {
  const {
    userEmail,
    userTags,
    participant,
    updateProfile,
    userProfile
  } = Route.useLoaderData()
  const router = useRouter()
  const queryClient = useQueryClient()

  const timeslots = useQuery(getAllTimeslotsByUserTagListQueryOptions(userTags.map((tag) => tag.id)))

  const [activeDate, setActiveDate] = useState<Date>(sortDatesAround(
    (timeslots.data ?? []).map((timeslot) => {
      return new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate())
    }), currentDate)[0] ?? currentDate)
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot>()
  
  const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
  const [unregisterConfirmationVisible, setUnegisterConfirmationVisible] = useState(false)

  const [notify, setNotify] = useState(true)
  const { width } = useWindowDimensions()

  const registerTimeslot= useMutation({
    mutationFn: (timeslot: Timeslot) => registerTimeslotMutation(timeslot, notify)
  })

  function FormattedTimeslots() {
    return (timeslots.data ?? [])
      .filter((timeslot) => {
        return activeDate.toISOString().includes(timeslot.start.toISOString().substring(0, timeslot.start.toISOString().indexOf('T')))
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((timeslot, index) => {
        const color = timeslot.tag?.color ?? 'black'
        
        const selected = userEmail && userEmail === timeslot.register ? 'bg-gray-200' : ''
        const participantTimeslot = participant.timeslot?.find((partTimeslot) => timeslot.tag?.id === partTimeslot.tag?.id)
        let disabled = timeslot.register !== undefined || currentDate > activeDate || (
          participantTimeslot !== undefined
        )
        if(participantTimeslot?.id === timeslot.id) disabled = false
        const disabledText = disabled ? 'line-through cursor-not-allowed' : ''

        return (
          <button key={index} onClick={() => {
            if(userEmail && userEmail !== timeslot.register) {
              setRegisterConfirmationVisible(true)
              setSelectedTimeslot(timeslot)
            }
            else if(userEmail && userEmail === timeslot.register){
              setUnegisterConfirmationVisible(true)
              setSelectedTimeslot(timeslot)
            }
          }} disabled={disabled} className={`${selected} rounded-lg enabled:hover:bg-gray-300 text-${color} ${disabledText}`}>
            <SlotComponent timeslot={timeslot} />
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
              <span>
                  {`${new Date(timeslot.start).toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}: ${new Date(timeslot.start).toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} - ${new Date(timeslot.end).toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}`}
              </span>
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
            const response = await registerTimeslot.mutateAsync({
              ...selectedTimeslot,
              register: userEmail,
              participantId: participant.id,
            })
            if(response){
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

              queryClient.invalidateQueries({
                queryKey: ['timeslot']
              })
              router.invalidate()
            }
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
            //TODO: explore not doing async
            const response = await registerTimeslot.mutateAsync({
              ...selectedTimeslot,
              register: undefined,
              participantId: undefined
            })
            if(response){
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

              queryClient.invalidateQueries({
                queryKey: ['timeslot']
              })
              router.invalidate()
            }
          }
        }}
        title="Confirm Unregistration" body={`<b>Unregistration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nAre you sure you want to unregister from this timeslot?`} 
      />
      {width > 1200 ? (
        <FullSizeTimeslot 
          timeslots={timeslots.data ?? []}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          width={width}
          formatTimeslot={FormattedTimeslots}
          formatRegisteredTimeslot={() => (FormattedRegisteredTimeslots() ?? [])}
          loading={timeslots.isLoading}
        />
      ) : (
        <SmallSizeTimeslot
          timeslots={timeslots.data ?? []}
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
