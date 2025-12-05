import { Button, ButtonGroup, Label } from "flowbite-react"
import { FC, useState } from "react"
import { TimeslotDisplayProps } from "./Timeslot"
import { HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi'
import { normalizeDate } from "../../utils"
import { Timeslot } from "../../types"
import { Badge } from "flowbite-react"
import { badgeColorThemeMap, defaultColumnColors } from "../../utils"

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

const TimeslotConsole: FC<TimeslotDisplayProps> = ({ timeslots, tags, activeDate, setActiveDate, setActiveTag, activeTag, width, formatTimeslot }) => {
  
  return (
    <div className="flex flex-col px-4 w-full justify-center items-center">
      <div className="flex flex-col items-center justify-center px-8 border border-gray-500 rounded-lg mb-4">
        <span className="mb-1">Dates for:</span>
        <div className="flex flex-row gap-2 items-center mb-2">
          {tags.length > 1 && (
            <button
              className="rounded-full border p-1"
              onClick={() => {
                const index = tags.findIndex((tag) => tag.id === activeTag.id)
                const newTag = index === -1 ? tags[0] : index - 1 < 0 ? tags[tags.length - 1] : tags[index - 1]
                setActiveTag(newTag)
              }}
            >
              <HiOutlineArrowLeft />
            </button>
          )}
          <Badge theme={badgeColorThemeMap} color={activeTag.color ? activeTag.color : 'light'} className="py-1">{activeTag.name}</Badge>
          {tags.length > 1 && (
            <button
              className="rounded-full border p-1"
              onClick={() => {
                const index = tags.findIndex((tag) => tag.id === activeTag.id)
                const newTag = index === -1 ? tags[0] : index + 1 >= tags.length ? tags[0] : tags[index + 1]
                setActiveTag(newTag)
              }}
            >
              <HiOutlineArrowRight />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-4 flex-wrap px-8 py-2 border border-gray-500 rounded-lg w-full justify-center items-center">
        {timeslots
          .filter((timeslot) => timeslot.tag !== undefined && timeslot.tag.id === activeTag.id)
          //filtering only timeslots with this id
          .reduce((prev, cur) => {
            if(!prev.some((timeslot) => (
              new Date(timeslot.start).getDate() === new Date(cur.start).getDate() &&
              new Date(timeslot.start).getMonth() === new Date(cur.start).getMonth() &&
              new Date(timeslot.start).getFullYear() === new Date(cur.start).getFullYear()
            ))) {
              prev.push(cur)
            }
            return prev
          }, [] as Timeslot[])
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .map((timeslot) => {
            const formattedDateString = timeslot.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })
            const badgeColor = activeTag.color ? defaultColumnColors[activeTag.color] : { text: 'black', bg: 'transparent', hover: 'bg-gray-100' }
            const selected = normalizeDate(timeslot.start).getTime() === normalizeDate(activeDate).getTime()
            const selectedClass = selected ? `${badgeColor.hover.substring(badgeColor.hover.indexOf(':') + 1)}` : ''

            return (
              <button
                key={timeslot.id}
                className={`
                  rounded-lg px-8 py-2
                  bg-${badgeColor.bg} text-${badgeColor.text} ${badgeColor.hover}
                  ${selectedClass}
                `}
                onClick={() => {
                  setActiveDate(normalizeDate(timeslot.start))
                }}
              >
                {formattedDateString}
              </button>
            )
          }
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