import { createFileRoute, redirect } from '@tanstack/react-router'
import { getPhotoSetByIdQueryOptions } from '../services/photoSetService'
import { useQueries, useQuery } from '@tanstack/react-query'
import { getPathQueryOptions } from '../services/collectionService'
import useWindowDimensions from '../hooks/windowDimensions'
import { PicturePath } from '../types'
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import { useRef, useState } from 'react'
import { parsePathName } from '../utils'

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

    const left: PicturePath[] = []
    const right: PicturePath[] = [...set.paths]

    //reorder array so that target is at front
    while(right[0].order !== path.order){
      const item = right.shift()
      if(item){
        right.push(item)
      }
    }

    //remove index
    right.shift()
    for(let i = 0; i < ((set.paths.length - 1) / 2); i++){
      const item = right.pop()
      if(item){
        left.push(item)
      }
    }

    return {
      auth: context.auth,
      path: path,
      set: set,
      left: left,
      right: right,
    }
  }

})

function RouteComponent() {
  const data = Route.useLoaderData()
  const [left, setLeft] = useState(data.left)
  const [right, setRight] = useState(data.right)
  const [current, setCurrent] = useState(data.path)
  const imageRefs = useRef<(HTMLButtonElement | null)[]>([])
  const url = useQuery(getPathQueryOptions(current.path ?? ''))
  const dimensions = useWindowDimensions()

  const [transformation, setTransformation] = useState<string>()

  const leftUrls = useQueries({
    queries: left.map((path) => {
      return getPathQueryOptions(path.path ?? '')
    })
  })

  const rightUrls = useQueries({
    queries: right.map((path) => {
      return getPathQueryOptions(path.path ?? '')
    })
  })

  let quantity = dimensions.width / 100
  quantity = quantity > 4 ? 4 : quantity

  console.log(imageRefs)

  return (
    <div className="bg-white flex flex-col items-center justify-center" style={{ height: dimensions.height }}>
      <div className='h-[50px] flex flex-row justify-between items-center px-4 text-gray-700 w-full border-b-gray-300 border-b-2'>
        <div>Back</div>
        <div>{parsePathName(current.path)}</div>
        <div>heart</div>
      </div>
      <img src={url.data?.[1]} style={{ height: dimensions.height - 200 }} />
      <div 
        className='
          h-[150px] flex flex-row bg-white items-center w-full justify-center 
          gap-2 transition-transform duration-300 ease-in-out'
        style={{
          transform: transformation
        }}
      >
        {leftUrls.map((url, index) => {
          if(index > quantity) return undefined

          const offset = imageRefs.current.reduce((prev, cur, refIndex) => {
            if(cur && refIndex <= quantity && refIndex > index - 1){
              return prev + cur.offsetWidth + 8
            }
            return prev
          }, 0)

          console.log(offset)

          return (
            <>
              {
                url.isLoading ? (
                  <div className="flex items-center justify-center h-[100px] bg-gray-300 rounded sm:w-96">
                    <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                      <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                    </svg>
                  </div>
                ) : (
                  url.data ? (
                    <button 
                      ref={el => imageRefs.current[index] = el} 
                      className='
                      hover:border-gray-300 border-2 border-transparent 
                        hover:opacity-100 opacity-90 rounded-sm'
                        onClick={() => {
                          setTransformation(`translateX(${offset}px)`)
                        }}
                    >
                      <img src={url.data[1]} className={`h-[100px] rounded-sm`}/>
                    </button>
                  ) : (
                    <span>Failed to retrieve data</span>
                  )
                )
              }
            </>
          )
        })}
        <img src={url.data?.[1]} className='h-[140px] rounded-lg' />
        {rightUrls.map((url, index) => {
          if(index > quantity) return undefined

          const offset = imageRefs.current.reduce((prev, cur, refIndex) => {
            if(cur && refIndex - quantity - 1 <= index && refIndex > quantity){
              return prev + cur.offsetWidth + 8
            }
            return prev
          }, 0)

          return (
            <>
              {
                url.isLoading ? (
                  <div className="flex items-center justify-center h-[100px] bg-gray-300 rounded sm:w-96">
                    <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                      <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                    </svg>
                  </div>
                ) : (
                  url.data ? (
                    <button 
                      ref={el => imageRefs.current[index + quantity + 1] = el} 
                      className='
                        hover:border-gray-300 border-2 border-transparent 
                        hover:opacity-100 opacity-90 rounded-sm'
                      onClick={() => {
                        setTransformation(`translateX(-${offset}px)`)
                      }}
                    >
                      <img src={url.data[1]} className={`h-[100px] rounded-sm`}/>
                    </button>
                  ) : (
                    <span>Failed to retrieve data</span>
                  )
                )
              }
            </>
          )
        })}
      </div>
      <button className='fixed top-1/2 right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500'
        onClick={() => {
          setTransformation(`translateX(-${imageRefs.current[quantity - 1]?.offsetWidth ?? 0 + 8}px)`)
        }}
      >
        <HiOutlineArrowRight size={32} />
      </button>
      <button className='fixed top-1/2 left-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500'
        onClick={() => {
          setTransformation(`translateX(${imageRefs.current[quantity + 1]?.offsetWidth ?? 0 + 8}px)`)
        }}
      >
        <HiOutlineArrowLeft size={32} />
      </button>
    </div>
  )
}
