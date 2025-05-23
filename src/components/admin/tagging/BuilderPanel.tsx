import { UseQueryResult } from "@tanstack/react-query";
import { Participant, PhotoCollection, Timeslot, UserTag } from "../../../types";
import { Dispatch, SetStateAction, useState } from "react";
import { v4 } from "uuid";
import { HiOutlinePlusCircle } from "react-icons/hi2";
import { BuilderForm } from "./BuilderForm";
import Loading from "../../common/Loading";

interface BuilderPanelProps {
  tags: UserTag[]
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  parentUpdateTagList: Dispatch<SetStateAction<UserTag[]>>
  //TODO: convert me to infinite query
  collectionListQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
  timeslotListQuery: UseQueryResult<Timeslot[] | undefined, Error>
  participantsQuery: UseQueryResult<Participant[] | undefined, Error>
}

export const BuilderPanel = (props: BuilderPanelProps) => {
  const [selectedTag, setSelectedTag] = useState<UserTag>()

  return (
    <div className="flex flex-row mx-4 my-4 gap-4 min-h-[96vh] max-h-[96vh] ">
      <div className="border border-gray-400 flex flex-col gap-2 rounded-2xl py-2 px-2 max-w-[350px] min-w-[350px] overflow-y-auto">
        <div className="flex flex-row items-center w-full justify-between px-4 border-b pb-2 border-b-gray-400">
          <span className="text-2xl text-start">User Tags</span>
          <button 
            className="flex flex-row items-center gap-2 enabled:hover:text-gray-500 enabled:hover:bg-gray-100 px-3 py-1 border rounded-xl disabled:text-gray-400"
            disabled={props.tags.some((pack) => pack.temporary)}
            onClick={() => {
              const temp = [
                ...props.tags
              ]
              const tempTag: UserTag = {
                id: v4(),
                name: 'Unnamed Package',
                participants: [],
                children: [],
                createdAt: new Date().toISOString()
              }
              temp.push(tempTag)

              props.parentUpdateTagList(temp)
              setSelectedTag(tempTag)
            }}
          >
            <span>Create Tag</span>
            <HiOutlinePlusCircle size={20}/>
          </button>
        </div>
        <div className="flex flex-col w-full">
          {props.tagsQuery.isLoading ? (
            <span className="flex flex-row text-start gap-1 italic font-light ms-4">
              <span>Loading</span>
              <Loading />
            </span>
          ) : (
            props.tags
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((tag, index) => {
                const selected = tag.id === selectedTag?.id

                return (
                  <div className="flex flex-col" key={index}>
                    <div className="flex flex-row items-center w-full px-4">
                      <span className="text-2xl">&bull;</span>
                      <button
                        className={`
                          flex flex-row gap-2 items-center w-full mx-1 ps-2 pe-1 justify-between 
                          border border-transparent rounded-lg hover:text-gray-500 hover:bg-gray-100
                          ${!selected ? 'hover:border-gray-200' : 'bg-gray-200 border-gray-500 hover:border-gray-900'}
                        `}
                        onClick={() => {
                          setSelectedTag((prev) => {
                            if(prev?.id !== tag.id) return tag
                            else return undefined
                          })
                        }}
                      >
                        <span className={`w-full truncate text-left text-${tag.color ?? 'black'}`}>{tag.name}</span>
                      </button>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </div>
      <div className="w-full border border-gray-400 flex flex-col rounded-2xl">
        {selectedTag ? (
          <BuilderForm 
            selectedTag={selectedTag}
            queriedTag={props.tagsQuery.data?.find((tag) => tag.id === selectedTag.id)}
            tagsQuery={props.tagsQuery}
            parentUpdateSelectedTag={setSelectedTag}
            parentUpdateTagList={props.parentUpdateTagList}
            collectionListQuery={props.collectionListQuery}
            timeslotListQuery={props.timeslotListQuery}
            participantsQuery={props.participantsQuery}
          />
        ) : (
          <span className="text-2xl text-gray-500 italic font-light self-center mt-4">Create or Select a Tag to get Started</span>
        )}
      </div>
    </div>
  )
}