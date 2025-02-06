import { GridChildComponentProps } from "react-window"
import { PhotoCollection, PhotoSet, PicturePath } from "../../../types"
import { DynamicStringEnumKeysOf, parsePathName } from "../../../utils"
import { FlowbiteColors, Tooltip } from "flowbite-react"
// import { UploadImagePlaceholder } from "./UploadImagePlaceholder"
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { 
  deleteImagesMutation, 
  DeleteImagesMutationParams, 
  reorderPathsMutation, 
  ReorderPathsParams, 
  updateSetMutation, 
  UpdateSetParams 
} from "../../../services/photoSetService"
import { 
  HiOutlineBarsArrowDown, 
  HiOutlineBarsArrowUp, 
  HiOutlineTrash,
  HiOutlineStar,
} from "react-icons/hi2";
import { CgArrowsExpandRight } from "react-icons/cg";
import { useNavigate } from "@tanstack/react-router"
import { Dispatch, SetStateAction } from "react"

export interface SetRowProps extends GridChildComponentProps {
  data: {
    collection: PhotoCollection,
    set: PhotoSet,
    data: PicturePath[],
    urls: {id: string, url: UseQueryResult<[string | undefined, string] | undefined>}[],
    cover: string,
    pictureStyle: (id: string, selected: boolean) => string
    selectedPhotos: PicturePath[]
    setSelectedPhotos: (photos: PicturePath[]) => void
    setDisplayPhotoControls: (id: string | undefined) => void
    controlsEnabled: (id: string, override: boolean) => string
    setCover: (path: string) => void
    setPicturePaths: (picturePaths: PicturePath[]) => void,
    displayTitleOverride: boolean,
    notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void,
    setFilesUploading: Dispatch<SetStateAction<Map<string, File> | undefined>>
  }
}

export const SetRow = ({ columnIndex, rowIndex, data, style }: SetRowProps) => {
  const index = columnIndex + 4 * rowIndex
  //TODO: reenable me
  if(!data.data[index]) {
    return undefined
  }
  //   if(data.data[index - 1] !== undefined || index == 0) {
  //     return (
  //       <UploadImagePlaceholder
  //         setFilesUploading={data.setFilesUploading}
  //         key={index} 
  //         style={{
  //           ...style,
  //           width: Number(style.width ?? 0) - 20,
  //           height: Number(style.height ?? 0) - 20,
  //         }}
  //       />
  //     )
  //   }
  //   return undefined
  // }

  const navigate = useNavigate()

  const coverSelected = parsePathName(data.data[index].path) === parsePathName(data.cover ?? '')
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
    <div 
        style={{
            ...style,
            width: Number(style.width ?? 0) - 20,
            height: Number(style.height ?? 0) - 20,
        }}
        key={index} 
        className={data.pictureStyle(data.data[index].id, coverSelected)} id='image-container'
        onClick={(event) => {
          const temp = [...data.selectedPhotos]
          if((event.target as HTMLElement).id.includes('image')){
            if(data.selectedPhotos.find((path) => path.id === data.data[index].id) !== undefined){
              data.setSelectedPhotos(data.selectedPhotos.filter((path) => path.id != data.data[index].id))
            }
            else if(event.shiftKey && temp.length > 0){
              let minIndex = -1
              let maxIndex = index
              for(let i = 0; i < data.data.length; i++){
                if(data.selectedPhotos.find((path) => path.id === data.data[i].id) !== undefined){
                  minIndex = i
                  break
                }
              }
              for(let i = data.data.length - 1; index < i; i--){
                if(data.selectedPhotos.find((path) => path.id === data.data[i].id) !== undefined){
                  maxIndex = i
                  break
                }
              }
              minIndex = index < minIndex ? index : minIndex
              if(minIndex > -1){
                data.setSelectedPhotos(data.data.filter((_, i) => i >= minIndex && i <= maxIndex))
              }
            }
            else{
              temp.push(data.data[index])
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
      {data.urls[index].url.isLoading ? (
        <div className="flex items-center justify-center w-[200px] h-[300px] bg-gray-300 rounded sm:w-96">
          <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
          </svg>
        </div>
      ) : (
        data.urls[index].url.data ? (
          <img src={data.urls[index].url.data[1]} className="object-cover rounded-lg w-[200px] h-[300px] justify-self-center " id='image'/>
        ) : (
          <span>Failed to retrieve data</span>
        )
      )}
      <div className={`absolute bottom-0 inset-x-0 justify-end flex-row gap-1 me-3 ${data.controlsEnabled(data.data[index].id, false)}`}>
        <Tooltip content={(<p>Set as cover</p>)} placement="bottom" className="w-[110px]" style='light'>
          <button className="" onClick={() => {
            if(!coverSelected) {
              data.setCover(data.data[index].path)
              updateSet.mutate({
                set: data.set,
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
        <Tooltip content={(<p>Preview Fullscreen</p>)} placement="bottom" className="w-[140px]" style='light'>
          <button
            onClick={() => {
              navigate({
                to: `/photo-fullscreen`,
                search: {
                  set: data.set.id,
                  path: data.data[index].id
                }
              })
            }}
          >
            <CgArrowsExpandRight size={20} />
          </button>
        </Tooltip>
        <Tooltip content={(<p>Move to Top</p>)} placement="bottom" className="w-[110px]" style='light'>
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
        <Tooltip content={(<p>Move to Bottom</p>)} placement="bottom" className="w-[130px]" style='light'>
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
          }}>
            <HiOutlineBarsArrowDown size={20} />
          </button>
        </Tooltip>
        <Tooltip content={(<p>Delete</p>)} placement="bottom">
          <button className="" onClick={() => {
            data.setPicturePaths(data.data.filter((path) => path.id !== data.data[index].id))
            deleteMutation.mutate({
                picturePaths: [data.data[index]],
                collection: data.collection,
            })
          }}>
            <HiOutlineTrash size={20} />
          </button>
        </Tooltip>
      </div>
      <div className={`absolute top-1 inset-x-0 justify-center flex-row ${data.controlsEnabled(data.data[index].id, data.displayTitleOverride)}`}>
          <p id="image-name">{parsePathName(data.data[index].path)}</p>
      </div>
    </div>
  )
}