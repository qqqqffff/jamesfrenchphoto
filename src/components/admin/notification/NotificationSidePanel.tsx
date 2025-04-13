import { useState } from "react"
import { Notification, UserTag } from "../../../types"

interface NotificationSidePanelProps {
  notifications: Notification[],
  userTags: UserTag[]
}

export const NotificationSidePanel = (props: NotificationSidePanelProps) => {
  const [filter, setFilter] = useState('')

  return (
    <>
      
    </>
  )
}