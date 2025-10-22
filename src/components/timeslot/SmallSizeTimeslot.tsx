import { Button, ButtonGroup, Dropdown, Label } from "flowbite-react"
import { FC, useState } from "react"
import { TimeslotDisplayProps } from "./Timeslot"
import { HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi'
import { normalizeDate } from "../../utils"
import { Timeslot } from "../../types"

const component: FC<TimeslotDisplayProps> = (params) => {
  const [activeConsole, setActiveConsole] = useState('timeslots')

  function activeControlClass(control: string) {
    if(control == activeConsole) return 'border border-black'
    return undefined
  }

  return (
    <>
      <div className="flex flex-col border-t border-gray-500 mt-4 font-main justify-center items-center">
        <div className="flex flex-row gap-4 my-4">
          <ButtonGroup outline>
            <Button color="light" className={activeControlClass('myTimeslots')} onClick={() => setActiveConsole('myTimeslots')}>My Timeslots</Button>
            <Button color="light" className={activeControlClass('timeslots')} onClick={() => setActiveConsole('timeslots')}>View Timeslots</Button>
          </ButtonGroup>
        </div>
        {activeConsole == 'timeslots' ? (
          <TimeslotConsole 
            {...params}
          />
        ) : (
          <MyTimeslotConsole 
            {...params}
          />
        )}
      </div>
    </>
  )
}

const TimeslotConsole: FC<TimeslotDisplayProps> = ({ timeslots, activeDate, setActiveDate, width, formatTimeslot }) => {
  const dateMap = new Map<number, Timeslot>()

  timeslots.forEach((timeslot) => {
    dateMap.set(normalizeDate(timeslot.start).getTime(), timeslot)
  })

  const normalDates = timeslots
    .map((timeslot) => normalizeDate(timeslot.start).getTime())
    .reduce((prev, cur) => {
      if(!prev.includes(cur)){
        prev.push(cur)
      }
      return prev
    }, [] as number[])
    .map((time) => new Date(time))
  
  return (
    <div className="flex flex-col px-4 w-full justify-center items-center">
      <div className="flex flex-row gap-4">
        {normalDates.length > 1 && (
          <button 
            className="border p-2 rounded-full border-black bg-white hover:bg-gray-300" 
            onClick={() => {
              const currentTimeslotIndex = normalDates.findIndex((date) => date.getTime() === activeDate.getTime())
              const currentDate = currentTimeslotIndex - 1 < 0 ? normalDates[normalDates.length - 1] : normalDates[currentTimeslotIndex - 1]
              
              setActiveDate(currentDate)
            }}
          >
              <HiOutlineArrowLeft className="text-xl"/>
          </button>
        )}
        <Dropdown color="light" label={'Date: ' + activeDate.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}>
        {
          timeslots.length > 0 ? (
            timeslots
              .reduce((prev, cur) => {
                const found = prev.find((timeslot) => timeslot.tag === cur.tag)
                if(!found) prev.push(cur)
                return prev
              }, [] as Timeslot[])
              .map((timeslot) => {
                const color = timeslot.tag?.color ?? 'black'
                const dates = timeslots
                  .map((timeslot) => normalizeDate(timeslot.start).getTime())
                  .reduce((prev, cur) => {
                    if(!prev.includes(cur)) {
                      prev.push(cur)
                    }
                    return prev
                  }, [] as number[])
                  .sort((a, b) => a - b)
                  .map((time) => new Date(time))
                
                const objects = dates.map((date, index) => {
                    return (
                      <Dropdown.Item key={index} className={`text-${color}`} onClick={() => setActiveDate(date)}>{date.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                    )
                })
                return objects
              })
          ) : (
            <Dropdown.Item>No Dates available</Dropdown.Item>
          )
        }
        </Dropdown>
        {normalDates.length > 1 && (
          <button 
            className="border p-2 rounded-full border-black bg-white hover:bg-gray-300" 
            onClick={() => {
              const currentTimeslotIndex = normalDates.findIndex((date) => date.getTime() === activeDate.getTime())
              const currentDate = currentTimeslotIndex + 1 >= normalDates.length ? normalDates[0] : normalDates[currentTimeslotIndex + 1]
              
              setActiveDate(currentDate)
            }} 
          >
            <HiOutlineArrowRight className="text-xl"/>
          </button>
        )}
      </div>
      
      <div className={`grid ${width > 600 ? 'grid-cols-2' : 'grid-cols-1'} border-gray-500 border rounded-lg px-4 py-2 w-full my-4 items-center justify-center gap-4`}>
          {formatTimeslot().length > 0 ? (
            formatTimeslot()
          ) : (
            <Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>
          )}
      </div>
    </div>
  )
}

const MyTimeslotConsole: FC<TimeslotDisplayProps> = ({formatRegisteredTimeslot, width}) => {
  return (
    <div className="grid w-full px-4">
      <div className={`
        grid border-gray-500 border rounded-lg px-4 py-2 w-full 
        my-4 items-center justify-center gap-4
        ${width > 600 && formatRegisteredTimeslot().length > 0 ? 'grid-cols-2' : 'grid-cols-1'}
      `}>
        {formatRegisteredTimeslot().length > 0 ? (
          formatRegisteredTimeslot().map((element, index) => {
            return (
              <div key={index} className="border border-gray-300 rounded-lg px-4 py-2">
                {element}
              </div>
            )
          })
        ) : (
          <Label className="font-medium text-lg italic text-gray-500">You will see your timeslot here after you register!</Label>
        )}
      </div>
    </div>
  )
}

export default component