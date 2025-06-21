import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { 
  ColumnColor, 
  Participant, 
  ParticipantFields, 
  Table, 
  TableColumn, 
  TableGroup, 
  UserData, 
  UserFields, 
  UserProfile, 
  UserTag 
} from "../../../types"
import { 
  HiMiniIdentification,
  HiOutlineCalendar, 
  HiOutlineDocumentText, 
  HiOutlineListBullet, 
  HiOutlinePencil, 
  HiOutlinePlusCircle, 
  HiOutlineTag, 
  HiOutlineUserCircle, 
  HiOutlineXCircle 
} from 'react-icons/hi2'
import { Dropdown } from "flowbite-react"
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { 
  appendTableRowMutation,
  AppendTableRowParams,
  createChoiceMutation,
  CreateChoiceParams,
  createTableColumnMutation, 
  CreateTableColumnParams, 
  deleteTableColumnMutation, 
  DeleteTableColumnParams, 
  deleteTableRowMutation, 
  DeleteTableRowParams, 
  UpdateTableColumnParams, 
  updateTableColumnsMutation 
} from "../../../services/tableService"
import { EditableTextField } from "../../common/EditableTextField"
import { ValueCell } from "./ValueCell"
import { defaultColumnColors, getColumnTypeColor } from "../../../utils"
import { ConfirmationModal } from "../../modals"
import { UserCell } from "./UserCell"
import { DateCell } from "./DateCell"
import { ChoiceCell } from "./ChoiceCell"
import { TagCell } from "./TagCell"
import { FileCell } from "./FileCell"
import { invariant } from "@tanstack/react-router"
import { AggregateCell } from "./AggregateCell"
import { ColorComponent } from "../../common/ColorComponent"
import { v4 } from 'uuid'
import { ParticipantCell } from "./ParticipantCell"
import { ParticipantSyncItem } from "./ParticipantSyncItem"
import { ValueSyncItem } from "./ValueSyncItem"
import { mapParticipantField, mapUserField, validateMapField } from "../../../functions/tableFunctions"
import { createParticipantMutation, CreateParticipantParams, updateParticipantMutation, UpdateParticipantMutationParams, updateUserAttributeMutation, UpdateUserAttributesMutationParams, updateUserProfileMutation, UpdateUserProfileParams } from "../../../services/userService"
import { TagSyncItem } from "./TagSyncItem"


interface TableComponentProps {
  table: Table,
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
}

export const TableComponent = (props: TableComponentProps) => {
  const [deleteColumnConfirmation, setDeleteColumnConfirmation] = useState(false)
  const [tempUsers, setTempUsers] = useState<UserProfile[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [headerDropdownHovering, setHeaderDropdownHovering] = useState(false)

  const refColumn = useRef<TableColumn | null>()

  const tableRows: [string, TableColumn['type'], string][][] = []

  if(props.table.columns.length > 0) { 
    for(let i = 0; i < props.table.columns[0].values.length; i++){
      const row: [string, TableColumn['type'], string][] = []
      for(let j = 0; j < props.table.columns.length; j++){
        row.push([props.table.columns[j].values[i], props.table.columns[j].type, props.table.columns[j].id])
      }
      tableRows.push(row)
    }
  }

  const createColumn = useMutation({
    mutationFn: (params: CreateTableColumnParams) => createTableColumnMutation(params),
  })

  const updateColumn = useMutation({
    mutationFn: (params: UpdateTableColumnParams) => updateTableColumnsMutation(params),
  })

  const appendRow = useMutation({
    mutationFn: (params: AppendTableRowParams) => appendTableRowMutation(params)
  })

  const deleteRow = useMutation({
    mutationFn: (params: DeleteTableRowParams) => deleteTableRowMutation(params)
  })

  const deleteColumn = useMutation({
    mutationFn: (params: DeleteTableColumnParams) => deleteTableColumnMutation(params)
  })

  const createChoice = useMutation({
    mutationFn: (params: CreateChoiceParams) => createChoiceMutation(params),
    onSuccess: (data) => {
      if(data) {
        const temp: Table = {
          ...props.table,
          columns: props.table.columns.map((column) => {
            if(column.id === data[1]){
              return {
                ...column,
                color: column.color?.map((color) => {
                  if(color.id === 'temp') return { ...color, id: data[0] }
                  return color
                })
              }
            }
            return column
          })
        }

        const updateGroup = (prev: TableGroup[]) => {
          const pTemp: TableGroup[] = [...prev]
            .map((group) => {
              if(group.id === temp.tableGroupId) {
                return {
                  ...group,
                  tables: group.tables.map((table) => {
                    if(table.id === temp.id) return temp
                    return table
                  })
                }
              }
              return group
            })

          return pTemp
        }

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable(temp)
      }
    }
  })

  const updateUserAttribute = useMutation({
    mutationFn: (params: UpdateUserAttributesMutationParams) => updateUserAttributeMutation(params)
  })

  const updateUserProfile = useMutation({
    mutationFn: (params: UpdateUserProfileParams) => updateUserProfileMutation(params)
  })

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  })

  const createParticipant = useMutation({
    mutationFn: (params: CreateParticipantParams) => createParticipantMutation(params)
  })

  //TODO: deprecate me please
  useEffect(() => {
    if(props.table.columns.length > 0) {
      let max = 0
      for(let i = 0; i < props.table.columns.length; i++){
        if(props.table.columns[i].values.length > max){
          max = props.table.columns[i].values.length
        }
      }
      if(props.table.columns.some((col) => col.values.length !== max)) {
        appendRow.mutate({
          table: props.table,
          length: max,
          options: {
            logging: true
          }
        })

        const temp: Table = {
          ...props.table,
          columns: props.table.columns.map((col) => {
            const temp = [...col.values]
            while(temp.length < max){
              temp.push('')
            }
            return {
              ...col,
              values: temp,
            }
          })
        }

        const updateGroup = (prev: TableGroup[]) => {
          const pTemp: TableGroup[] = [...prev]
            .map((group) => {
              if(group.id === temp.tableGroupId){
                return {
                  ...group,
                  tables: group.tables.map((table) => {
                    if(table.id === temp.id) return temp
                    return table
                  })
                }
              }
              return group
            })

          return pTemp
        }

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable(temp)
      }
    }
  }, [props.table])

  useEffect(() => {
    if(props.tempUsersData.data && props.tempUsersData.data.length > 0) {
      setTempUsers(props.tempUsersData.data)
    }
  }, [props.tempUsersData.data])

  useEffect(() => {
    if(props.userData.data) {
      setUsers(props.userData.data)
    }
  }, [props.userData.data])

  const pushColumn = (type: TableColumn['type']) => {
    const temp: TableColumn = {
      id: v4(),
      values: [],
      display: true,
      header: '',
      type: type,
      tags: [],
      order: props.table.columns.length,
      tableId: props.table.id,
      temporary: true
    }

    const table: Table = {
      ...props.table,
      columns: [...props.table.columns, temp]
    }

    const updateGroup = (prev: TableGroup[]) => {
      const pTemp = [...prev]
        .map((group) => {
          if(group.id === table.tableGroupId){
            return {
              ...group,
              tables: group.tables.map((pTable) => (pTable.id === table.id ? table : pTable))
            }
          }
          return group
        })

      return pTemp
    }

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(table)
    props.parentUpdateTableColumns(table.columns)
  }

  const updateValue = (id: string, text: string, i: number) => {
    const column = props.table.columns.find((column) => column.id === id)
    let newValue: string | undefined

    invariant(column !== undefined)

    const updatedColumns: TableColumn[] = []
    //user dependent columns
    if(column.type === 'user'){
      const dependentColumns = props.table.columns.filter((col) => col.choices?.[0] === column.id)

      for(let j = 0; j < dependentColumns.length; j++) {
        //participant column
        if(dependentColumns[j].type === 'participant') {
          const foundParticipant = users.find((user) => user.email === text)?.profile?.participant[0].id
          if(foundParticipant) {
            const tempValues = dependentColumns[j].values.map((value, k) => (k === i ? foundParticipant : value))
            updateColumn.mutate({
              column: dependentColumns[j],
              values: tempValues,
              options: {
                logging: true
              }
            })
            updatedColumns.push({
              ...dependentColumns[j],
              values: tempValues
            })
          }
        }
        if(
          dependentColumns[j].type === 'value' && 
          dependentColumns[j].choices?.[1] !== undefined &&
          validateMapField(dependentColumns[j].choices?.[1] ?? '')[0] !== null
        ) {
          //value column dependency works by [dependent column, field]
          const field = validateMapField(dependentColumns[j].choices?.[1] ?? '')[0]
          const foundTempUser = tempUsers.find((user) => user.email === text)
          const foundUser: UserData | undefined = users.find((user) => text === user.email) !== undefined ? (
            users.find((user) => text === user.email)
          ) : (
            foundTempUser ? {
              profile: foundTempUser,
              email: text,
              verified: false,
              first: foundTempUser?.firstName ?? '',
              last: foundTempUser?.lastName ?? '',
              userId: '',
              status: '',
            } : undefined
          )
          if(field !== null && foundUser?.profile !== undefined) {
            const tempValues = dependentColumns[j].values.map((value, k) => (k === i ? 
              mapUserField({ field: field as UserFields['type'], user: {
                ...foundUser.profile!,
                firstName: foundUser.profile?.firstName ?? foundUser.first,
                lastName: foundUser.profile?.lastName ?? foundUser.last
              }}) : value
            ))
            updateColumn.mutate({
              column: dependentColumns[j],
              values: tempValues,
              options: {
                logging: true
              }
            })
            updatedColumns.push({
              ...dependentColumns[j],
              values: tempValues
            })
          }
        }
      }
    }
    if(column.type === 'participant') {
      const participantList = [
        ...users.flatMap((data) => data.profile).filter((profile) => profile !== undefined),
        ...tempUsers
      ]
      .flatMap((profile) => profile.participant)
      .reduce((prev, cur) => {
        if(!prev.some((part) => part.id === cur.id)) {
          prev.push(cur)
        }
        return prev
      }, [] as Participant[])

      //upward propegation
      const parentColumns = props.table.columns.filter((col) => column.choices?.[0] === col.id)

      for(let j = 0; j < parentColumns.length; j++) {
        if(parentColumns[j].type === 'user') {
          // append myself to the user's participants if not already exists 
          // (and if i am the first participant make me the active one)
          const foundTemp = tempUsers.find((user) => user.email === parentColumns[j].values[i])
          const foundUser = !foundTemp ? users.find((user) => user.email === parentColumns[j].values[i]) : undefined
          const foundParticipant = [
            ...tempUsers.flatMap((user) => user.participant),
            ...users.flatMap((user) => user.profile?.participant).filter((participant) => participant !== undefined)
          ].reduce((prev, cur) => {
            if(!prev.some((participant) => participant.id === cur.id)) {
              prev.push(cur)
            }
            return prev
          }, [] as Participant[])
          .find((participant) => participant.id === text)

          if((foundUser || foundTemp) && foundParticipant) {
            const newParticipant: Participant = {
              ...foundParticipant,
              id: v4(),
              userEmail: foundUser?.email ?? foundTemp?.email!
            }
            participantList.push(newParticipant)
            newValue = newParticipant.id

            createParticipant.mutate({
              participant: newParticipant,
              authMode: 'userPool',
              options: {
                logging: true,
              }
            })

            if(foundUser) {
              setUsers((prev) => prev.map((user) => user.email === foundUser.email ? ({
                ...foundUser,
                profile: foundUser.profile ? ({
                  ...foundUser.profile,
                  participant: [...foundUser.profile.participant, newParticipant],
                  activeParticipant: foundUser.profile.activeParticipant === undefined ? newParticipant : foundTemp?.activeParticipant
                }) : undefined
              }) : user))
            }
            else if(foundTemp) {
              setTempUsers((prev) => prev.map((user) => user.email === foundTemp.email ? ({
                ...foundTemp,
                participant: [...foundTemp.participant, newParticipant],
                activeParticipant: foundTemp.activeParticipant === undefined ? newParticipant : foundTemp.activeParticipant
              }) : (
                user
              )))
            }
          }
          else if(foundParticipant) {
            const tempValues = parentColumns[j].values.map((value, k) => (k === i ? (
              foundParticipant.userEmail
            ) : value))
            
            //now need to downward propegate for updating the user column
            const userDependentColumns = props.table.columns.filter((col) => parentColumns[j].id === col.choices?.[0])

            console.log(userDependentColumns)

            for(let k = 0; k < userDependentColumns.length; k++) {
              if(
                userDependentColumns[k].type === 'value' && 
                userDependentColumns[k].choices?.[1] !== undefined &&
                validateMapField(userDependentColumns[k].choices?.[1] ?? '')[0] !== null
              ) {
                //value column dependency works by [dependent column, field]
                const field = validateMapField(userDependentColumns[k].choices?.[1] ?? '')[0]
                const foundTempUser = tempUsers.find((user) => user.email === text)
                const foundUser: UserData | undefined = users.find((user) => text === user.email) !== undefined ? (
                  users.find((user) => text === user.email)
                ) : (
                  foundTempUser ? {
                    profile: foundTempUser,
                    email: text,
                    verified: false,
                    first: foundTempUser?.firstName ?? '',
                    last: foundTempUser?.lastName ?? '',
                    userId: '',
                    status: '',
                  } : undefined
                )
                if(field !== null && foundUser?.profile !== undefined) {
                  const tempValues = userDependentColumns[k].values.map((value, k) => (k === i ? 
                    mapUserField({ field: field as UserFields['type'], user: {
                      ...foundUser.profile!,
                      firstName: foundUser.profile?.firstName ?? foundUser.first,
                      lastName: foundUser.profile?.lastName ?? foundUser.last
                    }}) : value
                  ))
                  updateColumn.mutate({
                    column: userDependentColumns[k],
                    values: tempValues,
                    options: {
                      logging: true
                    }
                  })
                  updatedColumns.push({
                    ...userDependentColumns[k],
                    values: tempValues
                  })
                }
              }
            }

            updateColumn.mutate({
              column: parentColumns[j],
              values: tempValues,
              options: {
                logging: true
              }
            })
            updatedColumns.push({
              ...parentColumns[j],
              values: tempValues
            })
          }
        }
      }

      //downward propegation
      const dependentColumns = props.table.columns.filter((col) => col.choices?.[0] === column.id)

      for(let j = 0; j < dependentColumns.length; j++) {
        const foundParticipant = participantList.find((participant) => participant.id === text)
        if(
          dependentColumns[j].type === 'value' &&
          dependentColumns[j].choices?.[1] !== undefined &&
          validateMapField(dependentColumns[j].choices?.[1] ?? '')[0] !== null
        ) {
          const field = validateMapField(dependentColumns[j].choices?.[1] ?? '')[0]

          if(field !== null && foundParticipant !== undefined) {
            const tempValues = dependentColumns[j].values.map((value, k) => (k === i ? (
              mapParticipantField({ field: field as ParticipantFields['type'], participant: foundParticipant })
            ) : value))

            updateColumn.mutate({
              column: dependentColumns[j],
              values: tempValues,
              options: {
                logging: true
              }
            })
            updatedColumns.push({
              ...dependentColumns[j],
              values: tempValues
            })
          }
        }
        if(dependentColumns[j].type === 'tag' || dependentColumns[j].type === 'date') {
          const tempValues = dependentColumns[j].values.map((value, k) => (k === i ? (
            foundParticipant?.id ?? ''
          ) : value))

          updateColumn.mutate({
            column: dependentColumns[j],
            values: tempValues,
            options: {
              logging: true
            }
          })
          updatedColumns.push({
            ...dependentColumns[j],
            values: tempValues
          })
        }
      }
    }
    if(
      column.type === 'value' && 
      column.choices?.[0] !== undefined && 
      props.table.columns.some((col) => column.choices?.[0] === col.id) &&
      column.choices?.[1] !== undefined &&
      validateMapField(column.choices[1])[0] !== null
    ) {
      const foundColumn = props.table.columns.find((col) => col.id === column.choices?.[0])
      invariant(foundColumn !== undefined)
      
      if(foundColumn.type === 'user') {
        const foundTempUser = tempUsers.find((user) => user.email === foundColumn.values[i])
        const foundUser: UserData | undefined = users.find((user) => foundColumn.values[i] === user.email) !== undefined ? (
          users.find((user) => foundColumn.values[i] === user.email)
        ) : (
          foundTempUser ? {
            profile: foundTempUser,
            email: foundColumn.values[i],
            verified: false,
            first: foundTempUser?.firstName ?? '',
            last: foundTempUser?.lastName ?? '',
            userId: '',
            status: '',
          } : undefined
        )
        const updatedUser = validateMapField(column.choices?.[1], undefined, foundUser ? { user: foundUser, value: text } : undefined)
        if(foundUser) {
          if((updatedUser[0] === 'first' || updatedUser[0] === 'last') && !foundTempUser) {
            updateUserAttribute.mutate({
              admin: foundUser.userId,
              email: foundUser.email,
              firstName: updatedUser[0] === 'first' ? text : (updatedUser[1] as UserData).first ?? '',
              lastName: updatedUser[0] === 'last' ? text : (updatedUser[1] as UserData).last ?? '',
              options: {
                logging: true
              }
            })
          }
          if(foundUser?.profile) {
            updateUserProfile.mutate({
              profile: foundUser.profile,
              first: updatedUser[0] === 'first' ? text : undefined,
              last: updatedUser[0] === 'last' ? text : undefined,
              sitting: updatedUser[0] === 'sitting' ? parseInt(text) : undefined,
              options: {
                logging: true
              }
            })
          }
        }
        if(updatedUser[1]) {
          if(foundTempUser === undefined) {
            setUsers((prev) => prev.map((user) => user.email === updatedUser[1]?.email ? updatedUser[1] as UserData : user))
          }
          else {
            setTempUsers((prev) => (
              prev
              .map((user) => user.email === updatedUser[1]?.email ? (updatedUser[1] as UserData).profile : user)
              .filter((profile) => profile !== undefined)
            ))
          }
        }
      }
      else if(foundColumn.type === 'participant') {
        const foundParticipant = [
          ...users.flatMap((data) => data.profile).filter((profile) => profile !== undefined),
          ...tempUsers
        ]
        .flatMap((profile) => profile.participant)
        .reduce((prev, cur) => {
          if(!prev.some((part) => part.id === cur.id)) {
            prev.push(cur)
          }
          return prev
        }, [] as Participant[])
        .find((participant) => participant.id === foundColumn.values[i])
        const temporaryParent = tempUsers.find((profile) => profile.participant.some((participant) => participant.id === foundParticipant?.id))

        const updatedUser = validateMapField(column.choices?.[1], foundParticipant ? { participant: foundParticipant, value: text } : undefined)

        if(foundParticipant) {
          updateParticipant.mutate({
            participant: foundParticipant,
            firstName: updatedUser[0] === 'first' ? text : foundParticipant.firstName,
            lastName: updatedUser[0] === 'last' ? text : foundParticipant.lastName,
            middleName: updatedUser[0] === 'middle' ? text : foundParticipant.middleName,
            preferredName: updatedUser[0] === 'preferred' ? text : foundParticipant.preferredName,
            contact: foundParticipant.contact,
            userTags: foundParticipant.userTags,
          })
        }

        if(updatedUser[1]) {
          if(temporaryParent === undefined) {
            setUsers((prev) => prev.map((user) => 
              user.profile?.participant.some((participant) => participant.id === foundParticipant?.id) ? (
                {
                  ...user,
                  profile: {
                    ...user.profile,
                    participant: user.profile.participant.map((participant) => participant.id === foundParticipant?.id ? updatedUser[1] as Participant : participant)
                  }
                }
              ) : user))
          }
          else {
            setTempUsers((prev) => prev.map((profile) => profile.email === temporaryParent.email ? ({
              ...profile,
              participant: profile.participant.map((participant) => participant.id === foundParticipant?.id ? updatedUser[1] as Participant : participant)
            }) : profile))
          }
        }
      }
    }

    updateColumn.mutate({
      column: column,
      values: column.values.map((value, index) => {
        if(index === i) return newValue ? newValue : text
        return value
      }),
      options: {
        logging: true
      }
    })

    const temp: Table = {
      ...props.table,
      columns: props.table.columns.map((column) => {
        const updatedColumn = updatedColumns.find((col) => col.id === column.id)
        if(updatedColumn) return updatedColumn
        else if(column.id === id){
          const values = [...column.values]
          values[i] = newValue ? newValue : text
          return {
            ...column,
            values: values
          }
        }
        return column
      })
    }

    const updateGroup = (prev: TableGroup[]) => {
      const pTemp = [...prev]
        .map((group) => {
          if(group.id === temp.tableGroupId){
            return {
              ...group,
              tables: group.tables.map((table) => {
                if(table.id === temp.id){
                  return temp
                }
                return table
              })
            }
          }
          return group
        })

      return pTemp
    }

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(temp)
    props.parentUpdateTableColumns(temp.columns)
  }

  const updateChoices = (id: string, data: {choice: string, color: string}, mode: 'create' | 'delete') => {
    const column = props.table.columns.find((column) => column.id === id)
    invariant(column !== undefined)

    if(mode === 'create') {
      createChoice.mutate({
        column: column,
        choice: data.choice,
        color: data.color,
        options: {
          logging: true
        }
      })

      const tempColor: ColumnColor = {
        id: v4(),
        textColor: defaultColumnColors[data.color].text,
        bgColor: defaultColumnColors[data.color].bg,
        value: data.choice,
        columnId: column.id,
        temporary: true
      }

      const temp: Table = {
        ...props.table,
        columns: props.table.columns.map((parentColumn) => {
          if(parentColumn.id === column.id) {
            return {
              ...parentColumn,
              choices: [...(parentColumn.choices ?? []), data.choice],
              color: [...(parentColumn.color ?? []), tempColor]
            }
          }
          return parentColumn
        })
      }

      const updateGroup = (prev: TableGroup[]) => {
        const pTemp: TableGroup[] = [...prev]
          .map((group) => {
            if(group.id === temp.tableGroupId) {
              return {
                ...group,
                tables: group.tables.map((table) => {
                  if(table.id === temp.id) return temp
                  return table
                })
              }
            }
            return group
          })

        return pTemp
      }

      props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.parentUpdateTable(temp)
      props.parentUpdateTableColumns(temp.columns)
    }
  }

  //TODO: move me to a functions file
  const syncParticipantColumn = (id: string, choice: string | null, updatedValues: string[]) => {
    const column = props.table.columns.find((column) => column.id === id)

    invariant(column !== undefined)

    updateColumn.mutate({
      column: column,
      choices: choice !== null ? [choice] : null,
      values: updatedValues,
      options: {
        logging: true
      }
    })

    const temp: Table = {
      ...props.table,
      columns: props.table.columns.map((column) => (column.id === id ? {
          ...column,
          choices: choice !== null ? [choice] : undefined,
          values: updatedValues
        } : 
          column 
        )
      )
    }

    const updateGroup = (prev: TableGroup[]) => {
      const pTemp = [...prev]
        .map((group) => (group.id === temp.tableGroupId ? {
            ...group,
            tables: group.tables.map((table) => (table.id === temp.id ? temp : table))
          } : 
            group
          )
        )

      return pTemp
    }

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(temp)
    props.parentUpdateTableColumns(temp.columns)
  }

  const syncValueColumn = (
    id: string, 
    choice: [string, ParticipantFields['type'] | UserFields['type']] | null, 
    updatedValues: string[]
  ) => {
    const column = props.table.columns.find((column) => column.id === id)

    invariant(column !== undefined)

    updateColumn.mutate({
      column: column,
      choices: choice !== null ? [choice[0], choice[1] as string] : null,
      values: updatedValues,
      options: {
        logging: true
      }
    })

    const temp: Table = {
      ...props.table,
      columns: props.table.columns.map((column) => (column.id === id ? {
          ...column,
          choices: choice !== null ? [choice[0], choice[1] as string] : undefined,
          values: updatedValues
        } : 
          column 
        )
      )
    }

    const updateGroup = (prev: TableGroup[]) => {
      const pTemp = [...prev]
        .map((group) => (group.id === temp.tableGroupId ? {
            ...group,
            tables: group.tables.map((table) => (table.id === temp.id ? temp : table))
          } : 
            group
          )
        )

      return pTemp
    }

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(temp)
    props.parentUpdateTableColumns(temp.columns)
  }

  return (
    <>
      <ConfirmationModal
        title="Delete Column"
        body="This action will <b>DELETE</b> this column <b>AND</b> all of its values. This action cannot be undone!"
        denyText="Cancel"
        confirmText="Delete"
        confirmAction={() => {
          if(refColumn.current){
            const column: TableColumn = refColumn.current

            deleteColumn.mutate({
              table: props.table,
              column: column,
              options: {
                logging: true
              }
            })

            const temp: Table = {
              ...props.table,
              columns: props.table.columns.filter((parentColumn) => parentColumn.id !== column.id)
            }

            const updateGroup = (prev: TableGroup[]) => {
              const pTemp: TableGroup[] = [...prev]
                .map((group) => {
                  if(group.id === temp.tableGroupId){
                    return {
                      ...group,
                      tables: group.tables.map((table) => {
                        if(table.id === temp.id) {
                          return temp
                        }
                        return table
                      })
                    }
                  }
                  return group
                })

              return pTemp
            }

            props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
            props.parentUpdateTableGroups((prev) => updateGroup(prev))
            props.parentUpdateTable(temp)
            props.parentUpdateTableColumns(temp.columns)
          }
        }}
        onClose={() => setDeleteColumnConfirmation(false)}
        open={deleteColumnConfirmation}
      />
      {/* overflow-x-auto overflow-y-auto */}
      <div className="relative shadow-md overflow-scroll max-w-[60vw] max-h-[85vh]">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 bg-gray-50 sticky">
            <tr>
              {props.table.columns.map((column) => {
                return (
                  <th
                    onMouseEnter={() => {}}
                    key={column.id}
                    className="
                      relative border-x border-x-gray-300 border-b border-b-gray-300 
                      min-w-[150px] max-w-[150px] whitespace-normal break-words place-items-center
                      items-center
                    "
                  >
                    {column.temporary || column.edit ? (
                      <div className="w-full pe-10">
                        <EditableTextField 
                          className="text-xs border-b-black focus:ring-0 focus:border-transparent focus:border-b-black min-w-full bg-transparent"
                          text={column.header ?? ''}
                          placeholder="Enter Column Name..."
                          onSubmitText={(text) => {
                            if(column.temporary && text !== ''){
                              const tempColumn: TableColumn = {
                                id: column.id,
                                display: true,
                                tags: [],
                                header: text,
                                tableId: props.table.id,
                                type: column.type,
                                values: props.table.columns.length > 0 && props.table.columns[0].values.length > 0 ?
                                  props.table.columns[0].values.fill('') : [],
                                order: props.table.columns.length,
                              }
                              createColumn.mutate({
                                column: tempColumn,
                                options: {
                                  logging: true
                                }
                              })
                              const temp: Table = {
                                ...props.table,
                                columns: props.table.columns
                                  .map((pColumn) => (pColumn.id === tempColumn.id ? tempColumn : pColumn))
                              }

                              const updateGroup = (prev: TableGroup[]) => {
                                const pTemp: TableGroup[] = [...prev]
                                  .map((group) => {
                                    if(group.id === props.table.tableGroupId){
                                      return {
                                        ...group,
                                        tables: group.tables.map((table) => {
                                          if(table.id === props.table.id){
                                            return temp
                                          }
                                          return table
                                        })
                                      }
                                    }
                                    return group
                                  })

                                return pTemp
                              }

                              props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTable(temp)
                              props.parentUpdateTableColumns(temp.columns)
                            }
                            else if(column.edit && text !== column.header) {
                              updateColumn.mutate({
                                column: column,
                                values: column.values,
                                header: text,
                                options: {
                                  logging: true
                                }
                              })

                              const temp: Table = {
                                ...props.table,
                                columns: props.table.columns
                                  .map((parentColumn) => ({
                                    ...parentColumn, 
                                    header: parentColumn.id === column.id ? text : parentColumn.header,
                                  }))
                              }

                              const updateGroup = (prev: TableGroup[]) => {
                                const pTemp = [...prev]
                                  .map((group) => {
                                    if(group.id === temp.tableGroupId){
                                      return {
                                        ...group,
                                        tables: group.tables.map((table) => {
                                          if(table.id === temp.id){
                                            return temp
                                          }
                                          return table
                                        })
                                      }
                                    }
                                    return group
                                  })

                                return pTemp
                              }
    
                              props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTable(temp)
                              props.parentUpdateTableColumns(temp.columns)
                            }
                          }}
                          onCancel={() => {
                            const temp: Table = {
                              ...props.table,
                              columns: props.table.columns.map((col) => (col.id === column.id ? ({
                                ...col,
                                edit: false,
                                temporary: false
                              }) : col))
                            }

                            const updateGroup = (prev: TableGroup[]) => {
                              const pTemp = [...prev]
                                .map((group) => {
                                  if(group.id === temp.tableGroupId){
                                    return {
                                      ...group,
                                      tables: group.tables.map((table) => {
                                        if(table.id === temp.id){
                                          return temp
                                        }
                                        return table
                                      })
                                    }
                                  }
                                  return group
                                })

                              return pTemp
                            }

                            props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                            props.parentUpdateTableGroups((prev) => updateGroup(prev))
                            props.parentUpdateTable(temp)
                            props.parentUpdateTableColumns(temp.columns)
                          }}
                        />
                      </div>
                    ) : (
                      <Dropdown 
                        className="min-w-max"
                        label={(<span className="hover:underline underline-offset-2">{column.header}</span>)}
                        arrowIcon={false}
                        placement="bottom"
                        inline
                        dismissOnClick={!headerDropdownHovering}
                      >
                        <div className="w-max flex flex-col">
                          <span className="whitespace-nowrap px-4 border-b pb-0.5 font-semibold text-base text-center w-full">
                            <span>Type:</span>
                            <ColorComponent 
                              customText={' ' + column.type[0].toUpperCase() + column.type.substring(1)} 
                              activeColor={getColumnTypeColor(column.type)}
                            />
                          </span>
                          {column.type === 'participant' && (
                            <ParticipantSyncItem 
                              table={props.table}
                              column={column}
                              users={[...users, ...tempUsers.map((user) => ({ 
                                profile: user, 
                                first: user.firstName ?? '',
                                last: user.lastName ?? '',
                                email: user.email,
                                userId: '',
                                status: '',
                                verified: false,
                              }))]} 
                              syncColumn={syncParticipantColumn}
                            />
                          )}
                          {column.type === 'value' && (
                            <ValueSyncItem 
                              table={props.table}
                              column={column}
                              users={users}
                              syncColumn={syncValueColumn}
                              setHovering={setHeaderDropdownHovering}
                            />
                          )}
                          {(column.type === 'tag' || column.type === 'date') && (
                            <TagSyncItem 
                              table={props.table}
                              column={column}
                              syncColumn={syncParticipantColumn}
                              participants={[
                                ...users.flatMap((data) => data.profile).filter((profile) => profile !== undefined),
                                ...tempUsers
                              ]
                              .flatMap((profile) => profile.participant)
                              .reduce((prev, cur) => {
                                if(!prev.some((part) => part.id === cur.id)) {
                                  prev.push(cur)
                                }
                                return prev
                              }, [] as Participant[])}
                            />
                          )}
                          <Dropdown.Item 
                            className="justify-center"
                            onClick={() => {
                              const temp: Table = {
                                ...props.table,
                                columns: props.table.columns.map((parentColumn) => {
                                  if(parentColumn.id === column.id){
                                    return {
                                      ...parentColumn,
                                      edit: true
                                    }
                                  }
                                  return parentColumn
                                })
                              }

                              const updateGroup = (prev: TableGroup[]) => {
                                const pTemp = [...prev]
                                  .map((group) => {
                                    if(group.id === temp.tableGroupId){
                                      return {
                                        ...group,
                                        tables: group.tables.map((table) => {
                                          if(table.id === temp.id){
                                            return temp
                                          }
                                          return table
                                        })
                                      }
                                    }
                                    return group
                                  })

                                return pTemp
                              }

                              props.parentUpdateTable(temp)
                              props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTableColumns(temp.columns)
                            }}
                          >Rename</Dropdown.Item>
                          <Dropdown.Item 
                            className="justify-center"
                            onClick={() => {
                              refColumn.current = column
                              setDeleteColumnConfirmation(true)
                            }}
                          >Delete</Dropdown.Item>
                        </div>
                      </Dropdown>
                    )}
                  </th>
                )
              })}
              <th
                className="
                  relative px-6 py-3 border-e border-e-gray-300 border-b border-b-gray-300
                  min-w-[50px] max-w-[50px] whitespace-normal break-words text-center
                  items-center flex flex-row justify-center
                "
              >
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={(<HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>)}
                >
                  <div className="w-max">
                    <span className="whitespace-nowrap px-4 border-b pb-0.5 text-base">Add a Column</span>
                    <div className="grid grid-cols-2 p-1 gap-x-2">
                      <Dropdown.Item 
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('value')}
                      >
                        <HiOutlinePencil size={32} className="bg-orange-400 border-4 border-orange-400 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Value Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds simple values</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item 
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('user')}
                      >
                        <HiOutlineUserCircle size={32} className="bg-red-500 border-4 border-red-500 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">User Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with user's emails.</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item 
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('participant')}
                      >
                        <HiMiniIdentification size={32} className="bg-pink-400 border-4 border-pink-400 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Participant Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with a user's participant.</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('choice')}
                      >
                        <HiOutlineListBullet size={32} className="bg-blue-500 border-4 border-blue-500 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Choice Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column can have different choices to pick.</span>
                        </div>
                      </Dropdown.Item >
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('date')}
                      >
                        <HiOutlineCalendar size={32} className="bg-cyan-400 border-4 border-cyan-400 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Timeslot Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with a participant's timeslot.</span>
                        </div>
                      </Dropdown.Item >
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('file')}
                      >
                        <HiOutlineDocumentText size={32} className="bg-purple-600 border-4 border-purple-600 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">File Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds files uploaded by the user.</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('tag')}
                      >
                        <HiOutlineTag size={32} className="bg-fuchsia-600 border-4 border-fuchsia-600 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Tag Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with a participant's tags.</span>
                        </div>
                      </Dropdown.Item >
                    </div>
                  </div>
                </Dropdown>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length > 0 && tableRows.map((row: [string, TableColumn['type'], string][], i: number) => {
                return (
                  <tr key={i} className="bg-white border-b">
                    {row.map(([v, t, id], j) => {
                      switch(t){
                        case 'user': {
                          return (
                            <UserCell
                              key={j}
                              value={v ?? ''}
                              updateValue={(text) => updateValue(id, text, i)}
                              userData={users}
                              userDataQuery={props.userData}
                              table={props.table}
                              rowIndex={i}
                              columnId={id}
                              tagsData={props.tagData}
                              tempUsers={tempUsers}
                              parentUpdateTempUsers={setTempUsers}
                              tempUsersQuery={props.tempUsersData}
                            />
                          )
                        }
                        case 'participant': {
                          return (
                            <ParticipantCell 
                              key={j}
                              table={props.table}
                              userData={[
                                ...users,
                                ...tempUsers.map((user) => ({
                                  email: user.email,
                                  status: '',
                                  userId: '',
                                  first: user.firstName ?? '',
                                  last: user.lastName ?? '',
                                  verified: false,
                                  profile: user,
                                }))
                              ]}
                              userDataQuery={props.userData}
                              value={v ?? ''}
                              updateValue={(text) => updateValue(id, text, i)}
                              updateUserProfiles={setUsers}
                              rowIndex={i}
                              tagsQuery={props.tagData}
                              choiceColumn={props.table.columns.find((col) => col.id === props.table.columns.find((pCol) => pCol.id === id)?.choices?.[0])}
                            />
                          )
                        }
                        case 'date': {
                          // TODO: add a query field for async fetch loading
                          return (
                            <DateCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              table={props.table}
                              participants={[
                                ...users,
                                ...tempUsers.map((user) => ({
                                  email: user.email,
                                  status: '',
                                  userId: '',
                                  first: user.firstName ?? '',
                                  last: user.lastName ?? '',
                                  verified: false,
                                  profile: user,
                                }))
                              ]
                              .map((data) => {
                                if(data.profile?.participant) return data.profile.participant
                                return [] as Participant[]
                              })
                              .reduce((prev, cur) => {
                                prev.push(...cur.filter((part) => !prev.some((prevPart) => prevPart.id === part.id)))
                                return prev
                              }, []) ?? []
                              }
                              rowIndex={i}
                              columnId={id}
                              userQuery={props.userData}
                              tempUserQuery={props.tempUsersData}
                              choiceColumn={props.table.columns.find((col) => col.id === props.table.columns.find((pCol) => pCol.id === id)?.choices?.[0])}
                            />
                          )
                        }
                        case 'choice': {
                          return (
                            <ChoiceCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              column={props.table.columns.find((col) => col.id === id)!}
                              updateParentTable={props.parentUpdateTable}
                              createChoice={(choice, color) => updateChoices(id, {choice: choice, color: color}, "create")}
                            />
                          )
                        }
                        case 'tag': {
                          return (
                            <TagCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              tags={props.tagData.data ?? []}
                              refetchTags={() => props.tagData.refetch()}
                              table={props.table}
                              columnId={id}
                              rowIndex={i}
                              participants={[
                                ...users.flatMap((data) => data.profile).filter((profile) => profile !== undefined),
                                ...tempUsers
                              ]
                              .flatMap((profile) => profile.participant)
                              .reduce((prev, cur) => {
                                if(!prev.some((part) => part.id === cur.id)) {
                                  prev.push(cur)
                                }
                                return prev
                              }, [] as Participant[])}
                              updateParticipant={(participant) => {
                                const foundTemp = tempUsers.find((user) => user.participant.some((pParticipant) => pParticipant.id === participant.id))
                                const foundUser = users.find((user) => user.profile?.participant.some((pParticipant) => pParticipant.id === participant.id))

                                if(foundUser !== undefined) {
                                  setUsers((prev) => prev.map((user) => user.email === foundUser.email ? ({
                                    ...foundUser,
                                    profile: foundUser.profile !== undefined ? ({
                                      ...foundUser.profile,
                                      participant: foundUser.profile.participant.map((pParticipant) => pParticipant.id === participant.id ? participant : pParticipant)
                                    }) : undefined
                                  }) : user))
                                }
                                else if(foundTemp !== undefined) {
                                  setTempUsers((prev) => prev.map((user) => user.email === foundTemp.email ? ({
                                    ...foundTemp,
                                    participant: foundTemp.participant.map((pParticipant) => pParticipant.id === participant.id ? participant : pParticipant)
                                  }) : user))
                                }
                              }}
                              userQuery={props.userData}
                              tempUserQuery={props.tempUsersData}
                            />
                          )
                        }
                        case 'file': {
                          return (
                            <FileCell
                              key={j}
                              value={v}
                              updateValue={(text) => {
                                const tempTable: Table = {
                                  ...props.table,
                                  columns: props.table.columns.map((column) => {
                                    if(column.id === id) {
                                      const temp = [...column.values]
                                      temp[i] = text
                                      return {
                                        ...column,
                                        values: temp
                                      }
                                    }
                                    return column
                                  })
                                }

                                const updateGroup = (prev: TableGroup[]) => {
                                  const pTemp: TableGroup[] = [...prev]
                                    .map((group) => {
                                      if(group.id === tempTable.tableGroupId) {
                                        return {
                                          ...group,
                                          tables: group.tables.map((table) => {
                                            if(table.id === tempTable.id) {
                                              return tempTable
                                            }
                                            return table
                                          })
                                        }
                                      }
                                      return group
                                    })

                                  return pTemp
                                }

                                props.parentUpdateTable(tempTable)
                                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateTableColumns(tempTable.columns)
                              }}
                              column={props.table.columns.find((column) => column.id === id)!}
                              rowIndex={i}
                            />
                          )
                        }
                        default: {
                          return (
                            <ValueCell
                              key={j} 
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                            />
                          )
                        }
                      }
                    })}
                    <td className="flex flex-row items-center justify-center py-3">
                      <button
                        onClick={() => {
                          deleteRow.mutate({
                            table: props.table,
                            rowIndex: i,
                            options: {
                              logging: true
                            }
                          })

                          const temp: Table = {
                            ...props.table,
                            columns: props.table.columns.map((column) => {
                              const mappedColumn: TableColumn = {
                                ...column,
                                values: column.values.reduce((prev, cur, index) => {
                                  if(index === i) return prev
                                  prev.push(cur)
                                  return prev
                                }, [] as string[])
                              }
                              return mappedColumn
                            })
                          }

                          const updateGroup = (prev: TableGroup[]) => {
                            const pTemp: TableGroup[] = [
                              ...prev
                            ].map((parentGroup) => {
                              if(parentGroup.id === props.table.tableGroupId){
                                return {
                                  ...parentGroup,
                                  tables: parentGroup.tables.map((table) => {
                                    if(table.id === temp.id){
                                      return temp
                                    }
                                    return table
                                  })
                                }
                              }
                              return parentGroup
                            })

                            return pTemp
                          }

                          props.parentUpdateTable(temp)
                          props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                          props.parentUpdateTableGroups((prev) => updateGroup(prev))
                          props.parentUpdateTableColumns(temp.columns)
                        }}
                      >
                        <HiOutlineXCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={26} />
                      </button>
                    </td>
                  </tr>
                )
              })
            }
            {props.table.columns.some((column) => column.type === 'choice') && (
              <tr className="bg-white border-b">
                {props.table.columns.map((col, index) => {
                  if(col.type === 'choice') {
                    return (
                      <AggregateCell
                        key={index}
                        column={col}
                      />
                    )
                  }
                  return (<td key={index} className="text-ellipsis border py-3 px-3 max-w-[150px]" />)
                })}
              </tr>
            )}
            {props.table.columns.length > 0 && (
              <tr className="bg-white w-full">
                <td className="text-ellipsis flex flex-row items-center justify-center w-full p-1 border-x border-b">
                  <button
                    onClick={() => {
                      appendRow.mutate({
                        table: props.table,
                        length: props.table.columns[0].values.length + 1,
                        options: {
                          logging: true
                        }
                      })

                      const temp: Table = {
                        ...props.table,
                        columns: props.table.columns.map((column) => {
                          const values = column.values
                          values.push('')
                          return {
                            ...column,
                            values: values
                          }
                        })
                      }

                      const updateGroup = (prev: TableGroup[]) => {
                        const pTemp = [...prev]
                          .map((group) => {
                            if(group.id === temp.tableGroupId){
                              return {
                                ...group,
                                tables: group.tables.map((table) => {
                                  if(table.id === temp.id){
                                    return temp
                                  }
                                  return table
                                })
                              }
                            }
                            return group
                          })

                        return pTemp
                      }

                      props.parentUpdateTable(temp)
                      props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                      props.parentUpdateTableGroups((prev) => updateGroup(prev))
                    }}
                  >
                    <HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}