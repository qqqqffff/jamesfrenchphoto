import { useEffect, useRef } from "react"
import { PhotoSet } from "../../types"

interface SetCarouselProps {
  setList: PhotoSet[],
  selectedSet: PhotoSet,
  setSelectedSet: (set: PhotoSet) => void
  currentIndex: number
}

export const SetCarousel = (props: SetCarouselProps) => {
  const textRefs = useRef<(HTMLButtonElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if(containerRef.current){
      const ref = textRefs.current.find((ref) => ref?.id === props.selectedSet.id)
      ref?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [containerRef.current, props.selectedSet])

  
  return (
    <div className="relative w-[20%] overflow-hidden py-2 flex flex-col rounded-xl">
      <div className="h-auto relative">
        <div
          ref={containerRef}
          className="flex transition-transform duration-500 ease-out h-full px-2"
          style={{
            // transform: `translateX(calc(20vw - ${averageWidth / 2}px - ${currentIndex * averageWidth}px))`
          }}
        >
          {props.setList.map((set, index) => {
            const selected = props.currentIndex === index
            return (
              <button 
                ref={el => textRefs.current[index] = el}
                id={set.id}
                className={`
                  hover:border-gray-300 border-2 whitespace-nowrap text-xl
                  hover:opacity-100 opacity-90 rounded-xl px-2 py-1 scale-75 duration-500
                  ease-in-out h-auto overflow-clip ${selected ? 'border-gray-200' : 'border-transparent'}
                `}
                onClick={() => {
                  props.setSelectedSet(set)
                }}
                style={{
                  transform: props.selectedSet.id === set.id ? 'scale(1)' : ''
                }}
              >
                {set.name}
              </button>
            )
          })}
        </div>
      </div>
      
    </div>
  )
}