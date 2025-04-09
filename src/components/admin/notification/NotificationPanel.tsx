import { Dispatch, SetStateAction } from "react"
import { Notification } from "../../../types"

interface NotificationPanelProps {
  notification: Notification,
  parentUpdateNotification: Dispatch<SetStateAction<Notification | undefined>>
  parentUpdateNotifications: Dispatch<SetStateAction<Notification[]>>
}
export const NotificationPanel = (props: NotificationPanelProps) => {
  function transformText(value: string){
    const split = value.split('\n')
    return split.map((value, key) => {
      return (
        <span key={key} className="inline-block w-full whitespace-normal break-words">
          {value}
          <br />
        </span>
      )
    })
  }

  return (
    <>
      <span className="font-thin text-lg italic">Preview Notification</span>
      <div className="border border-gray-400 rounded-lg px-4 py-1">
        <span className={`${props.notification.content ? 'text-black' : 'text-gray-300'} text-base font-extralight`}>{props.notification.content ? transformText(props.notification.content) : 'Notification content will display here'}</span>
      </div>
      {props.notification.content}
    </>
  )
}