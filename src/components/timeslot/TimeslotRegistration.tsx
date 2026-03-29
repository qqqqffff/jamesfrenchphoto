import { Dispatch, SetStateAction } from "react";
import { Timeslot } from "../../types";
import { formatTime } from "../../utils";
import { NotificationComponent } from "./NotificationComponent";
import { DateTime } from "luxon";

interface TimeslotRegistrationProps {
  timeslot: Timeslot,
  type: 'Registration' | 'Unregistration'
  preview: {
    preview: true
  } | {
    preview: false
    setNotify: (notify: boolean) => void
    email: string
    notify: boolean
    recipients: string[]
    setRecipients: Dispatch<SetStateAction<string[]>>
  }
}

export const TimeslotRegistration = (props: TimeslotRegistrationProps) => {
  if(props.type === 'Registration') {
    const displayCancelationFee: boolean = (
      props.timeslot.cancelationFee !== undefined && (
        (
          DateTime.fromJSDate(props.timeslot.start).diffNow().toMillis() >= props.timeslot.cancelationFee.window.toMillis() &&
          !props.preview.preview
        ) || props.preview.preview
      )
    )
    return (
      <div className="flex flex-col rounded-lg border px-4 py-2 w-full">
        <div className="flex flex-row border-b-2">
          <span className="text-xl font-medium">Confirm Timeslot Selection</span>
        </div>
        <div className="text-center flex flex-col">
          <span><b>Registration for Timeslot: {props.timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTime(props.timeslot.start, { timeString: true })} - {formatTime(props.timeslot.end, { timeString: true })}</b></span>
          <span>Make sure that this is the right timeslot for you, since you only can reserve one timeslot!</span>
          {displayCancelationFee && (
            <span>Booking this timeslot within <b>{props.timeslot.cancelationFee!.window.as('hours')}</b> hours of the selected date will incur an additional short notice booking fee of <b>${props.timeslot.cancelationFee!.amount}</b>.</span>
          )}
          {props.timeslot.noshowFee && (
            <span>Please attend your reserved timeslot on time otherwise you will be charged a <b>${props.timeslot.noshowFee}</b> no show fee.</span>
          )}
          <div  className="w-full border my-2"/>
          {(props.timeslot.cancelationFee !== undefined || props.timeslot.noshowFee !== undefined) && (
            <>
              <span className="italic text-sm text-gray-500 text-start">Payment information will be collected on following screen which will be subject to charges in the following cases:</span>
              {/* display logic follows: if cancelation fee and within cancelation fee window while not a preview or is a preview display */}
              {displayCancelationFee && (<span className="italic text-sm text-gray-500 text-start">&bull; Short notice booking (immediate) for booking within {props.timeslot.cancelationFee!.window.as('hours')} hours</span>)}
              {props.timeslot.noshowFee && (<span className="italic text-sm text-gray-500 text-start">&bull; No show fee (processed within 7 days of timeslot date).</span>)}
            </>
          )}
          {(props.timeslot.noshowFee || props.timeslot.cancelationFee) && (
            <span className="italic text-xs text-gray-500 text-start">Please note that charges are subject to a 2% platform service charge with a maximum charge of $10 to help keep our platform running.</span>
          )}
          {props.preview.preview ? (
            <span className="italic text-sm text-gray-500 mt-4 border px-2 py-1 rounded-lg">Additional fields will display here to send email notifications to user and additional participants</span>
          ) : (
            <NotificationComponent 
              setNotify={props.preview.setNotify}
              email={props.preview.email}
              notify={props.preview.notify}
              recipients={props.preview.recipients}
              setRecipients={props.preview.setRecipients}
            />
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col rounded-lg border px-4 py-2 w-full">
      <div className="flex flex-row border-b-2">
        <span className="text-xl font-medium">Confirm Unregistration</span>
      </div>
      <div className="text-center flex flex-col pt-2 pb-8">
        <span><b>Unregistration for Timeslot: {props.timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTime(props.timeslot.start, { timeString: true })} - {formatTime(props.timeslot.end, { timeString: true })}</b></span>
        <span>Are you sure you want to unregister from this timeslot?</span>
      </div>
    </div>
  )
}