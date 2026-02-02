import { UseQueryResult } from "@tanstack/react-query"
import { PicturePath } from "../../../types"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { LazyImage } from "../../common/LazyImage"

interface PhotoCarouselProps {
  paths: PicturePath[],
  setId?: string,
  favorites?: string[]
  data: UseQueryResult<[string | undefined, string] | undefined>[]
  watermarkQuery?: UseQueryResult<[string | undefined, string] | undefined>
  setSelectedPath: Dispatch<SetStateAction<string>>,
  selectedPath: string,
}

export const PhotoCarousel = (props: PhotoCarouselProps) => {
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [offset, setOffset] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  const currentIndex = props.paths.findIndex((path) => path.id === props.selectedPath)

  useEffect(() => {
    const currentRef = imageRefs.current[currentIndex]
  if (!currentRef) return

  const observer = new ResizeObserver(() => {
    setOffset(imageRefs.current.reduce((prev, cur, index) => {
      if(index <= currentIndex){
        return prev + ((cur?.clientWidth === undefined || cur.clientWidth === 0 ? 100 : cur.clientWidth) + 4)
      }
      return prev
    }, 0) - ((imageRefs.current[currentIndex]?.clientWidth ?? 0) / 2))
  })

  observer.observe(currentRef)
  return () => observer.disconnect()
  }, [
    props.data, currentIndex, props.paths
  ])

  return (
    <div className="relative w-screen overflow-hidden">
      <div className='h-[150px] relative py-1'>
        <div 
          className="flex transition-transform duration-500 ease-out h-full"
          style={{
            transform: `translateX(calc(50vw - ${offset}px))`,
          }}
        >
          {props.data.map((url, index) => {
            return (
              <div
                key={index}
                ref={el => imageRefs.current[index] = el}
                onClick={() => {
                  const foundItem = props.paths.find((path) => path.id === url.data?.[0])

                  if(!foundItem) {
                    return
                  }

                  props.setSelectedPath(foundItem.id)
                  if(location.href.includes('favorites-fullscreen')){
                    navigate({ to: '.', search: { favorites: props.favorites, path: foundItem.id }})
                  } else if(location.href.includes('photo-fullscreen')) {
                    navigate({ to: '.', search: { set: props.setId, path: foundItem.id }})
                  }
                }}
                className={`rounded-sm border-2 hover:opacity-100 hover:border-opacity-100 opacity-80 border-opacity-60 scale-75 duration-500 ease-in-out
                  ${props.selectedPath === url.data?.[0] ? 'border-gray-300' : 'border-transparent hover:border-gray-300'}
                `} 
                style={{ height: '140px', transform: props.selectedPath === url.data?.[0] ? 'scale(1)' : '' }}
              >
                <LazyImage 
                  srcPathQuery={url}
                  watermarkQuery={props.watermarkQuery}
                  loading="lazy"
                  draggable={false}
                />
              </div>
            )}
          )}
        </div>
      </div>
    </div>
   
  )
}