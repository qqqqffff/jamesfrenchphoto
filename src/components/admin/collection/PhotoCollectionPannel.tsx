import { Dispatch, FC, SetStateAction, useState } from "react"
import { UserTag, Watermark, PhotoCollection, PhotoSet } from "../../../types"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Dropdown, Label, Tooltip } from "flowbite-react"
import { getPhotoSetByIdQueryOptions } from "../../../services/photoSetService"
import { CollectionThumbnail } from "./CollectionThumbnail"
import { HiOutlineCog6Tooth, HiOutlinePlusCircle, HiOutlineTrash } from "react-icons/hi2"
import { SetList } from "./SetList"
import { CreateCollectionModal, WatermarkModal } from "../../modals"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { PhotoSetPannel } from "./PhotoSetPannel"
import { deleteCoverMutation, DeleteCoverParams, getPathQueryOptions, updateCollectionMutation, UpdateCollectionParams } from "../../../services/collectionService"
import Loading from "../../common/Loading"
import { detectDuplicates } from "./utils"
import { PublishableItems } from "./PublishableItems"
import { AuthContext } from "../../../auth"
import { FavoritePannel } from "./FavoritePannel"
import { HiOutlineUpload } from "react-icons/hi"
import { deleteWatermarkMutation, DeleteWatermarkParams, uploadWatermarksMutation, WatermarkUploadParams } from "../../../services/watermarkService"
import { parsePathName } from "../../../utils"
import { WatermarkPannel } from "./WatermarkPannel"

interface PhotoCollectionPannelProps {
  watermarkObjects: Watermark[],
  updateWatermarkObjects: Dispatch<SetStateAction<Watermark[]>>,
  availableTags: UserTag[],
  coverPath?: string,
  collection: PhotoCollection,
  updateParentCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  set?: PhotoSet,
  auth: AuthContext,
  parentActiveConsole: 'sets' | 'favorites' | 'watermarks'
}

interface Publishable {
  status: boolean, 
  reason?: string[], 
  warning?: string[]
}

export const PhotoCollectionPannel: FC<PhotoCollectionPannelProps> = ({ 
  watermarkObjects, updateWatermarkObjects, availableTags, collection, 
  set, updateParentCollection, auth, parentActiveConsole
}) => {
  const [createSet, setCreateSet] = useState(false)
  const [watermarkVisible, setWatermarkVisible] = useState(false)
  const [selectedWatermark, setSelectedWatermark] = useState<Watermark>()
  const [selectedSet, setSelectedSet] = useState<PhotoSet | undefined>(set)
  const [setList, setSetList] = useState<PhotoSet[]>(collection.sets)
  const [updateCollectionVisible, setUpdateCollectionVisible] = useState(false)
  const [coverPath, setCoverPath] = useState(collection.coverPath)

  const [activeConsole, setActiveConsole] = useState<'sets' | 'favorites' | 'watermarks'>(parentActiveConsole)

  const client = useQueryClient()
  const router = useRouter()
  const navigate = useNavigate()

  const deleteImage = useMutation({
      mutationFn: (params: DeleteCoverParams) => deleteCoverMutation(params),
  })

  const updateCollection = useMutation({
      mutationFn: (params: UpdateCollectionParams) => updateCollectionMutation(params)
  })

  const setQuery = useQuery({
      ...getPhotoSetByIdQueryOptions(selectedSet?.id, { resolveUrls: false, user: auth.user?.profile.email }),
      enabled: selectedSet !== undefined
  })

  const uploadWatermarks = useMutation({
    mutationFn: (params: WatermarkUploadParams) => uploadWatermarksMutation(params),
  })

  const deleteWatermark = useMutation({
    mutationFn: (params: DeleteWatermarkParams) => deleteWatermarkMutation(params), 
  })

  const watermarkPaths = useQueries({
    queries: watermarkObjects.map((watermark) => {
      return getPathQueryOptions(watermark.path, watermark.id)
    })
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

      const tempSetList = setList.sort((a, b) => b.order - a.order)
      for(let i = 0; i < tempSetList.length; i++) {
          publishable = tempSetList[i].paths.length > 0 ? (
              tempSetList[i].paths.length < 20 ? (
                  updatePublishable(publishable, `${tempSetList[i].name} has Few Pictures`)
              ) : (
                  publishable
              )
          ) : (
              updatePublishable(publishable, undefined, `${tempSetList[i].name} has a No Pictures`)
          )
          const duplicates = detectDuplicates(tempSetList[i].paths)
          publishable = duplicates.length > 0 ? updatePublishable(publishable, `${tempSetList[i].name} has Duplicates`) : publishable
      }

      return publishable
  })()

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
            updateParentCollection(collection)
          }
        }} 
        availableTags={availableTags} 
        open={updateCollectionVisible} 
        onClose={() => setUpdateCollectionVisible(false)}
      />
      <div className="flex flex-row mx-4 mt-4 gap-4">
        <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
          <CollectionThumbnail 
            collectionId={collection.id}
            cover={coverPath}
            allowUpload
            onClick={() => {}}
            contentChildren={(
              <div className='flex flex-row justify-between w-full'>
                <div className="flex flex-row gap-1 font-thin opacity-90 items-center justify-start">
                  <Tooltip content={(<p>Collection Has {collection.published ? 'Been Published' : 'Not Been Published'}</p>)}>
                    <p className={`${collection.published ? 'text-green-400' : 'text-gray-600 italic'}`}>{collection.name}</p>
                  </Tooltip>
                  <p>&bull;</p>
                  <p>Items: {collection.items}</p>
                  <p>&bull;</p>
                  <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
                </div>
                <Dropdown dismissOnClick={false} label={(<HiOutlineCog6Tooth size={20} className="hover:text-gray-600"/>)} inline arrowIcon={false}>
                  <Dropdown.Item
                    onClick={() => setUpdateCollectionVisible(true)}
                  >
                    Update Collection
                  </Dropdown.Item>
                  <Dropdown.Item 
                    disabled={collection.coverPath === undefined}
                    onClick={() => deleteImage.mutate({
                      collectionId: collection.id,
                      cover: collection.coverPath
                    })}
                  >
                    Remove Cover Photo
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => setWatermarkVisible(true)}
                  >
                    Watermark
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => console.log(navigate({ to: `/photo-collection/${collection.id}`, search: { set: selectedSet?.id }})) }
                  >
                    Preview Collection
                  </Dropdown.Item>
                  <Tooltip
                    style="light"
                    className={`${((publishable?.reason?.length ?? 0) < 0 && (publishable.warning?.length ?? 0) < 0) ? 'hidden' : ''}`}
                    content={(
                      <div className="flex flex-col gap-1 justify-start max-h-[200px] overflow-y-scroll z-20">
                        {publishable.reason?.map((reason, index) => {
                          return (
                            <PublishableItems key={index} item="error" message={reason} />
                          )
                        })}
                        {publishable.warning?.map((warning, index) => {
                          return (
                            <PublishableItems key={index} item="warning" message={warning} />
                          )
                        })}
                      </div>
                    )}
                  >
                    <Dropdown.Item
                      onClick={() => {
                        updateParentCollection({
                          ...collection,
                          published: !collection.published
                        })
                        updateCollection.mutate({
                          collection: collection,
                          published: !collection.published
                        })
                      }}
                      disabled={(() => {
                        if(publishable.status) return false
                        if(collection.published) return false
                        return true
                      })()}
                      className="disabled:cursor-not-allowed"
                    >
                      <span className={`${!publishable.status ? 'text-gray-500' : ''}`}>{!collection.published ? 'Publish' : 'Unpublish'}</span>
                    </Dropdown.Item>
                  </Tooltip>
                </Dropdown>
              </div>
            )}
            parentLoading={deleteImage.isPending}
            setCover={setCoverPath}
          />
          <div className="grid grid-cols-3 w-full place-items-center border border-gray-400 rounded-lg py-0.5">
            <button 
              className={`py-1 px-2 hover:border-gray-300 rounded-lg border border-transparent ${activeConsole === 'sets' ? 'text-black' : 'text-gray-400'}`}
              onClick={() => {
                if(activeConsole !== 'sets'){
                  setActiveConsole('sets')
                  navigate({ to: '.', search: { collection: collection.id, console: 'sets' }})
                }
              }}
            >
              Photo Sets
            </button>
            <button 
              className={`py-1 px-2 hover:border-gray-300 rounded-lg border border-transparent ${activeConsole === 'favorites' ? 'text-black' : 'text-gray-400'}`}
              onClick={() => {
                if(activeConsole !== 'favorites'){
                  navigate({ to: '.', search: { collection: collection.id, console: 'favorites' }})
                  setActiveConsole('favorites')
                }
              }}
            >
              Favorites
            </button>
            <button
              className={`py-1 px-2 hover:border-gray-300 rounded-lg border border-transparent ${activeConsole === 'watermarks' ? 'text-black' : 'text-gray-400'}`}
              onClick={() => {
                if(activeConsole !== 'watermarks') {
                  navigate({ to: '.', search: { collection: collection.id, console: 'watermarks' }})
                  setActiveConsole('watermarks')
                }
              }}
            >
              Watermarks
            </button>
          </div>
          {activeConsole === 'sets' ? (
            <>
              <div className="flex flex-row items-center justify-between w-full">
                <Label className="text-lg ms-2">Photo Sets</Label>
                <button
                  className="flex flex-row gap-2 border border-gray-300 items-center justify-between hover:bg-gray-100 rounded-xl py-1 px-2 me-2"
                  onClick={() => {
                    setCreateSet(true)
                  }}
                >
                  <span className="">Create New Set</span>
                  <HiOutlinePlusCircle className="text-2xl text-gray-600" />
                </button>
              </div>
              <div className="border w-full"></div>
              <div className="w-full">
                <SetList 
                  setList={setList}
                  setSelectedSet={(set: PhotoSet) => {
                    navigate({
                      to: '.', search: {
                        collection: collection.id,
                        set: set.id,
                        console: activeConsole as string
                      }
                    })
                    setQuery.refetch()
                    setSelectedSet(set)
                  } }
                  collection={collection}
                  updateSetList={setSetList}
                  creatingSet={createSet}
                  doneCreatingSet={(set) => {
                    if(set !== undefined && collection.published){
                      const updatedCollection: PhotoCollection = {
                        ...collection,
                        published: false
                      }
                      updateCollection.mutate({
                        collection: collection,
                        published: false
                      })

                      updateParentCollection(updatedCollection)
                      setCreateSet(false)
                    }
                    setCreateSet(false)
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
                {watermarkPaths.map((path) => {
                  const foundWatermark = watermarkObjects.find((watermarks) => watermarks.id === path.data?.[0])
                  if(path.data && !foundWatermark) return
                  return (
                    <div 
                      className={`border border-gray-300 px-3 py-1 flex flex-row justify-between items-center w-full rounded-lg hover:bg-gray-100 
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
              <></>
            )
          )}
        </div>
        { activeConsole === 'sets' ? (
          selectedSet ? (
            setQuery.isLoading || setQuery.isRefetching ? (
              <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
                <div className="flex flex-row items-center justify-center">
                  <p>Loading</p>
                  <Loading />
                </div>
              </div>
            ) : (
              <PhotoSetPannel 
                photoCollection={collection} 
                photoSet={setQuery.data ?? selectedSet} 
                watermarkObjects={watermarkObjects}
                paths={setQuery.data?.paths ?? []}
                deleteParentSet={(setId) => {
                  const updatedSetList = setList
                      .filter((set) => set.id !== setId)
                      .sort((a, b) => a.order - b.order)
                      .map((set, index) => ({ ...set, order: index}))
                  
                  setSetList(updatedSetList)
                  setSelectedSet(undefined)
                }}
                parentUpdateSet={(updatedSet) => {
                  const temp = setList.map((set) => {
                    if(set.id === updatedSet.id){
                      return updatedSet
                    }
                    return set
                  })
                  setSetList(temp)
                  setSelectedSet(updatedSet)
                }}
                updateParentCollection={updateParentCollection}
                auth={auth}
              />
            )
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
              <FavoritePannel 
                collection={collection}
              />
            </div>
          ) : (
            <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
              <WatermarkPannel 
                collection={collection}
                updateCollection={updateParentCollection}
                watermarkObjects={watermarkObjects}
                watermarkPaths={watermarkPaths}
                selectedWatermark={selectedWatermark}
                setSelectedWatermark={setSelectedWatermark}
              />
            </div>
          )
        )}
      </div>
    </>
  )
}