import { useEffect, useState } from "react"
import { PackageItem } from "../../../types"
import { decryptBooleanStatement } from "../../../functions/packageFunctions"

interface TieredItemProps {
  item: PackageItem
  display: 'list'
  expand?: boolean
}

export const TieredItem = (props: TieredItemProps) => {
  const [expand, setExpand] = useState(props.expand ?? false)
  
  useEffect(() => {
    if(props.expand !== undefined) {
      setExpand(props.expand)
    }
  }, [props.expand])
  
  return (
    <div className="w-full flex flex-row gap-2 px-2">
      <span>&bull;</span>
      <div className="flex flex-col">
        <span className="text-wrap font-light">{props.item.name}</span>
        {expand && (
          props.item.statements?.map((statement, index) => {
            return (
              <span className="text-sm font-light" key={index} >{decryptBooleanStatement(statement)}</span>
            )
          })
        )}
        {expand && (<span className="text-wrap font-light text-sm italic">{props.item.description}</span>)}
        {expand && (
          <button 
            className="self-start hover:text-black text-gray-500 text-sm font-light italic hover:underline"
            onClick={() => setExpand(false)}
          >
            <span>Show Less</span>
          </button>
        )}
      </div>
      {!expand && (
        <button 
          className="hover:text-black text-gray-500 text-sm font-light italic hover:underline"
          onClick={() => setExpand(true)}
        >
          <span>Show More</span>
        </button>
      )}
    </div>
  )
}