import { useEffect, useState } from "react"
import { UserProfile } from "../../types"
import { ParticipantPanel } from "./ParticipantPanel"
import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi2'
import { formatParticipantName } from "../../functions/clientFunctions"

interface UserPanelProps {
  userType: ["temp" | "unlinked" | "user" | "potential" | "false", string]
  userProfile: UserProfile
}

export const UserPanel = (props: UserPanelProps) => {
  const [userInfoShowing, setUserInfoShowing] = useState(true)
  const [participantInfoShowing, setParticipantInfoShowing] = useState(props.userProfile.participant.map((participant) => ({ id: participant.id, showing: true })))

  useEffect(() => {
    setUserInfoShowing(prev => prev ? prev : true)
    setParticipantInfoShowing(prev => 
      prev.some((item) => !item.showing) || 
      props.userProfile.participant.some((participant) => !prev.some((item) => item.id === participant.id)) ||
      prev.some((item) => !props.userProfile.participant.some((participant) => item.id === participant.id)) ?
      props.userProfile.participant.map((participant) => ({ id: participant.id, showing: true }))
      :
      prev
    )
  }, [
    props.userProfile
  ])

  const formatUserName = (userProfile: UserProfile) => {
    if(userProfile.firstName && userProfile.lastName) {
      return userProfile.firstName + ' ' + userProfile.lastName
    }
    else if(userProfile.firstName) {
      return userProfile.firstName
    }
    else if(userProfile.lastName) {
      return userProfile.lastName
    }
    return ''
  }
  return (
    <div className="px-4 py-2 flex flex-col">
      <div className="flex flex-row items-center gap-4 justify-between">
        <span className="font-medium whitespace-nowrap text-lg text-blue-400">User Info{
        props.userType[0] === 'temp' && userInfoShowing ? (
          ' - Temporary'
        ) : (
          props.userType[0] === 'unlinked' && userInfoShowing ? (
            ' - Unlinked'
          ) : (
            !userInfoShowing ? (
              `: ${formatUserName(props.userProfile)}`
            ) : (
              ''
            )
          )
        )}
        </span>
        <button
          onClick={() => setUserInfoShowing(!userInfoShowing)}
          className="hover:text-black text-gray-500 hover:bg-gray-200 p-1"
        >
          {userInfoShowing ? (
            <HiOutlineMinus size={16} />
          ) : (
            <HiOutlinePlus size={16} />
          )}
        </button>
      </div>
      <div className="border mb-2"/>
      {userInfoShowing  && (
        <div className="flex flex-col text-xs">
        <div className="px-3">
          <div className="flex flex-row items-center text-nowrap justify-between w-full border-y py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>Sitting Number:</span>
              <span className="italic">{props.userProfile.sittingNumber}</span>
            </div>
          </div>
          <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>First Name:</span>
              <span className="italic">{props.userProfile.firstName}</span>
            </div>
          </div>
          <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>Last Name:</span>
              <span className="italic">{props.userProfile.lastName}</span>
            </div>
          </div>
          <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>Email:</span>
              <span className="italic">{props.userProfile.email}</span>
            </div>
          </div>
        </div>
        </div>
      )}
      <div className="border mt-2"/>
      {props.userProfile.participant
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((participant, index) => {
        // TODO: implement admin options to delete participants
        const foundShowing = participantInfoShowing.find((item) => item.id === participant.id)
        return (
          <div key={index}>
            <div className="px-3 relative flex flex-row w-full justify-between gap-4">
              {foundShowing === undefined || foundShowing.showing ? (
                <ParticipantPanel 
                  //removing redundant userEmail
                  participant={{ ...participant, userEmail: ''}}
                  showOptions={{
                    timeslot: true,
                    notifications: true,
                  }}
                />
              ) : (
                <div className="flex flex-row gap-2 whitespace-nowrap py-2 text-sm">
                  <span className='text-purple-400'>Participant</span>
                  <span>{formatParticipantName(participant)}</span>
                </div>
              )}
              <button
                className={`
                  hover:text-black text-gray-500 hover:bg-gray-200 p-1
                  ${(foundShowing === undefined || foundShowing.showing) ? "absolute right-2 top-2" : ''}
                `}
                onClick={() => {
                  setParticipantInfoShowing(prev => prev.some((item) => item.id === participant.id) ? 
                    prev.map((item) => item.id === participant.id ? ({...item, showing: !(foundShowing === undefined || foundShowing.showing)}) : item) 
                  : 
                    [...prev, ({ id: participant.id, showing: !(foundShowing === undefined || foundShowing.showing)})]
                  )
                }}
              >
                {foundShowing === undefined || foundShowing.showing ? (
                  <HiOutlineMinus size={12} />
                ) : (
                  <HiOutlinePlus size={12} />
                )}
              </button>
            </div>
            <div className="border"/>
          </div>
        )
      })}
    </div>
  )
}