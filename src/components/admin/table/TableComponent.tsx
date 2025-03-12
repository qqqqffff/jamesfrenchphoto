import { Dispatch, SetStateAction } from "react"
import { Table, TableGroup } from "../../../types"

interface TableComponentProps {
  table: Table,
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
}

export const TableComponent = (props: TableComponentProps) => {
  const tableRows: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'][][] = []

  for(let i = 0; i < props.table.columns[0].values.length; i++){
    const row: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'][] = []
    for(let j = 0; j < props.table.columns.length; j++){
      row.push([props.table.columns[i].values[j], props.table.columns[i].type])
    }
    tableRows.push(row)
  }


  return (
    <div className="relative overflow-x-auto overflow-y-auto shadow-md">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky">
          <tr>
            {props.table.columns.map((column) => {
              return (
                <th
                  onMouseEnter={() => {}}
                  key={column.id}
                  className="
                    relative px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300 
                    min-w-[150px] max-w-[150px] whitespace-normal overflow-hidden break-words text-center 
                    items-center
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
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => {
            return (
              <tr key={i} className="bg-white border-b">
                {row.map(([v, t], j) => {
                  //TODO: column type mapping 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'
                  switch(t){
                    case 'value': {
                      console.log(v)
                    }
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
                  }
                  return (
                    <td className="text-ellipsis px-6 py-4 border" key={j}>
                      {v}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}