import { createFileRoute, invariant, redirect, useNavigate } from '@tanstack/react-router'
import { favoriteImageMutation, FavoriteImageMutationParams, getPhotoSetByIdQueryOptions, unfavoriteImageMutation, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { useMutation, useQueries } from '@tanstack/react-query'
import { getPathQueryOptions } from '../services/collectionService'
import useWindowDimensions from '../hooks/windowDimensions'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart, HiOutlineDownload } from "react-icons/hi";
import { useState } from 'react'
import { parsePathName } from '../utils'
import { PhotoCarousel } from '../components/admin/collection/PhotoCarousel'

interface PhotoFullScreenParams {
  set: string,
  path: string
}

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
      getPhotoSetByIdQueryOptions(context.set, { resolveUrls: false })
    )

    const path = set?.paths.find((path) => path.id === context.path)

    if(!set || !path) throw redirect({ to: destination })

    return {
      auth: context.auth,
      path: path,
      set: set,
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
    onSettled: (id) => {
      if(id){
        setCurrent({
          ...current,
          favorite: id,
        })
      }
    }
  })

  const unfavorite = useMutation({
    mutationFn: (params: UnfavoriteImageMutationParams) => unfavoriteImageMutation(params),
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
            else if(current.favorite === undefined && data.auth.user?.profile.email !== undefined){
              favorite.mutate({
                pathId: current.id,
                user: data.auth.user.profile.email
              })
              setCurrent({
                ...current,
                favorite: 'temp'
              })
            }
            
          }}>
            <HiOutlineHeart size={24} className={`${current.favorite !== undefined ? 'fill-red-400' : ''}`}/>
          </button>
          <button>
            <HiOutlineDownload size={24} />
          </button>
        </div>
      </div>
      <img src={paths.find((path) => path.data?.[0] === current.id)?.data?.[1]} style={{ height: dimensions.height - 200 }} />
      <PhotoCarousel 
        paths={data.set.paths} 
        data={paths} 
        setSelectedPath={setCurrent} 
        selectedPath={current}      
      />
      <button className='fixed top-1/2 right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500'
        onClick={() => {
          const currentIndex = data.set.paths.findIndex((path) => path.id === current.id)
          invariant(currentIndex !== -1)
          const nextIndex = currentIndex + 1 >= data.set.paths.length ? 0 : currentIndex + 1
          setCurrent(data.set.paths[nextIndex])
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
        }}
      >
        <HiOutlineArrowLeft size={32} />
      </button>
    </div>
  )
}
