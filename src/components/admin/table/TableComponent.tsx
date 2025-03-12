import { Dispatch, SetStateAction } from "react"
import { Table, TableGroup } from "../../../types"
import { HiChevronDown, HiOutlinePencil, HiOutlinePlus, HiOutlinePlusCircle } from 'react-icons/hi2'
import { Dropdown, MegaMenu, Tooltip } from "flowbite-react"

interface TableComponentProps {
  table: Table,
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
}

export const TableComponent = (props: TableComponentProps) => {
  const tableRows: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'][][] = []

  if(props.table.columns.length > 0) { 
    for(let i = 0; i < props.table.columns[0].values.length; i++){
      const row: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'][] = []
      for(let j = 0; j < props.table.columns.length; j++){
        row.push([props.table.columns[i].values[j], props.table.columns[i].type])
      }
      tableRows.push(row)
    }
  }
  


  return (
    // overflow-x-auto overflow-y-auto
    <div className="relative  shadow-md">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-700 bg-gray-50 sticky">
          <tr>
            {props.table.columns.map((column) => {
              return (
                <th
                  onMouseEnter={() => {}}
                  key={column.id}
                  className="
                    relative px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300 
                    min-w-[150px] max-w-[150px] whitespace-normal overflow-hidden break-words text-center 
                    items-center uppercase
                  "
                >
                  <button 
                    className="hover:underline underline-offset-2 max-w-[140px]"
                    onClick={() => {}}
                  >
                    {column.header}
                  </button>
                </th>
              )
            })}
            <th
              className="
                relative px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300
                min-w-[50px] max-w-[50px] whitespace-normal break-words text-center
                items-center flex flex-row justify-center
              "
            >
              <Dropdown
                inline
                arrowIcon={false}
                label={(<HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>)}
              >
                <span className="whitespace-nowrap px-4 border-b pb-0.5">Add a Column</span>
                <div className="grid grid-cols-2">
                  <div className="">
                    <HiOutlinePencil size={24} className="bg-orange-400"/>
                  </div>
                </div>
              </Dropdown>
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => {
            return (
              <tr key={i} className="bg-white border-b">
                {row.map(([v, t], j) => {
                  //TODO: column type mapping 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'
                  switch(t){
                    // case 'user': {

                    // }
                    // case 'date': {

                    // }
                    // case 'choice': {

                    // }
                    // case 'tag': {

                    // }
                    // case 'file': {

                    // }
                    default: {
                      return (
                        <td className="text-ellipsis px-6 py-4 border" key={j}>
                          {v}
                        </td>
                      )
                    }
                  }
                })}
              </tr>
            )
          })}
          {tableRows.length > 0 && (
            <tr className="bg-white border-b">
              <td className="text-ellipsis px-6 py-4 border">
                <button className="">
                  <HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}