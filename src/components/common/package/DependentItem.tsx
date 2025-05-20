import { useEffect, useState } from "react"
import { PackageItem } from "../../../types"

interface DependentItemProps {
  packageItems: PackageItem[]
  item: PackageItem
  display: 'list'
  expand?: boolean
}

export const DependentItem = (props: DependentItemProps) => {
  const [expand, setExpand] = useState(props.expand ?? false)

  useEffect(() => {
    if(props.expand !== undefined) {
      setExpand(props.expand)
    }
  }, [props.expand])

  const dependentItem = props.packageItems.find((item) => item.id === props.item.dependent)
  const expandedDetails = `Depdends on ${dependentItem?.name}. Charged $${props.item.price} per ${props.item.quantities} of ${dependentItem?.name} over the aloted amount of ${dependentItem?.max} ${dependentItem?.name}.`

  return (
    <div className="w-full flex flex-row gap-2 px-2">
      <span>&bull;</span>
      <div className="flex flex-col">
        <span className="text-wrap font-light">{props.item.name}</span>
        {expand && (<span className="text-wrap font-light text-sm italic">{expandedDetails}</span>)}
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