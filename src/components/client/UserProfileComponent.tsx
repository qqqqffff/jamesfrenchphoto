import { UseMutationResult } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Dropdown } from "flowbite-react"
import { Dispatch, SetStateAction, useState, ReactNode } from "react"
import { Participant, UserProfile } from "../../types"
import { CgSpinner } from 'react-icons/cg';
import { HiOutlineBars3, HiOutlineCheckCircle, HiOutlineUserCircle } from "react-icons/hi2";

interface UserProfileComponentProps {
  width: number,
  admin: boolean, 
  logout: () => Promise<'success' | 'fail'>,
  selectedParticipant: Participant
  setSelectedParticipant: Dispatch<SetStateAction<Participant | undefined>>
  user: UserProfile,
  participantMutation: UseMutationResult<'success' | 'fail', Error, string, unknown>
}

export const UserProfileComponent = (props: UserProfileComponentProps) => {
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const dashboardUrl = '/' +  (props.admin !== null && props.admin ? 'admin' : 'client') + '/dashboard'

  const structureActiveParticipantName = (participant: Participant) => participant.preferredName !== undefined && participant.preferredName !== '' ? (
    `${participant.preferredName} ${participant.lastName}` 
  ) : (
    `${participant.firstName} ${participant.lastName}`
  )

  function BorderWrapper ({ children }: { children: ReactNode }) {
    if(props.width > 800) {
      return (
        <div className="border-2 rounded-lg px-4 py-2">
          {children}
        </div>
      )
    }
    return (children)
  }

  return (
    <div className={`flex flex-row items-center text-2xl w-full justify-end ${props.width > 800 ? 'gap-10' : 'gap-4'}`}>
      <BorderWrapper>
        <Dropdown
          arrowIcon={props.user.participant.length > 1}
          inline
          trigger="hover"
          dismissOnClick={false}
          label={props.width > 800 ? (
            structureActiveParticipantName(props.selectedParticipant)
          ) : (
            <HiOutlineUserCircle size={32} />
          )}
        >
          {props.user.participant.map((participant, index) => {
            return (
              <Dropdown.Item 
                className='whitespace-nowrap flex flex-row gap-1 items-center'
                disabled={participant.id === props.selectedParticipant.id}
                key={index} 
                onClick={async () => {
                  if(props.user.activeParticipant?.id !== participant.id){
                    props.participantMutation
                    .mutateAsync(participant.id)
                    .then((response) => {
                      if(response === 'success') {
                        props.setSelectedParticipant(participant)
                      }
                    })
                  }
                }}
              >
                {participant.id === props.selectedParticipant.id && (
                  props.participantMutation.isPending ? (
                    <CgSpinner size={20} className="animate-spin text-gray-600"/>
                  ) : (
                    <HiOutlineCheckCircle size={20} />
                  )
                )}
                {structureActiveParticipantName(participant)}
              </Dropdown.Item>
            )}
          )}
        </Dropdown>
      </BorderWrapper>
      <BorderWrapper>
        <Dropdown
          arrowIcon={false}
          inline
          trigger="hover"
          dismissOnClick={false}
          label={props.width > 800 ? 'Settings' : <HiOutlineBars3 size={32} />}
          placement="bottom-end"
        >
          <Dropdown.Item onClick={() => navigate({ to: dashboardUrl })}>My Dashboard</Dropdown.Item>
          {props.admin !== true && (
            <Dropdown.Item onClick={() => navigate({ to: '/client/profile' })}>My Profile</Dropdown.Item>
          )}
          <Dropdown.Item 
            disabled={loggingOut}
            className='whitespace-nowrap flex flex-row gap-1 items-center'
            onClick={() => {
              props.logout().then((response) => {
                setLoggingOut(false)
                props.setSelectedParticipant(undefined)
                if(response === 'success') {
                  navigate({ to: '/', search: { logout: 'success' } })
                }
                else if(response === 'fail') {
                  navigate({ to: '/', search: { logout: 'fail' }})
                }
              })
              setLoggingOut(true)
            }}
          >
            {loggingOut && (<CgSpinner size={20} className="animate-spin text-gray-600"/>)}
            <span>Logout</span>
          </Dropdown.Item>
        </Dropdown>
      </BorderWrapper>
    </div>
  )
}