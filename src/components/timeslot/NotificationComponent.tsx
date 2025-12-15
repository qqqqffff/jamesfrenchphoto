import { Checkbox } from "flowbite-react";
import { Dispatch, FC, SetStateAction, useState } from "react";
import validator from 'validator'
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlinePlusCircle, HiOutlineXCircle } from 'react-icons/hi2'

interface NotificationComponentParams {
  setNotify: (not: boolean) => void, 
  email: string, 
  notify: boolean,
  recipients: string[]
  setRecipients: Dispatch<SetStateAction<string[]>>
}

const component: FC<NotificationComponentParams> = ({ setNotify, notify, email, recipients, setRecipients }) => {
  const [invalidEmail, setInvalidEmail] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string>('')
  const [deleteHovering, setDeleteHovering] = useState<string | undefined>()
  const [showAdditionalRecipients, setShowAdditionalRecipients] = useState(false)

  return (
    <div className="flex flex-col justify-start gap-2">
      <button className="flex flex-row gap-2 text-left items-center mt-4 ms-2" onClick={() => setNotify(!notify)} type="button">
        <Checkbox className="mt-1" checked={notify} readOnly />
        <span>Send a confirmation email to <span className="italic">{email}</span></span>
      </button>
      {showAdditionalRecipients ? (
        <>
          <div className="flex flex-row gap-2 items-center max-w-[90%] py-1 border rounded-lg px-2">
            <span className="italic text-sm whitespace-nowrap">Additional Recipients:</span>
            <input 
              className={`
                font-thin ps-2 text-sm ring-transparent w-full outline-none rounded-lg
                border py-0.5 placeholder:text-gray-400 placeholder:italic italic 
                ${invalidEmail ? 'border-red-500' : 'border-gray-400'}  
              `}
              placeholder="Additional Recipient's Email..."
              value={currentEmail}
              onChange={(event) => {
                setCurrentEmail(event.target.value)
              }}
              onKeyDown={(event) => {
                if(
                  event.code === 'Enter' &&
                  validator.isEmail(currentEmail) &&
                  !recipients.some((email) => email.toLowerCase() === currentEmail.toLowerCase()) &&
                  email.toLowerCase() !== currentEmail.toLowerCase()
                ) {
                  setRecipients(prev => [...prev, currentEmail])
                  setCurrentEmail('')
                }
                if(event.code === 'Escape') {
                  setCurrentEmail('')
                }
              }}
              onFocus={() => setInvalidEmail(false)}
              onBlur={() => setInvalidEmail(
                (!validator.isEmail(currentEmail) && currentEmail !== '') || 
                currentEmail.toLowerCase() === email.toLowerCase() || 
                recipients.some((email) => email.toLowerCase() === currentEmail.toLowerCase())
              )}
            />
            <button
              disabled={!validator.isEmail(currentEmail) || recipients.some((email) => email.toLowerCase().trim() === currentEmail.toLowerCase().trim()) || email === currentEmail}
              className="disabled:text-gray-400 disabled:cursor-not-allowed text-gray-600 enabled:hover:text-black"
              onClick={() => {
                setRecipients(prev => [...prev, currentEmail])
                setCurrentEmail('')
              }}
            >
              <HiOutlinePlusCircle size={22} />
            </button>
            <button
              className="hover:text-gray-500"
              onClick={() => setShowAdditionalRecipients(false)}
            >
              <HiOutlineChevronDown size={16} />
            </button>
          </div>
          {recipients.map((recipient, index) => {
            return (
              <button 
                key={index}
                className="flex flex-row gap-2 items-center  text-sm"
                onClick={() => {
                  setRecipients(prev => prev.filter((email) => email !== recipient))
                }}
              >
                <span>&bull;</span>
                <span 
                  className="italic hover:line-through"
                  style={{
                    textDecorationLine: deleteHovering !== undefined && deleteHovering === recipient ? 'line-through' : ''
                  }}
                >{recipient}</span>
                <HiOutlineXCircle 
                  size={22} 
                  className="ms-1 mt-0.5 text-gray-600 hover:text-black" 
                  onMouseEnter={() => setDeleteHovering(recipient)} 
                  onMouseLeave={() => setDeleteHovering(undefined)}
                />
              </button>
            )
          })}
        </>
      ) : (
        <button
          className="flex flex-row items-center rounded-lg px-2 py-1 border hover:bg-gray-100 gap-4 w-fit"
          onClick={() => setShowAdditionalRecipients(true)}
        >
          <span className="italic text-sm whitespace-nowrap">Additional Recipients:</span>
          <HiOutlineChevronLeft size={16} />
        </button>
      )}
    </div>
  )
}

export default component