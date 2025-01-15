import { FC, useState } from "react"
import { UserTag, Watermark, PhotoCollection, PhotoSet } from "../../types"
import { useMutation, useQueries, useQuery } from "@tanstack/react-query"
import PhotoSetPannel from "./PhotoSetPannel"
import { Button, Label, Progress, TextInput } from "flowbite-react"
import { ControlComponent } from "./ControlPannel"
import { CreateCollectionModal } from "../modals"
import { createSetMutation, CreateSetParams, getAllPhotoCollectionsQueryOptions, getAllPicturePathsByPhotoSetQueryOptions, getPathQueryOptions } from "../../services/collectionService"
import { textInputTheme } from "../../utils"
import CollectionThumbnail from "./CollectionThumbnail"
import { HiOutlineCheckCircle, HiOutlinePlusCircle, HiOutlineXCircle } from "react-icons/hi2"
import { HiOutlineMenu } from "react-icons/hi"
import Set from './Set'

interface PhotoCollectionPannelProps {
    watermarkObjects: Watermark[],
    availableTags: UserTag[],
    coverPath?: string,
    collection: PhotoCollection,
}

interface CreateSetComponentParams {
    collection: PhotoCollection,
    order?: number,
    callback: (set: PhotoSet) => void
    close: () => void
}

const CreateSetComponent: FC<CreateSetComponentParams> = ({ collection, callback, close, order }) => {
    const [name, setName] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const createSet = useMutation({
        mutationFn: (params: CreateSetParams) => createSetMutation(params),
        onSettled: (data) => {
            setLoading(false)
            if(data){
                setName('')
                callback(data)
            }
        }
    })
    return (
        <div className="flex flex-row border rounded-2xl py-1 px-4 gap-4">
            <button><HiOutlineMenu/></button>
            <input autoFocus className="focus:outline-none border-b-black border-b w-full" onChange={(event) => setName(event.target.value)} value={name}/>
            <Button size='sm' outline pill isProcessing={loading} 
            onClick={() => {
                setLoading(true)
                createSet.mutate({
                    collection: collection,
                    name: name,
                    options: {
                        logging: true
                    }
                }
            )}}>
                {!loading && <HiOutlineCheckCircle className="text-3xl text-green-400"/>}
            </Button>
            <Button size='sm' outline pill onClick={() => close()}>
                {!loading && <HiOutlineXCircle className="text-3xl text-red-500" />}
            </Button>
        </div>
    )
}

const component: FC<PhotoCollectionPannelProps> = ({ watermarkObjects, availableTags, coverPath, collection }) => {
    const [activeSet, setActiveSet] = useState<PhotoSet | undefined>(collection.sets[0])
    const paths = useQuery(getAllPicturePathsByPhotoSetQueryOptions(activeSet?.id))

    const [createSetVisible, setCreateSetVisible] = useState(false)
    
    return (
        <>

            <div className="grid grid-cols-3 mx-4 mt-4">
                <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px]">
                    <CollectionThumbnail 
                        collection={collection}
                        coverPath={coverPath}
                    />
                    <div className="flex flex-row items-center justify-between w-full">
                        <Label className="text-lg ms-2">Photo Sets</Label>
                        <button
                            className="flex flex-row gap-2 border border-gray-300 items-center justify-between hover:bg-gray-100 rounded-xl py-1 px-2 me-2"
                            onClick={() => {setCreateSetVisible(true)}}
                        >
                            <span className="">Create New Set</span>
                            <HiOutlinePlusCircle className="text-2xl text-gray-600" />
                        </button>
                    </div>
                    <div className="border w-full"></div>
                    <div className="rounded-2xl border border-gray-400 w-full">
                        {collection.sets.map((set, index) => {
                            return (
                                <Set set={set} key={index}/>
                            )
                        })}
                        {createSetVisible && (
                            <CreateSetComponent 
                                collection={collection}
                                callback={(set) => {
                                    collection.sets.push(set)
                                    setCreateSetVisible(false)
                                }}
                                close={() => setCreateSetVisible(false)}
                            />)}
                    </div>
                </div>
            </div>
        </>
    )
}

export default component