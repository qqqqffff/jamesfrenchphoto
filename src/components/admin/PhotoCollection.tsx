import { FC, useEffect, useState } from "react"
import { PhotoCollection, PicturePath } from "../../types"
import { ControlComponent } from "./ControlPannel";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { getUrl, remove } from "aws-amplify/storage";
import { Subscription } from "rxjs";
import { 
    HiOutlineBarsArrowDown, 
    HiOutlineBarsArrowUp, 
    HiOutlineTrash,
    HiOutlineStar
} from "react-icons/hi2";
import { Tooltip } from "flowbite-react";
import { UploadImagesModal } from "../modals";
import { useNavigate } from "react-router-dom";

export type PhotoCollectionProps = {
    photoCollection: PhotoCollection;
    photoPaths?: PicturePath[];
}

const client = generateClient<Schema>()

export const PhotoCollectionComponent: FC<PhotoCollectionProps> = ({ photoCollection, photoPaths }) => {
    const [picturePaths, setPhotoPaths] = useState<PicturePath[] | undefined>(photoPaths)
    const [apiCalled, setApiCalled] = useState(false)
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>(([] as string[]))
    const [displayPhotoControls, setDisplayPhotoControls] = useState<string | undefined>()
    const [uploadImagesVisible, setUploadImagesVisible] = useState(false)
    const [cover, setCover] = useState(photoCollection.coverPath ?? null)
    const navigate = useNavigate()

    useEffect(() => {
        let unsubscribe: Subscription | undefined
        if(!apiCalled){
            console.log('api call')
            setApiCalled(true)
            unsubscribe = client.models.PhotoPaths.observeQuery(
                {filter: { collectionId: { eq: photoCollection.id } }})
            .subscribe(async (data) => {
                if(data.isSynced){
                    console.log(data)
                    setPhotoPaths((await Promise.all(data.items.map(async (item) => {
                        return {
                            id: item.id,
                            path: item.path,
                            url: (await getUrl({
                                path: item.path
                            })).url.toString()
                        } as PicturePath
                    }))).sort((a, b) => a.order - b.order))
                }
            })
        }
        
        return () => {
            if(unsubscribe) unsubscribe.unsubscribe()
        }
    }, [])

    function pictureStyle(url: string, cover: boolean){
        const conditionalBackground = selectedPhotos.includes(url) ? `bg-gray-100 ${cover ? 'border-yellow-300' : 'border-cyan-400'}` : `bg-transparent border-gray-500 ${cover ? 'border-yellow-300' : 'border-gray-500'}`
        // console.log(conditionalBackground, selectedPhotos.includes(url), selectedPhotos, url)
        return 'relative px-2 py-6 border hover:bg-gray-200 rounded-lg ' + conditionalBackground
    }
    function controlsEnabled(id: string){
        if(id == displayPhotoControls) return 'flex'
        return 'hidden'
    }

    function parseName(path: string){
        return path.substring(path.indexOf('_') + 1)
    }

    async function saveCollection(){

    }

    function chagesToSave(){
        return (
            photoCollection.coverPath !== cover ||
            photoPaths?.find((path) => picturePaths?.find((p) => path.id == p.id)?.order !== path.order)
        )
    }

    return (
    <>
        <UploadImagesModal 
            open={uploadImagesVisible} 
            onClose={() => setUploadImagesVisible(false)} 
            collectionId={photoCollection.id} 
            eventId={photoCollection.eventId} 
            subcategoryId={photoCollection.id} 
            offset={picturePaths ? picturePaths.length : 0}
        />
        <div className="grid grid-cols-6 gap-2">
            <div className="grid grid-cols-5 col-span-5 border-gray-400 border rounded-2xl space-x-4 p-4">
                    {picturePaths && picturePaths.length > 0 ? 
                    picturePaths.filter((path) => path.url).map((path, index) => {
                        const coverSelected = path.path === cover
                        const coverSelectedStyle = `${coverSelected ? 'fill-yellow-300' : ''}`
                        return (
                            <button key={index} className={pictureStyle(path.url, coverSelected)} id='image-container'
                                onClick={(event) => {
                                    if((event.target as HTMLElement).id.includes('image')){
                                        if(selectedPhotos.includes(path.url)){
                                            setSelectedPhotos(selectedPhotos.filter((url) => url != path.url))
                                        }
                                        else{
                                            const temp = [...selectedPhotos]
                                            temp.push(path.url)
                                            setSelectedPhotos(temp)
                                        }
                                    }
                                }}
                                onMouseEnter={() => {
                                    setDisplayPhotoControls(path.id)
                                }}  
                                onMouseLeave={() => {
                                    setDisplayPhotoControls(undefined)
                                }}
                            >
                                <img src={path.url} className="object-cover rounded-lg" id='image'/>
                                <div className={`absolute bottom-0 inset-x-0 justify-end flex-row gap-1 me-1 ${controlsEnabled(path.id)}`}>
                                    <Tooltip content={(<p>Set as cover</p>)} placement="bottom" className="w-[110px]">
                                        <button className="" onClick={async () => {
                                            if(coverSelected) {
                                                setCover(null)
                                            } else {
                                                setCover(path.path)
                                            }
                                        }}>
                                            <HiOutlineStar className={coverSelectedStyle} size={20} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={(<p>Move to Top</p>)} placement="bottom" className="w-[110px]">
                                        <button className="" onClick={async () => {
                                            const temp = [path, ...picturePaths.filter((p) => p.id !== path.id)].map((path, index) => {
                                                return {
                                                    ...path,
                                                    order: index,
                                                }
                                            })
                                            setPhotoPaths(temp)
                                        }}>
                                            <HiOutlineBarsArrowUp size={20} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={(<p>Move to Bottom</p>)} placement="bottom" className="w-[130px]">
                                        <button className="" onClick={async () => {
                                            const temp = [...picturePaths.filter((p) => p.id !== path.id), path].map((path, index) => {
                                                return {
                                                    ...path,
                                                    order: index,
                                                }
                                            })
                                            setPhotoPaths(temp)
                                        }}><HiOutlineBarsArrowDown size={20} /></button>
                                    </Tooltip>
                                    <Tooltip content='Delete' placement="bottom">
                                        <button className="" onClick={async () => {
                                            const s3response = await remove({
                                                path: path.path
                                            })
                                            console.log(s3response)
                                            const pathsresponse = await client.models.PhotoPaths.delete({
                                                id: path.id,
                                            })
                                            console.log(pathsresponse)
                                            setPhotoPaths(await Promise.all((await client.models.PhotoPaths
                                                .listPhotoPathsByCollectionId({ collectionId: photoCollection.id}))
                                                .data.map(async (item) => {
                                                    return {
                                                        id: item.id,
                                                        path: item.path,
                                                        url: (await getUrl({
                                                            path: item.path
                                                        })).url.toString()
                                                    } as PicturePath
                                                })))
                                        }}>
                                            <HiOutlineTrash size={20} />
                                        </button>
                                    </Tooltip>
                                    
                                </div>
                                <div className={`absolute top-0 inset-x-0 justify-center flex-row ${controlsEnabled(path.id)}`}>
                                    <p id="image-name">{parseName(path.path)}</p>
                                </div>
                            </button>
                        )
                    }) : (<p>Upload Pictures to Start!</p>)}
            </div>
            <div className="flex flex-col col-span-1 border-gray-400 border rounded-2xl items-center gap-4 py-3 me-2">
                <p className="text-2xl underline">Controls</p>
                <ControlComponent name="Upload Picture" fn={() => setUploadImagesVisible(true)} />
                <ControlComponent name="Save Changes" fn={() => console.log('hello world')} />
                <ControlComponent name={!(selectedPhotos.length > 0) ? "Preview" : "Preview Selected"} fn={() => navigate(`/photo-collection/${photoCollection.id}`, { state: { origin: 'admin' }})} />
            </div>
        </div>        
    </>
)
}



