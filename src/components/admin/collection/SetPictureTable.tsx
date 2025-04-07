import { PhotoCollection, PhotoSet, PicturePath } from "../../../types"
import { DynamicStringEnumKeysOf, parsePathName } from "../../../utils"
import { FlowbiteColors } from "flowbite-react"
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { 
  deleteImagesMutation, 
  DeleteImagesMutationParams, 
  favoriteImageMutation, 
  FavoriteImageMutationParams, 
  reorderPathsMutation, 
  ReorderPathsParams,
  unfavoriteImageMutation,
  UnfavoriteImageMutationParams,
} from "../../../services/photoSetService"
import { 
  HiOutlineBarsArrowDown, 
  HiOutlineBarsArrowUp, 
  HiOutlineTrash
} from "react-icons/hi2";
import { HiOutlineDownload, HiOutlineHeart } from "react-icons/hi"
import { CgArrowsExpandRight } from "react-icons/cg";
import { useNavigate } from "@tanstack/react-router"
import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { UploadImagePlaceholder } from "./UploadImagePlaceholder"
import { downloadImageMutation, DownloadImageMutationParams } from "../../../services/photoPathService"

export interface SetPictureTableProps {
  collection: PhotoCollection,
  set: PhotoSet,
  paths: PicturePath[],
  parentUpdatePaths: Dispatch<SetStateAction<PicturePath[]>>,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>,
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>,
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  urls: {id: string, url: UseQueryResult<[string | undefined, string] | undefined>}[],
  pictureStyle: (id: string) => string
  selectedPhotos: PicturePath[]
  setSelectedPhotos: (photos: PicturePath[]) => void
  setDisplayPhotoControls: (id: string | undefined) => void
  controlsEnabled: (id: string, override: boolean) => string
  displayTitleOverride: boolean,
  notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void,
  setFilesUploading: Dispatch<SetStateAction<Map<string, File> | undefined>>,
  userEmail: string | undefined
}

const LazyImage = (props: ComponentProps<'img'>) => {
  const imgRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if(entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.1 })

    if(imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if(imgRef.current) {
        observer.disconnect()
      }
    }
  })

  return (
    <div
      ref={imgRef}
    >
      {isVisible ? (
        <img 
          {...props}
        />
      ) : (
        <div className="flex items-center justify-center w-[200px] h-[300px] bg-gray-300 rounded sm:w-96">
          <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
          </svg>
        </div>
      )}
    </div>
  )
}

export const SetPictureTable = (props: SetPictureTableProps) => {
  const navigate = useNavigate()

  const deleteMutation = useMutation({
    mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
  })

  const rerorderPaths = useMutation({
    mutationFn: (params: ReorderPathsParams) => reorderPathsMutation(params)
  })

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite) {
        props.parentUpdatePaths(props.paths.map((path) => {
          if(path.id === favorite[1]){
            return ({
              ...path,
              favorite: favorite[0]
            })
          }
          return path
        }))
      }
    }
  })

  const unfavorite = useMutation({
    mutationFn: (params: UnfavoriteImageMutationParams) => unfavoriteImageMutation(params)
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => downloadImageMutation(params),
    onSettled: (file) => {
      if(file){
        try{
          const url = window.URL.createObjectURL(file)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name
          link.click()
          window.URL.revokeObjectURL(url)
        }catch(error){
          console.error(error)
        }
      }
    }
  })

  return (
    <div className="grid grid-cols-4 gap-x-8 gap-y-4 max-h-[90vh] overflow-y-auto">
      {props.paths
        .sort((a, b) => a.order - b.order)
        .map((path, index) => {
          const url = props.urls.find((url) => url.id === path.id)

          if(!url || !url.url.data) return
          return (
            <div
              key={index} 
              className={props.pictureStyle(path.id)} id='image-container'
              onClick={(event) => {
                const temp = [...props.selectedPhotos]
                if((event.target as HTMLElement).id.includes('image')){
                  if(props.selectedPhotos.find((parentPath) => path.id === parentPath.id) !== undefined){
                    props.setSelectedPhotos(props.selectedPhotos.filter((parentPath) => parentPath.id !== path.id))
                  }
                  else if(event.shiftKey && temp.length > 0){
                    let minIndex = -1
                    let maxIndex = index
                    for(let i = 0; i < props.paths.length; i++){
                      if(props.selectedPhotos.find((path) => path.id === props.paths[i].id) !== undefined){
                        minIndex = i
                        break
                      }
                    }
                    for(let i = props.paths.length - 1; index < i; i--){
                      if(props.selectedPhotos.find((path) => path.id === props.paths[i].id) !== undefined){
                        maxIndex = i
                        break
                      }
                    }
                    minIndex = index < minIndex ? index : minIndex
                    if(minIndex > -1){
                      props.setSelectedPhotos(props.paths.filter((_, i) => i >= minIndex && i <= maxIndex))
                    }
                  }
                  else{
                    temp.push(props.paths[index])
                    props.setSelectedPhotos(temp)
                  }
                }
              }}
              onMouseEnter={() => {
                props.setDisplayPhotoControls(path.id)
              }}  
              onMouseLeave={() => {
                props.setDisplayPhotoControls(undefined)
              }}
            >
              {url?.url.isLoading ? (
                <div className="flex items-center justify-center w-[200px] h-[300px] bg-gray-300 rounded sm:w-96">
                  <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                    <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                  </svg>
                </div>
              ) : (
                <LazyImage 
                  src={url.url.data[1]} 
                  className="object-cover rounded-lg w-[200px] h-[300px] justify-self-center" 
                  id='image'
                  loading='lazy'  
                />
              )}
              <div className={`absolute bottom-0 inset-x-0 pb-1 justify-end flex-row gap-1 me-3 ${props.controlsEnabled(path.id, false)}`}>
                <button 
                  title={`${path.favorite !== undefined ? 'Unfavorite' : 'Favorite'}`} 
                  className="" 
                  onClick={() => {
                    if(path.favorite !== undefined && path.favorite !== 'temp'){
                      unfavorite.mutate({
                        id: path.favorite,
                        options: {
                          logging: true
                        }
                      })

                      const temp = props.paths.map((parentPath) => {
                        if(path.id === parentPath.id) {
                          return ({
                            ...path,
                            favorite: undefined
                          })
                        }
                        return path
                      })
                      
                      const updatedSet: PhotoSet = {
                        ...props.set,
                        paths: temp
                      }

                      const updatedCollection: PhotoCollection = {
                        ...props.collection,
                        sets: props.collection.sets.map((set) => {
                          if(set.id === updatedSet.id) return updatedSet
                          return set
                        })
                      }
  
                      props.parentUpdatePaths(temp)
                      props.parentUpdateSet(updatedSet)
                      props.parentUpdateCollection(updatedCollection)
                      props.parentUpdateCollections((prev) => {
                        const pTemp = [...prev]

                        return pTemp.map((col) => {
                          if(col.id === updatedCollection.id) return updatedCollection
                          return col
                        })
                      })
                    }
                    else if(props.userEmail && path.favorite === undefined){
                      favorite.mutate({
                        pathId: path.id,
                        user: props.userEmail,
                        options: {
                          logging: true
                        }
                      })

                      const temp = props.paths.map((parentPath) => {
                        if(path.id === parentPath.id){
                          return ({
                            ...path,
                            favorite: 'temp'
                          })
                        }
                        return path
                      })
                      
                      const updatedSet: PhotoSet = {
                        ...props.set,
                        paths: temp
                      }

                      const updatedCollection: PhotoCollection = {
                        ...props.collection,
                        sets: props.collection.sets.map((set) => {
                          if(set.id === updatedSet.id) return updatedSet
                          return set
                        })
                      }
  
                      props.parentUpdatePaths(temp)
                      props.parentUpdateSet(updatedSet)
                      props.parentUpdateCollection(updatedCollection)
                      props.parentUpdateCollections((prev) => {
                        const temp = [...prev]

                        return temp.map((col) => {
                          if(col.id === updatedCollection.id) return updatedCollection
                          return col
                        })
                      })
                    }
                  }}
                >
                  <HiOutlineHeart size={20} className={`${path.favorite !== undefined ? 'fill-red-400' : ''}`}/>
                </button>
                <button 
                  title='Download' 
                  className={`${downloadImage.isPending ? 'cursor-wait' : ''}`} 
                  onClick={() => {
                    if(!downloadImage.isPending){
                      downloadImage.mutate({
                        path: path.path
                      })
                    }
                  }}
                >
                  <HiOutlineDownload size={20} />
                </button>
                <button
                  title='Preview Fullscreen'
                  onClick={() => {
                    navigate({
                      to: `/photo-fullscreen`,
                      search: {
                        set: props.set.id,
                        path: path.id
                      }
                    })
                  }}
                >
                  <CgArrowsExpandRight size={20} />
                </button>
                <button 
                  title='Move to Top' 
                  className="" 
                  onClick={() => {
                    const temp = [path, ...props.paths.filter((p) => p.id !== path.id)].map((path, index) => {
                      return {
                        ...path,
                        order: index,
                      }
                    })

                    rerorderPaths.mutate({
                      paths: temp,
                    })

                    const updatedSet: PhotoSet = {
                      ...props.set,
                      paths: temp
                    }

                    const updatedCollection: PhotoCollection = {
                      ...props.collection,
                      sets: props.collection.sets.map((set) => {
                        if(set.id === updatedSet.id) return updatedSet
                        return set
                      })
                    }

                    props.parentUpdatePaths(temp)
                    props.parentUpdateSet(updatedSet)
                    props.parentUpdateCollection(updatedCollection)
                    props.parentUpdateCollections((prev) => {
                      const temp = [...prev]

                      return temp.map((col) => {
                        if(col.id === updatedCollection.id) return updatedCollection
                        return col
                      })
                    })
                  }}
                >
                  <HiOutlineBarsArrowUp size={20} />
                </button>
                <button 
                  title='Move to Bottom'
                  className="" 
                  onClick={() => {
                    const temp = [...props.paths.filter((p) => p.id !== path.id), path].map((path, index) => {
                      return {
                        ...path,
                        order: index,
                      }
                    })

                    rerorderPaths.mutate({
                      paths: temp,
                    })

                    const updatedSet: PhotoSet = {
                      ...props.set,
                      paths: temp
                    }

                    const updatedCollection: PhotoCollection = {
                      ...props.collection,
                      sets: props.collection.sets.map((set) => {
                        if(set.id === updatedSet.id) return updatedSet
                        return set
                      })
                    }

                    props.parentUpdatePaths(temp)
                    props.parentUpdateSet(updatedSet)
                    props.parentUpdateCollection(updatedCollection)
                    props.parentUpdateCollections((prev) => {
                      const pTemp = [...prev]

                      return pTemp.map((col) => {
                        if(col.id === updatedCollection.id) return updatedCollection
                        return col
                      })
                    })
                  }}
                >
                  <HiOutlineBarsArrowDown size={20} />
                </button>
                <button 
                  title='Delete' 
                  className="" 
                  onClick={() => {
                    deleteMutation.mutate({
                      picturePaths: [path],
                      collection: props.collection,
                      options: {
                        logging: true
                      }
                    })

                    const updatedPaths = props.paths.filter((p) => p.id !== path.id)

                    const updatedSet: PhotoSet = {
                      ...props.set,
                      paths: updatedPaths
                    }

                    const updatedCollection: PhotoCollection = {
                      ...props.collection,
                      sets: props.collection.sets.map((set) => {
                        if(set.id === updatedSet.id) return updatedSet
                        return set
                      })
                    }

                    props.parentUpdatePaths(updatedPaths)
                    props.parentUpdateSet(updatedSet)
                    props.parentUpdateCollection(updatedCollection)
                    props.parentUpdateCollections((prev) => {
                      const temp = [...prev]

                      return temp.map((col) => {
                        if(col.id === updatedCollection.id) return updatedCollection
                        return col
                      })
                    })
                  }}
                >
                  <HiOutlineTrash size={20} />
                </button>
              </div>
              <div className={`absolute top-1 inset-x-0 justify-center flex-row ${props.controlsEnabled(path.id, props.displayTitleOverride)}`}>
                <p id="image-name">{parsePathName(path.path)}</p>
              </div>
            </div>
          )
      })}
      <UploadImagePlaceholder
        setFilesUploading={props.setFilesUploading}
        className="h-full place-self-center w-full"
      />
    </div>
  )
}