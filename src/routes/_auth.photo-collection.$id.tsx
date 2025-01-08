import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { getAllPicturePathsQueryOptions, getCollectionByIdQueryOptions, getCoverPathFromCollectionQueryOptions, getWatermarkPathFromCollectionQueryOptions } from '../services/collectionService'
import { PhotoCollection, PicturePath } from '../types'
import { useEffect, useRef } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Button } from 'flowbite-react'

export const Route = createFileRoute('/_auth/photo-collection/$id')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if(!params.id) throw redirect({ to: destination })
    const collection = await context.queryClient.ensureQueryData(getCollectionByIdQueryOptions(params.id))
    if(!collection) throw redirect({ to: destination })
    const coverUrl = (await context.queryClient.ensureQueryData(getCoverPathFromCollectionQueryOptions(collection)))?.[1]
    const watermarkUrl = (await context.queryClient.ensureQueryData(getWatermarkPathFromCollectionQueryOptions(collection)))?.[1]
    const paths = (await context.queryClient.ensureQueryData(getAllPicturePathsQueryOptions(collection.id)))

    const mappedCollection: PhotoCollection = {
      ...collection,
      coverPath: coverUrl,
      watermarkPath: watermarkUrl,
      paths: paths ?? []
    }

    return {
      collection: mappedCollection,
      auth: context.auth
    }
  },
  wrapInSuspense: true
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const collection = data.collection

  const coverPath = {
    url: collection.coverPath ??
      (collection.paths.length > 0 ? collection.paths[0].url : undefined) 
  }

  const navigate = useNavigate()
  const coverPhotoRef = useRef<HTMLImageElement | null>(null)
  const navigateControls = data.auth.admin
  const dimensions = useWindowDimensions()

  useEffect(() => {
    if(coverPhotoRef && coverPhotoRef.current) {
      coverPhotoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [coverPhotoRef.current])    

  const formattedCollection: PicturePath[][] = []
  let maxIndex = (dimensions.width > 1600 ? 5 : (dimensions.width > 800 ? 3 : 1))
  for(let i = 0; i < maxIndex; i++){
    formattedCollection.push([] as PicturePath[])
  }

  let curIndex = 0
  collection.paths
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

  const gridClass = `grid grid-cols-${String(maxIndex)} gap-4 mx-4`

  return (
    <div className="font-main">
      <div className="flex flex-row justify-center mb-10">
        <Button className='mt-4' onClick={() => navigate({ to: `/${navigateControls ? 'admin' : 'client'}/dashboard` })}>{navigateControls ? 'Return to Admin Console' : 'Return Home'}</Button>
      </div>
      <div className="flex flex-row justify-center items-center mb-2 relative bg-gray-200" 
        onContextMenu={(e) => {
          if(!collection.downloadable) e.preventDefault()
        }}
      >
        <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
          <p className={`${dimensions.width > 1600 ? "text-5xl" : 'text-3xl' } font-thin opacity-90`}>{collection.name}</p>
          {/* <p className="italic text-xl">{new Date(collection.createdAt).toLocaleDateString()}</p> */}
        </div>
        <img ref={coverPhotoRef} src={coverPath.url} style={{ maxHeight: dimensions.height }} />
      </div>
      <div className={gridClass} >
        {formattedCollection  && formattedCollection.length > 0 && formattedCollection
          .map((subCollection, index) => {
            return (
              <div key={index} className="flex flex-col gap-4">
                {subCollection.map((picture, s_index) => {
                  return (
                    <div key={s_index} className="relative" onContextMenu={(e) => {
                      if(!collection.downloadable) e.preventDefault()
                    }}>
                      <img 
                        className="h-auto max-w-full rounded-lg" src={picture.url} alt="" 
                      />
                      <img 
                        src={collection.watermarkPath}
                        className="absolute inset-0 max-w-[200px] max-h-[300px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                        alt=""
                      />
                    </div>
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
