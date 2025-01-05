import { FC, useState } from "react"
import { Event, UserTag, Watermark, PhotoCollection } from "../../types"
import { useQueries, useQuery } from "@tanstack/react-query"
import { getAllCollectionsByEventQueryOptions, getAllPicturePathsQueryOptions, getCoverPathFromCollectionQueryOptions } from "../../services/collectionService"
import { PhotoCollectionPannel } from "./PhotoCollectionPannel"

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

    return (
        <>
            {
                !selectedCollection ? (
                    coverPaths.map((data) => (
                        <img src={data.data?.[1]} className="max-h-[200px] max-w-[300px]"/>
                    ))
                ) : (
                    <PhotoCollectionPannel 
                        photoCollection={selectedCollection} 
                        photoPaths={paths.data ?? []} 
                        watermarkObjects={watermarkObjects} 
                        availableTags={availableTags} 
                    />
                )
                
            }
        </>
    )
}