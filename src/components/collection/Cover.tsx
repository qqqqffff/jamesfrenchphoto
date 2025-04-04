import { CSSProperties, MutableRefObject } from "react"
import useWindowDimensions from "../../hooks/windowDimensions"
import { CoverType, PhotoCollection } from "../../types"

interface CoverProps {
  coverType?: CoverType
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
    <div className={"flex flex-row justify-center items-center mb-2 relative bg-gray-200 w-full " + props.className}>
      <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
        <div className='bg-white bg-opacity-30 flex flex-col gap-2 px-10 py-4'>
          <p className={`${dimensions.width > 1600 ? "text-7xl" : 'text-5xl' } font-thin font-birthstone`}>{props.collection.name}</p>
          <p className="italic text-xl">{new Date(props.collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
        </div>
        {props.collectionRef && (
          <button 
            className='border rounded-lg py-1.5 px-2 animate-pulse mt-10'
            onClick={() => {
              if(props.collectionRef?.current){
                props.collectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
          >
            Go to Sets
          </button>
        )}
      </div>
      <img ref={props.coverRef} src={props.path} style={props.style ?? { maxHeight: '100vh', minHeight: '100vh' }} />
    </div>
  )
}