import { FC, useState } from "react"
import { Event, UserTag, Watermark, PhotoCollection } from "../../types"
import { useQueries, useQuery } from "@tanstack/react-query"
import { getAllCollectionsByEventQueryOptions, getAllPicturePathsQueryOptions, getCoverPathFromCollectionQueryOptions } from "../../services/collectionService"
import { PhotoCollectionPannel } from "./PhotoCollectionPannel"
import { Progress } from "flowbite-react"
import { ControlComponent } from "./ControlPannel"
import { CreateCollectionModal } from "../modals"

interface EventPannelProps {
    event: Event
    watermarkObjects: Watermark[],
    availableTags: UserTag[],
}

export const EventPannel: FC<EventPannelProps> = ({ event, watermarkObjects, availableTags, }) => {
    const collections = useQuery(getAllCollectionsByEventQueryOptions(event.id, { siTags: false }))
    const coverPaths = useQueries({
        queries: (collections.data ?? [])
            .filter((collection) => collection.coverPath !== undefined)
            .map((collection) => {
                return getCoverPathFromCollectionQueryOptions(collection)
            })
    })
    const [selectedCollection, setSelectedCollection] = useState<PhotoCollection>()
    const paths = useQuery(getAllPicturePathsQueryOptions(selectedCollection?.id))

    const [createCollectionVisible, setCreateCollectionVisible] = useState(false)

    return (
        <>
            <CreateCollectionModal
                eventId={event.id}
                availableTags={availableTags}
                onSubmit={(collection) => {
                    if(collection){
                        setSelectedCollection(collection)
                    }
                    else{
                        //TODO: error handle
                    }
                }}
                onClose={() => setCreateCollectionVisible(false)}
                open={createCollectionVisible}
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
                                    collections.data.map((collection) => {
                                        return (
                                            <button 
                                                className="flex flex-row justify-center items-center relative rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] hover:bg-gray-300 hover:text-gray-500"
                                                onClick={() => {
                                                    setSelectedCollection(collection)
                                                }}
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
                    <PhotoCollectionPannel 
                        photoCollection={selectedCollection} 
                        photoPaths={paths.data ?? []} 
                        watermarkObjects={watermarkObjects} 
                        availableTags={availableTags} 
                        removeActiveCollection={() => setSelectedCollection(undefined)}
                    />
                )
                
            }
        </>
    )
}