import { useEffect, useRef, useState } from "react"
import { PhotoSet } from "../../types"

interface SetCarouselProps {
  setList: PhotoSet[],
  selectedSet: PhotoSet,
  setSelectedSet: (set: PhotoSet) => void
  currentIndex: number
}

export const SetCarousel = (props: SetCarouselProps) => {
  const textRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    setOffset(
      textRefs.current.reduce((prev, cur, index) => {
        if(index <= props.currentIndex){
          return prev + ((cur?.clientWidth === undefined || cur.clientWidth === 0 ? 100 : cur.clientWidth))
        }
        return prev
      }, 0)
      - 
      ((textRefs.current[props.currentIndex]?.clientWidth ?? 100) / 2)
    )
  }, [textRefs.current[props.currentIndex]])
  
  return (
    <div className="relative overflow-hidden py-2 flex flex-col rounded-xl">
      <div className="h-auto relative">
        <div
          className="flex transition-transform duration-500 ease-out h-full px-2"
          style={{
            transform: `translateX(calc(50% - ${offset}px))`
          }}
        >
          {props.setList.map((set, index) => {
            const selected = props.currentIndex === index
            return (
              <button 
                key={index}
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