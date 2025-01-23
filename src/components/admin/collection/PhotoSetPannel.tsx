import { FC, useRef, useState } from "react"
import { PhotoCollection, PhotoSet, PicturePath, Watermark } from "../../../types"
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { Alert, Dropdown, FlowbiteColors, ToggleSwitch } from "flowbite-react";
import { WatermarkModal } from "../../modals";
import { FixedSizeGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import useWindowDimensions from "../../../hooks/windowDimensions";
import { DynamicStringEnumKeysOf } from "../../../utils";
import { SetControls } from "./SetControls";
import { SetRow } from "./SetRow";

export type PhotoCollectionProps = {
    photoCollection: PhotoCollection;
    photoSet: PhotoSet;
    watermarkObjects: Watermark[],
    paths: PicturePath[]
}

export const PhotoSetPannel: FC<PhotoCollectionProps> = ({ photoCollection, photoSet, watermarkObjects, paths }) => {
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

    function pictureStyle(id: string, cover: boolean){
        const conditionalBackground = selectedPhotos.find((path) => path.id === id) !== undefined ? 
        `bg-gray-100 ${cover ? 'border-yellow-300' : 'border-cyan-400'}` : `bg-transparent border-gray-500 ${cover ? 'border-yellow-300' : 'border-gray-500'}`
        return 'relative px-2 py-8 border hover:bg-gray-200 rounded-lg focus:ring-transparent ' + conditionalBackground
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
        {selectedPhotos.length > 0 && (
            <SetControls 
                collection={pictureCollection}
                photos={picturePaths}
                setPhotos={setPicturePaths}
                selectedPhotos={selectedPhotos} 
                setSelectedPhotos={setSelectedPhotos}
            />
        )}
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


