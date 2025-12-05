import { useMutation } from "@tanstack/react-query"
import { CgArrowsExpandRight } from "react-icons/cg"
import { HiOutlineHeart, HiOutlineDownload } from "react-icons/hi"
import { DownloadImageMutationParams, PhotoPathService } from "../../services/photoPathService"
import { FavoriteImageMutationParams, UnfavoriteImageMutationParams, PhotoSetService } from "../../services/photoSetService"
import { PhotoCollection, PhotoSet, PicturePath, UserProfile } from "../../types"
import { Dispatch, SetStateAction } from "react"
import { useNavigate } from "@tanstack/react-router"

interface PhotoControlsProps {
  PhotoPathService: PhotoPathService,
  PhotoSetService: PhotoSetService,
  picture: PicturePath,
  set: PhotoSet
  collection: PhotoCollection,
  controlsEnabled: (id: string) => string
  profile?: UserProfile,
  token?: string,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet>>
}
export const PhotoControls = (props: PhotoControlsProps) => {
  const navigate = useNavigate()
  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => props.PhotoSetService.favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite) {
        props.parentUpdateSet((set) => ({
          ...set,
          paths: set.paths.map((path) => {
            if(path.id === favorite[1]){
              return ({
                ...path,
                favorite: favorite[0]
              })
            }
            return path
          })
        }))
      }
    }
  })

  const unfavorite = useMutation({
    mutationFn: (params: UnfavoriteImageMutationParams) => props.PhotoSetService.unfavoriteImageMutation(params)
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => props.PhotoPathService.downloadImageMutation(params),
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
    <div className={`
      absolute bottom-2 inset-x-0 justify-end flex-row gap-1 me-3 
      ${props.controlsEnabled(props.picture.id)}
    `}>
      <button
        title={`${props.picture.favorite !== undefined ? 'Unfavorite' : 'Favorite'}`}
        onClick={() => {
          if(!props.picture.favorite && props.profile?.email){
            favorite.mutate({
              pathId: props.picture.id,
              collectionId: props.collection.id,
              participantId: props.profile.email,
              options: {
                logging: true
              }
            })
            props.parentUpdateSet((set) => ({
              ...set,
              paths: set.paths.map((path) => path.id === props.picture.id ? ({
                ...path,
                favorite: 'temp'
              }) : path)
            }))
          }
          else if(props.picture.favorite && props.picture.favorite !== 'temp'){
            unfavorite.mutate({
              id: props.picture.favorite,
            })
            props.parentUpdateSet((set) => ({
              ...set,
              paths: set.paths.map((path) => path.id === props.picture.id ? 
                ({ ...path, favorite: undefined}) : path
              )
            }))
          }
        }}
      >
        <HiOutlineHeart size={24} className={`${props.picture.favorite !==  undefined ? 'fill-red-400' : ''} text-white`}/>
      </button>
      {props.collection.downloadable && (
        <button 
          title='Download' 
          className={`${downloadImage.isPending ? 'cursor-wait' : ''}`} 
          onClick={() => {
            if(!downloadImage.isPending){
              downloadImage.mutate({
                path: props.picture.path
              })
            }
          }}
        >
          <HiOutlineDownload size={24} className='text-white'/>
        </button>
      )}
      <button
        title='Preview Fullscreen'
        onClick={() => {
          navigate({
            to: `/photo-fullscreen`,
            search: {
              set: props.set.id,
              path: props.picture.id,
              temporaryToken: props.token
            }
          })
        }}
      >
        <CgArrowsExpandRight size={24} className='text-white' />
      </button>
    </div>
  )
}