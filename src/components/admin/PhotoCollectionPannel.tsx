import { FC, useState } from "react"
import { UserTag, Watermark, PhotoCollection } from "../../types"
import { useQueries, useQuery } from "@tanstack/react-query"
import PhotoSetPannel from "./PhotoSetPannel"
import { Progress, TextInput } from "flowbite-react"
import { ControlComponent } from "./ControlPannel"
import { CreateCollectionModal } from "../modals"
import { getAllPhotoCollectionsQueryOptions, getAllPicturePathsByPhotoSetQueryOptions, getPathQueryOptions } from "../../services/collectionService"
import { textInputTheme } from "../../utils"

interface PhotoCollectionPannelProps {
    watermarkObjects: Watermark[],
    availableTags: UserTag[],
}

const component: FC<PhotoCollectionPannelProps> = ({ watermarkObjects, availableTags, }) => {
    const collections = useQuery(getAllPhotoCollectionsQueryOptions({ siTags: false, siSets: false }))
    const coverPaths = useQueries({
        queries: (collections.data ?? [])
            .filter((collection) => collection.coverPath !== undefined)
            .map((collection) => {
                return getPathQueryOptions(collection.coverPath!)
            })
    })
    const [selectedCollection, setSelectedCollection] = useState<PhotoCollection>()

    const paths = useQuery(getAllPicturePathsByPhotoSetQueryOptions(selectedCollection?.sets[0].id))


    const [createCollectionVisible, setCreateCollectionVisible] = useState(false)

    const [filteredItems, setFilteredItems] = useState<PhotoCollection[]>()

    function filterItems(term: string): undefined | void {
        if (!term || !collections.data || collections.data.length <= 0) {
          setFilteredItems(undefined)
          return
        }
    
        const normalSearchTerm = term.trim().toLocaleLowerCase()
    
        const data: PhotoCollection[] = collections.data
          .filter((item) => {
            let filterResult = false
            try {
              filterResult = item.name
                .trim()
                .toLocaleLowerCase()
                .includes(normalSearchTerm)
            } catch (err) {
              return false
            }
            return filterResult
          })
          .filter((item) => item !== undefined)
    
        console.log(data)
        setFilteredItems(data)
    }

    return (
        <>
            <TextInput
                className="self-center w-[80%]"
                theme={textInputTheme}
                sizing="sm"
                placeholder="Search"
                onChange={(event) => filterItems(event.target.value)}
            />
            {
                !selectedCollection ? (
                    <div className="grid grid-cols-6 gap-2">
                        <div className="grid grid-cols-3 border border-gray-400 rounded-2xl p-2 col-span-5">
                            {collections.isLoading ? (
                                <div className="self-center col-start-2 flex flex-row items-center justify-center min-w-[200px]">
                                    <Progress
                                        progress={100}
                                        textLabel="Loading..."
                                        textLabelPosition="inside"
                                        labelText
                                        size="lg"
                                        className="min-w-[200px]"
                                    />
                                </div>
                            ) : (
                                collections.data && collections.data.length > 0 ? (
                                    filteredItems ? (
                                        filteredItems.length > 0 ? (
                                            filteredItems.map((collection, index) => {
                                                return (
                                                    <button 
                                                        className="flex flex-row justify-center items-center relative rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] hover:bg-gray-300 hover:text-gray-500"
                                                        onClick={() => {
                                                            setSelectedCollection(collection)
                                                        }}
                                                        key={index}
                                                    >
                                                        <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                                                            <p className={`font-thin opacity-90 text-2xl`}>{collection.name}</p>
                                                        </div>
                                                        <img src={coverPaths.find((path) => path.data?.[0] === collection.id)?.data?.[1]} className="max-h-[240px] max-w-[360px]"/>
                                                    </button>
                                                )
                                            })
                                        ) : (
                                            <div className="self-center col-start-2 flex flex-row items-center justify-center">
                                                <span >No results yet!</span>
                                            </div>
                                        )
                                    ) : (
                                        collections.data.map((collection, index) => {
                                            return (
                                                <button 
                                                    className="flex flex-row justify-center items-center relative rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] hover:bg-gray-300 hover:text-gray-500"
                                                    onClick={() => {
                                                        setSelectedCollection(collection)
                                                    }}
                                                    key={index}
                                                >
                                                    <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                                                        <p className={`font-thin opacity-90 text-2xl`}>{collection.name}</p>
                                                    </div>
                                                    <img src={coverPaths.find((path) => path.data?.[0] === collection.id)?.data?.[1]} className="max-h-[240px] max-w-[360px]"/>
                                                </button>
                                            )
                                        })
                                    )
                                ) : (
                                    <div className="self-center col-start-2 flex flex-row items-center justify-center">
                                        <span >No collections yet!</span>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="flex flex-col col-span-1 border-gray-400 border rounded-2xl items-center gap-4 py-3 me-2">
                            <p className="text-2xl underline">Controls</p>
                            <ControlComponent name='Create Collection' fn={() => setCreateCollectionVisible(true)} />
                        </div>
                    </div>
                    
                ) : (
                    <PhotoSetPannel 
                        photoCollection={selectedCollection} 
                        watermarkObjects={watermarkObjects} 
                        availableTags={availableTags} 
                        removeActiveCollection={() => setSelectedCollection(undefined)}
                        photoPaths={paths.data ?? []}
                    />
                )
                
            }
        </>
    )
}

export default component