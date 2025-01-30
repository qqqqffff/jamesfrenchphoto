import { UseQueryResult } from "@tanstack/react-query"
import { PicturePath } from "../../../types"
import { invariant } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

interface PhotoCarouselProps {
  paths: PicturePath[]
  data: UseQueryResult<[string | undefined, string] | undefined>[]
  setSelectedPath: (path: PicturePath) => void,
  selectedPath: PicturePath,
}

export const PhotoCarousel = (props: PhotoCarouselProps) => {
  const imageRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [averageWidth, setAverageWidth] = useState(90)

  useEffect(() => {
    setAverageWidth((imageRefs.current
      .reduce((prev, cur) => prev += (cur?.offsetWidth ?? 0 + 4), 0) 
    ) / imageRefs.current.length)
  }, [props.data])

  const currentIndex = props.paths.findIndex((path) => path.id === props.selectedPath.id)

  return (
    <div className="relative w-screen overflow-hidden">
      <div className='h-[150px] relative'>
        <div 
          className="flex transition-transform duration-500 ease-out h-full"
          style={{
            transform: `translateX(calc(50vw - ${currentIndex * averageWidth}px))`,
          }}
        >
          {props.data.map((url, index) => {
            return (
              <div key={index}>
                {
                  url.isLoading ? (
                    <div className="flex items-center justify-center h-[100px] bg-gray-300 rounded-sm">
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
                          hover:opacity-100 opacity-90 rounded-sm scale-75 duration-500 ease-in-out'
                        onClick={() => {
                          const foundItem = props.paths.find((path) => path.id === url.data?.[0])
                          invariant(foundItem)

                          props.setSelectedPath(foundItem)
                        }}
                        style={{
                          transform: props.selectedPath.id === url.data[0] ? 'scale(1)' : ''
                        }}
                      >
                        <img src={url.data[1]} className='rounded-sm' style={{ height: '140px' }}/>
                      </button>
                    ) : (
                      <span>Failed to retrieve data</span>
                    )
                  )
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
   
  )
}