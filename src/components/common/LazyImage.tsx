import { UseQueryResult } from "@tanstack/react-query"
import { 
  ComponentProps, 
  useEffect, 
  useRef, 
  useState, 
} from "react"

interface LazyImageProps extends Omit<ComponentProps<'img'>, 'src'> {
  watermarkPath?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  src?: UseQueryResult<[string | undefined, string] | undefined, Error>
}

export const LazyImage = (props: LazyImageProps) => {
  const imgRef = useRef<HTMLDivElement | null>(null)
  const [placeholderDimensions, setPlaceholderDimensions] = useState<{width: number, hieght: number}>()

  useEffect(() => {
    if(imgRef.current) {
      setPlaceholderDimensions({
        width: 0, //not used yet
        hieght: Math.max(placeholderDimensions?.hieght ?? 0, imgRef.current.clientHeight)
      })
    }
  }, [imgRef.current])

  if(!props.src || 
    props.src.isPending || 
    !props.src.data?.[1] || 
    props.watermarkPath?.isPending
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
          ref={undefined}
          src={props.src.data[1]}
        />
        {props.watermarkPath?.data?.[1] && (
          <img 
            src={props.watermarkPath.data[1]}
            className="absolute inset-0 max-w-full h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
            alt="James French Photography Watermark"
          />
        )}
    </div>
  )
}