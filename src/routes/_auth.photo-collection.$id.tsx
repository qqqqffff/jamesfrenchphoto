import { createFileRoute, invariant, redirect, useNavigate } from '@tanstack/react-router'
import { getPhotoCollectionByIdQueryOptions, getPathQueryOptions } from '../services/collectionService'
import { favoriteImageMutation, FavoriteImageMutationParams, getAllPicturePathsByPhotoSetQueryOptions, unfavoriteImageMutation, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { PhotoCollection, PhotoSet, PicturePath } from '../types'
import { useEffect, useRef, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Button, Tooltip } from 'flowbite-react'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { SetCarousel } from '../components/collection/SetCarousel'
import { CgArrowsExpandRight } from 'react-icons/cg'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart } from 'react-icons/hi2'
import { downloadImageMutation, DownloadImageMutationParams } from '../services/photoPathService'

interface PhotoCollectionParams {
  set?: string,
}
//TODO: validation on route
export const Route = createFileRoute('/_auth/photo-collection/$id')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): PhotoCollectionParams => ({
    set: (search.set as string) || undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context, params }) => {
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if(!params.id) throw redirect({ to: destination })
    const collection = await context.queryClient.ensureQueryData(getPhotoCollectionByIdQueryOptions(params.id))
    // if(!collection || collection.sets.length === 0 || !collection.published) throw redirect({ to: destination })
    invariant(collection)
    const set = collection.sets.find((set) => set.id === context.set)
    const watermarkUrl = (collection.watermarkPath !== undefined || set?.watermarkPath !== undefined) ?  (
      await context.queryClient.ensureQueryData(
        getPathQueryOptions(set?.watermarkPath ?? collection.watermarkPath ?? '')))?.[1] : undefined
    
    const paths = (await context.queryClient.ensureQueryData(getAllPicturePathsByPhotoSetQueryOptions(set?.id ?? collection.sets[0].id)))
    // if(!coverUrl) throw redirect({ to: destination })

    const mappedCollection: PhotoCollection = {
      ...collection,
      watermarkPath: watermarkUrl,
    }

    const mappedSet: PhotoSet = {
      ...(set ?? collection.sets[0]),
      paths: paths ?? [],
    }

    return {
      collection: mappedCollection,
      set: mappedSet,
      auth: context.auth,
    }
  },
  wrapInSuspense: true
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const collection = data.collection
  const [set, setSet] = useState(data.set)
  const [currentControlDisplay, setCurrentControlDisplay] = useState<string>()

  const coverPath = useQuery(getPathQueryOptions(data.collection.coverPath ?? ''))

  const navigate = useNavigate()
  const coverPhotoRef = useRef<HTMLImageElement | null>(null)
  const collectionRef = useRef<HTMLDivElement | null>(null)
  const navigateControls = data.auth.admin
  const dimensions = useWindowDimensions()

  useEffect(() => {
    if(coverPhotoRef && coverPhotoRef.current) {
      coverPhotoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [coverPhotoRef.current])

  const paths = useQueries({
    queries: set.paths.map((path) => (
      getPathQueryOptions(path.path, path.id)
    ))
  })

  const formattedCollection: PicturePath[][] = []
  let maxIndex = (dimensions.width > 1600 ? 5 : (
    dimensions.width > 800 ? 
      3 : 1
  ))
  for(let i = 0; i < maxIndex; i++){
    formattedCollection.push([] as PicturePath[])
  }

  let curIndex = 0
  set.paths
    .sort((a, b) => a.order - b.order)
    .forEach((picture) => {
      formattedCollection[curIndex].push(picture)
      if(curIndex + 2 > maxIndex){
        curIndex = 0
      }
      else{
        curIndex = curIndex + 1
      }
    })

  const gridClass = `grid grid-cols-${String(maxIndex)} gap-4 mx-4 mt-1`

  function controlsEnabled(id: string){
    if(id === currentControlDisplay) return 'flex'
    return 'hidden'
  }

  const currentIndex = collection.sets.findIndex((colSet) => colSet.id === set.id)

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite) {
      //   setSet({
      //     ...set,
      //     paths: set.paths.map((path) => {
      //     if(path.id === data.data[index].id){
      //       return ({
      //         ...path,
      //         favorite: favorite
      //       })
      //     }
      //     return path
      //   })})
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
    <div 
      className="font-main" 
      onContextMenu={(e) => {
        if(!collection.downloadable) e.preventDefault()
      }}
    >
      <div className="flex flex-row justify-center mb-10">
        <Button className='mt-4' 
          onClick={() => 
            navigate({ 
              to: `/${navigateControls ? 'admin' : 'client'}/dashboard${navigateControls ? '/collection' : ''}`, 
              search: { set: navigateControls ? set.id : undefined, collection: navigateControls ? collection.id : undefined } 
            })
          }
        >{navigateControls ? 'Return to Admin Console' : 'Return Home'}</Button>
      </div>
      <div className="flex flex-row justify-center items-center mb-2 relative bg-gray-200" 
        
      >
        <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
          <p className={`${dimensions.width > 1600 ? "text-5xl" : 'text-3xl' } font-thin opacity-90`}>{collection.name}</p>
          <p className="italic text-xl opacity-90">{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
          <button 
            className='border rounded-lg py-1.5 px-2 animate-pulse mt-10'
            onClick={() => {
              if(collectionRef.current){
                collectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
          >
            Go to Sets
          </button>
        </div>
        <img ref={coverPhotoRef} src={coverPath.data?.[1]} style={{ maxHeight: dimensions.height }} />
      </div>
      <div className='flex flex-row items-center px-4 sticky gap-2 top-0 z-10 bg-white py-1 border-b-gray-300 border-b' ref={collectionRef}>
        <div className='flex flex-col items-start font-mono'>
          <span className='font-bold text-2xl'>James French Photogrpahy</span>
          <span className='italic'>{set.name}</span>
        </div>
        <button className='text-gray-700 rounded-lg p-1 z-50 hover:text-gray-500 bg-white'
          onClick={() => {
            const nextIndex = currentIndex - 1 < 0 ? collection.sets.length - 1 : currentIndex - 1
            setSet({...collection.sets[nextIndex]})
          }}
        >
          <HiOutlineArrowLeft size={24} />
        </button>
        <SetCarousel 
          setList={data.collection.sets}
          setSelectedSet={setSet}
          selectedSet={set}
          currentIndex={currentIndex}
        />
        <button className='text-gray-700 rounded-lg p-1 z-50 hover:text-gray-500 bg-white'
          onClick={() => {
            const nextIndex = currentIndex + 1 >= collection.sets.length ? 0 : currentIndex + 1
            setSet({...collection.sets[nextIndex]})
          }}
        >
          <HiOutlineArrowRight size={24} />
        </button>
      </div>
      <div className={gridClass} >
        {formattedCollection  && formattedCollection.length > 0 && formattedCollection
          .map((subCollection, index) => {
            return (
              <div key={index} className="flex flex-col gap-4">
                {subCollection.map((picture, s_index) => {
                  const url = paths.find((path) => path.data?.[0] === picture.id)
                  const favorite = picture.favorite !== undefined
                  return (
                    <button 
                      key={s_index} 
                      className="relative" 
                      onContextMenu={(e) => {
                        if(!collection.downloadable) e.preventDefault()
                      }}
                      onMouseEnter={() => setCurrentControlDisplay(picture.id)}
                      onMouseLeave={() => setCurrentControlDisplay(undefined)}
                      onClick={() => setCurrentControlDisplay(picture.id)}
                    >
                      { url?.isLoading ? (
                        <div className="flex items-center justify-center h-[100px] bg-gray-300 rounded-lg">
                          <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                          </svg>
                        </div>
                      ) : (
                        <>
                          <img 
                            className={`h-auto max-w-full rounded-lg border-2 ${currentControlDisplay === picture.id ? 'border-gray-300' : 'border-transparent'}`} src={url?.data?.[1]} alt="" 
                          />
                          <img 
                            src={collection.watermarkPath}
                            className="absolute inset-0 max-w-[200px] max-h-[300px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                            alt=""
                          />
                        </>
                      )}
                      <div className={`absolute bottom-0 inset-x-0 justify-end flex-row gap-1 me-3 ${controlsEnabled(picture.id)}`}>
                        <Tooltip content={(<p>Preview Fullscreen</p>)} placement="bottom" className="whitespace-nowrap" style='light'>
                          <button
                            onClick={() => {
                              navigate({
                                to: `/photo-fullscreen`,
                                search: {
                                  set: set.id,
                                  path: picture.id
                                }
                              })
                            }}
                          >
                            <CgArrowsExpandRight size={20} />
                          </button>
                        </Tooltip>
                        <Tooltip content={<p>Favorite</p>} placement='bottom' className='whitespace-nowrap' style='light'>
                            <button
                              onClick={() => {
                                // if(favorite){
                                //   setFavorites(favorites.filter((favorite) => favorite !== picture.id))
                                // }
                                // else{
                                //   setFavorites([...favorites, picture.id])
                                // }
                              }}
                            >
                              <HiOutlineHeart size={20} className={`${favorite ? 'fill-red-400' : ''}`}/>
                            </button>
                        </Tooltip>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })
        }
      </div>
      <div className="w-full flex flex-row items-center justify-center">
        <Button
          color='light'
          className="m-4 self-center"
          onClick={() => {
            if(coverPhotoRef && coverPhotoRef.current){
              coverPhotoRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              })
            }
          }}
        >Return to Top</Button>
      </div>
  </div>
  )
}
