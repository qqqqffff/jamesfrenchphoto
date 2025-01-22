import { FC, useState } from "react"
import { PhotoCollection, PhotoSet, PicturePath, Watermark } from "../../../types"
import { 
    HiOutlineBarsArrowDown, 
    HiOutlineBarsArrowUp, 
    HiOutlineTrash,
    HiOutlineStar,
    HiOutlineCog6Tooth
} from "react-icons/hi2";
import { Alert, Dropdown, FlowbiteColors, ToggleSwitch, Tooltip } from "flowbite-react";
import { WatermarkModal } from "../../modals";
import { FixedSizeGrid, GridChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import useWindowDimensions from "../../../hooks/windowDimensions";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteImagesMutation, DeleteImagesMutationParams, getAllPicturePathsByPhotoSetQueryOptions, reorderPathsMutation, ReorderPathsParams, updateSetMutation, UpdateSetParams } from "../../../services/photoSetService";
import { DynamicStringEnumKeysOf } from "../../../utils";
import UploadImagePlaceholder from "./UploadImagePlaceholder";

export type PhotoCollectionProps = {
    photoCollection: PhotoCollection;
    photoSet: PhotoSet;
    watermarkObjects: Watermark[],
}

interface RowProps extends GridChildComponentProps {
    data: {
        set: PhotoSet,
        data: PicturePath[],
        cover: string,
        parseName: (path: string) => string 
        pictureStyle: (path: string, selected: boolean) => string
        selectedPhotos: string[]
        setSelectedPhotos: (photos: string[]) => void
        setDisplayPhotoControls: (id: string | undefined) => void
        controlsEnabled: (id: string, override: boolean) => string
        setCover: (path: string) => void
        setPicturePaths: (picturePaths: PicturePath[]) => void,
        displayTitleOverride: boolean,
        notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void
    }
}

const Row: FC<RowProps> = ({ columnIndex, rowIndex, data, style }) => {
    const index = columnIndex + 4 * rowIndex
    if(!data.data[index]) {
        if(data.data[index - 1] !== undefined || index == 0) return (<UploadImagePlaceholder setId={data.set.id}/>)
        return undefined
    }
    const coverSelected = data.parseName(data.data[index].path) === data.parseName(data.cover ?? '')
    const coverSelectedStyle = `${coverSelected ? 'fill-yellow-300' : ''}`

    const deleteMutation = useMutation({
        mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
    })

    const updateSet = useMutation({
        mutationFn: (params: UpdateSetParams) => updateSetMutation(params)
    })

    const rerorderPaths = useMutation({
        mutationFn: (params: ReorderPathsParams) => reorderPathsMutation(params)
    })

    return (
        <button 
            style={{
                ...style,
                width: Number(style.width ?? 0) - 20,
                height: Number(style.height ?? 0) - 20,
            }}
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
                <Tooltip content={(<p>Set as cover</p>)} placement="bottom" className="w-[110px]">
                    <button className="" onClick={async () => {
                        if(!coverSelected) {
                            data.setCover(data.data[index].path)
                            updateSet.mutate({
                                set: data.set,
                                paths: data.data,
                                coverPath: data.data[index].path,
                                name: data.set.name,
                                order: data.set.order,
                            })
                        }
                        else{
                            data.notify('Cover Photo is required!', 'red')
                        }
                    }}>
                        <HiOutlineStar className={coverSelectedStyle} size={20} />
                    </button>
                </Tooltip>
                <Tooltip content={(<p>Move to Top</p>)} placement="bottom" className="w-[110px]">
                    <button className="" onClick={() => {
                        const temp = [data.data[index], ...data.data.filter((p) => p.id !== data.data[index].id)].map((path, index) => {
                            return {
                                ...path,
                                order: index,
                            }
                        })
                        data.setPicturePaths(temp)
                        rerorderPaths.mutate({
                            paths: temp,
                        })
                    }}>
                        <HiOutlineBarsArrowUp size={20} />
                    </button>
                </Tooltip>
                <Tooltip content={(<p>Move to Bottom</p>)} placement="bottom" className="w-[130px]">
                    <button className="" onClick={() => {
                        const temp = [...data.data.filter((p) => p.id !== data.data[index].id), data.data[index]].map((path, index) => {
                            return {
                                ...path,
                                order: index,
                            }
                        })
                        data.setPicturePaths(temp)
                        rerorderPaths.mutate({
                            paths: temp,
                        })
                    }}><HiOutlineBarsArrowDown size={20} /></button>
                </Tooltip>
                <Tooltip content='Delete' placement="bottom">
                    <button className="" onClick={() => {
                        data.setPicturePaths(data.data.filter((path) => path.id !== data.data[index].id))
                        deleteMutation.mutate({
                            picturePaths: [data.data[index]]
                        })
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

const component: FC<PhotoCollectionProps> = ({ photoCollection, photoSet, watermarkObjects }) => {
    const photoPaths = useQuery(getAllPicturePathsByPhotoSetQueryOptions(photoSet.id))

    const [picturePaths, setPicturePaths] = useState(photoPaths.data ?? [])
    const [pictureCollection, setPictureCollection] = useState(photoCollection)
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>(([] as string[]))
    const [displayPhotoControls, setDisplayPhotoControls] = useState<string | undefined>()
    const [cover, setCover] = useState(photoSet.coverPath)
    const [watermarkVisible, setWatermarkVisible] = useState(false)
    const [watermarks, setWatermarks] = useState<{path: string, url: string }[]>(watermarkObjects)
    const [displayTitleOverride, setDisplayTitleOverride] = useState(false)
    const [notification, setNotification] = useState<{text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>}>()

    const dimensions = useWindowDimensions()

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

    return (
    <>
        <WatermarkModal
            open={watermarkVisible}
            onClose={() => setWatermarkVisible(false)}
            collection={pictureCollection}
            paths={picturePaths ?? []}
            onCollectionSubmit={(collection) => {
                const temp = {...collection}
                //TODO: query invalidation
                setPictureCollection(temp)
            }}
            onWatermarkUpload={(paths) => {
                const temp = [...paths]
                //TODO: query invalidation
                setWatermarks(temp)
            }}
            watermarks={watermarks}
        />
        <div className="border-gray-400 border rounded-2xl p-4 flex flex-col items-center w-full">
            <div className="flex flex-row items-center justify-between w-full">
                <span className="text-2xl ms-4 mb-2">Photo Set: <span className="font-thin">{photoSet.name}</span></span>
                <Dropdown dismissOnClick={false} label={(<HiOutlineCog6Tooth size={24} className="hover:text-gray-600"/>)} inline arrowIcon={false}>
                    <Dropdown.Item 
                        onClick={() => setDisplayTitleOverride(!displayTitleOverride)}
                    >
                        <ToggleSwitch 
                            checked={displayTitleOverride} 
                            onChange={() => setDisplayTitleOverride(!displayTitleOverride)}
                            label="Display Photo Titles"
                        />
                    </Dropdown.Item>
                </Dropdown>
            </div>
            <div className="w-full border border-gray-200 my-2"></div>
            <div className="relative">
                {notification && (
                    <Alert color={notification.color} className="text-lg w-[90%] absolute" onDismiss={() => setNotification(undefined)}>{notification.text}</Alert>
                )}
            </div>
            {picturePaths ? (
                <AutoSizer className='w-full self-center' style={{ minHeight: `${dimensions.height - 350}px`}}>
                    {({ height, width }: { height: number; width: number }) => {
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
                                set: photoSet,
                                data: picturePaths
                                    .sort((a, b) => a.order - b.order)
                                    .filter((path) => path.url && path.path && path.id),
                                cover,
                                parseName,
                                pictureStyle,
                                selectedPhotos,
                                setSelectedPhotos,
                                setDisplayPhotoControls,
                                controlsEnabled,
                                setCover,
                                setPicturePaths,
                                displayTitleOverride,
                                notify: (text, color) => setNotification({text, color}),
                            }}
                        >
                            {Row}
                        </FixedSizeGrid>)}}
                </AutoSizer>
            ) : (
                <p 
                    className="hover:underline underline-offset-2 hover:text-gray-600 hover:cursor-pointer" 
                    onClick={() => {}}
                    //TODO: max this do something (connect the uploader)
                >Upload Pictures to Start!</p>
            )}
        </div>
        
            
            {/* <div className="flex flex-col col-span-1 border-gray-400 border rounded-2xl items-center gap-4 py-3 me-2">
                <p className="text-2xl underline">Controls</p>
                <ControlComponent name='Update Collection' fn={() => setUpdateCollection(true)} />
                <ControlComponent name="Save Changes" fn={() => saveCollection()} disabled={!changesToSave} isProcessing={submitting} />
                <ControlComponent name="Preview" fn={() => navigate({ to: `/photo-collection/${photoCollection.id}`})} />
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
            </div> */}
    </>
)
}

export default component


