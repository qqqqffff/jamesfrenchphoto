import { Dispatch, SetStateAction } from "react";
import { UserTag } from "../../types";
import { TagPicker } from "../admin/package/TagPicker";
import { UseQueryResult } from "@tanstack/react-query";
import { normalizeDate, sortDatesAround } from "../../utils";
import { ColorComponent } from "../common/ColorComponent";
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle } from 'react-icons/hi2'

interface TagNavigatorProps {
  activeDate: Date
  setActiveTag: Dispatch<SetStateAction<UserTag | undefined>>
  setActiveDate: Dispatch<SetStateAction<Date>>
  activeTag: UserTag | undefined
  tags: UserTag[]
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
}

export const TagNavigator = (props: TagNavigatorProps) => {
  const sortedTimeslots = (props.activeTag?.timeslots ?? [])
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  const formattedTextString = sortedTimeslots.length > 0 ? (
    sortedTimeslots[0].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' }) +
    (sortedTimeslots.reduce((prev, cur) => {
      if(!prev.some((date) => date.getTime() === normalizeDate(cur.start).getTime())) {
        prev.push(normalizeDate(cur.start))
      }
      return prev
    }, [] as Date[]).length > 1 ? (
      ' - ' +
      sortedTimeslots[sortedTimeslots.length - 1].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })
    ) : '')) : 'No Timeslots'

  const uniqueTimeslotDates = sortDatesAround((props.activeTag?.timeslots ?? [])
    .map((timeslot) => normalizeDate(timeslot.start))
    .reduce((prev, cur) => {
      if(!prev.some((date) => date.getTime() === cur.getTime())) {
        prev.push(cur)
      }
      return prev
    }, [] as Date[]), props.activeDate)
  return (
    <>
      <TagPicker 
        tags={props.tags}
        pickedTag={props.activeTag ? [props.activeTag] : undefined}
        parentPickTag={(tag) => {
          if(tag && tag.timeslots && tag.timeslots.length > 0) {
            const sortedTimes = tag.timeslots
              .map((timeslot) => normalizeDate(timeslot.start))
              .reduce((prev, cur) => {
                if(!prev.some((date) => date.getTime() === cur.getTime())) {
                  prev.push(cur)
                }
                return prev
              }, [] as Date[])
            const sortedDates = sortDatesAround(sortedTimes, props.activeDate)
            props.setActiveTag(tag)
            props.setActiveDate(sortedDates[0])
            return
          }
          props.setActiveTag(tag)
        }}
        allowMultiple={false}
        allowClear
        placeholder="Filter By Tag"
        className="w-full my-2 border rounded-lg px-2 py-1.5"
      />
      {props.activeTag && (
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-row items-center gap-1">
            {uniqueTimeslotDates.length > 1 && (
              <button 
                className="mt-1"
                onClick={() => {
                  const activeDateIndex = uniqueTimeslotDates.findIndex((date) => date.getTime() === normalizeDate(props.activeDate).getTime())
                  const newDate = activeDateIndex - 1 < 0 ? uniqueTimeslotDates[uniqueTimeslotDates.length - 1] : uniqueTimeslotDates[activeDateIndex - 1]

                  props.setActiveDate(newDate)
                }}
              >
                <HiOutlineArrowLeftCircle size={20} className="hover:text-gray-500"/>
              </button>
            )}
            <span>Active Date{
              sortedTimeslots.reduce((prev, cur) => {
                if(!prev.some((date) => date.getTime() === normalizeDate(cur.start).getTime())) {
                  prev.push(normalizeDate(cur.start))
                }
                return prev
              }, [] as Date[]).length > 1 ? 's' : ''
            }</span>
            {uniqueTimeslotDates.length > 1 && (
              <button 
                className="mt-1"
                onClick={() => {
                  const activeDateIndex = uniqueTimeslotDates.findIndex((date) => date.getTime() === normalizeDate(props.activeDate).getTime())
                  const newDate = activeDateIndex + 1 >= uniqueTimeslotDates.length ? uniqueTimeslotDates[0] : uniqueTimeslotDates[activeDateIndex + 1]

                  props.setActiveDate(newDate)
                }}
              >
                <HiOutlineArrowRightCircle size={20} className="hover:text-gray-500"/>
              </button>
            )}
          </div>
          <ColorComponent 
            activeColor={props.activeTag.color} 
            customText={formattedTextString} 
          />
        </div>
      )}
    </>
  )
}