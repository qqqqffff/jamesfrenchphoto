import { createFileRoute, redirect } from '@tanstack/react-router'
import { DynamicStringEnumKeysOf } from '../../utils'
import { Alert, Dropdown, FlowbiteColors } from 'flowbite-react'
import { useState } from 'react'
import useWindowDimensions from '../../hooks/windowDimensions'
import ParticipantCreator, { PrefilledParticipantFormElements } from '../../components/client/ParticipantCreator'
import { Participant, UserProfile, UserStorage } from '../../types'
import ParticipantProfileForm from '../../components/client/ParticipantProfileForm'
import UserProfileForm from '../../components/client/UserProfileForm'

export const Route = createFileRoute('/_auth/client/profile')({
  component: RouteComponent,
  loader: ({context}) => {
    const userStorage = context.auth.user
    if(!userStorage) throw redirect({ to: '/client/dashboard' })
    const updateProfile = context.auth.updateProfile
    return {
      userStorage,
      updateProfile
    }
  }
})

interface ProfileNotification {
    message: string,
    color: DynamicStringEnumKeysOf<FlowbiteColors>,
}



function RouteComponent() {
  const {
    userStorage,
    updateProfile,
  } = Route.useLoaderData()
  const [user, setUser] = useState(userStorage.profile)
  const [createParticipantFormVisible, setCreateParticipantFormVisible] = useState(false)
      
  const { width } = useWindowDimensions()

  const [notification, setNotification] = useState<ProfileNotification[]>([])
  const [participantPrefilledElements, setParticipantPrefilledElements] = useState<PrefilledParticipantFormElements>()
  const [activeParticipant, setActiveParticipant] = useState<Participant>()

  const dropdownText = activeParticipant ? `Participant: ${activeParticipant.preferredName ?? activeParticipant.firstName}, ${activeParticipant.lastName}` : 
        createParticipantFormVisible ?  'Add Participant' : 
        userStorage ? `Parent: ${userStorage.attributes.given_name}, ${userStorage.attributes.family_name}` : 'N/A'

  function ContentRenderer(){
    if(user) {
        if(createParticipantFormVisible){
            return (
                <div className={`flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 md:w-[60%] ${width < 768 ? 'mx-4' : ''}`}>
                    <ParticipantCreator width={width} userEmail={user.email} taggingCode={{visible: true, editable: true}} displayRequired
                        prefilledElements={participantPrefilledElements}
                        submit={(noti: string, participant?: Participant, errorReturn?: PrefilledParticipantFormElements) => {
                            if(participant){
                                const tempUserProfile = {
                                    ...user,
                                }
                                tempUserProfile.participant = [...tempUserProfile.participant, participant]

                                updateProfile(tempUserProfile)
                                setUser(tempUserProfile)
                                setNotification([{message: noti, color: 'green'}])
                                setActiveParticipant(participant)
                                setCreateParticipantFormVisible(false)
                            } else if(errorReturn){
                                setNotification([{message: noti, color: 'red'}])
                                setParticipantPrefilledElements(errorReturn)
                            }
                        }}
                    />
                </div>
            )
        } else if(activeParticipant){
          return (
            <ParticipantProfileForm width={width} participant={activeParticipant} 
              submit={(noti: string, participant: Participant) => {
                const tempUserProfile = {
                  ...user,
                }
                tempUserProfile.participant = tempUserProfile.participant.map((part) => {
                  if(part.id == participant.id){
                    return participant
                  }
                  return part
                })

                updateProfile(tempUserProfile)
                setUser(tempUserProfile)
                setNotification([{message: noti, color: 'green'}])
                setActiveParticipant(participant)
              }} 
            />
          )
        } else if(userStorage) {
          return (
            <UserProfileForm 
              width={width} 
              user={userStorage} 
              submit={(noti: string, user?: UserStorage, profile?: UserProfile) => {
                if(user && profile){
                  setNotification([{ message: noti, color: 'green' }])
                  setUser(profile)
                  updateProfile(profile, user.attributes)
                } else {
                  setNotification([{ message: noti, color: 'red' }])
                }
              }} 
              userProfile={user}
            />
          )
        }
    }
    return (
        <span>Failed to recieve user data</span>
    )
  }
  return (
    <>
      <div className="flex justify-center items-center font-main mb-4 mt-2">
        {notification.length > 0 && notification.map((noti, index) => {
            return (
                <Alert color={noti.color} className="text-lg w-[90%]" key={index} onDismiss={() => setNotification(notification.filter((not) => not !== noti))}>{noti.message}</Alert>
            )
        })}
      </div>
      <div className="flex flex-col my-4 w-full gap-4 justify-center items-center font-main">
        <div className="flex flex-row gap-4 items-center">
          <Dropdown color="light" className="" label={dropdownText}>
            <Dropdown.Item onClick={() => {
              setActiveParticipant(undefined)
              setCreateParticipantFormVisible(false)
            }}>
              {`Parent: ${userStorage?.attributes.given_name}, ${userStorage?.attributes.family_name}`}
            </Dropdown.Item>
            {user?.participant.map((participant, index) => {
              return (
                <Dropdown.Item  key={index} onClick={() => {
                  setActiveParticipant(participant)
                  setCreateParticipantFormVisible(false)
                }}>{`Participant: ${participant.preferredName ?? participant.firstName}, ${participant.lastName}`}</Dropdown.Item>
              )
            })}
            <Dropdown.Item className="border-t" 
              disabled={user !== null && user.participant.length >= 5}
              onClick={() => {
                setActiveParticipant(undefined)
                setCreateParticipantFormVisible(true)
              }}
            >{user !== null && user.participant.length >= 5 ? 'Maximum Participants Created' : 'Add Participant'}</Dropdown.Item>
          </Dropdown>
        </div>
        <ContentRenderer />
    </div>
    </>
  )
}
