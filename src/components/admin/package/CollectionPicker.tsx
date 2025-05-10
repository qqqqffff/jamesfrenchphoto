import { Checkbox, Dropdown } from "flowbite-react"
import { PhotoCollection } from "../../../types"
import { useState } from "react"

interface CollectionPickerProps {
  collectionList: PhotoCollection[],
  parentSelectCollection: (collection: string, selected: boolean) => void,
  parentUnselectAllCollections: () => void
  selectedCollections: PhotoCollection[]
}

//TODO: put in a useeffect to destroy states
export const CollectionPicker = (props: CollectionPickerProps) => {
  const [search, setSearch] = useState<string>('')
  return (
    <Dropdown
     label={<span className="h-min">Select Collections</span>}
     dismissOnClick={false}
     color='gray'
     size="xs"
    >
      <div className="px-2 py-1 flex flex-row gap-4">
        <span>Collections:</span>
        <button 
          className="text-xs border rounded-lg px-2" 
          onClick={() => props.parentUnselectAllCollections()}
        >Clear</button>
      </div>
      <div className="px-2 py-1 flex flex-row items-center justify-center">
        <input 
          placeholder="Search for a collection"
          className="font-thin py-1 px-2 text-xs ring-transparent w-full border rounded-md focus:outline-none placeholder:text-gray-400 placeholder:italic"
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          value={search}
        />
      </div>
      {props.collectionList
        .filter((collection) => collection.name.toLowerCase().trim().includes((search ?? '').toLowerCase()))
        .map((collection) => {
          const selected = props.selectedCollections.some((pCol) => collection.id === pCol.id)
          return (
            <Dropdown.Item 
              onClick={() => props.parentSelectCollection(collection.id, !selected)}
              className="flex flex-row gap-2 w-full items-center justify-start" 
            >
              <Checkbox checked={selected} readOnly/>
              <span>{collection.name}</span>
            </Dropdown.Item>
          )
        })
        }
    </Dropdown>
  )
}