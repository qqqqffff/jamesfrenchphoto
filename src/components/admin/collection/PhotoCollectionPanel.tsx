import { Dispatch, FC, SetStateAction, useRef, useState } from "react"
import { UserTag, Watermark, PhotoCollection, PhotoSet, ShareTemplate } from "../../../types"
import { useMutation, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query"
import { Dropdown, Label, Tooltip } from "flowbite-react"
import { CollectionThumbnail } from "./CollectionThumbnail"
import { HiOutlineCog6Tooth, HiOutlinePlusCircle, HiOutlineTrash } from "react-icons/hi2"
import { SetList } from "./SetList"
import { ConfirmationModal, CreateCollectionModal } from "../../modals"
import { useNavigate } from "@tanstack/react-router"
import { PhotoSetPanel } from "./PhotoSetPanel"
import { 
  CollectionService,
  DeleteCollectionParams, 
  DeleteCoverParams,  
  PublishCollectionParams, 
  UpdateCollectionParams,  
  UploadCoverParams
} from "../../../services/collectionService"
import Loading from "../../common/Loading"
import { PublishableItems } from "./PublishableItems"
import { AuthContext } from "../../../auth"
import { FavoritePanel } from "./FavoritePanel"
import { HiOutlineUpload } from "react-icons/hi"
import { 
  WatermarkService, 
  DeleteWatermarkParams,
  WatermarkUploadParams 
} from "../../../services/watermarkService"
import { parsePathName } from "../../../utils"
import { WatermarkPanel } from "./WatermarkPanel"
import { SharePanel } from "./SharePanel"
import { 
  ShareService, 
  DeleteShareTemplateParams,  
} from "../../../services/shareService"
import { CgSpinner } from "react-icons/cg"
import { UsersPanel } from "./UsersPanel"
import { UserService } from "../../../services/userService"
import { CoverPanel } from "./CoverPanel"
import { CoverSidePanel } from "./CoverSidePanel"
import { CollectionSidePanelButton } from "./CollectionSidePanelButton"
import { v4 } from 'uuid'
import { PhotoPathService } from "../../../services/photoPathService"
import { PhotoSetService } from "../../../services/photoSetService"

interface PhotoCollectionPanelProps {
  CollectionService: CollectionService,
  PhotoPathService: PhotoPathService,
  PhotoSetService: PhotoSetService,
  ShareService: ShareService,
  UserService: UserService,
  WatermarkService: WatermarkService,
  watermarkObjects: Watermark[],
  updateWatermarkObjects: Dispatch<SetStateAction<Watermark[]>>,
  availableTags: UserTag[],
  collection: PhotoCollection,
  updateParentCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  updateParentCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  set?: PhotoSet,
  auth: AuthContext,
  parentActiveConsole: 'sets' | 'favorites' | 'watermarks' | 'share' | 'users' | 'cover',
  shareTemplates: ShareTemplate[],
  updateShareTemplates: Dispatch<SetStateAction<ShareTemplate[]>>
  coverPath?: UseQueryResult<[string | undefined, string] | undefined, Error>
}

export interface Publishable {
  status: boolean, 
  reason?: string[], 
  warning?: string[]
}

export const PhotoCollectionPanel: FC<PhotoCollectionPanelProps> = ({ 
  CollectionService, watermarkObjects, updateWatermarkObjects, availableTags, collection, 
  set, updateParentCollection, auth, parentActiveConsole, shareTemplates,
  updateShareTemplates, coverPath, updateParentCollections, PhotoPathService,
  PhotoSetService, ShareService, UserService, WatermarkService,
}) => {
  const [selectedWatermark, setSelectedWatermark] = useState<Watermark>()
  const [selectedSet, setSelectedSet] = useState<PhotoSet | undefined>(set)
  const [updateCollectionVisible, setUpdateCollectionVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplate>()
  const [deleteCollectionVisible, setDeleteCollectionVisible] = useState(false)
  const fileUpload = useRef<File | null>(null)
  const [uploadCoverPhotoVisible, setUploadCoverPhotoVisible] = useState(false)
  const [expandTitle, setExpandTitle] = useState(false)

  const [activeConsole, setActiveConsole] = useState<'sets' | 'favorites' | 'watermarks' | 'share' | 'users' | 'cover'>(parentActiveConsole)

  const navigate = useNavigate()

  const deleteImage = useMutation({
    mutationFn: (params: DeleteCoverParams) => CollectionService.deleteCoverMutation(params),
  })

  const updateCollection = useMutation({
    mutationFn: (params: UpdateCollectionParams) => CollectionService.updateCollectionMutation(params)
  })
  
  //TODO: parent state management

  const deleteCollection = useMutation({
    mutationFn: (params: DeleteCollectionParams) => CollectionService.deleteCollectionMutation(params)
  })

  const uploadWatermarks = useMutation({
    mutationFn: (params: WatermarkUploadParams) => WatermarkService.uploadWatermarksMutation(params),
  })

  const deleteWatermark = useMutation({
    mutationFn: (params: DeleteWatermarkParams) => WatermarkService.deleteWatermarkMutation(params), 
  })

  const deleteShareTemplate = useMutation({
    mutationFn: (params: DeleteShareTemplateParams) => ShareService.deleteShareTemplateMutation(params)
  })

  const watermarkPaths = useQueries({
    queries: watermarkObjects.map((watermark) => {
      return CollectionService.getPathQueryOptions(watermark.path, watermark.id)
    })
  })

  const publishCollection = useMutation({
    mutationFn: (params: PublishCollectionParams) => CollectionService.publishCollectionMutation(params),
    onSuccess: (data) => {
      if(data){
        const tempCollection: PhotoCollection = {
          ...collection,
          published: true,
          publicCoverPath: data
        }

        updateParentCollection(tempCollection),
        updateParentCollections((prev) => {
          const temp: PhotoCollection[] = [...prev]

          return temp.map((col) => {
            if(col.id === tempCollection.id) {
              return tempCollection 
            }
            return col
          })
        })
      }
    }
  })

  const participants = useQuery(UserService.getAllParticipantsQueryOptions({ 
    siTags: { },
    siCollections: true
  }))

  const collectionParticipants = useQuery(CollectionService.getAllCollectionParticipantsQueryOptions(collection.id, { siTags: true }))

  const uploadCover = useMutation({
    mutationFn: (params: UploadCoverParams) => CollectionService.uploadCoverMutation(params),
    onSuccess: (path) => {
      const tempCollection: PhotoCollection = {
        ...collection,
        coverPath: path,
        published: false,
        publicCoverPath: undefined
      }
      if(collection.published) {
        publishCollection.mutate({
          collectionId: collection.id,
          publishStatus: false,
          path: collection.publicCoverPath ?? '',
          name: '',
          options: {
            logging: true
          }
        })
      }
      updateParentCollection(tempCollection)
      updateParentCollections((prev) => {
        const temp: PhotoCollection[] = [...prev]

        return temp.map((col) => {
          if(col.id === tempCollection.id) {
            return tempCollection
          }
          return col
        })
      })
    },
    onSettled: () => fileUpload.current = null
  })

  const deleteCover = useMutation({
    mutationFn: (params: DeleteCoverParams) => CollectionService.deleteCoverMutation(params),
    onSettled: () => {
      if(fileUpload.current) {
        uploadCover.mutate({
          cover: fileUpload.current,
          collectionId: collection.id,
        })
      }
    }
  })

  //all cover paths, each set has paths, warn if less than 20 and if has duplicates
  const publishable: Publishable = (() => {
    let publishable: Publishable = { status: true }
    const updatePublishable = (a: Publishable, warning?: string, reason?: string) => {
      if(reason){
        a.reason = [reason, ...(a.reason ?? [])]
        a.status = false
      }
      if(warning){
        a.warning = [warning, ...(a.warning ?? [])]
      }
      return a
    }
    publishable = collection.coverPath === undefined ? updatePublishable(publishable, undefined, 'Collection has No Cover Photo'): publishable

    const tempSetList = collection.sets.sort((a, b) => b.order - a.order)
    for(let i = 0; i < tempSetList.length; i++) {
      publishable = tempSetList[i].items > 0 ? (
        tempSetList[i].items < 20 ? (
          updatePublishable(publishable, `${tempSetList[i].name} has Few Pictures`)
        ) : (
          publishable
        )
      ) : (
        updatePublishable(publishable, undefined, `${tempSetList[i].name} has a No Pictures`)
      )
    }

    return publishable
  })()

  const confirmationBody = coverPath?.data ? (
    `This action will <b>Replace</b> the previous cover for this collection with the selected file.\nPress continue or cancel to proceed.`
  ) : (
    `This action will <b>Set</b> the cover for this collection to the selected file.\nPress continue or cancel to proceed.`
  )

  const wrapPublishableItem = (): JSX.Element => {
    const item = (
      <Dropdown.Item
        onClick={() => {
          if(collection.published){
            const tempCollection: PhotoCollection = {
              ...collection,
              published: false,
              publicCoverPath: undefined
            }
            updateParentCollection(tempCollection)
            updateParentCollections((prev) => {
              const temp = [...prev]
  
              return temp.map((col) => {
                if(col.id === tempCollection.id) return tempCollection
                return col
              })
            })
            publishCollection.mutate({
              collectionId: collection.id,
              publishStatus: false,
              path: collection.publicCoverPath ?? '',
              name: '',
              options: {
                logging: true,
              }
            })
          }
          else if(!collection.published && collection.coverPath){
            publishCollection.mutate({
              collectionId: collection.id,
              publishStatus: true,
              path: collection.coverPath,
              name: collection.name,
              options: {
                logging: true
              }
            })
          }
        }}
        disabled={(() => {
          if(publishable.status) return false
          if(collection.published) return false
          if(publishCollection.isPending) return true
          return true
        })()}
        className={`disabled:cursor-not-allowed flex flex-row gap-2 ${publishCollection.isPending ? 'cursor-wait' : ''}`}
      >
        {publishCollection.isPending && (
          <CgSpinner size={24} className="animate-spin text-gray-600"/>
        )}
        <span className={`${!publishable.status ? 'text-gray-500' : ''}`}>{!collection.published ? 'Publish Collection' : 'Unpublish Collection'}</span>
      </Dropdown.Item>
    )
    if(publishable.reason !== undefined || publishable.warning !== undefined) {
      return (
        <Tooltip
          style="light"
          arrow
          placement="bottom"
          trigger="hover"
          theme={{ target: undefined }}
          content={(
            <div className="flex flex-col gap-1 justify-start max-h-[200px] overflow-y-scroll z-20">
              {publishable.reason !== undefined && (
                <div className="border-b w-full py-1 px-2">
                  <span className="font-normal text-sm italic whitespace-nowrap">Publish Errors</span>
                </div>
              )}
              {publishable.reason?.map((reason, index) => {
                return (
                  <div key={index}>
                    <PublishableItems  item="error" message={reason} />
                    <div className="border-t w-full"/>
                  </div>
                )
              })}
              {publishable.warning !== undefined && (
                <div className="border-b w-full py-1 px-2">
                  <span className="font-normal text-sm italic whitespace-nowrap">Publish Warnings</span>
                </div>
              )}
              {publishable.warning?.map((warning, index) => {
                return (
                  <div key={index}>
                    <PublishableItems  item="warning" message={warning} />
                    <div className="border-t w-full"/>
                  </div>
                )
              })}
            </div>
          )}
        >
          {item}
        </Tooltip>
      )
    }
    return item
  }

  return (
    <>
      <CreateCollectionModal
        CollectionService={CollectionService}
        parentCollection={collection}
        onSubmit={(collection) => {
          if(collection){
            updateParentCollection(collection)
            updateParentCollections((prev) => {
              const temp = [...prev]

              return temp.map((col) => {
                if(collection.id === col.id) return collection
                return col
              })
            })
          }
        }} 
        open={updateCollectionVisible} 
        onClose={() => setUpdateCollectionVisible(false)}
      />
      <ConfirmationModal 
        title='Delete Collection'
        body='This action will <b>Delete</b> this collection <b>AND</b> any associated sets and pictures. This action is permanent and <b>CANNOT</b> be undone!'
        denyText="Cancel"
        confirmText="Delete"
        confirmAction={async () => {
          await deleteCollection.mutateAsync({
            collectionId: collection.id,
            options: {
              logging: true
            }
          })
          updateParentCollections((prev) => {
            const temp = [...prev]

            return temp.filter((col) => col.id !== collection.id)
          })
          updateParentCollection(undefined)
        }}
        onClose={() => setDeleteCollectionVisible(false)}
        open={deleteCollectionVisible}
      />
      <ConfirmationModal 
        title={coverPath?.data ? 'Replace Collection Cover' : 'Set Collection Cover'}
        body={confirmationBody}
        denyText="Cancel"
        confirmText="Continue"
        confirmAction={() => {
          setUploadCoverPhotoVisible(false)
          if(fileUpload.current){
            if(coverPath?.data){
              deleteCover.mutate({
                cover: coverPath.data[1],
                collectionId: collection.id,
              })
            } else {
              uploadCover.mutate({
                cover: fileUpload.current,
                collectionId: collection.id,
              })
            }
          }
        }}
        onClose={() => setUploadCoverPhotoVisible(false)}
        open={uploadCoverPhotoVisible}
      />
      <div className="flex flex-row mx-4 mt-4 gap-4">
        <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
          <CollectionThumbnail 
            CollectionService={CollectionService}
            collectionId={collection.id}
            cover={coverPath}
            allowUpload
            onClick={() => {}}
            contentChildren={(
              <div className='flex flex-row justify-between w-full'>
                <div className="flex flex-col gap-1 justify-start">
                  <div className="flex flex-row gap-2 font-thin opacity-90 justify-start">
                    <Tooltip 
                      style='light' 
                      placement='bottom' 
                      content={(
                        <p className={`font-thin italic ${collection.published ? 'text-green-400' : ''}`}>Collection is {collection.published ? '' : 'Not '}Published</p>
                      )}
                    >
                      <p 
                        onMouseEnter={() => setExpandTitle(true)}
                        onMouseLeave={() => setExpandTitle(false)}
                        className={`
                          max-w-[220px] hover:cursor-pointer
                          ${expandTitle ? '' : 'truncate'}
                          ${collection.published ? 'text-green-400' : 'text-gray-600 italic'}
                        `}
                      >{collection.name}</p>
                    </Tooltip>
                  </div>
                  <span className="font-thin text-sm italic flex flex-row gap-1 -z-20">
                    <span className="font-normal italic">Items:</span> 
                    <span>{collection.items}</span>
                    <p>&bull;</p>
                    <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
                  </span>
                </div>
                <div className="mt-1">
                  <Dropdown 
                    dismissOnClick={false} 
                    label={(<HiOutlineCog6Tooth size={20} className="hover:text-gray-600"/>)} 
                    inline 
                    arrowIcon={false}
                  >
                    <Dropdown.Item
                      onClick={() => setUpdateCollectionVisible(true)}
                    >
                      Update Collection
                    </Dropdown.Item>
                    <Dropdown.Item 
                      disabled={collection.coverPath === undefined}
                      onClick={() => {
                        deleteImage.mutate({
                          collectionId: collection.id,
                          cover: collection.coverPath
                        })

                        const tempCollection: PhotoCollection = {
                          ...collection,
                          coverPath: undefined
                        }
                        updateParentCollection(tempCollection)
                        updateParentCollections((prev) => {
                          const temp = [...prev]
              
                          return temp.map((col) => {
                            if(col.id === tempCollection.id) return tempCollection
                            return col
                          })
                        })
                      }}
                    >
                      Remove Cover Photo
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => navigate({ to: `/photo-collection/${collection.id}`, search: { set: selectedSet?.id }}) }
                    >
                      Preview Collection
                    </Dropdown.Item>
                    {wrapPublishableItem()}
                    <Dropdown.Item
                      onClick={() => setDeleteCollectionVisible(true)}
                    >
                      Delete Collection
                    </Dropdown.Item>
                  </Dropdown>
                </div>
              </div>
            )}
            parentLoading={deleteImage.isPending}
            updateParentCollection={updateParentCollection}
            updateParentCollections={updateParentCollections}
            updatePublishStatus={publishCollection}
          />
          <div className="grid grid-cols-3 w-full place-items-center border border-gray-400 rounded-lg py-0.5">
            <CollectionSidePanelButton
              console="sets"
              activeConsole={activeConsole} 
              onClick={() => {
                if(activeConsole !== 'sets'){
                  setActiveConsole('sets')
                  navigate({ to: '.', search: { collection: collection.id, console: 'sets' }})
                }
              }}
              title="Photo Sets"
            />
            <CollectionSidePanelButton 
              console="favorites"
              activeConsole={activeConsole}
              onClick={() => {
                if(activeConsole !== 'favorites'){
                  navigate({ to: '.', search: { collection: collection.id, console: 'favorites' }})
                  setActiveConsole('favorites')
                }
              }}
              title="Favorites"
            />
            <CollectionSidePanelButton
              console="watermarks"
              activeConsole={activeConsole}
              onClick={() => {
                if(activeConsole !== 'watermarks') {
                  navigate({ to: '.', search: { collection: collection.id, console: 'watermarks' }})
                  setActiveConsole('watermarks')
                }
              }}
              title="Watermarks"
            />
            <CollectionSidePanelButton 
              console="share"
              activeConsole={activeConsole}
              onClick={() => {
                if(activeConsole !== 'share') {
                  navigate({ to: '.', search: { collection: collection.id, console: 'share' }})
                  setActiveConsole('share')
                }
              }}
              title="Share"
            />
            <CollectionSidePanelButton 
              console="users"
              activeConsole={activeConsole}
              onClick={() => {
                if(activeConsole !== 'users') {
                  navigate({ to: '.', search: { collection: collection.id, console: 'users' }})
                  setActiveConsole('users')
                }
              }}
              title="Users"
            />
            <CollectionSidePanelButton 
              console="cover"
              activeConsole={activeConsole}
              onClick={() => {
                if(activeConsole !== 'cover') {
                  navigate({ to: '.', search: { collection: collection.id, console: 'cover' }})
                  setActiveConsole('cover')
                }
              }}
              title="Cover"
            />
          </div>
          { activeConsole === 'sets' ? (
            <>
              <div className="flex flex-row items-center justify-between w-full">
                <Label className="text-lg ms-2">Photo Sets</Label>
                <button
                  className="flex flex-row gap-2 border border-gray-300 items-center justify-between hover:bg-gray-100 rounded-xl py-1 px-2 me-2"
                  onClick={() => {
                    const tempSet: PhotoSet = {
                      id: v4(),
                      name: '',
                      creating: true,
                      paths: [],
                      order: collection.sets.length,
                      collectionId: collection.id,
                      items: 0
                    }
                    const tempCollection: PhotoCollection = {
                      ...collection,
                      sets: [...collection.sets, tempSet]
                    }
                    updateParentCollection(tempCollection)
                    updateParentCollections((prev) => prev.map((collection) => collection.id === tempCollection.id ? tempCollection : collection))
                  }}
                >
                  <span className="">Create New Set</span>
                  <HiOutlinePlusCircle className="text-2xl text-gray-600" />
                </button>
              </div>
              <div className="border w-full"></div>
              <div className="w-full">
                <SetList 
                  PhotoSetService={PhotoSetService}
                  CollectionService={CollectionService}
                  setList={collection.sets}
                  selectedSet={selectedSet}
                  setSelectedSet={(set: PhotoSet | undefined) => {
                    navigate({
                      to: '.', search: {
                        collection: collection.id,
                        set: set?.id,
                        console: activeConsole as string
                      }
                    })
                    
                    setSelectedSet(set)
                  }}
                  collection={collection}
                  updateSet={(set, remove) => {
                    const tempCollection: PhotoCollection = {
                      ...collection,
                      sets: remove ? (
                        collection.sets.filter((cSet) => cSet.id !== set.id) 
                      ) : (
                        collection.sets.map((cSet) => set.id === cSet.id ? set : cSet)
                      )
                    }
                    updateParentCollection(tempCollection)
                    updateParentCollections((prev) => prev.map((collection) => collection.id === tempCollection.id ? tempCollection : collection))
                  }}
                  reorderSets={(sets) => {
                    const tempCollection: PhotoCollection = {
                      ...collection,
                      sets: sets
                    }
                    updateParentCollection(tempCollection)
                    updateParentCollections((prev) => prev.map((collection) => collection.id === tempCollection.id ? tempCollection : collection))
                  }}
                />
              </div>
            </>
          ) : (
            activeConsole === 'watermarks' ? (
              <>
                <div className="flex flex-row items-center justify-between w-full">
                  <Label className="text-lg ms-2">Watermarks</Label>
                  <label htmlFor="watermark-upload" className="flex flex-row gap-2 border border-gray-300 items-center hover:bg-gray-100 rounded-xl py-1 px-3 me-2">
                    <span className="">Upload Watermark</span>
                    <HiOutlineUpload size={20} />
                    <input 
                      id='watermark-upload' 
                      accept=""
                      type='file' 
                      className="hidden"
                      multiple={false}
                      onChange={(event) => {
                        if(event.target.files){
                          const uploads = new Map<string, File>()
                          Array.from(event.target.files).forEach((file) => {
                            uploads.set(file.name, file)
                          })
                          uploadWatermarks.mutate({
                            filesUpload: uploads,
                            updateWatermarks: updateWatermarkObjects
                          })
                        }
                      }} 
                    />
                  </label>
                </div>
                <div className="border w-full"></div>
                {watermarkPaths
                .sort((a, b) => parsePathName(a.data?.[1] ?? '').localeCompare(parsePathName(b.data?.[1] ?? '')))
                .map((path, index) => {
                  const foundWatermark = watermarkObjects.find((watermarks) => watermarks.id === path.data?.[0])
                  if(path.data && !foundWatermark) return
                  return (
                    <div 
                      key={index}
                      className={`
                        border border-gray-300 px-3 py-1 flex flex-row justify-between items-center w-full 
                        rounded-lg hover:bg-gray-100 hover:cursor-pointer 
                        ${(selectedWatermark === foundWatermark && foundWatermark !== undefined) ? 'bg-gray-200' : ''}`}
                      onClick={() => {
                        if(foundWatermark && selectedWatermark !== foundWatermark){
                          setSelectedWatermark(foundWatermark)
                        }
                      }}
                    >
                      { path.isLoading ? (
                        <span className="flex flex-row items-center">
                          <span>Loading</span>
                          <Loading className="text-xl"/>
                        </span>
                      ) : (
                        (path.data && foundWatermark !== undefined) ? (
                          <>
                            <span className="italic font-light">{parsePathName(foundWatermark.path)}</span>
                            <div className="flex flex-row gap-2 items-center">
                              <Tooltip content={'Delete'} style="light" placement="bottom">
                                <button
                                  onClick={() => {
                                    updateWatermarkObjects((prev) => {
                                      return prev.filter((parentWatermarks) => parentWatermarks.id !== foundWatermark.id)
                                    })
                                    deleteWatermark.mutate({
                                      watermark: foundWatermark
                                    })
                                  }}
                                >
                                  <HiOutlineTrash size={20} className="hover:text-gray-700"/>
                                </button>
                              </Tooltip>
                            </div>
                          </>
                        ) : (
                          undefined
                        )
                      )}
                    </div>
                  )
                })}
              </> 
          ) : (
            activeConsole === 'share' ? (
              <>
                <div className="flex flex-row items-center justify-start w-full">
                  <Label className="text-lg ms-2">Templates</Label>
                </div>
                <div className="border w-full"></div>
                {shareTemplates.map((template) => {
                  const selected = template.id === selectedTemplate?.id
                  return (
                    <div 
                      className={`border border-gray-300 px-3 py-1 flex flex-row justify-between items-center w-full rounded-lg hover:bg-gray-100 
                        ${selected ? 'bg-gray-200' : ''}`}
                      onClick={() => {
                        if(!selected){
                          setSelectedTemplate(template)
                        }
                      }}
                    >
                      <span className="italic font-light">{template.name}</span>
                      <div className="flex flex-row gap-2 items-center">
                        <Tooltip content={'Delete'} style="light" placement="bottom">
                          <button
                            onClick={() => {
                              setSelectedTemplate((prev) => {
                                if(prev?.id === template.id){
                                  return undefined
                                }
                                return prev
                              })
                              updateShareTemplates((prev) => {
                                return prev.filter((parentTemplate) => parentTemplate.id !== template.id)
                              })
                              deleteShareTemplate.mutate({
                                id: template.id
                              })
                            }}
                          >
                            <HiOutlineTrash size={20} className="hover:text-gray-700 mt-1"/>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )
                })}
              </> 
          ) : (
            activeConsole === 'cover' ? (
              <CoverSidePanel 
                setUploadCoverVisible={setUploadCoverPhotoVisible}
                fileUpload={fileUpload}
                updateParentCollection={updateParentCollection}
                updateParentCollections={updateParentCollections}
                collection={collection}
                updateCollectionMutation={updateCollection}
              />
          ) : (
            <></>
          )
          )))}
        </div>
        { activeConsole === 'sets' ? (
            selectedSet ? (
              <PhotoSetPanel 
                PhotoSetService={PhotoSetService}
                PhotoPathService={PhotoPathService}
                CollectionService={CollectionService}
                photoCollection={collection} 
                photoSet={selectedSet} 
                deleteParentSet={(setId) => {
                  const updatedSetList = collection.sets
                      .filter((set) => set.id !== setId)
                      .sort((a, b) => a.order - b.order)
                      .map((set, index) => ({ ...set, order: index}))
                  
                  
                  const tempCollection: PhotoCollection = {
                    ...collection,
                    sets: updatedSetList
                  }

                  setSelectedSet(undefined)
                  updateParentCollection(tempCollection)
                  updateParentCollections((prev) => prev.map((collection) => collection.id === tempCollection.id ? tempCollection : collection))
                }}
                parentUpdateSet={setSelectedSet}
                parentUpdateCollection={updateParentCollection}
                parentUpdateCollections={updateParentCollections}
                auth={auth}
                publishable={publishable}
                publishCollection={publishCollection}
              />
            ) : (
              <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
                <div className="flex flex-row items-center justify-center">
                  <p>Click a set to view it here!</p>
                </div>
              </div>
          )
        ) : (
          activeConsole === 'favorites' ? (
          <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
            <FavoritePanel 
              PhotoSetService={PhotoSetService}
              PhotoPathService={PhotoPathService}
              collection={collection}
            />
          </div>
        ) : (
          activeConsole === 'watermarks' ? (
          <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
            <WatermarkPanel 
              WatermarkService={WatermarkService}
              collection={collection}
              updateCollection={updateParentCollection}
              updateCollections={updateParentCollections}
              watermarkObjects={watermarkObjects}
              watermarkPaths={watermarkPaths}
              selectedWatermark={selectedWatermark}
              setSelectedWatermark={setSelectedWatermark}
            />
          </div>
        ) : (
          activeConsole === 'share' ? (
            <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
              <SharePanel 
                UserService={UserService}
                CollectionService={CollectionService}
                ShareService={ShareService}
                collection={collection}
                selectedTemplate={selectedTemplate}
                updateParentSelectedTemplate={setSelectedTemplate}
                updateParentTemplates={updateShareTemplates}
              />
            </div>
        ) : (
          activeConsole === 'users' ? (
            <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
              <UsersPanel
                CollectionService={CollectionService}
                collection={collection}
                parentUpdateCollection={updateParentCollection}
                parentUpdateCollections={updateParentCollections}
                participants={participants.data ?? []}
                collectionParticipants={collectionParticipants}
                userTags={availableTags}
                updateCollectionMutation={updateCollection}
              />
            </div>
        ): (
          <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
            <CoverPanel
              collection={collection}
              cover={coverPath}
              updatePublishStatus={publishCollection}
            />
          </div>
        )))))}
      </div>
    </>
  )
}