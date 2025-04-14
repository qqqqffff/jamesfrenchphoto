import { Dispatch, FC, SetStateAction, useCallback, useState } from "react"
import { PhotoCollection, PhotoSet, PicturePath } from "../../../types"
import { 
  HiOutlineCog6Tooth,
  HiOutlineExclamationTriangle,
  HiOutlineTrash
} from "react-icons/hi2";
import { Alert, Dropdown, FlowbiteColors, TextInput, ToggleSwitch, Tooltip } from "flowbite-react";
import { ConfirmationModal, UploadImagesModal } from "../../modals";
import { DynamicStringEnumKeysOf, parsePathName, textInputTheme } from "../../../utils";
import { SetControls } from "./SetControls";
import { EditableTextField } from "../../common/EditableTextField";
import { useMutation } from "@tanstack/react-query";
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
import { detectDuplicates } from "./utils";
import { useDropzone } from "react-dropzone";
import { UploadData, UploadToast } from "../../modals/UploadImages/UploadToast";
import { AuthContext } from "../../../auth";
import { PictureList } from "./PictureTable/PictureList";

export type PhotoSetPanelProps = {
  photoCollection: PhotoCollection;
  photoSet: PhotoSet;
  paths: PicturePath[],
  deleteParentSet: (setId: string) => void,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>,
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>,
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  auth: AuthContext
}

export const PhotoSetPanel: FC<PhotoSetPanelProps> = ({ 
  photoCollection, photoSet, 
  paths, deleteParentSet, parentUpdateSet,
  parentUpdateCollection, auth, parentUpdateCollections
}) => {
  const [picturePaths, setPicturePaths] = useState(paths)
  const [searchText, setSearchText] = useState<string>('')
  const [selectedPhotos, setSelectedPhotos] = useState<PicturePath[]>([])
  const [displayPhotoControls, setDisplayPhotoControls] = useState<string | undefined>()
  const [displayTitleOverride, setDisplayTitleOverride] = useState(false)
  const [notification, setNotification] = useState<{text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>}>()
  const [filesUploading, setFilesUploading] = useState<Map<string, File> | undefined>()
  const [uploads, setUploads] = useState<UploadData[]>([])
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)

  const updateSet = useMutation({
    mutationFn: (params: UpdateSetParams) => updateSetMutation(params),
  })

  function pictureStyle(id: string){
    const conditionalBackground = selectedPhotos.find((path) => path.id === id) !== undefined ? 
    `bg-gray-100 border-cyan-400` : `bg-transparent border-gray-500`
    return 'relative px-8 py-8 border hover:bg-gray-200 rounded-lg focus:ring-transparent min-w-max ' + conditionalBackground
  }

  function controlsEnabled(id: string, override: boolean){
    if(id == displayPhotoControls || override) return 'flex'
    return 'hidden'
  }

  let activeTimeout: NodeJS.Timeout | undefined

  const duplicates = detectDuplicates(picturePaths)

  const deleteImages = useMutation({
    mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
  })

  const uploadImages = useMutation({
    mutationFn: (params: UploadImagesMutationParams) => uploadImagesMutation(params),
    onSettled: () => {
      const temp: PhotoCollection = {
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
      }
      parentUpdateCollection(temp)
      parentUpdateCollections((prev) => {
        const pTemp = [...prev]

        return pTemp.map((col) => {
          if(col.id === temp.id) return temp
          return col
        })
      })
    }
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

      tempFiles = tempFiles.filter((path) => {
        console.log(parsePathName(path.path), trimmedText)
        return parsePathName(path.path)
          .trim()
          .toLocaleLowerCase()
          .includes(trimmedText)
      })
    }

    tempFiles.push({
      id: 'upload',
      path: '1',
      url: '',
      order: tempFiles.length,
    })

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
        parentUpdateSet={parentUpdateSet}
        parentUpdateCollection={parentUpdateCollection}
        parentUpdateCollections={parentUpdateCollections}
        onClose={() => setFilesUploading(undefined)}
        open={filesUploading !== undefined}
      />
    }
    <UploadToast 
      uploads={uploads}
      setUploads={setUploads}
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
        collection={photoCollection}
        set={photoSet}
        paths={picturePaths}
        parentUpdatePaths={setPicturePaths}
        parentUpdateSet={parentUpdateSet}
        parentUpdateCollection={parentUpdateCollection}
        parentUpdateCollections={parentUpdateCollections}
        selectedPhotos={selectedPhotos} 
        parentUpdateSelectedPhotos={setSelectedPhotos}
      />
    )}
    <div className="border-gray-400 border rounded-2xl p-4 flex flex-col items-center w-full">
      <div className="grid w-full grid-cols-3">
        <EditableTextField 
          className="text-xl"
          label={(<span className="text-nowrap text-xl">{`Photo Set: `}</span>)} 
          text={photoSet.name} 
          onSubmitText={(text) => {
            updateSet.mutate({
              set: photoSet,
              name: text,
              order: photoSet.order,
              options: {
                logging: true
              }
            })
            const tempSet: PhotoSet = {
              ...photoSet,
              name: text
            }

            const tempCollection: PhotoCollection = {
              ...photoCollection,
              sets: photoCollection.sets.map((set) => {
                if(set.id === photoSet.id) {
                  return tempSet
                }
                return set
              })
            }
            parentUpdateSet(tempSet)
            parentUpdateCollection(tempCollection)
            parentUpdateCollections((prev) => {
              const temp = [...prev]

              return temp.map((col) => {
                if(col.id === tempCollection.id) return tempCollection
                return col
              })
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
          className="w-full max-w-[400px] place-self-center mb-2" 
          placeholder="Search"
          onChange={(event) => {
            setSearchText(event.target.value)
          }}
          value={searchText}
        />
        <div className="flex flex-row items-center gap-3 place-self-end h-full mb-1">
          <span>Items: {picturePaths.length}</span>
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
        <PictureList 
          collection={photoCollection}
          set={photoSet}
          paths={filteredPhotos
            .sort((a, b) => a.order - b.order)
            .filter((path) => path.path && path.id)
          }
          parentUpdatePaths={setPicturePaths}
          parentUpdateSet={parentUpdateSet}
          parentUpdateCollection={parentUpdateCollection}
          parentUpdateCollections={parentUpdateCollections}
          pictureStyle={pictureStyle}
          selectedPhotos={selectedPhotos}
          setSelectedPhotos={setSelectedPhotos}
          setDisplayPhotoControls={setDisplayPhotoControls}
          controlsEnabled={controlsEnabled}
          displayTitleOverride={displayTitleOverride}
          notify={(text, color) => {
            setNotification({text, color})
            clearTimeout(activeTimeout)
            activeTimeout = setTimeout(() => {
              setNotification(undefined)
              activeTimeout = undefined
            }, 5000)
          }}
          setFilesUploading={setFilesUploading}
          userEmail={auth.user?.profile.email}
        />
      </div>
    </div>
  </>
)}
