import { UseQueryResult } from "@tanstack/react-query"
import { 
  ComponentProps, 
  MutableRefObject, 
  useEffect, 
  useRef, 
  useState, 
} from "react"
import { CgSpinner } from 'react-icons/cg'

interface LazyImageProps extends Omit<ComponentProps<'img'>, 'src' | 'ref'> {
  watermarkPath?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  src?: UseQueryResult<[string | undefined, string] | undefined, Error>
  overrideSrc?: string,
  ref?: MutableRefObject<HTMLImageElement | null>
}

export const LazyImage = (props: LazyImageProps) => {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const watermarkRef = useRef<HTMLImageElement | null>(null)
  const [placeholderDimensions, setPlaceholderDimensions] = useState<{width: number, hieght: number}>()

  useEffect(() => {
    if(imgRef.current) {
      setPlaceholderDimensions({
        width: Math.max(placeholderDimensions?.width ?? 0, imgRef.current.clientWidth),
        hieght: Math.max(placeholderDimensions?.hieght ?? 0, imgRef.current.clientHeight)
      })
    }
  }, [imgRef.current])

  useEffect(() => {
    if(
      props.watermarkPath !== undefined && 
      (
        (watermarkRef.current?.naturalWidth ?? 0) < 0 || 
        !watermarkRef.current?.complete
      )
    ) {
      props.watermarkPath.refetch()
    }
  }, [watermarkRef.current])

  if(
    (
      !props.src || 
      props.src.isPending || 
      !props.src.data?.[1] || 
      props.watermarkPath?.isPending
    ) 
    && 
    !props.overrideSrc
  ) {
    return (
      <div 
        className={props.className}
        style={{
          minHeight: placeholderDimensions?.hieght,
          minWidth: placeholderDimensions?.width
        }}
      >
        <svg className="text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
          <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
        </svg>
      </div>
    )
  }

  const imageProps = {...props}
  delete(imageProps.watermarkPath)
  delete(imageProps.overrideSrc)

  const numbs = []
  if(placeholderDimensions) {
    numbs.push(placeholderDimensions.width)
    numbs.push(placeholderDimensions.hieght)
  }
  else {
    numbs.push(85)
  }

  const watersize = Math.min(...numbs) * ( 3/4 )

  return (
    <div
      ref={props.ref}
      id='lazy-image-container'
      className="relative"
      style={{
        minHeight: placeholderDimensions?.hieght,
        minWidth: placeholderDimensions?.width
      }}
    >
        <img 
          {...imageProps}
          ref={imgRef}
          src={props.overrideSrc ? props.overrideSrc : props.src?.data?.[1]}
        />
        {props.watermarkPath?.isLoading || 
        (props.watermarkPath?.data?.[1] === undefined && props.watermarkPath !== undefined) ? (
          <CgSpinner 
            className='absolute text-white opacity-80 animate-spin z-10' 
            size={watersize} 
            style={{
              top: `calc(50% - ${watersize/2}px)`,
              left: `calc(50% - ${watersize/2}px)`
            }}
          />
        ) :
        props.watermarkPath?.data?.[1] && (
          <img 
            ref={watermarkRef}
            src={props.watermarkPath.data[1]}
            className="absolute inset-0 w-full h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
            style={{ maxWidth: `${(imgRef.current?.clientHeight ?? 0)}px` }}
            alt="James French Photography Watermark"
          />
        )}
    </div>
  )
}