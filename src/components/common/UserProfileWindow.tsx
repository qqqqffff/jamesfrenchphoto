import { UserData } from "../../types"

interface UserProfileWindowProps {
  profile: UserData
  children?: JSX.Element,
  display?: {
    email?: boolean
    title?: boolean
  }
}
export const UserProfileWindow = (props: UserProfileWindowProps) => {
  return (
    <div className="flex flex-col px-2 text-xs text-start max-h-60 overflow-y-auto">
      {props.display?.title && (<span className='text-blue-400 text-base'>User</span>)}
      {props.display?.email && (
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Email:</span>
          <span className="italic">{props.profile.email}</span>
        </div>
      )}
      <div className="flex flex-row gap-2 items-center text-nowrap">
        <span>First Name:</span>
        <span className="italic">{props.profile.first}</span>
      </div>
      <div className="flex flex-row gap-2 items-center text-nowrap">
        <span>Last Name:</span>
        <span className="italic">{props.profile.last}</span>
      </div>
      {props.profile.created && (
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Created:</span>
          <span className="italic">
          {
            props.profile.created.toLocaleString('en-US', { timeZone: 'America/Chicago' })
            .replace('T', ' ')
            .replace(/[.].*/g, '')
          }
          </span>
        </div>
      )}
      <div className="border-gray-300 border mb-1"/>
      {props.profile.profile?.participant.map((participant, index) => {
        return (
          <div className="flex flex-col" key={index}>
            <span className="underline">Participant:</span>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>First Name:</span>
              <span className="italic">{participant.firstName}</span>
            </div>
            {participant.preferredName && (
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Preferred Name:</span>
                <span className="italic">{participant.preferredName}</span>
              </div>
            )}
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Last Name:</span>
              <span className="italic">{participant.lastName}</span>
            </div>
            {participant.email && (
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Email:</span>
                <span className="italic">{participant.email}</span>
              </div>
            )}
            {participant.userTags.length > 0 && (
              <div className="flex flex-row gap-1 items-center text-nowrap">
                <span className="me-1">Tags:</span>
                {participant.userTags.map((tag, index, arr) => {
                  return (
                    <span className={`italic text-${tag.color ?? 'black'} truncate`} key={index}>{tag.name}{arr.length > 1 && index !== arr.length - 1 ? ',' : ''}</span>
                  )
                })}
              </div>
            )}
            <div className="border-gray-300 border mb-1"/>
          </div>
        )
      })}
      {props.children}
    </div>
  )
}