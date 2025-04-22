import { CSSProperties, MutableRefObject } from "react"
import useWindowDimensions from "../../hooks/windowDimensions"
import { PhotoCollection } from "../../types"

interface CoverProps {
  path: string,
  collection: PhotoCollection,
  collectionRef?: MutableRefObject<HTMLDivElement | null>
  coverRef?: MutableRefObject<HTMLImageElement | null>
  style?: CSSProperties
  className?: string
}

export const Cover = (props: CoverProps) => {
  const dimensions = useWindowDimensions()

  return (
    <div 
      className={`
        flex flex-row${
        props.collection.coverType?.placement === 'left' ? '' :
        props.collection.coverType?.placement === 'right' ? '-reverse' : ' justify-center'
        } items-center mb-2 relative w-full 
        ${props.collection.coverType?.bgColor ? `bg-${props.collection.coverType.bgColor} bg-opacity-25` : 
        'bg-gray-200'} ` + props.className}
    >
      <div 
        className={`
          absolute flex flex-col place-self-center text-center 
          ${props.collection.coverType?.placement === 'left' ? 'right-4' :
            props.collection.coverType?.placement === 'right' ? 'left-4' : ''
          }
          ${props.collection.coverType?.textPlacement === 'top' ? 'top-4' :
            props.collection.coverType?.textPlacement === 'bottom' ? 'bottom-4' : ''
          }
        `}
      >
        <div 
          className={`
            bg-opacity-30 flex flex-col gap-2 px-10 py-4
            ${props.collection.coverType?.textColor !== 'white' ? 'bg-white': 'bg-gray-600'} 
            text-${props.collection.coverType?.textColor ?? 'black'}
          `}
        >
          <p className={`${dimensions.width > 1600 ? "text-7xl" : 'text-5xl' } font-thin font-birthstone`}>{props.collection.name}</p>
          {props.collection.coverType?.date !== 'none' && (
            <p className="italic text-xl">{new Date(props.collection.coverType?.date ?? props.collection.createdAt).toLocaleDateString()}</p>
          )}
        </div>
        <button 
          className={`
            border border-gray-400 rounded-lg py-1.5 px-2 animate-pulse mt-2 
            w-min whitespace-nowrap self-center hover:border-gray-700
            bg-opacity-50 ${props.collection.coverType?.textColor !== 'white' ? 'text-black bg-gray-100': 'text-white bg-gray-600'}
          `}
          onClick={() => {
            if(props.collectionRef?.current){
              props.collectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        >
          Go to Sets
        </button>
      </div>
      <img ref={props.coverRef} src={props.path} style={props.style ?? { maxHeight: '100vh', minHeight: '100vh' }} />
    </div>
  )
}