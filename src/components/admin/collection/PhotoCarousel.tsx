import { UseQueryResult } from "@tanstack/react-query"
import { PhotoSet, PicturePath } from "../../../types"
import { useLocation, useNavigate } from "@tanstack/react-router"
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { LazyImage } from "../../common/LazyImage"
import { calculatePictureHeight } from "../../../functions/photoFunctions"

interface PhotoCarouselProps {
  paths: PicturePath[],
  set: PhotoSet,
  favorites?: string[]
  data: UseQueryResult<[string | undefined, string] | undefined>[]
  watermarkQuery?: UseQueryResult<[string | undefined, string] | undefined>
  setSelectedPath: Dispatch<SetStateAction<string>>,
  selectedPath: string,
  dimensions: { width: number, height: number }
}

interface SlideInformation {
  start: React.Touch,
  current: React.Touch,
  finished: boolean,
  startIndex: number
}

export const PhotoCarousel = (props: PhotoCarouselProps) => {
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [offset, setOffset] = useState(0)
  const [sliding, setSliding] = useState<SlideInformation | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const currentIndex = props.paths.findIndex((path) => path.id === props.selectedPath)

  useEffect(() => {
    const currentRef = imageRefs.current[currentIndex]
    if (!currentRef) return

    const observer = new ResizeObserver(() => {
      setOffset(prev => sliding !== null && !sliding.finished ? prev : imageRefs.current.reduce((prev, cur, index) => {
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

  const differential = (sliding?.current.clientX ?? 0) - (sliding?.start.clientX ?? 0)
  console.log(offset)

  return (
    <div className="relative w-screen overflow-hidden">
      <div className='h-[150px] relative py-1'>
        <div 
          className="flex transition-transform duration-500 ease-out h-full"
          style={{
            transform: `translateX(calc(50vw - ${offset}px))`,
            translate: differential
          }}
          onMouseDown={(event) => {
            if(sliding === null || !sliding.finished) {
              const slide: React.Touch = {
                identifier: 0,
                clientX: event.clientX,
                clientY: event.clientY,
                target: event.target,
                screenX: event.screenX,
                screenY: event.screenY,
                pageX: event.pageX,
                pageY: event.pageY
              }
              setSliding({
                startIndex: currentIndex,
                start: slide,
                current: slide,
                finished: false
              })
            }
          }}
          onMouseMove={(event) => {
            if(sliding !== null && !sliding.finished) {
              const slide: React.Touch = {
                identifier: 0,
                clientX: event.clientX,
                clientY: event.clientY,
                target: event.target,
                screenX: event.screenX,
                screenY: event.screenY,
                pageX: event.pageX,
                pageY: event.pageY
              }
              const currentPicture = imageRefs.current[currentIndex]
              if(currentPicture) {
                const currentBounding = currentPicture.getBoundingClientRect()
                const currentWidth = currentBounding.width
                const currentX = currentBounding.x

                props.setSelectedPath(prev => {
                  const midPoint = props.dimensions.width / 2
                  if((currentX + currentWidth) < midPoint && currentIndex !== props.set.paths.length - 1) {
                    const nextPath = props.set.paths[currentIndex + 1]
                    navigate({ to: '.', search: { set: props.set.id, path: nextPath.id }})
                    return nextPath.id
                  }
                  else if(currentX > midPoint && currentIndex !== 0) {
                    const nextPath = props.set.paths[currentIndex - 1]
                    navigate({ to: '.', search: { set: props.set.id, path: nextPath.id }})
                    return nextPath.id
                  }
                  return prev
                })
                setSliding({
                  start: sliding.start,
                  startIndex: sliding.startIndex,
                  current: slide,
                  finished: false
                })
                return
              }

              setSliding({
                start: sliding.start,
                startIndex: sliding.startIndex,
                current: slide,
                finished: false
              })
            }
          }}
          onMouseUp={(event) => {
            const end: React.Touch = {
              identifier: 0,
              clientX: event.clientX,
              clientY: event.clientY,
              target: event.target,
              screenX: event.screenX,
              screenY: event.screenY,
              pageX: event.pageX,
              pageY: event.pageY
            }
            const endDifferential = end.clientX - (sliding?.start.clientX ?? 0)
            const minThreshold = 50
            // if(
            //   end !== undefined &&
            //   sliding !== null && 
            //   sliding.finished === null &&
            //   currentPath !== undefined &&
            //   props.set !== undefined &&
            //   Math.abs(endDifferential) > minThreshold
            // ) {
            //   const nextIndex = endDifferential > 0 ? (
            //     currentPath.order - 1 < 0 ? props.set.paths.length - 1 : currentPath.order - 1
            //   ) : (
            //     currentPath.order + 1 >= props.set.paths.length ? 0 : currentPath.order + 1
            //   )
            if(sliding && sliding.startIndex !== currentIndex) {
              setTimeout(() => {
                setSliding(null)
              }, 500)
              setSliding({
                ...sliding,
                finished: true
              })
              setOffset(imageRefs.current.reduce((prev, cur, index) => {
                console.log(cur?.clientWidth)
                if(index <= currentIndex){
                  return prev + ((cur?.clientWidth === undefined || cur.clientWidth === 0 ? 100 : cur.clientWidth) + 4)
                }
                return prev
              }, 0) - ((imageRefs.current[currentIndex]?.clientWidth ?? 0)))
              return
            }
            setSliding(null)
              
            //   props.setSelectedPath(props.set.paths[nextIndex].id)
            //   navigate({ to: '.', search: { set: props.set.id, path: props.set.paths[nextIndex].id }})
            //   setSliding({
            //     ...sliding,
            //     current: end,
            //     finished: currentPath
            //   })
            //   return
            // }
            // setSliding(null)
          }}
          onTouchStart={(event) => {
            if(sliding === null || !sliding.finished) {
              setSliding({
                start: event.touches[0],
                startIndex: currentIndex,
                current: event.touches[0],
                finished: false
              })
            }
          }}
          onTouchMove={(event) => {
            if(sliding && !sliding.finished) {
              setSliding({
                start: sliding.start,
                startIndex: sliding.startIndex,
                current: Array.from(event.changedTouches).find(touch => touch.identifier === sliding.start.identifier) ?? sliding.current,
                finished: false
              })
            }
          }}
          onTouchEnd={(event) => {
            const end = Array.from(event.changedTouches).find(touch => touch.identifier === sliding?.start.identifier)
            const endDifferential = (end?.clientX ?? 0) - (sliding?.start.clientX ?? 0)
            const minThreshold = 50
            // if(
            //   end !== undefined &&
            //   sliding !== null && 
            //   sliding.finished === null && 
            //   currentPath !== undefined && 
            //   props.set !== undefined && 
            //   Math.abs(endDifferential) > minThreshold
            // ) {  
            //   const nextIndex = endDifferential > 0 ? (
            //     currentPath.order - 1 < 0 ? props.set.paths.length - 1 : currentPath.order - 1
            //   ) : (
            //     currentPath.order + 1 >= props.set.paths.length ? 0 : currentPath.order + 1
            //   )
            //   setTimeout(() => {
            //     setSliding(null)
            //   }, 500)
            //   props.setSelectedPath(props.set.paths[nextIndex].id)
            //   navigate({ to: '.', search: { set: props.set.id, path: props.set.paths[nextIndex].id }})
            //   setSliding({
            //     ...sliding,
            //     current: end,
            //     finished: currentPath
            //   })
            //   return
            // }
            if(minThreshold > 50) {
              setTimeout(() => {
                setSliding(null)
              }, 500)
            }
            setSliding(null)
          }}
        >
          {props.data.map((url, index) => {
            const foundItem = props.paths.find((path) => path.id === url.data?.[0])
            const maxHeight = foundItem !== undefined ? (
              calculatePictureHeight(foundItem, props.dimensions, 140)
            ) : (
              140
            )

            return (
              <div
                key={index}
                ref={el => imageRefs.current[index] = el}
                onClick={() => {
                  if(foundItem && props.selectedPath !== foundItem?.id && sliding === null) {
                    props.setSelectedPath(foundItem.id)
                    if(location.href.includes('favorites-fullscreen')){
                      navigate({ to: '.', search: { favorites: props.favorites, path: foundItem.id }})
                    } else if(location.href.includes('photo-fullscreen')) {
                      navigate({ to: '.', search: { set: props.set.id, path: foundItem.id }})
                    }
                  }
                }}
                className={`
                  flex flex-row items-center rounded-sm border-2 hover:opacity-100 hover:border-opacity-100 
                  opacity-80 border-opacity-60 scale-75 duration-500 ease-in-out justify-center
                  ${props.selectedPath === foundItem?.id ? 'border-gray-300' : 'border-transparent hover:border-gray-300'}
                `} 
                style={{ 
                  height: '140px',
                  transform: props.selectedPath === foundItem?.id ? 'scale(1)' : '' 
                }}
              >
                <LazyImage 
                  srcPathQuery={url}
                  watermarkQuery={props.watermarkQuery}
                  loading="lazy"
                  draggable={false}
                  style={{ 
                    height: '140px', 
                    maxHeight: `${maxHeight}px`,
                    transform: props.selectedPath === foundItem?.id ? 'scale(1)' : '' 
                  }}
                />
              </div>
            )}
          )}
        </div>
      </div>
    </div>
   
  )
}