import { Dispatch, FC, SetStateAction, useCallback, useRef, useState } from "react"
import { PhotoCollection, PhotoSet, PicturePath, Watermark } from "../../../types"
import { 
  HiOutlineCog6Tooth,
  HiOutlineExclamationTriangle,
  HiOutlineTrash
} from "react-icons/hi2";
import { Alert, Dropdown, FlowbiteColors, TextInput, ToggleSwitch, Tooltip } from "flowbite-react";
import { ConfirmationModal, UploadImagesModal, WatermarkModal } from "../../modals";
import { FixedSizeGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import useWindowDimensions from "../../../hooks/windowDimensions";
import { DynamicStringEnumKeysOf, parsePathName, textInputTheme } from "../../../utils";
import { SetControls } from "./SetControls";
import { SetRow } from "./SetRow";
import { EditableTextField } from "../../common/EditableTextField";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  deleteImagesMutation, 
  DeleteImagesMutationParams, 
  deleteSetMutation, 
  DeleteSetMutationParams, 
  updateSetMutation, 
  UpdateSetParams, 
  uploadImagesMutation, 
  UploadImagesMutationParams
} from "../../../services/photoSetService";
import { getPathQueryOptions } from "../../../services/collectionService";
import { detectDuplicates } from "./utils";
import { useDropzone } from "react-dropzone";
import { UploadData, UploadToast } from "../../modals/UploadImages/UploadToast";

export type PhotoCollectionProps = {
  photoCollection: PhotoCollection;
  photoSet: PhotoSet;
  watermarkObjects: Watermark[],
  paths: PicturePath[],
  deleteParentSet: (setId: string) => void,
  parentUpdateSet: (updatedSet: PhotoSet) => void,
  updateParentCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
}

export const PhotoSetPannel: FC<PhotoCollectionProps> = ({ 
  photoCollection, photoSet, watermarkObjects, 
  paths, deleteParentSet, parentUpdateSet,
  updateParentCollection
}) => {
  const gridRef = useRef<FixedSizeGrid>(null)
  const [picturePaths, setPicturePaths] = useState(paths)
  const [pictureCollection, setPictureCollection] = useState(photoCollection)
  const [searchText, setSearchText] = useState<string>('')
  const [selectedPhotos, setSelectedPhotos] = useState<PicturePath[]>([])
  const [displayPhotoControls, setDisplayPhotoControls] = useState<string | undefined>()
  const [cover, setCover] = useState(photoSet.coverPath)
  const [watermarkVisible, setWatermarkVisible] = useState(false)
  const [watermarks, setWatermarks] = useState<Watermark[]>(watermarkObjects)
  const [displayTitleOverride, setDisplayTitleOverride] = useState(false)
  const [notification, setNotification] = useState<{text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>}>()
  const [filesUploading, setFilesUploading] = useState<Map<string, File> | undefined>()
  const [uploads, setUploads] = useState<UploadData[]>([])
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)

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

  const pathUrls = picturePaths
    .sort((a, b) => a.order - b.order)
    .map((path) => {
      return ({
        id: path.id,
        url: useQuery(getPathQueryOptions(path.path))
      })
    })

  const duplicates = detectDuplicates(picturePaths)

  const deleteImages = useMutation({
    mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
  })

  const uploadImages = useMutation({
    mutationFn: (params: UploadImagesMutationParams) => uploadImagesMutation(params),
    onSettled: () => updateParentCollection({
      ...photoCollection,
      items: photoCollection.sets.reduce((prev, cur) => {
        if(cur.id === photoSet.id){
          return prev += picturePaths.length
        }
        return prev += cur.paths.length
      }, 0),
      sets: photoCollection.sets.map((set) => {
        if(set.id === photoSet.id){
          return {
            ...set,
            paths: picturePaths
          }
        }
        return set
      })
    })
  })

  const deleteSet = useMutation({
    mutationFn: (params: DeleteSetMutationParams) => deleteSetMutation(params)
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const fileMap = new Map<string, File>()
    acceptedFiles.forEach((file) => {
      fileMap.set(file.name, file)
    })
    setFilesUploading(fileMap)
  }, [])

  const {getRootProps, getInputProps, isDragActive} = useDropzone({ 
    noClick: true, 
    onDrop, 
    accept: {
      'image/jpg': ['.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp'],
      'image/png': ['.png'],
      'image/avif': ['.avif']
    }
  })

  const filteredPhotos = (() => {
    let tempFiles = [...picturePaths]

    if(searchText){
      const trimmedText = searchText.trim().toLocaleLowerCase()

      return tempFiles.filter((path) => {
        console.log(parsePathName(path.path), trimmedText)
        return parsePathName(path.path)
          .trim()
          .toLocaleLowerCase()
          .includes(trimmedText)
      })
    }

    return tempFiles
  })()

  return (
  <>
    {filesUploading && 
      <UploadImagesModal 
        collection={photoCollection}
        set={photoSet}
        files={filesUploading}
        createUpload={(upload) => {
          const temp: UploadData[] = [...uploads, {
            id: upload.uploadId,
            state: 'inprogress',
            progress: 0,
            currentItems: 0,
            totalItems: upload.files.size,
            totalSize: upload.totalUpload,
            display: true,
          }]
          uploadImages.mutate(upload)
          setUploads(temp)
        }}
        updateUpload={setUploads}
        updatePicturePaths={setPicturePaths}
        onClose={() => setFilesUploading(undefined)}
        open={filesUploading !== undefined}
      />
    }
    <UploadToast 
      uploads={uploads}
      setUploads={setUploads}
    />
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
    <ConfirmationModal 
      title='Delete Set'
      body='This action will <b>DELETE</b> this set <b>AND</b> any associated pictures. This action cannot be undone!'
      denyText="Cancel"
      confirmText="Delete"
      confirmAction={() => {
        deleteParentSet(photoSet.id)
        setDeleteConfirmation(false)
        deleteSet.mutate({
          collection: photoCollection,
          set: photoSet,
          options: {
            logging: true
          }
        })
      }}
      onClose={() => setDeleteConfirmation(false)}
      open={deleteConfirmation}
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
      <div className="grid grid-cols-3 w-full">
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
        <TextInput 
          theme={textInputTheme} 
          sizing="sm" 
          className="w-full max-w-[400px] place-self-center" 
          placeholder="Search"
          onChange={(event) => {
            setSearchText(event.target.value)
          }}
          value={searchText}
        />
        <div className="flex flex-row items-center gap-3 place-self-end h-full">
          <span>Items: {photoSet.paths.length}</span>
          {duplicates.length > 0 && (
            <Tooltip style='light' content={(
              <div className="flex flex-col">
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
                        setSearchText('')
                      }}
                    >
                      <HiOutlineTrash size={16} className="mt-1.5"/>
                    </button>
                  </Tooltip>
                </span>
              </div>
            )}>
              <HiOutlineExclamationTriangle className='text-yellow-400' size={24}/>
            </Tooltip>
          )}
          <Tooltip content="Photo Set Settings">
            <Dropdown dismissOnClick={false} label={(<HiOutlineCog6Tooth size={24} className="hover:text-gray-600"/>)} inline arrowIcon={false}>
              <Dropdown.Item 
                  onClick={() => setDisplayTitleOverride(!displayTitleOverride)}
                  as='div'
              >
                <ToggleSwitch 
                    checked={displayTitleOverride} 
                    onChange={() => setDisplayTitleOverride(!displayTitleOverride)}
                    label="Display Photo Titles"
                />
              </Dropdown.Item>
              {/* <Dropdown.Item 
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
              </Dropdown.Item> */}
              <Dropdown.Item as='label' htmlFor="setting-upload-file" className="">
                <input 
                  id='setting-upload-file' 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*"
                  {...getInputProps()}
                  onChange={(event) => {
                    if(event.target.files){
                      const files = Array.from(event.target.files)
                      onDrop(files)
                    }
                  }}
                />Upload Pictures
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => setDeleteConfirmation(true)}
                className="text-red-400"
              >
                Delete Set
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
      <div className="w-full p-1 relative" {...getRootProps()}>
        { isDragActive && (
          <div 
            className="absolute w-full h-full items-center justify-center flex flex-col opacity-50 z-10 bg-gray-200 border-2 border-gray-400 border-dashed rounded-lg"
          >
            <span className="opacity-100 font-semibold text-2xl animate-pulse">Drop files here</span>
          </div>
        )}
        <AutoSizer className='w-full self-center' style={{ minHeight: `${dimensions.height - 100}px`}}>
          {({ height, width }: { height: number; width: number }) => {
            return (
              <FixedSizeGrid
                ref={gridRef}
                style={{
                    left: ((width - 940) / 2),
                }}
                height={height}
                rowCount={Number(Number(filteredPhotos.length / 4).toFixed(1)) + 1}
                columnCount={4}
                rowHeight={400}
                width={width - ((width - 940) / 2)}
                columnWidth={240}
                itemData={{
                    collection: photoCollection,
                    set: photoSet,
                    data: filteredPhotos
                      .sort((a, b) => a.order - b.order)
                      .filter((path) => path.path && path.id),
                    urls: pathUrls
                      .filter((path) => {
                        return filteredPhotos.find((filteredPath) => path.id === filteredPath.id) !== undefined
                      }),
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
                    setFilesUploading,
                }}
              >
                {SetRow}
              </FixedSizeGrid>
            )}}
        </AutoSizer>
      </div>
    </div>
  </>
)}
