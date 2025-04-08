import { Dispatch, SetStateAction, useState } from "react"
import { Notification } from "../../../types"
import { Dropdown, Tooltip } from "flowbite-react"
import { HiOutlineCog6Tooth } from "react-icons/hi2"
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea"

interface CreateNotificationPanelProps {
  parentUpdateNotification: Dispatch<SetStateAction<Notification | undefined>>
  parentUpdateNotifications: Dispatch<SetStateAction<Notification[]>>
}

export const CreateNotificationPanel = (props: CreateNotificationPanelProps) => {
  const [content, setContent] = useState('')

  return (
    <div className="flex flex-col">
      <div className="flex flex-row w-full justify-between">
        <span className="font-light text-xl px-2 w-full py-1">Create Notification</span>
        <Tooltip content="Photo Set Settings">
          <Dropdown 
            dismissOnClick={false} 
            label={(<HiOutlineCog6Tooth size={24} className="hover:text-gray-600"/>)} 
            inline 
            arrowIcon={false}
          >
          </Dropdown>
        </Tooltip>
      </div>
      <div className="border w-full mb-4" />
      <div className="grid grid-cols-2 gap-x-4 px-10">
        <div className="flex flex-col gap-1 max-w-[500px]">
          <span>Notification content</span>
          <AutoExpandTextarea 
            placeholder="Enter Notification Content Here..."
            stateUpdate={setContent}
            parentValue={content}
          />
          <span>Users</span>
          <span>UserTags</span>
        </div>
        <div>
          <span>Preview Notification</span>
        </div>
      </div>
    </div>
  )
}