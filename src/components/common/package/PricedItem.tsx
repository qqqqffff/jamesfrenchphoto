import { Dropdown } from "flowbite-react"
import { PackageItem, PhotoCollection } from "../../../types"
import { useEffect, useState } from "react"

interface PricedItemProps {
  item: PackageItem,
  display: 'list'
  collectionList: PhotoCollection[]
  expand?: boolean
}

export const PricedItem = (props: PricedItemProps) => {
  const [expand, setExpand] = useState(props.expand ?? false)
  
  useEffect(() => {
    if(props.expand !== undefined) {
      setExpand(props.expand)
    }
  }, [props.expand])

  const extendedDetails = `. ${props.item.max === 0 ? '' : `${props.item.max} included in the package.`} ${props.item.price === '0' ? '' : `$${props.item.price} per item ${props.item?.hardCap === Infinity ? '' : ` with a limit of ${props.item.hardCap} items.`}`}`
  return (
    <div className="w-full flex flex-row gap-2 px-2">
      <span>&bull;</span>
      <div className="flex flex-col">
        <span className="text-wrap font-light">{props.item.name}{expand ? extendedDetails : ''}</span>
        {expand && props.item.collectionIds
              .filter((id) => props.collectionList.some((collection) => collection.id === id)).length > 0 && (
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-light">This is a selectable item:</span>
            {<Dropdown
              size="xs"
              inline
              arrowIcon={false}
              trigger="hover"
              label={(<span className="text-sm font-light hover:text-black text-gray-500">Available Collections</span>)}
            >
              {props.item.collectionIds
              .filter((id) => props.collectionList.some((collection) => collection.id === id))
              .map((id, index) => {
                return (
                  <Dropdown.Item key={index}>{props.collectionList.find((collection) => collection.id === id)?.name}</Dropdown.Item>
                )
              })}
            </Dropdown>}
          </div>
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