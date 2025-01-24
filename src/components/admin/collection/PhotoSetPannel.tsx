import { FC, useRef, useState } from "react"
import { PhotoCollection, PhotoSet, PicturePath, Watermark } from "../../../types"
import { 
    HiOutlineCog6Tooth,
    HiOutlineInformationCircle,
    HiOutlineTrash
} from "react-icons/hi2";
import { Alert, Dropdown, FlowbiteColors, ToggleSwitch, Tooltip } from "flowbite-react";
import { WatermarkModal } from "../../modals";
import { FixedSizeGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import useWindowDimensions from "../../../hooks/windowDimensions";
import { DynamicStringEnumKeysOf } from "../../../utils";
import { SetControls } from "./SetControls";
import { SetRow } from "./SetRow";
import { EditableTextField } from "../../common/EditableTextField";
import { useMutation, useQueries } from "@tanstack/react-query";
import { deleteImagesMutation, DeleteImagesMutationParams, updateSetMutation, UpdateSetParams } from "../../../services/photoSetService";
import { getPathQueryOptions } from "../../../services/collectionService";
import { detectDuplicates } from "./utils";

export type PhotoCollectionProps = {
    photoCollection: PhotoCollection;
    photoSet: PhotoSet;
    watermarkObjects: Watermark[],
    paths: PicturePath[],
    parentUpdateSet: (updatedSet: PhotoSet) => void
}

export const PhotoSetPannel: FC<PhotoCollectionProps> = ({ photoCollection, photoSet, watermarkObjects, paths, parentUpdateSet }) => {
    const gridRef = useRef<FixedSizeGrid>(null)
    const [picturePaths, setPicturePaths] = useState(paths)
    const [pictureCollection, setPictureCollection] = useState(photoCollection)
    const [selectedPhotos, setSelectedPhotos] = useState<PicturePath[]>([])
    const [displayPhotoControls, setDisplayPhotoControls] = useState<string | undefined>()
    const [cover, setCover] = useState(photoSet.coverPath)
    const [watermarkVisible, setWatermarkVisible] = useState(false)
    const [watermarks, setWatermarks] = useState<Watermark[]>(watermarkObjects)
    const [displayTitleOverride, setDisplayTitleOverride] = useState(false)
    const [notification, setNotification] = useState<{text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>}>()

    const dimensions = useWindowDimensions()

    const updateSet = useMutation({
        mutationFn: (params: UpdateSetParams) => updateSetMutation(params),
    })

    function pictureStyle(id: string, cover: boolean){
        const conditionalBackground = selectedPhotos.find((path) => path.id === id) !== undefined ? 
        `bg-gray-100 ${cover ? 'border-yellow-300' : 'border-cyan-400'}` : `bg-transparent border-gray-500 ${cover ? 'border-yellow-300' : 'border-gray-500'}`
        return 'relative px-2 py-8 border hover:bg-gray-200 rounded-lg focus:ring-transparent ' + conditionalBackground
    }

    function controlsEnabled(id: string, override: boolean){
        if(id == displayPhotoControls || override) return 'flex'
        return 'hidden'
    }

    let activeTimeout: NodeJS.Timeout | undefined

    const pathUrls = useQueries({
        queries: picturePaths.map((path) => {
            return getPathQueryOptions(path.path)
        })
    })

    const duplicates = detectDuplicates(picturePaths)

    const deleteImages = useMutation({
        mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
    })

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
        {selectedPhotos.length > 0 && (
            <SetControls 
                collection={pictureCollection}
                photos={picturePaths}
                setPhotos={setPicturePaths}
                selectedPhotos={selectedPhotos} 
                setSelectedPhotos={setSelectedPhotos}
                gridRef={gridRef}
            />
        )}
        <div className="border-gray-400 border rounded-2xl p-4 flex flex-col items-center w-full">
            <div className="flex flex-row items-center justify-between w-full">
                <EditableTextField 
                    label={(<span>{`Photo Set: `}</span>)} 
                    text={photoSet.name} 
                    onSubmitText={(text) => {
                        updateSet.mutate({
                            set: photoSet,
                            coverPath: photoSet.coverPath,
                            name: text,
                            order: photoSet.order,
                            options: {
                                logging: true
                            }
                        })
                        parentUpdateSet({
                            ...photoSet,
                            name: text
                        })
                    }} 
                    onSubmitError={(message) => {
                        setNotification({text: message, color: 'red'})
                        clearTimeout(activeTimeout)
                        activeTimeout = setTimeout(() => {
                            setNotification(undefined)
                            activeTimeout = undefined
                        }, 5000)
                    }}
                />
                <div className="flex flex-row items-center gap-3">
                    <Tooltip style='light' content={(
                        <div className="flex flex-col">
                            <span>Items: {photoSet.paths.length}</span>
                            {duplicates.length > 0 && (
                                <span className="text-yellow-400 flex flex-row items-center">
                                    Found Duplicate(s)
                                    <Tooltip content='Delete Duplicates'>
                                        <button
                                            onClick={() => {
                                                deleteImages.mutate({
                                                    collection: photoCollection,
                                                    picturePaths: duplicates
                                                })
                                                setPicturePaths(picturePaths.filter((path) => {
                                                    return (duplicates.find((dup) => dup.id === path.id) === undefined)
                                                }))
                                            }}
                                        >
                                            <HiOutlineTrash size={16} className="mt-1.5"/>
                                        </button>
                                    </Tooltip>
                                </span>
                            )}
                        </div>
                    )}>
                        <HiOutlineInformationCircle size={24}/>
                    </Tooltip>
                    <Tooltip content="Photo Set Settings">
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
                            <Dropdown.Item 
                                onClick={() => {
                                    const index = picturePaths.findIndex((path) => {
                                        return path.path === cover
                                    })
                                    if(index === -1) {
                                        setNotification({text: 'No Cover Photo', color: 'red'})
                                        clearTimeout(activeTimeout)
                                        activeTimeout = setTimeout(() => {
                                            setNotification(undefined)
                                            activeTimeout = undefined
                                        }, 5000)
                                        return
                                    }
                                    gridRef.current?.scrollToItem({
                                        rowIndex: (index / 4)
                                    })
                                }}
                            >
                                Go To Cover
                            </Dropdown.Item>
                        </Dropdown>
                    </Tooltip>
                    
                </div>
                
            </div>
            <div className="w-full border border-gray-200 my-2"></div>
            <div className="relative z-10 w-full flex flex-row items-center justify-center">
                {notification && (
                    <Alert color={notification.color} className="text-lg w-[90%] absolute mt-16" onDismiss={() => setNotification(undefined)}>{notification.text}</Alert>
                )}
            </div>
            <AutoSizer className='w-full self-center' style={{ minHeight: `${dimensions.height - 350}px`}}>
                {({ height, width }: { height: number; width: number }) => {
                return (
                    <FixedSizeGrid
                        ref={gridRef}
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
                            collection: photoCollection,
                            set: photoSet,
                            data: picturePaths
                                .sort((a, b) => a.order - b.order)
                                .filter((path) => path.path && path.id),
                            urls: pathUrls,
                            cover,
                            pictureStyle,
                            selectedPhotos,
                            setSelectedPhotos,
                            setDisplayPhotoControls,
                            controlsEnabled,
                            setCover,
                            setPicturePaths,
                            displayTitleOverride,
                            notify: (text, color) => {
                                setNotification({text, color})
                                clearTimeout(activeTimeout)
                                activeTimeout = setTimeout(() => {
                                    setNotification(undefined)
                                    activeTimeout = undefined
                                }, 5000)
                            },
                        }}
                    >
                        {SetRow}
                    </FixedSizeGrid>)}}
            </AutoSizer>
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


