import { Dispatch, SetStateAction, useState } from "react"
import { currentDate, normalizeDate } from "../../../utils"
import { Datepicker, Label } from "flowbite-react"
import { Participant, Timeslot, UserTag } from "../../../types"
import { UseQueryResult } from "@tanstack/react-query"
import { SlotComponent } from "../../timeslot/Slot"
import { Link } from "@tanstack/react-router"
import Loading from "../../common/Loading"

interface TimeslotsPanelProps {
  selectedTag: UserTag
  parentUpdateTag: Dispatch<SetStateAction<UserTag | undefined>>
  timeslotQuery: UseQueryResult<Timeslot[] | undefined, Error>
  participantQuery: UseQueryResult<Participant[] | undefined, Error>
}
export const TimeslotsPanel = (props: TimeslotsPanelProps) => {
  const [filterDate, setFilterDate] = useState<Date>()

  const filteredTimeslots = (props.timeslotQuery.data ?? [])
    .filter((timeslot) => ((
      filterDate === undefined || 
      normalizeDate(filterDate).getTime() === normalizeDate(timeslot.end).getTime())
    ) && !props.selectedTag.timeslots?.some((pTimeslot) => pTimeslot.id === timeslot.id))

  return (
    <div className="flex flex-col items-center justify-center w-full gap-4">
      <div className="flex flex-row gap-2 items-center">
        <Label className="text-2xl font-light italic">Filter Date:</Label>
        <Datepicker 
          onChange={(date) => {
            setFilterDate(date ?? undefined)
          }}
          value={filterDate}
        />
      </div>
      <div className="grid grid-cols-2 px-10 place-items-center gap-x-10 w-full max-h-[68vh] overflow-auto">
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          <span className="font-light border-b me-[40%] text-lg ps-2 pb-1">Untagged Timeslots</span>
          {props.timeslotQuery.isLoading ? (
            <span className="flex flex-row text-start gap-1 italic font-light">
              <span>Loading</span>
              <Loading />
            </span>
          ) : (
            (props.timeslotQuery.data?.length ?? 0) === 0 ? (
              <div className="flex flex-row gap-4">
                <span className="italic font-light">No Untagged Timeslots</span>
                <Link to="/admin/dashboard/scheduler">
                  <span className="hover:underline">Create New Timeslot</span>
                </Link>
              </div>
            ) : (
              filterDate !== undefined && filteredTimeslots.length === 0 ? (
                <div className="flex flex-row gap-4">
                  <span className="italic font-light">No Results</span>
                  <Link to="/admin/dashboard/scheduler">
                    <span className="hover:underline text-sm italic">Create New Timeslot</span>
                  </Link>
                </div>
              ) : (
                filteredTimeslots
                  .sort((a, b) => b.start.getTime() - a.start.getTime())
                  .map((timeslot, index) => {
                    return (
                      <button 
                        key={index} 
                        className='hover:bg-gray-200 rounded-lg'
                        onClick={() => {
                          const tempTag: UserTag = {
                            ...props.selectedTag,
                            timeslots: [...(props.selectedTag.timeslots ?? []), timeslot]
                          }

                          props.parentUpdateTag(tempTag)
                        }}
                      >
                        <SlotComponent 
                          timeslot={timeslot} 
                          participant={props.participantQuery.data
                            ?.find((participant) => participant.id === timeslot.participantId)
                          } 
                          tag={undefined} 
                        />
                      </button>
                    )
                  })
              )
            )
          )}
        </div>
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          <span className="font-light border-b me-[40%] text-lg ps-2 pb-1">Selected Timeslots</span>
          {(props.selectedTag.timeslots?.length ?? 0) === 0 ? (
            <span className="italic font-light">No Selected Timeslots</span>
          ) : (
            (props.selectedTag.timeslots ?? [])
            .sort((a, b) => {
              const diffA = Math.abs(a.start.getTime() - currentDate.getTime());
              const diffB = Math.abs(b.start.getTime() - currentDate.getTime());
              return diffA - diffB;
            })
            .map((timeslot, index) => {
              return (
                <button 
                  key={index} 
                  className='hover:bg-gray-200 rounded-lg'
                  onClick={() => {
                    const tempTag: UserTag = {
                      ...props.selectedTag,
                      timeslots: [...(props.selectedTag.timeslots ?? [])].filter((pTimeslot) => pTimeslot.id !== timeslot.id)
                    }

                    props.parentUpdateTag(tempTag)
                  }}
                >
                  <SlotComponent 
                    timeslot={timeslot} 
                    participant={props.participantQuery.data
                      ?.find((participant) => participant.id === timeslot.participantId) 
                    } 
                    tag={props.selectedTag} 
                  />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}