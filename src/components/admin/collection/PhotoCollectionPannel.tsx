import { FC, useState } from "react"
import { UserTag, Watermark, PhotoCollection, PhotoSet } from "../../../types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button, Dropdown, Label } from "flowbite-react"
import { createSetMutation, CreateSetParams } from "../../../services/photoSetService"
import CollectionThumbnail from "./CollectionThumbnail"
import { HiOutlineCheckCircle, HiOutlineCog6Tooth, HiOutlinePlusCircle, HiOutlineXCircle } from "react-icons/hi2"
import { HiOutlineMenu } from "react-icons/hi"
import SetList from "./SetList"
import { CreateCollectionModal, WatermarkModal } from "../../modals"
import { useNavigate, useRouter } from "@tanstack/react-router"
import PhotoSetPannel from "./PhotoSetPannel"
import { deleteCoverMutation, DeleteCoverParams } from "../../../services/collectionService"

interface PhotoCollectionPannelProps {
    watermarkObjects: Watermark[],
    availableTags: UserTag[],
    coverPath?: string,
    collection: PhotoCollection,
    set?: PhotoSet
}

interface CreateSetComponentParams {
    collection: PhotoCollection,
    order?: number,
    callback: (set: PhotoSet) => void
    close: () => void,
}

const CreateSetComponent: FC<CreateSetComponentParams> = ({ collection, callback, close }) => {
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

const component: FC<PhotoCollectionPannelProps> = ({ watermarkObjects, availableTags, coverPath, collection, set }) => {
    const [createSetVisible, setCreateSetVisible] = useState(false)
    const [watermarkVisible, setWatermarkVisible] = useState(false)
    const [selectedSet, setSelectedSet] = useState<PhotoSet | undefined>(set)
    const [updateCollectionVisible, setUpdateCollectionVisible] = useState(false)
    const client = useQueryClient()
    const router = useRouter()
    const navigate = useNavigate()

    const deleteImage = useMutation({
        mutationFn: (params: DeleteCoverParams) => deleteCoverMutation(params),
        onSettled: () => {
            router.invalidate()
        }
    })
    
    return (
        <>
            <WatermarkModal 
                collection={collection} 
                onCollectionSubmit={(collection) => {
                    if(collection){
                        client.invalidateQueries({ queryKey: ['photoCollection']})
                    }
                } } 
                onWatermarkUpload={(watermarks) => {
                    if(watermarks) {
                        client.invalidateQueries({
                            queryKey: ['watermarks', 'photoCollection'],
                        })
                        router.invalidate()
                    }
                }} 
                paths={[]} 
                watermarks={watermarkObjects} 
                open={watermarkVisible} 
                onClose={() => setWatermarkVisible(false)} 
            />
            <CreateCollectionModal
                collection={collection}
                onSubmit={(collection) => {
                    if(collection){
                        client.invalidateQueries({ queryKey: ['photoPaths']})
                        client.invalidateQueries({ queryKey: ['photoCollection']})
                    }
                }} 
                availableTags={availableTags} 
                open={updateCollectionVisible} 
                onClose={() => setUpdateCollectionVisible(false)}
            />
            <div className="flex flex-row mx-4 mt-4 gap-4">
                <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px]">
                    <CollectionThumbnail 
                        collection={collection}
                        coverPath={coverPath}
                        allowUpload
                        onClick={() => {}}
                        parentLoading={deleteImage.isPending}
                        contentChildren={(
                            <Dropdown dismissOnClick={false} label={(<HiOutlineCog6Tooth size={20} className="hover:text-gray-600"/>)} inline arrowIcon={false}>
                                <Dropdown.Item 
                                    disabled={collection.coverPath === undefined}
                                    onClick={() => deleteImage.mutate({
                                        collectionId: collection.id,
                                        cover: collection.coverPath
                                    })}
                                >Remove Cover Photo</Dropdown.Item>
                            </Dropdown>
                        )}
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
                    <div className="w-full">
                        <SetList 
                            setList={collection.sets} 
                            setSelectedSet={(set) => {
                                navigate({to: '.', search: {
                                    collection: collection.id,
                                    set: set.id
                                }})
                                setSelectedSet(set)
                            }}
                            collectionId={collection.id}
                        />
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
                {selectedSet ? (
                    <PhotoSetPannel 
                        photoCollection={collection} 
                        photoSet={selectedSet} 
                        watermarkObjects={watermarkObjects} 
                    />
                ) : (
                    <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
                        <div className="flex flex-row items-center justify-center">
                            <p>Click a set to view it here!</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default component