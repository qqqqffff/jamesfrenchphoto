import { useState } from "react"
import { Participant, PhotoCollection, Timeslot, UserTag } from "../../../types"
import { FormStep } from "./BuilderForm"
import { HiOutlineChevronRight, HiOutlineChevronDown } from 'react-icons/hi2'
import { CollectionItem } from "./CollectionItem"
import { SlotComponent } from "../../timeslot/Slot"
import { UseQueryResult } from "@tanstack/react-query"
import { ParticipantItem } from "./ParticipantItem"

//TODO: shows the children tags and associated package if any
interface ReviewPanelProps {
  selectedTag: UserTag
  participantQuery: UseQueryResult<Participant[] | undefined, Error>
}
export const ReviewPanel = (props: ReviewPanelProps) => {
  const [sections, setSections] = useState<{
    section: FormStep,
    expanded: boolean,
  }[]>(
    Object.keys(FormStep)
      .filter((step) => step !== 'Review')
      .map((step) => {
        return ({ section: step as FormStep, expanded: false })
      })
  )

  const sortedPhotoCollections = (props.selectedTag.collections ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const collectionColumns: PhotoCollection[][] = (() => {
    const returnGroup: PhotoCollection[][] = [[], [], []]
    
    for(let i = 0; i < sortedPhotoCollections.length; i++) {
      returnGroup[i % 3].push(sortedPhotoCollections[i])
    }

    return returnGroup
  })()

  const sortedTimeslots = (props.selectedTag.timeslots ?? [])
    .sort((a, b) => b.start.getTime() - a.start.getTime())

  const timeslotColumns: Timeslot[][] = (() => {
    const returnGroup: Timeslot[][] = [[], [], []]

    for(let i = 0; i < sortedTimeslots.length; i++){
      returnGroup[i % 3].push(sortedTimeslots[i])
    }

    return returnGroup
  })()

  const sortedUsers = props.selectedTag.participants
    .sort((a, b) => a.firstName.localeCompare(b.firstName))

  const usersColumn: Participant[][] = (() => {
    const returnGroup: Participant[][] = [[], [], []]

    for(let i = 0; i < sortedUsers.length; i++) {
      returnGroup[i % 3].push(sortedUsers[i])
    }

    return returnGroup
  })()

  return (
    <div className="flex flex-row px-10">
      <div className="max-h-[75vh] overflow-y-auto border rounded-lg px-2 py-1 w-full max-w-[750px] flex flex-col gap-2">
        <div className="flex flex-row items-center justify-center py-2">
          <span className={`font-bodoni text-xl font-semibold text-${props.selectedTag.color ?? 'black'}`}>{props.selectedTag.name}</span>
        </div>
        <div className="border"/>
        <button 
          className="
            py-2 flex flex-row justify-center mx-8 items-center gap-2
            hover:bg-gray-100 hover:rounded-full
          "
          onClick={() => setSections(
            sections.map((section, index) => index === 0 ? (
              ({ ...section, expanded: !section.expanded })
            ) : section
            )
          )}
        >
          <span className="font-thin text-wrap">Details</span>
          {sections[0].expanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
        </button>
        <div className="border-b mx-10"/>
        {sections[0].expanded && (
          <>
            <div className="grid grid-cols-2 px-10 place-items-center gap-x-6 gap-y-4 w-full my-2">
              <div className="border rounded-lg flex flex-col w-full px-4 h-full py-1">
                <span className="border-b px-6 self-center">Child Tags</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {props.selectedTag.children.length === 0 ? (
                    <div className="flex flex-row items-center gap-2">
                      <span>&bull;</span>
                      <span className={`italic font-light`}>No Children</span>
                    </div>
                  ) : (
                  props.selectedTag.children.map((child, index) => {
                    return (
                      <div className="flex flex-row items-center gap-2" key={index}>
                        <span>&bull;</span>
                        <span className={`italic font-light text-${child.color ?? 'black'}`}>{child.name}</span>
                      </div>
                    )
                  }))}
                </div>
              </div>
              <div className="border rounded-lg flex flex-col w-full px-4 h-full py-1">
                <span className="border-b px-6 self-center h-full">Package</span>
                <div className="flex flex-row items-center gap-2" >
                  <span>&bull;</span>
                  <span className={`italic font-light`}>{props.selectedTag.package?.name ?? 'No Associated Package'}</span>
                </div>
              </div>
            </div>
            <div className="border-b mx-10"/>
          </>
        )}
        <button 
          className="
            py-2 flex flex-row justify-center mx-8 items-center gap-2
            hover:bg-gray-100 hover:rounded-full
          "
          onClick={() => setSections(
            sections.map((section, index) => index === 1 ? (
              ({ ...section, expanded: !section.expanded })
            ) : section
            )
          )}
        >
          <span className="font-thin text-wrap">Collections</span>
          {sections[1].expanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
        </button>
        <div className="border-b mx-10"/>
        {sections[1].expanded && (
          <>
            <div className="grid grid-cols-3 px-10 place-items-center gap-x-6 gap-y-4 w-full my-2">
              {collectionColumns.map((column) => {
                return (
                  column.map((collection, jindex) => {
                      return (
                        <CollectionItem 
                          key={jindex}
                          collection={collection}
                          selected={false}
                          selectedTag={props.selectedTag}
                        />
                      )}
                    )
                  )
              })}
            </div>
            <div className="border-b mx-10"/>
          </>
        )}
        <button 
          className="
            py-2 flex flex-row justify-center mx-8 items-center gap-2
            hover:bg-gray-100 hover:rounded-full
          "
          onClick={() => setSections(
            sections.map((section, index) => index === 2 ? (
              ({ ...section, expanded: !section.expanded })
            ) : section
            )
          )}
        >
          <span className="font-thin text-wrap">Timeslots</span>
          {sections[2].expanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
        </button>
        <div className="border-b mx-10"/>
        {sections[2].expanded && (
          <>
            <div className="grid grid-cols-2 px-10 place-items-center gap-x-6 gap-y-4 w-full my-2">
              {timeslotColumns.map((column) => {
                return (
                  column.map((timeslot, jindex) => {
                    return (
                      <SlotComponent 
                        className="w-full"
                        key={jindex}
                        timeslot={timeslot}
                        participant={props.participantQuery.data
                          ?.find((participant) => participant.id === timeslot.participantId)
                        }
                        tag={props.selectedTag}
                      />
                    )
                  })
                )
              })}
            </div>
            <div className="border-b mx-10"/>
          </>
        )}
        <button 
          className="
            py-2 flex flex-row justify-center mx-8 items-center gap-2
            hover:bg-gray-100 hover:rounded-full
          "
          onClick={() => setSections(
            sections.map((section, index) => index === 3 ? (
              ({ ...section, expanded: !section.expanded })
            ) : section
            )
          )}
        >
          <span className="font-thin text-wrap">Participants</span>
          {sections[3].expanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
        </button>
        {sections[3].expanded && (
          <>
            <div className="border-b mx-10"/>
            <div className="grid grid-cols-2 px-10 place-items-center gap-x-6 gap-y-4 w-full my-2">
              {usersColumn.map((column) => {
                return (
                  column.map((participant, index) => {
                    return (
                      <ParticipantItem
                        key={index}
                        participant={participant}
                        selected={false}
                        selectedTag={props.selectedTag}
                      />
                    )
                  })
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}