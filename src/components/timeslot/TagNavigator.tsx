import { Dispatch, SetStateAction } from "react";
import { UserTag } from "../../types";
import { TagPicker } from "../common/TagPicker";
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { normalizeDate, sortDatesAround } from "../../utils";
import { ColorComponent } from "../common/ColorComponent";
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi2'
import { GetAllUserTagsData } from "../../services/tagService";
import { UseNavigateResult } from "@tanstack/react-router";
import { DateTime } from "luxon";

interface TagNavigatorProps {
  activeDate: Date
  setActiveTag: Dispatch<SetStateAction<UserTag | undefined>>
  navigate: UseNavigateResult<string>
  activeTag: UserTag | undefined
  tags: UserTag[]
  tagsQuery: UseInfiniteQueryResult<InfiniteData<GetAllUserTagsData, unknown>, Error>
  small?: boolean
}

//implement tag query fetching next
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
    <div className="flex flex-col justify-center w-full items-center">
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
            props.navigate({ to: '.', search: { date: DateTime.fromJSDate(sortedDates[0]).toFormat('MM-dd-yyyy') }})
            return
          }
          props.setActiveTag(tag)
        }}
        allowMultiple={false}
        allowClear
        placeholder="Filter By Tag"
        small={props.small}
      />
      {props.activeTag && (
        props.small ? (
          <div className="flex flex-col gap-2 mt-1">
            <div>
              <button
                className="p-1 border rounded-lg enabled:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed enabled:hover:border-gray-400"
                onClick={() => {
                  //navigate to previous active date from the timeslot if exists
                  const activeDateIndex = uniqueTimeslotDates.findIndex((date) => date.getTime() === normalizeDate(props.activeDate).getTime())
                  const newDate = activeDateIndex - 1 < 0 ? uniqueTimeslotDates[uniqueTimeslotDates.length - 1] : uniqueTimeslotDates[activeDateIndex - 1]

                  props.navigate({ to: '.', search: { date: DateTime.fromJSDate(newDate).toFormat('MM-dd-yyyy') }})
                }}
                disabled={(props.activeTag.timeslots ?? []).length > 1}
              >
                <HiOutlineChevronUp size={24} className={`text-${props.activeTag.color ?? 'black'}`} />
              </button>
            </div>
            <div>
              <button
                className="p-1 border rounded-lg enabled:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed enabled:hover:border-gray-400"
                onClick={() => {
                  //navigate to next active date from the timeslot if exists
                  const activeDateIndex = uniqueTimeslotDates.findIndex((date) => date.getTime() === normalizeDate(props.activeDate).getTime())
                  const newDate = activeDateIndex + 1 >= uniqueTimeslotDates.length ? uniqueTimeslotDates[0] : uniqueTimeslotDates[activeDateIndex + 1]

                  props.navigate({ to: '.', search: { date: DateTime.fromJSDate(newDate).toFormat('MM-dd-yyyy') }})
                }}
                disabled={(props.activeTag.timeslots ?? []).length > 1}
              >
                <HiOutlineChevronDown size={24} className={`text-${props.activeTag.color ?? 'black'}`} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-row items-center gap-1">
              {uniqueTimeslotDates.length > 1 && (
                <button 
                  className="mt-1"
                  onClick={() => {
                    const activeDateIndex = uniqueTimeslotDates.findIndex((date) => date.getTime() === normalizeDate(props.activeDate).getTime())
                    const newDate = activeDateIndex - 1 < 0 ? uniqueTimeslotDates[uniqueTimeslotDates.length - 1] : uniqueTimeslotDates[activeDateIndex - 1]

                    props.navigate({ to: '.', search: { date: DateTime.fromJSDate(newDate).toFormat('MM-dd-yyyy') }})
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

                    props.navigate({ to: '.', search: { date: DateTime.fromJSDate(newDate).toFormat('MM-dd-yyyy') }})
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
        )
      )}
    </div>
  )
}