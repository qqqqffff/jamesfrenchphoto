import { FC } from "react";
import { TimeslotDisplayProps } from "./Timeslot";
import { Badge, Label, Tooltip } from "flowbite-react";
import { badgeColorThemeMap, defaultColumnColors, normalizeDate } from "../../utils";
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineInformationCircle } from "react-icons/hi"
import { Timeslot } from "../../types";

const component: FC<TimeslotDisplayProps> = ({timeslots, tags, setActiveDate, activeDate, setActiveTag, activeTag, formatTimeslot, formatRegisteredTimeslot }) => {
  return (
    <div className="grid grid-cols-6 gap-4 font-main mt-6">
      <div className="flex flex-col ms-4 border border-gray-400 rounded-lg px-6 py-2 gap-2">
        <div className="flex flex-row gap-1 w-full justify-between">
          <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
          <Tooltip style='light' content={
            (<span className="italic">Click on a timeslot to register for a selected date in the range seen bellow!</span>)
          }>
            <Badge color="light" icon={HiOutlineInformationCircle} className="text-2xl text-gray-600 bg-transparent -me-2" theme={badgeColorThemeMap} size="" />
          </Tooltip>
        </div>
        <div className="flex flex-col items-center justify-center">
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
          
          <div  className="border mb-2 w-full"/>
          {timeslots.length > 0 ? (
            <div className="flex flex-col w-full">
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
                        mb-2 rounded-lg px-4 py-2 w-full
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
          ) : (
            <span className="text-gray-400 italic">No current timeslots for registration!</span>
          )}
        </div>
      </div>
      <div className="col-span-4 border border-gray-400 rounded-lg py-4 px-2 h-[500px] overflow-auto">
        <div className="grid gap-2 grid-cols-3">
            {formatTimeslot().length > 0 ? (
              formatTimeslot()
            ) : (
              <div className="flex flex-row w-full items-center justify-center col-start-2">
                <Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>
              </div>
            )}
        </div>
      </div>
      <div className="flex flex-col border border-gray-400 rounded-lg py-2 px-6 h-[500px] overflow-auto me-4 gap-2">
        <span className="text-2xl underline underline-offset-4">Selected Timeslots:</span>
        {formatRegisteredTimeslot()}
      </div>
  </div>
  )
}

export default component