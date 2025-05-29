import { UseQueryResult } from "@tanstack/react-query"
import { TextInput } from "flowbite-react"
import { Dispatch, SetStateAction, useState } from "react"
import { PhotoCollection, UserTag } from "../../../types"
import { textInputTheme } from "../../../utils"
import Loading from "../../common/Loading"
import { Link } from "@tanstack/react-router"
import { CollectionItem } from "./CollectionItem"

//TODO: convert to infinite query
interface CollectionPanelProps {
  selectedTag: UserTag
  parentUpdateTag: Dispatch<SetStateAction<UserTag | undefined>>
  collectionsQuery: UseQueryResult<PhotoCollection[] | undefined, Error>
}
export const CollectionsPanel = (props: CollectionPanelProps) => {
  const [search, setSearch] = useState<string>('')

  const filteredItems: PhotoCollection[] = (props.collectionsQuery.data ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((collection) => collection.name.trim().toLowerCase().includes(search.trim().toLowerCase()))
  // 3 expected output columns
  const collectionColumns: PhotoCollection[][] = (() => {
    const returnGroup: PhotoCollection[][] = [[], [], []]
    
    for(let i = 0; i < filteredItems.length; i++) {
      returnGroup[i % 3].push(filteredItems[i])
    }

    return returnGroup
  })()

  return (
    <div className="flex flex-col max-h-[70vh] items-center justify-center w-full">
      <TextInput 
        theme={textInputTheme}
        sizing="sm"
        className="max-w-[400px] w-full mb-4 self-center"
        placeholder="Search Photo Collections"
        onChange={(event) => setSearch(event.target.value)}
        value={search}
      />
      <div className="grid grid-cols-3 px-10 place-items-center gap-x-6 w-full">
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          {props.collectionsQuery.isLoading ? (
            <span className="flex flex-row text-start gap-1 italic font-light">
              <span>Loading</span>
              <Loading />
            </span>
          ) : (
          filteredItems.length === 0 ? (
            search !== ''? (
              <div className="flex flex-row gap-4">
                <span className="italic font-light">No Results</span>
                <Link to="/admin/dashboard/collection">
                  <span className="hover:underline text-sm italic">Create New Collection</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-row gap-4">
                <span className="italic font-light">No Collections</span>
                <Link to="/admin/dashboard/collection">
                  <span className="hover:underline text-sm italic">Create New Collection</span>
                </Link>
              </div>
            )
          ) : (
            collectionColumns[0].map((collection, index) => {
              const selected = props.selectedTag.collections?.some((pCol) => pCol.id === collection.id)
              return (
                <CollectionItem 
                  key={index}
                  collection={collection}
                  selected={selected ?? false}
                  selectedTag={props.selectedTag}
                  parentUpdateTag={props.parentUpdateTag}
                />
              )
            })
          ))}
        </div>
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          {collectionColumns[1].map((collection, index) => {
            const selected = props.selectedTag.collections?.some((pCol) => pCol.id === collection.id)
            return (
              <CollectionItem 
                key={index}
                collection={collection}
                selected={selected ?? false}
                selectedTag={props.selectedTag}
                parentUpdateTag={props.parentUpdateTag}
              />
            )
          })}
        </div>
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          {collectionColumns[2].map((collection, index) => {
            const selected = props.selectedTag.collections?.some((pCol) => pCol.id === collection.id)
            return (
              <CollectionItem 
                key={index}
                collection={collection}
                selected={selected ?? false}
                selectedTag={props.selectedTag}
                parentUpdateTag={props.parentUpdateTag}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}