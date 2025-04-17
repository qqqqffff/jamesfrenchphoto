import { FC } from "react";
import { TimeslotDisplayProps } from "./Timeslot";
import { Badge, Dropdown, Label, Tooltip } from "flowbite-react";
import { badgeColorThemeMap, normalizeDate } from "../../utils";
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineInformationCircle } from "react-icons/hi"
import { Timeslot } from "../../types";
import { ColorComponent } from "../common/ColorComponent";

const component: FC<TimeslotDisplayProps> = ({timeslots, setActiveDate, activeDate, formatTimeslot, formatRegisteredTimeslot }) => {
  return (
    <div className="grid grid-cols-6 gap-4 font-main mt-6">
      <div className="flex flex-col ms-4 border border-gray-400 rounded-lg px-6 py-2 gap-2">
        <div className="flex flex-row gap-1 w-full justify-between">
          <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
          <Tooltip content={
              (<span className="italic">Click on a timeslot to register for a selected date in the range seen bellow!</span>)
          }>
              <Badge color="light" icon={HiOutlineInformationCircle} className="text-2xl text-gray-600 bg-transparent" theme={badgeColorThemeMap} size="" />
          </Tooltip>
        </div>
          <div className="flex flex-row gap-2 items-center">
              <button className="border p-1.5 rounded-full border-black bg-white hover:bg-gray-300" onClick={() => {
                  const tempTimeslots = timeslots
                    .map((timeslot) => normalizeDate(timeslot.start).getTime())
                    .reduce((prev, cur) => {
                      if(!prev.includes(cur)){
                        prev.push(cur)
                      }
                      return prev
                    }, [] as number[])
                    .map((time) => new Date(time))
    
                  const currentTimeslotIndex = tempTimeslots.findIndex((date) => date.getTime() === activeDate.getTime())
                  const currentDate = currentTimeslotIndex - 1 < 0 ? tempTimeslots[tempTimeslots.length - 1] : tempTimeslots[currentTimeslotIndex - 1]
                  
                  setActiveDate(currentDate)
              }} disabled={timeslots.length === 0}>
                  <HiOutlineArrowLeft />
              </button>
              <Dropdown color="light" label={'Date: ' + activeDate.toLocaleDateString()}>
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
              <button className="border p-1.5 rounded-full border-black bg-white hover:bg-gray-300" onClick={() => {
                  const tempTimeslots = timeslots
                    .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                    .reduce((prev, cur) => {
                      if(!prev.includes(cur)){
                        prev.push(cur)
                      }
                      return prev
                    }, [] as number[])
                    .map((time) => new Date(time))
    
                  const currentTimeslotIndex = tempTimeslots.findIndex((date) => date.getTime() === activeDate.getTime())
                  const currentDate = currentTimeslotIndex + 1 >= tempTimeslots.length ? tempTimeslots[0] : tempTimeslots[currentTimeslotIndex + 1]
                  
                  setActiveDate(currentDate)
              }} disabled={timeslots.length === 0}>
                  <HiOutlineArrowRight />
              </button>
          </div>
          {timeslots.length > 0 ? (
            <div className="flex flex-col">
              {timeslots
                  .filter((timeslot) => timeslot.tag !== undefined)
                  .reduce((prev, cur) => {
                    const found = prev.find((timeslot) => timeslot.tag === cur.tag)
                    if(!found) prev.push(cur)
                    return prev
                  }, [] as Timeslot[])
                  .map((timeslot, index) => {
                    const tag = timeslot.tag!
                    const sortedTimeslots = timeslots.sort((a, b) => a.start.getTime() - b.start.getTime())
                    
                    const formattedDateString = sortedTimeslots[0].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' }) + ' - ' + sortedTimeslots[sortedTimeslots.length - 1].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })

                    return (
                      <div key={index} className="flex flex-col items-center justify-center">
                        <span>Dates for:</span>
                        <Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>
                        <ColorComponent activeColor={tag.color} customText={formattedDateString} />
                      </div>
                    )
              })}
            </div>
          ) : (
            <span className="text-gray-400 italic">No current timeslots for registration!</span>
          )}
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