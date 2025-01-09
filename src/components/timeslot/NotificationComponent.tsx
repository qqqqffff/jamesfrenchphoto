import { Checkbox } from "flowbite-react";
import { FC } from "react";

interface NotificationComponentParams {
  setNotify: (not: boolean) => void, 
  email: string, 
  notify: boolean 
}

const component: FC<NotificationComponentParams> = ({ setNotify, notify, email }) => {
  return (
    <>
      <button className="flex flex-row gap-2 text-left items-center mt-4 ms-2" onClick={() => setNotify(!notify)} type="button">
        <Checkbox className="mt-1" checked={notify} readOnly />
        <span>Send a confirmation email to <span className="italic">{email}</span></span>
      </button>
    </>
  )
}

export default component