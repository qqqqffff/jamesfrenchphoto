import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { Participant } from "../../types"
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { GetAllParticipantsData } from "../../services/userService"
import { Checkbox, Label, TextInput, Tooltip } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { formatParticipantName } from "../../functions/clientFunctions"
import { HiOutlineXMark } from "react-icons/hi2";
import { ParticipantPanel } from "./ParticipantPanel"
import Loading from './Loading'

type ParticipantPickerProps = {
  type: {
    type: 'search',
    label?: 'top' | 'side',
  } | {
    type: 'list',
    search?: boolean
    maxHeight: number
  }
  multiple: {
    multiple: 'true',
    selectedParticipants: Participant[],
    setSelectedParticipants: Dispatch<SetStateAction<Participant[]>>
  } | {
    multiple: 'false',
    selectedParticipant: Participant | undefined,
    setSelectedParticipant: Dispatch<SetStateAction<Participant | undefined>>
  },
  participants: Participant[],
  participantQuery: UseInfiniteQueryResult<InfiniteData<GetAllParticipantsData, unknown>, Error>
}

export const ParticipantPicker = (props: ParticipantPickerProps) => {
  return (
    props.type.type === 'search' ? (
      <ParticipantSearchComponent 
        properties={props}
      />
    ) : (
      <ParticipantListComponent 
        properties={props}
      />
    )
  )
}

const ParticipantListComponent = (a: { properties: ParticipantPickerProps }): JSX.Element | undefined => {
  const props = a.properties
  const [displayCols, setDisplayCols] = useState(3)
  const containerRef = useRef<HTMLDivElement>(null)
  const participantItems = useRef<Map<string, HTMLButtonElement | null>>(new Map())
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const [participantSearch, setParticipantSearch] = useState('')
  
  const filteredParticipants = props.participants
  .filter((participant) => (
    participant.firstName.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
    participant.lastName.trim().toLowerCase().includes(participantSearch.trim().toLowerCase())) ||
    participant.preferredName?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
    participant.email?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
    participant.middleName?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase())
  )
  .sort((a, b) => a.firstName.localeCompare(b.firstName))

  useEffect(() => {
    if(containerRef.current) {
      //min value 1 max 3
      setDisplayCols(Math.max(1, Math.min(3, Math.floor(containerRef.current.offsetWidth / 400))))
    }
  }, [containerRef.current])

  useEffect(() => {
    if(!bottomObserverRef.current) {
      bottomObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const foundKey = Array.from(participantItems.current.keys()).findIndex((id) => entry.target.id === id)
          const validIndex = foundKey >= participantItems.current.size - (displayCols * 1) - 1
          if(
            entry.isIntersecting &&
            validIndex &&
            props.participantQuery.hasNextPage &&
            !props.participantQuery.isFetching
          ) {
            props.participantQuery.fetchNextPage()
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    const bottomRef = participantItems.current.size - (displayCols * 1) - 1

    if(bottomRef >= 0 && bottomObserverRef.current) {
      const el = participantItems.current.get(Array.from(participantItems.current.keys())[bottomRef])
      if(el !== undefined && el !== null) {
        bottomObserverRef.current.observe(el)
      }
    }

    return () => {
      if(bottomObserverRef.current) {
        bottomObserverRef.current.disconnect()
      }
    }
  }, [
    props.participantQuery.hasNextPage,
    props.participantQuery.isFetching,
    bottomObserverRef.current,
    participantItems.current.size,
  ])

  useEffect(() => {
    if(
      filteredParticipants.length < 16 && 
      !props.participantQuery.isFetching &&
      props.participantQuery.hasNextPage
    ) {
      props.participantQuery.fetchNextPage()
    }
  }, [
    props.participantQuery.isFetching,
    props.participantQuery.hasNextPage,
    filteredParticipants
  ])
  
  return props.type.type === 'list' ? (
    <div
      className='flex flex-col items-center w-full justify-center overflow-y-auto'
      style={{
        maxHeight: `${props.type.maxHeight}px`
      }}
    >
      {props.type.search && (
        <div className="flex flex-row items-center justify-center py-2 border-b">
          <TextInput
            theme={textInputTheme}
            sizing="sm"
            className="max-w-[250px]"
            onChange={(event) => setParticipantSearch(event.target.value)}
            value={participantSearch}
          />
        </div>
      )}
      <div
        className={`grid grid-cols-1 md:grid-cols-${displayCols} gap-x-4 gap-y-2 w-full`}
        ref={containerRef}
      >
        {filteredParticipants.length === 0 ? (
          <span className="w-full border rounded-sm">No Participants Found</span>
        ) : (
          filteredParticipants.map((item, index) => {
            const selected = props.multiple.multiple === 'true' ? (
              props.multiple.selectedParticipants.some((p) => p.id === item.id)
            ) : (
              props.multiple.selectedParticipant?.id === item.id
            )

            return (
              <Tooltip
                theme={{ target: undefined }}
                key={index}
                content={(
                  <ParticipantPanel participant={item} />
                )}
                style='light'
              >
                <button 
                  id={item.id}
                  ref={el => participantItems.current.set(item.id, el)}
                  className={`
                    w-full flex text-wrap whitespace-break-spaces
                    ${selected ? 'hover:bg-gray-200 bg-gray-100' : 'hover:bg-gray-100'}
                  `}
                  onClick={() => {
                    if(selected) {
                      if(props.multiple.multiple === 'true') {
                        props.multiple.setSelectedParticipants(prev => prev.filter((participant) => participant.id !== item.id))
                      }
                      else {
                        props.multiple.setSelectedParticipant(undefined)
                      }
                    }
                    else {
                      if(props.multiple.multiple === 'true') {
                        props.multiple.setSelectedParticipants(prev => [...prev, item])
                      }
                      else {
                        props.multiple.setSelectedParticipant(item)
                      }
                    }
                  }}
                >
                  <span>{formatParticipantName(item)}</span>
                </button>
              </Tooltip>
            )
          })
        )}
        {props.participantQuery.isFetching && (
          <span className="flex flex-row gap-1 w-full justify-center items-center border rounded-sm">
            <span>Loading</span>
            <Loading />
          </span>
        )}
      </div>
    </div>
  ) : (
    undefined
  )
}

const ParticipantSearchComponent = (a: { properties: ParticipantPickerProps }): JSX.Element | undefined => {
  const props = a.properties
  const [participantSearch, setParticipantSearch] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const participantItems = useRef<Map<string, HTMLLIElement | null>>(new Map())
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)

  const filteredParticipants = props.participants
    .filter((participant) => (
      participant.firstName.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
      participant.lastName.trim().toLowerCase().includes(participantSearch.trim().toLowerCase())) ||
      participant.preferredName?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
      participant.email?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
      participant.middleName?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase())
    )
    .sort((a, b) => a.firstName.localeCompare(b.firstName))

  useEffect(() => {
    const mouseDownHandler = (event: MouseEvent) => {
      if(
        containerRef.current &&
        isFocused &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false)
        setParticipantSearch('')
      }
    }

    window.addEventListener('mousedown', mouseDownHandler)
    return () => {
      window.removeEventListener('mousedown', mouseDownHandler)
    }
  }, [])

  useEffect(() => {
    if(!bottomObserverRef.current) {
      bottomObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const foundKey = Array.from(participantItems.current.keys()).findIndex((id) => entry.target.id === id)
          const validIndex = foundKey !== -1 && foundKey >= participantItems.current.size - 3
          if(
            entry.isIntersecting &&
            validIndex &&
            props.participantQuery.hasNextPage &&
            !props.participantQuery.isFetching
          ) {
            props.participantQuery.fetchNextPage()
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }
    
    const bottomRef = participantItems.current.size - 3
    console.log(bottomRef)

    if(bottomRef >= 0 && bottomObserverRef.current) {
      const el = participantItems.current.get(Array.from(participantItems.current.keys())[bottomRef])
      if(el !== undefined && el !== null) {
        bottomObserverRef.current.observe(el)
      }
    }
    
    return () => {
      if(bottomObserverRef.current) {
        bottomObserverRef.current.disconnect()
      }
    }
  }, [
    props.participantQuery.hasNextPage,
    props.participantQuery.isFetching,
    bottomObserverRef.current,
    participantItems.current.size,
  ])

  useEffect(() => {
    if(
      filteredParticipants.length < 16 && 
      !props.participantQuery.isFetching &&
      props.participantQuery.hasNextPage
    ) {
      props.participantQuery.fetchNextPage()
    }
  }, [
    props.participantQuery.isFetching,
    props.participantQuery.hasNextPage,
    filteredParticipants
  ])


  const foundParticipant = props.participants.find((participant) => (
    props.multiple.multiple === 'false' && 
    participant.id === props.multiple.selectedParticipant?.id
  ))

  return props.type.type === 'search' ? (
    <div 
      ref={containerRef}
      className={`
        flex ${props.type.label === 'top' ? 'flex-col' : 'flex-row'} 
        gap-1 self-center items-center justify-center relative
      `}
    >
      <Label className="font-medium text-lg ms-2" htmlFor="participant">
        Participant:
      </Label>
      <TextInput 
        id='participant'
        theme={textInputTheme}
        sizing="sm"
        className="max-w-[250px]"
        onFocus={() => setIsFocused(true)}
        onChange={(event) => setParticipantSearch(event.target.value)}
        value={isFocused ? (
          participantSearch
        ) : (
          props.multiple.multiple === 'false' && foundParticipant ? (
            formatParticipantName(foundParticipant)
          ) : (
            ''
          )
        )}
      />
      {isFocused && (
        <div className="absolute z-10 top-1/2 mt-10 bg-white border rounded-sm shadow-lg flex flex-col gap-2">
          <div className="flex flex-row p-1 justify-between w-full border-b gap-8">
            <span className="ms-2 whitespace-nowrap">Participants</span>
            <button
              onClick={() => setIsFocused(false)}
            >
              <HiOutlineXMark size={16} className="text-gray-400 hover:text-black" />
            </button>
          </div>
          {filteredParticipants.length > 0 ? (
            <ul className="max-h-56 overlfow-y-auto py-1 px-2 min-w-max">
            {filteredParticipants.map((item, index) => {
              const selected = props.multiple.multiple === 'true' ? (
                props.multiple.selectedParticipants.some((participant) => participant.id === item.id)
              ) : (
                props.multiple.selectedParticipant?.id === item.id
              )
              return (
                <Tooltip
                  theme={{ target: undefined }}
                  key={index}
                  content={(
                    <ParticipantPanel participant={item} />
                  )}
                  style='light'
                >
                  {/* average h - 42px */}
                  <li 
                    className="px-4 py-2 hover:bg-gray-100 rounded flex flex-row gap-2"
                    ref={el => participantItems.current.set(item.id, el)}
                    id={item.id}
                  >
                    <button
                      onClick={() => {
                        if(selected) {
                          if(props.multiple.multiple === 'true') {
                            props.multiple.setSelectedParticipants(prev => prev.filter((participant) => participant.id !== item.id))
                          }
                          else {
                            props.multiple.setSelectedParticipant(undefined)
                          }
                        }
                        else {
                          if(props.multiple.multiple === 'true') {
                            props.multiple.setSelectedParticipants(prev => [...prev, item])
                          }
                          else {
                            props.multiple.setSelectedParticipant(item)
                          }
                        }
                      }}
                    >
                      {props.multiple.multiple === 'true' && (
                        <Checkbox 
                          readOnly
                          checked={selected}
                        />
                      )}
                      <span>{formatParticipantName(item)}</span>
                    </button>
                  </li>
                </Tooltip>
              )
            })}
            {props.participantQuery.isFetching && (
              <li className="px-4 py-2 flex flex-row gap-1 items-center">
                <span>Loading</span>
                <Loading />
              </li>
            )}
            </ul>
          ) : (
            <div>
              <span>{props.participantQuery.isFetching ? (
                <span className="flex flex-row gap-1 items-center">
                  <span>Loading</span>
                  <Loading />
                </span>
              ) : (
                'No participants found.'
              )}</span>
            </div>
          )}
        </div>
      )}
    </div>
  ) : undefined
}