import { FC, useState } from "react"
import { PhotoCollection, PicturePath } from "../../types"
import { ControlComponent } from "./ControlPannel";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { getUrl, remove } from "aws-amplify/storage";
import { 
    HiOutlineBarsArrowDown, 
    HiOutlineBarsArrowUp, 
    HiOutlineTrash,
    HiOutlineStar
} from "react-icons/hi2";
import { Tooltip } from "flowbite-react";
import { UploadImagesModal, WatermarkModal } from "../modals";
import { useNavigate } from "react-router-dom";
import { TbCircleLetterPFilled, TbCircleLetterLFilled } from "react-icons/tb";

export type PhotoCollectionProps = {
    photoCollection: PhotoCollection;
    photoPaths: PicturePath[];
    watermarkObjects: {
        path: string,
        url: string
    }[]
}

const client = generateClient<Schema>()

export const PhotoCollectionComponent: FC<PhotoCollectionProps> = ({ photoCollection, photoPaths, watermarkObjects }) => {
    const [pictureCollection, setPictureCollection] = useState(photoCollection)
    const [picturePaths, setPicturePaths] = useState<PicturePath[]>(photoPaths)
    const [submitting, setSubmitting] = useState(false)
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>(([] as string[]))
    const [displayPhotoControls, setDisplayPhotoControls] = useState<string | undefined>()
    const [uploadImagesVisible, setUploadImagesVisible] = useState(false)
    const [cover, setCover] = useState(photoCollection.coverPath ?? null)
    const [changesToSave, setChangesToSave] = useState(false)
    const [watermarkVisible, setWatermarkVisible] = useState(false)
    const [watermarks, setWatermarks] = useState<{path: string, url: string }[]>(watermarkObjects)
    const navigate = useNavigate()

    function pictureStyle(url: string, cover: boolean){
        const conditionalBackground = selectedPhotos.includes(url) ? `bg-gray-100 ${cover ? 'border-yellow-300' : 'border-cyan-400'}` : `bg-transparent border-gray-500 ${cover ? 'border-yellow-300' : 'border-gray-500'}`
        return 'relative px-2 py-8 border hover:bg-gray-200 rounded-lg ' + conditionalBackground
    }

    function controlsEnabled(id: string){
        if(id == displayPhotoControls) return 'flex'
        return 'hidden'
    }

    function parseName(path: string){
        return path.substring(path.indexOf('_') + 1)
    }

    async function saveCollection(){
        setSubmitting(true)
        const collectionUpdateResponse = await client.models.PhotoCollection.update({
            id: photoCollection.id,
            coverPath: pictureCollection.coverPath,
            downloadable: pictureCollection.downloadable,
            watermarkPath: pictureCollection.watermarkPath,
        })
        console.log(collectionUpdateResponse)
        
        if(collectionUpdateResponse.data){
            const pathUpdateResponse = await Promise.all((picturePaths ?? []).map(async (path) => {
                return await client.models.PhotoPaths.update({
                    id: path.id,
                    order: path.order,
                })
            }))

            console.log(pathUpdateResponse)
        }

        setChangesToSave(false)
        setSubmitting(false)
    }

    return (
    <>
        <UploadImagesModal 
            open={uploadImagesVisible} 
            onClose={() => setUploadImagesVisible(false)} 
            collection={pictureCollection}
            onSubmit={async (collection) => {
                const paths: PicturePath[] = await Promise.all(collection.paths.map(async (path) => {
                    const mappedPath: PicturePath = {
                        ...path,
                        url: (await getUrl({
                            path: path.path
                        })).url.toString()
                    }
                    return mappedPath
                }))
                setPictureCollection({
                    ...collection,
                    paths: paths,
                })
                setPicturePaths(paths)
            }}
        />
        <WatermarkModal
            open={watermarkVisible}
            onClose={() => setWatermarkVisible(false)}
            collection={pictureCollection}
            paths={picturePaths}
            onCollectionSubmit={(collection) => {
                const temp = {...collection}
                setPictureCollection(temp)
            }}
            onWatermarkUpload={(paths) => {
                const temp = [...paths]
                setWatermarks(temp)
            }}
            watermarks={watermarks}
        />
        <div className="grid grid-cols-6 gap-2">
            <div className="grid grid-cols-5 col-span-5 border-gray-400 border rounded-2xl p-4 gap-4">
                    {picturePaths.length > 0 ? 
                    picturePaths.filter((path) => path.url).map((path, index) => {
                        const coverSelected = parseName(path.path) === parseName(cover ?? '')
                        const coverSelectedStyle = `${coverSelected ? 'fill-yellow-300' : ''}`

                        let img = document.createElement('img')
                        img.src = path.url!

                        const portrait = (img.naturalHeight / img.naturalWidth) > 1

                        return (
                            <button 
                                disabled={submitting}
                                key={index} 
                                className={pictureStyle(path.url, coverSelected)} id='image-container'
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
                                <img src={path.url} className="object-cover rounded-lg w-[200px] h-[300px] justify-self-center " id='image'/>
                                <div className={`absolute bottom-0 inset-x-0 justify-end flex-row gap-1 me-3 ${controlsEnabled(path.id)}`}>
                                    <Tooltip content={(<p>{portrait ? 'Will display as portait' : 'Will display as landscape'}</p>)} placement="bottom" className="w-[150px]">
                                        {portrait ? (
                                            <TbCircleLetterPFilled size={20} />
                                        ) : (
                                            <TbCircleLetterLFilled size={20} />
                                        )}
                                    </Tooltip>
                                    <Tooltip content={(<p>Set as cover</p>)} placement="bottom" className="w-[110px]">
                                        <button className="" disabled={submitting} onClick={async () => {
                                            if(coverSelected) {
                                                setCover(null)
                                                setChangesToSave(true)
                                            } else {
                                                setCover(path.path)
                                                setChangesToSave(true)
                                            }
                                        }}>
                                            <HiOutlineStar className={coverSelectedStyle} size={20} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={(<p>Move to Top</p>)} placement="bottom" className="w-[110px]">
                                        <button className="" disabled={submitting} onClick={async () => {
                                            const temp = [path, ...picturePaths.filter((p) => p.id !== path.id)].map((path, index) => {
                                                return {
                                                    ...path,
                                                    order: index,
                                                }
                                            })
                                            setPicturePaths(temp)
                                            setChangesToSave(true)
                                        }}>
                                            <HiOutlineBarsArrowUp size={20} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={(<p>Move to Bottom</p>)} placement="bottom" className="w-[130px]">
                                        <button className="" disabled={submitting} onClick={async () => {
                                            const temp = [...picturePaths.filter((p) => p.id !== path.id), path].map((path, index) => {
                                                return {
                                                    ...path,
                                                    order: index,
                                                }
                                            })
                                            setPicturePaths(temp)
                                            setChangesToSave(true)
                                        }}><HiOutlineBarsArrowDown size={20} /></button>
                                    </Tooltip>
                                    <Tooltip content='Delete' placement="bottom">
                                        <button className="" disabled={submitting} onClick={async () => {
                                            const s3response = await remove({
                                                path: path.path
                                            })
                                            console.log(s3response)
                                            const pathsresponse = await client.models.PhotoPaths.delete({
                                                id: path.id,
                                            })
                                            console.log(pathsresponse)
                                            setPicturePaths(picturePaths.filter((item) => item.id !== path.id))
                                        }}>
                                            <HiOutlineTrash size={20} />
                                        </button>
                                    </Tooltip>
                                </div>
                                <div className={`absolute top-1 inset-x-0 justify-center flex-row ${controlsEnabled(path.id)}`}>
                                    <p id="image-name">{parseName(path.path)}</p>
                                </div>
                            </button>
                        )
                    }) : (<p>Upload Pictures to Start!</p>)}
            </div>
            <div className="flex flex-col col-span-1 border-gray-400 border rounded-2xl items-center gap-4 py-3 me-2">
                <p className="text-2xl underline">Controls</p>
                <ControlComponent name="Upload Picture" fn={() => setUploadImagesVisible(true)} />
                <ControlComponent name="Save Changes" fn={() => saveCollection()} disabled={!changesToSave} isProcessing={submitting} />
                <ControlComponent name="Preview" fn={() => navigate(`/photo-collection/${photoCollection.id}`, { state: { origin: 'admin' }})} />
                <ControlComponent name='Downloadable' fn={() => {
                    const temp = {...pictureCollection}
                    temp.downloadable = !temp.downloadable
                    setPictureCollection(temp)
                    setChangesToSave(true)
                }} className={pictureCollection.downloadable ? 'bg-green-200 text-green-800' : ''} />
                <ControlComponent name='Watermark' fn={() => setWatermarkVisible(true)} />
            </div>
        </div>        
    </>
)
}



