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
import { FixedSizeGrid, GridChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import useWindowDimensions from "../../hooks/windowDimensions";

export type PhotoCollectionProps = {
    photoCollection: PhotoCollection;
    photoPaths: PicturePath[];
    watermarkObjects: {
        path: string,
        url: string
    }[]
}

const client = generateClient<Schema>()

interface RowProps extends GridChildComponentProps {
    data: {
        data: PicturePath[],
        cover: string | null,
        parseName: (path: string) => string 
        pictureStyle: (path: string, selected: boolean) => string
        submitting: boolean
        selectedPhotos: string[]
        setSelectedPhotos: (photos: string[]) => void
        setDisplayPhotoControls: (id: string | undefined) => void
        controlsEnabled: (id: string, override: boolean) => string
        setCover: (path: string | null) => void
        setChangesToSave: (changes: boolean) => void
        setPicturePaths: (paths: PicturePath[]) => void
        displayTitleOverride: boolean,
    }
}

const Row: FC<RowProps> = ({ columnIndex, rowIndex, data, style }) => {
    const index = columnIndex + 4 * rowIndex
    if(!data.data[index]) return (<>Failed to Load</>)
    const coverSelected = data.parseName(data.data[index].path) === data.parseName(data.cover ?? '')
    const coverSelectedStyle = `${coverSelected ? 'fill-yellow-300' : ''}`

    let img = document.createElement('img')
    img.src = data.data[index].url!

    const portrait = (img.naturalHeight / img.naturalWidth) > 1

    return (
        <button 
            style={{
                ...style,
                width: Number(style.width ?? 0) - 20,
                height: Number(style.height ?? 0) - 20,
            }}
            disabled={data.submitting}
            key={index} 
            className={data.pictureStyle(data.data[index].url, coverSelected)} id='image-container'
            onClick={(event) => {
                if((event.target as HTMLElement).id.includes('image')){
                    if(data.selectedPhotos.includes(data.data[index].url)){
                        data.setSelectedPhotos(data.selectedPhotos.filter((url) => url != data.data[index].url))
                    }
                    else{
                        const temp = [...data.selectedPhotos]
                        temp.push(data.data[index].url)
                        data.setSelectedPhotos(temp)
                    }
                }
            }}
            onMouseEnter={() => {
                data.setDisplayPhotoControls(data.data[index].id)
            }}  
            onMouseLeave={() => {
                data.setDisplayPhotoControls(undefined)
            }}
        >
            <img src={data.data[index].url} className="object-cover rounded-lg w-[200px] h-[300px] justify-self-center " id='image'/>
            <div className={`absolute bottom-0 inset-x-0 justify-end flex-row gap-1 me-3 ${data.controlsEnabled(data.data[index].id, false)}`}>
                <Tooltip content={(<p>{portrait ? 'Will display as portait' : 'Will display as landscape'}</p>)} placement="bottom" className="w-[150px]">
                    {portrait ? (
                        <TbCircleLetterPFilled size={20} />
                    ) : (
                        <TbCircleLetterLFilled size={20} />
                    )}
                </Tooltip>
                <Tooltip content={(<p>Set as cover</p>)} placement="bottom" className="w-[110px]">
                    <button className="" disabled={data.submitting} onClick={async () => {
                        if(coverSelected) {
                            data.setCover(null)
                            data.setChangesToSave(true)
                        } else {
                            data.setCover(data.data[index].path)
                            data.setChangesToSave(true)
                        }
                    }}>
                        <HiOutlineStar className={coverSelectedStyle} size={20} />
                    </button>
                </Tooltip>
                <Tooltip content={(<p>Move to Top</p>)} placement="bottom" className="w-[110px]">
                    <button className="" disabled={data.submitting} onClick={async () => {
                        const temp = [data.data[index], ...data.data.filter((p) => p.id !== data.data[index].id)].map((path, index) => {
                            return {
                                ...path,
                                order: index,
                            }
                        })
                        data.setPicturePaths(temp)
                        data.setChangesToSave(true)
                    }}>
                        <HiOutlineBarsArrowUp size={20} />
                    </button>
                </Tooltip>
                <Tooltip content={(<p>Move to Bottom</p>)} placement="bottom" className="w-[130px]">
                    <button className="" disabled={data.submitting} onClick={async () => {
                        const temp = [...data.data.filter((p) => p.id !== data.data[index].id), data.data[index]].map((path, index) => {
                            return {
                                ...path,
                                order: index,
                            }
                        })
                        data.setPicturePaths(temp)
                        data.setChangesToSave(true)
                    }}><HiOutlineBarsArrowDown size={20} /></button>
                </Tooltip>
                <Tooltip content='Delete' placement="bottom">
                    <button className="" disabled={data.submitting} onClick={async () => {
                        const s3response = await remove({
                            path: data.data[index].path
                        })
                        console.log(s3response)
                        const pathsresponse = await client.models.PhotoPaths.delete({
                            id: data.data[index].id,
                        })
                        console.log(pathsresponse)
                        data.setPicturePaths(data.data.filter((item) => item.id !== data.data[index].id))
                    }}>
                        <HiOutlineTrash size={20} />
                    </button>
                </Tooltip>
            </div>
            <div className={`absolute top-1 inset-x-0 justify-center flex-row ${data.controlsEnabled(data.data[index].id, data.displayTitleOverride)}`}>
                <p id="image-name">{data.parseName(data.data[index].path)}</p>
            </div>
        </button>
    )
}

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
    const [displayTitleOverride, setDisplayTitleOverride] = useState(false)
    const [deleteSubmitting, setDeleteSubmitting] = useState(false)
    const dimensions = useWindowDimensions()
    const navigate = useNavigate()

    function pictureStyle(url: string, cover: boolean){
        const conditionalBackground = selectedPhotos.includes(url) ? `bg-gray-100 ${cover ? 'border-yellow-300' : 'border-cyan-400'}` : `bg-transparent border-gray-500 ${cover ? 'border-yellow-300' : 'border-gray-500'}`
        return 'relative px-2 py-8 border hover:bg-gray-200 rounded-lg ' + conditionalBackground
    }

    function controlsEnabled(id: string, override: boolean){
        if(id == displayPhotoControls || override) return 'flex'
        return 'hidden'
    }

    function parseName(path: string){
        return path.substring(path.indexOf('_') + 1)
    }

    async function saveCollection(){
        setSubmitting(true)
        const collectionUpdateResponse = await client.models.PhotoCollection.update({
            id: photoCollection.id,
            coverPath: cover,
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

    const gridClass = `w-full self-center`

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
            <div className="border-gray-400 border rounded-2xl p-4 col-span-5 flex flex-col items-center">
                <span className="text-2xl mb-4">{pictureCollection.name}</span>
                {picturePaths.length > 0 ? 
                    <AutoSizer className={gridClass} style={{ minHeight: `${dimensions.height - 350}px`}}>
                        {({ height, width }: { height: number; width: number }) => {
                            console.log(width)
                        return (
                            <FixedSizeGrid
                                style={{
                                    left: -(940 / 2),
                                }}
                                height={height - 50}
                                rowCount={Number(Number(picturePaths.length / 4).toFixed(1)) + 1}
                                columnCount={4}
                                rowHeight={400}
                                width={width - (width - 940 - ((width - 940)/2 + 10))}
                                columnWidth={240}
                                itemData={{
                                    data: picturePaths
                                        .sort((a, b) => a.order - b.order)
                                        .filter((path) => path.url && path.path && path.id),
                                    cover,
                                    parseName,
                                    pictureStyle,
                                    submitting,
                                    selectedPhotos,
                                    setSelectedPhotos,
                                    setDisplayPhotoControls,
                                    controlsEnabled,
                                    setCover,
                                    setChangesToSave,
                                    setPicturePaths,
                                    displayTitleOverride,
                                }}
                            >
                                {Row}
                            </FixedSizeGrid>)}}
                    </AutoSizer>
                : (<p>Upload Pictures to Start!</p>)}
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
                <ControlComponent name={displayTitleOverride ? 'Hide Photo Titles' : 'Show Photo Titles'} fn={() => setDisplayTitleOverride(!displayTitleOverride)} />
                <ControlComponent name='Delete Selected' disabled={selectedPhotos.length <= 0} fn={async () => {
                    setDeleteSubmitting(true)
                    const removalPaths = picturePaths
                        .filter((path) => selectedPhotos.find((photo) => path.url == photo) !== undefined)
                    const updatedPaths = picturePaths
                        .filter((path) => selectedPhotos.find((photo) => path.url == photo) === undefined)
                        .sort((a, b) => a.order - b.order)
                        .map((path, index) => ({...path, order: index}))
                    const temp = pictureCollection

                    const updateResponses = await Promise.all(updatedPaths.map(async (path) => {
                        const updateResponse = await client.models.PhotoPaths.update({
                            id: path.id,
                            order: path.order
                        })
                        return updateResponse
                    }))

                    console.log(updateResponses)

                    const deleteResponses = await Promise.all(removalPaths.map(async (path) => {
                        const removePathResponse = await client.models.PhotoPaths.delete({ id: path.id })
                        if(pictureCollection.coverPath === path.path){
                            const updateCollection = await client.models.PhotoCollection.update({
                                id: pictureCollection.id,
                                coverPath: null,
                            })
                            console.log(updateCollection)
                            temp.coverPath = undefined
                        }
                        const removeS3Response = await remove({
                            path: path.path
                        })
                        return {
                            s3: removeS3Response,
                            table: removePathResponse
                        }
                    }))

                    console.log(deleteResponses)

                    setSelectedPhotos([])
                    setDeleteSubmitting(false)
                    setPicturePaths(updatedPaths)
                    setPictureCollection(temp)
                }} isProcessing={deleteSubmitting}/>
            </div>
        </div>        
    </>
)
}



