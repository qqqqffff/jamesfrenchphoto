import { Dispatch, FC, SetStateAction, useState } from "react"
import { UserTag, Watermark, PhotoCollection, PhotoSet } from "../../../types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Dropdown, Label, Tooltip } from "flowbite-react"
import { getPhotoSetByIdQueryOptions } from "../../../services/photoSetService"
import { CollectionThumbnail } from "./CollectionThumbnail"
import { HiOutlineCog6Tooth, HiOutlinePlusCircle } from "react-icons/hi2"
import { SetList } from "./SetList"
import { CreateCollectionModal, WatermarkModal } from "../../modals"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { PhotoSetPannel } from "./PhotoSetPannel"
import { deleteCoverMutation, DeleteCoverParams, updateCollectionMutation, UpdateCollectionParams } from "../../../services/collectionService"
import Loading from "../../common/Loading"
import { detectDuplicates } from "./utils"
import { PublishableItems } from "./PublishableItems"

interface PhotoCollectionPannelProps {
  watermarkObjects: Watermark[],
  availableTags: UserTag[],
  coverPath?: string,
  collection: PhotoCollection,
  updateParentCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  set?: PhotoSet
}

interface Publishable {
  status: boolean, 
  reason?: string[], 
  warning?: string[]
}

export const PhotoCollectionPannel: FC<PhotoCollectionPannelProps> = ({ 
  watermarkObjects, availableTags, collection, 
  set, updateParentCollection, 
}) => {
  const [createSet, setCreateSet] = useState(false)
  const [watermarkVisible, setWatermarkVisible] = useState(false)
  const [selectedSet, setSelectedSet] = useState<PhotoSet | undefined>(set)
  const [setList, setSetList] = useState<PhotoSet[]>(collection.sets)
  const [updateCollectionVisible, setUpdateCollectionVisible] = useState(false)
  const [coverPath, setCoverPath] = useState(collection.coverPath)

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
      ...getPhotoSetByIdQueryOptions(selectedSet?.id, { resolveUrls: false}),
      enabled: selectedSet !== undefined
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
            collection={collection}
            collectionId={collection.id}
            cover={coverPath}
            allowUpload
            onClick={() => {}}
            contentChildren={(
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
                  onClick={() => navigate({ to: `/photo-collection/${collection.id}`, search: { set: selectedSet?.id }})}
                >
                  Preview Collection
                </Dropdown.Item>
                <Tooltip
                  className={`${publishable.status ? 'hidden' : ''}`}
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
                    disabled={!publishable.status || !collection.published}
                    className="disabled:cursor-not-allowed"
                  >
                    <span className={`${!publishable.status ? 'text-gray-500' : ''}`}>{!collection.published ? 'Publish' : 'Unpublish'}</span>
                  </Dropdown.Item>
                </Tooltip>
              </Dropdown>
            )}
            parentLoading={deleteImage.isPending}
            setCover={setCoverPath}
          />
          <div className="flex flex-row items-center justify-between w-full">
            <Label className="text-lg ms-2">Photo Sets</Label>
            <button
              className="flex flex-row gap-2 border border-gray-300 items-center justify-between hover:bg-gray-100 rounded-xl py-1 px-2 me-2"
              onClick={() => {setCreateSet(true)}}
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
                    set: set.id
                  }
                })
                setQuery.refetch()
                setSelectedSet(set)
              } }
              collection={collection}
              updateSetList={setSetList}
              creatingSet={createSet}
              doneCreatingSet={() => setCreateSet(false)}
            />
          </div>
        </div>
        {selectedSet ? (
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
                setSetList(setList.filter((set) => set.id !== setId))
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
            />
          )
        ) : (
          <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
            <div className="flex flex-row items-center justify-center">
              <p>Click a set to view it here!</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}