import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { PhotoSetService, FavoriteImageMutationParams, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { useMutation, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query'
import { CollectionService } from '../services/collectionService'
import { V6Client } from '@aws-amplify/api-graphql'
import useWindowDimensions from '../hooks/windowDimensions'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart, HiOutlineDownload } from "react-icons/hi";
import { useState } from 'react'
import { parsePathName } from '../utils'
import { PhotoCarousel } from '../components/admin/collection/PhotoCarousel'
import { DownloadImageMutationParams, PhotoPathService } from '../services/photoPathService'
import { Schema } from '../../amplify/data/resource'
import { LazyImage } from '../components/common/LazyImage'
import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi2'

interface PhotoFullScreenParams {
  set: string,
  path: string,
}

//TODO: could revamp me with infinite query
export const Route = createFileRoute('/_auth/photo-fullscreen')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): PhotoFullScreenParams => ({
    set: (search.set as string) || '',
    path: (search.path as string) || '',
  }),
  beforeLoad: ({ search }) => {
    return search
  },
  loader: async ({ context }) => {
    const client = context.client as V6Client<Schema>
    const collectionService = new CollectionService(client)
    const photoSetService = new PhotoSetService(client)
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if(
      context.set === '' ||
      context.path === ''
    ) throw redirect({ to: destination })

    const set = await context.queryClient.ensureQueryData(
      photoSetService.getPhotoSetByIdQueryOptions(context.set, { 
        resolveUrls: false, 
        participantId: context.auth.user?.profile.activeParticipant?.id 
      })
    )

    const path = set?.paths.find((path) => path.id === context.path)

    if(!set || !path) throw redirect({ to: destination })

    const collection = await context.queryClient.ensureQueryData(
      collectionService.getPhotoCollectionByIdQueryOptions(set.collectionId, { siPaths: false, siSets: false, siTags: false })
    )

    if(!collection) throw redirect({ to: destination })

    return {
      CollectionService: collectionService,
      PhotoPathService: new PhotoPathService(client),
      PhotoSetService: photoSetService,
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
  const [carouselHidden, setCarouselHidden] = useState(false)

  const { top, bottom } = (() => {
    const halfLength = dimensions.width / 2;
    const currentIndex = current.order

    let bottom = currentIndex > 0 ? currentIndex - 1 : 0
    let bottomAccumulatedWidth = (140 / current.height) * (current.width + 4) * 0.5
    let top = currentIndex < data.set.paths.length - 1 ? currentIndex + 1 : currentIndex
    let topAccumulatedWidth = bottomAccumulatedWidth

    while(bottom > 0 && bottomAccumulatedWidth < halfLength) {
      bottomAccumulatedWidth += (140 / data.set.paths[bottom].height) * (data.set.paths[bottom].width + 4) * 0.75
      bottom -= 1
    }

    while(top < data.set.paths.length - 1 && topAccumulatedWidth < halfLength) {
      topAccumulatedWidth += (140 / data.set.paths[top].height) * (data.set.paths[top].width + 4) * 0.75
      top += 1
    }

    return {
      top: top < data.set.paths.length - 1 ? top + 1 : top,
      bottom: bottom > 0 ? bottom - 1 : bottom
    }
  })()

  console.log(top, bottom)

  const paths: Record<string, UseQueryResult<[string | undefined, string], Error>> = 
  Object.fromEntries(
    useQueries({
      queries: data.set.paths.map((path) => (
        data.CollectionService.getPathQueryOptions(path.path ?? '', path.id)
      ))
    })
    .map((query, index) => {
      return [
        data.set.paths[index].id,
        query
      ]
    })
  )

  const watermarkQuery = useQuery({
    ...data.CollectionService.getPathQueryOptions(data.collection.watermarkPath ?? data.set.watermarkPath ?? ''),
    enabled: data.collection.watermarkPath !== undefined || data.set.watermarkPath !== undefined,
  })

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => data.PhotoSetService.favoriteImageMutation(params),
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
    mutationFn: (params: UnfavoriteImageMutationParams) => data.PhotoSetService.unfavoriteImageMutation(params),
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => data.PhotoPathService.downloadImageMutation(params),
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
    <div className="bg-white flex flex-col" style={{ height: dimensions.height }}>
      <div className='min-h-[50px] flex flex-row justify-between items-center px-4 text-gray-700 w-full '>
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
        <div className='font-bodoni italic font-semibold'>{parsePathName(current.path)}</div>
        <div className='flex flex-row gap-4'>
          <button 
            title={`${current.favorite !== undefined ? 'Unfavorite' : 'Favorite'}`}
            onClick={() => {
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
                  collectionId: data.collection.id,
                  setId: data.set.id,
                })
                setCurrent({
                  ...current,
                  favorite: 'temp'
                })
              }
              
            }}
          >
            <HiOutlineHeart size={24} className={`${current.favorite !== undefined ? 'fill-red-400 hover:fill-red-700' : 'hover:fill-red-200'}`}/>
          </button>
          {(data.collection.downloadable || data.auth.admin) && (
            <button 
              title='Download'
              className={`${downloadImage.isPending ? 'cursor-wait' : ''} hover:text-gray-500`}
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
          <button 
            title='Hide Carousel'
            className='p-1 hover:text-gray-400 hover:bg-gray-100 -ms-2'
            onClick={() => {
              setCarouselHidden(!carouselHidden)
            }}
          >
            {carouselHidden ? <HiOutlinePlus size={24}/> : <HiOutlineMinus size={24}/>}
          </button>
        </div>
      </div>
      <div className='flex flex-row border-y-2 border-y-gray-300 justify-center'>
        <LazyImage 
          srcPathQuery={paths[current.id]}
          watermarkQuery={data.collection.watermarkPath !== undefined || data.set.watermarkPath !== undefined ? watermarkQuery : undefined}
          style={{ 
            // minHeight: `calc(100vh - ${carouselHeight}px)`,
            height: `calc(100vh - ${50 + (carouselHidden ? 0 : 150)}px)`,
            minWidth: '200px',
          }}
          className='border duration-300 transition-all ease-in-out flex-1'
          loading='lazy'
          draggable={false}
        />
      </div>
      <div
        className='duration-300 ease-in-out overflow-hidden transition-all'
        style={{
          maxHeight: carouselHidden ? '0px' : `150px`,
          opacity: carouselHidden ? 0 : 1
        }}
      >
        <PhotoCarousel 
          paths={data.set.paths} 
          data={Object.values(paths)} 
          setSelectedPath={setCurrent} 
          selectedPath={current}
          setId={data.set.id}
        />
      </div>
      <button className='fixed top-1/2 right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500 hover:bg-gray-100'
        onClick={() => {
          const currentIndex = data.set.paths.findIndex((path) => path.id === current.id)
          if(currentIndex == -1) {
            //TODO: handle the error
          }
          const nextIndex = currentIndex + 1 >= data.set.paths.length ? 0 : currentIndex + 1
          setCurrent(data.set.paths[nextIndex])
          navigate({ to: '.', search: { set: data.set.id, path: data.set.paths[nextIndex].id }})
        }}
      >
        <HiOutlineArrowRight size={32} />
      </button>
      <button className='fixed top-1/2 left-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500 hover:bg-gray-100'
        onClick={() => {
          const currentIndex = data.set.paths.findIndex((path) => path.id === current.id)
          if(currentIndex == -1) {
            //TODO: handle the error
          }
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
