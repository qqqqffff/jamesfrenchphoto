import { UseQueryResult } from "@tanstack/react-query"
import { Participant, Table, TableColumn, UserData, UserTag } from "../../../types"
import { useState } from "react"
import { v4 } from 'uuid'
import { Dropdown, Tooltip } from "flowbite-react"
import { UserProfileWindow } from "../../common/UserProfileWindow"
import validator from "validator"
import { TagPicker } from "../package/TagPicker"

interface CreateParticipantWindowProps {
  table: Table,
  rowIndex: number,
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  submit: (participant?: Participant) => void,
  userProfiles: UserData[]
  choiceColumn?: TableColumn
}

export const CreateParticipantWindow = (props: CreateParticipantWindowProps) => {
  const [participant, setParticipant] = useState<Participant>({
    id: v4(),
    firstName: '',
    lastName: '',
    userTags: [],
    contact: false,
    userEmail: props.choiceColumn?.values[props.rowIndex] ?? '',
    notifications: [],
    collections: []
  })
  const [selectedColumns, setSelectedColumns] = useState<{column: TableColumn, type: 'first' | 'last' | 'preferred' | 'middle' | 'email' | 'userEmail' | 'tags' }[]>([])

  const allowedCreate = (
    participant.firstName !== '' &&
    participant.lastName !== '' &&
    participant.userEmail !== '' &&
    validator.isEmail(participant.userEmail) &&
    props.userProfiles.some((data) => data.email === participant.userEmail)
  )

  return (
    <div className="flex flex-col text-xs overflow-auto max-h-[320px] w-[250px]">
      <div className="flex flex-col px-2 pb-1 gap-1">
        <div className="flex flex-row items-center text-nowrap w-full justify-between">
          <div className="flex flex-row gap-2 items-center">
            <span>User Email:</span>
            <Dropdown
              inline
              label={<span className="italic text-xs max-w-[110px] truncate">{participant.userEmail === '' ? 'Select User': participant.userEmail}</span>}
            >
              {props.userProfiles
                .filter((data) => data.email !== participant.userEmail)
                .map((profile, index) => {
                  return (
                    <Dropdown.Item
                      key={index}
                      onClick={() => {
                        setParticipant({
                          ...participant,
                          userEmail: profile.email,
                        })
                        setSelectedColumns([...selectedColumns].filter((column) => column.type !== 'userEmail'))
                      }}
                      className="text-xs"
                    >
                      <Tooltip
                        theme={{ target: undefined }}
                        style="light"
                        placement="bottom"
                        content={(
                          <UserProfileWindow 
                            display={{ email: true, title: true }}
                            profile={profile} 
                          />
                        )}
                      >
                        {profile.first !== undefined && profile.first !== '' && profile.last !== undefined && profile.last !== '' ? (
                          `${profile.first}, ${profile.last}`
                        ) : (
                          profile.email
                        )}
                      </Tooltip>
                    </Dropdown.Item>
                  )
                })
              }
            </Dropdown>
          </div>
          <Dropdown
            inline
          >
            {selectedColumns.some((col) => col.type === 'userEmail') ? (
              <div className="flex flex-row gap-1 items-center px-2 py-1">
                <span>Selected Column:</span>
                <span className="font-bold">{selectedColumns.find((col) => col.type === 'userEmail')?.column.header}</span>
              </div>
            ) : (
              <span className="px-2 py-1">No Selected Column</span>
            )}
            {props.table.columns
              .filter((column) => (
                !selectedColumns.some((col) => column.id === col.column.id) && 
                !selectedColumns.some((col) => col.type === 'userEmail')
              ))
              .filter((column) => (
                column.type === 'user' &&
                validator.isEmail(column.values[props.rowIndex])
              ))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setSelectedColumns([...selectedColumns, { column: column, type: 'userEmail' }])
                      setParticipant({
                        ...participant,
                        userEmail: column.values[props.rowIndex]
                      })
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>First Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="First Name..."
            onChange={(event) => {
              const temp = [...selectedColumns].filter((col) => col.type !== 'first')

              setSelectedColumns(temp)
              setParticipant({
                ...participant,
                firstName: event.target.value
              })
            }}
            value={participant.firstName}
          />
          <Dropdown
            inline
          >
            {selectedColumns.some((col) => col.type === 'first') ? (
              <div className="flex flex-row gap-1 items-center px-2 py-1">
                <span>Selected Column:</span>
                <span className="font-bold">{selectedColumns.find((col) => col.type === 'first')?.column.header}</span>
              </div>
            ) : (
              <span className="px-2 py-1">No Selected Column</span>
            )}
            {props.table.columns
              .filter((column) => (
                !selectedColumns.some((col) => column.id === col.column.id) && 
                !selectedColumns.some((col) => col.type === 'first')
              ))
              .filter((column) => (
                column.type !== 'date' && 
                column.type !== 'file' && 
                column.type !== 'tag' && 
                column.type !== 'user' &&
                column.values[props.rowIndex].match(/^([A-z]+)$/g)
              ))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setSelectedColumns([...selectedColumns, { column: column, type: 'first' }])
                      setParticipant({
                        ...participant,
                        firstName: column.values[props.rowIndex]
                      })
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Preferred Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="Preferred Name..."
            onChange={(event) => {
              const temp = [...selectedColumns].filter((col) => col.type !== 'preferred')

              setSelectedColumns(temp)
              setParticipant({
                ...participant,
                preferredName: event.target.value
              })
            }}
            value={participant.preferredName ?? ''}
          />
          <Dropdown
            inline
          >
            {selectedColumns.some((col) => col.type === 'preferred') ? (
              <div className="flex flex-row gap-1 items-center px-2 py-1">
                <span>Selected Column:</span>
                <span className="font-bold">{selectedColumns.find((col) => col.type === 'preferred')?.column.header}</span>
              </div>
            ) : (
              <span className="px-2 py-1">No Selected Column</span>
            )}
            {props.table.columns
              .filter((column) => (
                !selectedColumns.some((col) => column.id === col.column.id) && 
                !selectedColumns.some((col) => col.type === 'preferred')
              ))
              .filter((column) => (
                column.type !== 'date' && 
                column.type !== 'file' && 
                column.type !== 'tag' && 
                column.type !== 'user' &&
                column.values[props.rowIndex].match(/^([A-z]+)$/g)
              ))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setSelectedColumns([...selectedColumns, { column: column, type: 'preferred' }])
                      setParticipant({
                        ...participant,
                        preferredName: column.values[props.rowIndex]
                      })
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Middle Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="Middle Name..."
            onChange={(event) => {
              const temp = [...selectedColumns].filter((col) => col.type !== 'middle')

              setSelectedColumns(temp)
              setParticipant({
                ...participant,
                middleName: event.target.value
              })
            }}
            value={participant.middleName ?? ''}
          />
          <Dropdown
            inline
          >
            {selectedColumns.some((col) => col.type === 'middle') ? (
              <div className="flex flex-row gap-1 items-center px-2 py-1">
                <span>Selected Column:</span>
                <span className="font-bold">{selectedColumns.find((col) => col.type === 'middle')?.column.header}</span>
              </div>
            ) : (
              <span className="px-2 py-1">No Selected Column</span>
            )}
            {props.table.columns
              .filter((column) => (
                !selectedColumns.some((col) => column.id === col.column.id) && 
                !selectedColumns.some((col) => col.type === 'middle')
              ))
              .filter((column) => (
                column.type !== 'date' && 
                column.type !== 'file' && 
                column.type !== 'tag' && 
                column.type !== 'user' &&
                column.values[props.rowIndex].match(/^([A-z]+)$/g)
              ))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setSelectedColumns([...selectedColumns, { column: column, type: 'middle' }])
                      setParticipant({
                        ...participant,
                        middleName: column.values[props.rowIndex]
                      })
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Last Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="First Name..."
            onChange={(event) => {
              const temp = [...selectedColumns].filter((col) => col.type !== 'last')

              setSelectedColumns(temp)
              setParticipant({
                ...participant,
                lastName: event.target.value
              })
            }}
            value={participant.lastName}
          />
          <Dropdown
            inline
          >
            {selectedColumns.some((col) => col.type === 'last') ? (
              <div className="flex flex-row gap-1 items-center px-2 py-1">
                <span>Selected Column:</span>
                <span className="font-bold">{selectedColumns.find((col) => col.type === 'last')?.column.values[props.rowIndex]}</span>
              </div>
            ) : (
              <span className="px-2 py-1">No Selected Column</span>
            )}
            {props.table.columns
              .filter((column) => (
                !selectedColumns.some((col) => column.id === col.column.id) && 
                !selectedColumns.some((col) => col.type === 'last')
              ))
              .filter((column) => (
                column.type !== 'date' && 
                column.type !== 'file' && 
                column.type !== 'tag' && 
                column.type !== 'user' &&
                column.values[props.rowIndex].match(/^([A-z]+)$/g)
              ))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setSelectedColumns([...selectedColumns, { column: column, type: 'last' }])
                      setParticipant({
                        ...participant,
                        lastName: column.values[props.rowIndex]
                      })
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Email:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="Email..."
            onChange={(event) => {
              const temp = [...selectedColumns].filter((col) => col.type !== 'email')

              setSelectedColumns(temp)
              setParticipant({
                ...participant,
                email: event.target.value
              })
            }}
            value={participant.email ?? ''}
          />
          <Dropdown
            inline
          >
            {selectedColumns.some((col) => col.type === 'email') ? (
              <div className="flex flex-row gap-1 items-center px-2 py-1">
                <span>Selected Column:</span>
                <span className="font-bold">{selectedColumns.find((col) => col.type === 'email')?.column.header}</span>
              </div>
            ) : (
              <span className="px-2 py-1">No Selected Column</span>
            )}
            {props.table.columns
              .filter((column) => (
                !selectedColumns.some((col) => column.id === col.column.id) && 
                !selectedColumns.some((col) => col.type === 'email')
              ))
              .filter((column) => (
                column.type === 'user' &&
                validator.isEmail(column.values[props.rowIndex])
              ))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setSelectedColumns([...selectedColumns, { column: column, type: 'email' }])
                      setParticipant({
                        ...participant,
                        email: column.values[props.rowIndex]
                      })
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Tags:</span>
          <TagPicker 
            allowMultiple
            className='
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            '
            tags={props.tagsQuery.data ?? []}
            parentPickTag={(tag) => {
              if(tag) {
                const selectedTag = participant.userTags.some((pTag) => pTag.id === tag.id)
                const temp = [...selectedColumns].filter((col) => col.type !== 'tags')

                if(selectedTag) {
                  setSelectedColumns(temp)
                  setParticipant({
                    ...participant,
                    userTags: participant.userTags.filter((pTag) => tag.id !== pTag.id)
                  })
                }
                else {
                  setSelectedColumns(temp)
                  setParticipant({
                    ...participant,
                    userTags: [...participant.userTags, tag]
                  })
                }
              } 
              //TODO: address tag null case
            }}
            pickedTag={participant.userTags}
          />
        </div>
        <button 
          disabled={!allowedCreate}
          className="
            self-end mt-2 mb-1 border rounded-lg py-1 px-2 enabled:hover:bg-gray-50 
            enabled:hover:border-gray-300 disabled:bg-gray-50 
            disabled:hover:cursor-not-allowed disabled:opacity-65
          "
          onClick={() => {
            props.submit(participant)
          }}
        >Create Participant</button>
      </div>
    </div>
  )
}