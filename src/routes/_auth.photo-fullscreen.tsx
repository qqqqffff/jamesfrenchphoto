import { createFileRoute, invariant, redirect, useNavigate } from '@tanstack/react-router'
import { favoriteImageMutation, FavoriteImageMutationParams, getPhotoSetByIdQueryOptions, unfavoriteImageMutation, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { useMutation, useQueries } from '@tanstack/react-query'
import { getPathQueryOptions, getPhotoCollectionByIdQueryOptions } from '../services/collectionService'
import useWindowDimensions from '../hooks/windowDimensions'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart, HiOutlineDownload } from "react-icons/hi";
import { useState } from 'react'
import { parsePathName } from '../utils'
import { PhotoCarousel } from '../components/admin/collection/PhotoCarousel'
import { downloadImageMutation, DownloadImageMutationParams } from '../services/photoPathService'

interface PhotoFullScreenParams {
  set: string,
  path: string,
}

//TODO: revamp me with infinite query
export const Route = createFileRoute('/_auth/photo-fullscreen')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): PhotoFullScreenParams => ({
    set: (search.set as string) || '',
    path: (search.path as string) || '',
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context }) => {
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if(context.set === '' ||
    context.path === ''
    ) throw redirect({ to: destination })

    const set = await context.queryClient.ensureQueryData(
      getPhotoSetByIdQueryOptions(context.set, { 
        resolveUrls: false, 
        participantId: context.auth.user?.profile.activeParticipant?.id 
      })
    )

    const path = set?.paths.find((path) => path.id === context.path)

    if(!set || !path) throw redirect({ to: destination })

    const collection = await context.queryClient.ensureQueryData(
      getPhotoCollectionByIdQueryOptions(set.collectionId, { siPaths: false, siSets: false, siTags: false })
    )

    if(!collection) throw redirect({ to: destination })

    return {
      auth: context.auth,
      path: path,
      set: set,
      collection: collection
    }
  }

})

function RouteComponent() {
  const data = Route.useLoaderData()
  const [current, setCurrent] = useState(data.path)
  const dimensions = useWindowDimensions()
  const navigate = useNavigate()

  const paths = useQueries({
    queries: data.set.paths.map((path) => (
      getPathQueryOptions(path.path ?? '', path.id)
    ))
  })

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite){
        setCurrent({
          ...current,
          favorite: favorite[0],
        })
      }
    }
  })

  const unfavorite = useMutation({
    mutationFn: (params: UnfavoriteImageMutationParams) => unfavoriteImageMutation(params),
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
    <div className="bg-white flex flex-col items-center justify-center" style={{ height: dimensions.height }}>
      <div className='h-[50px] flex flex-row justify-between items-center px-4 text-gray-700 w-full border-b-gray-300 border-b-2'>
        <button 
          className='hover:border-gray-100 border border-transparent rounded-lg px-2 py-1 hover:bg-gray-200 hover:text-gray-500'
          onClick={() => {
            if(data.auth.admin) {
              navigate({ to: '/admin/dashboard/collection', search: { collection: data.set.collectionId, set: data.set.id }})
            } else{
              navigate({ to: '/client/dashboard' })
            }
          }}
        >
          Back
        </button>
        <div>{parsePathName(current.path)}</div>
        <div className='flex flex-row gap-4'>
          <button onClick={() => {
            if(current.favorite !== undefined && current.favorite !== 'temp'){
              unfavorite.mutate({
                id: current.favorite,
                options: {
                  logging: true
                }
              })
              setCurrent({
                ...current,
                favorite: undefined
              })
            }
            else if(current.favorite === undefined && data.auth.user?.profile.activeParticipant?.id !== undefined){
              favorite.mutate({
                pathId: current.id,
                participantId: data.auth.user.profile.activeParticipant?.id,
                collectionId: data.collection.id
              })
              setCurrent({
                ...current,
                favorite: 'temp'
              })
            }
            
          }}>
            <HiOutlineHeart size={24} className={`${current.favorite !== undefined ? 'fill-red-400' : ''}`}/>
          </button>
          {data.collection.downloadable && (
            <button 
              className={`${downloadImage.isPending ? 'cursor-wait' : ''}`}
              onClick={() => {
                if(!downloadImage.isPending){
                  downloadImage.mutate({
                    path: current.path,
                    options: {
                      logging: true
                    }
                  })
                }
              }}
            >
              <HiOutlineDownload size={24} />
            </button>
          )}
        </div>
      </div>
      <img src={paths.find((path) => path.data?.[0] === current.id)?.data?.[1]} style={{ height: dimensions.height - 200 }} />
      <PhotoCarousel 
        paths={data.set.paths} 
        data={paths} 
        setSelectedPath={setCurrent} 
        selectedPath={current}
        setId={data.set.id}
      />
      <button className='fixed top-1/2 right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500'
        onClick={() => {
          const currentIndex = data.set.paths.findIndex((path) => path.id === current.id)
          invariant(currentIndex !== -1)
          const nextIndex = currentIndex + 1 >= data.set.paths.length ? 0 : currentIndex + 1
          setCurrent(data.set.paths[nextIndex])
          navigate({ to: '.', search: { set: data.set.id, path: data.set.paths[nextIndex].id }})
        }}
      >
        <HiOutlineArrowRight size={32} />
      </button>
      <button className='fixed top-1/2 left-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500'
        onClick={() => {
          const currentIndex = data.set.paths.findIndex((path) => path.id === current.id)
          invariant(currentIndex !== -1)
          const nextIndex = currentIndex - 1 < 0 ? data.set.paths.length - 1 : currentIndex - 1
          setCurrent(data.set.paths[nextIndex])
          navigate({ to: '.', search: { set: data.set.id, path: data.set.paths[nextIndex].id }})
        }}
      >
        <HiOutlineArrowLeft size={32} />
      </button>
    </div>
  )
}
