import { UseQueryResult } from "@tanstack/react-query"
import { 
  ComponentProps, 
  Dispatch, 
  MutableRefObject, 
  SetStateAction, 
  useRef, 
} from "react"

interface LazyImageProps extends Omit<ComponentProps<'img'>, 'src' | 'ref'> {
  watermarkQuery?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  watermarkPath?: string,
  src?: UseQueryResult<[string | undefined, string] | undefined, Error>
  overrideSrc?: string,
  ref?: MutableRefObject<HTMLImageElement | null>
  pictureDimensions?: [string, { width: number, height: number}][]
  parentSetPictureDimensions?: Dispatch<SetStateAction<[string, { width: number, height: number}][]>>
}

export const LazyImage = (props: LazyImageProps) => {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const watermarkRef = useRef<HTMLImageElement | null>(null)

  // useEffect(() => {
  //   if(
  //     props.watermarkQuery && 
  //     watermarkRef.current !== null &&
  //     (
  //       !watermarkRef.current.complete ||
  //       watermarkRef.current.clientWidth === 0
  //     )
  //   ) {
  //     props.watermarkQuery.refetch()
  //   }
  // }, [watermarkRef.current, props.watermarkQuery?.data])

  if(
    (
      !props.src || 
      props.src.isPending || 
      !props.src.data?.[1] || 
      props.src.isLoading ||
      props.src.isFetching || (
        props.watermarkQuery !== undefined &&
        props.watermarkPath === undefined
      )
    ) 
    && 
    !props.overrideSrc
  ) {
    return (
      <div 
        className={props.className}
        style={{
          minHeight: `${props.pictureDimensions?.find((dimension) => dimension[0] === props.src?.data?.[0])?.[1].height}px`,
          minWidth: `${props.pictureDimensions?.find((dimension) => dimension[0] === props.src?.data?.[0])?.[1].width}px`
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
  delete(imageProps.watermarkQuery)
  delete(imageProps.overrideSrc)
  delete(imageProps.pictureDimensions)
  delete(imageProps.parentSetPictureDimensions)

  return (
    <div
      ref={props.ref}
      id='lazy-image-container'
      className="relative"
      style={{
        minHeight: `${imageProps.pictureDimensions?.find((dimension) => dimension[0] === props.src?.data?.[0])?.[1].height}px`,
        minWidth: `${imageProps.pictureDimensions?.find((dimension) => dimension[0] === props.src?.data?.[0])?.[1].width}px`
      }}
    >
      <img 
        {...imageProps}
        ref={imgRef}
        src={props.overrideSrc ? props.overrideSrc : props.src?.data?.[1]}
        onLoad={(load) => {
          if(
            !load.currentTarget.clientHeight || 
            !load.currentTarget.clientWidth || 
            !props.pictureDimensions ||
            !props.parentSetPictureDimensions ||
            props.src?.data?.[0] === undefined
          ) return

          const temp = [...props.pictureDimensions]

          if(!temp.some((dimension) => dimension[0] === props.src?.data?.[0])) {
            temp.push([props.src.data[0], { 
              width: load.currentTarget.clientWidth,
              height: load.currentTarget.clientHeight
            }])
          }
          else {
            temp.map((dimension) => dimension[0] === props.src?.data?.[0] ? ([
              props.src.data[0], { 
                width: load.currentTarget.clientWidth,
                height: load.currentTarget.clientHeight
              }
            ]) : dimension)
          }

          props.parentSetPictureDimensions(temp)
        }}
      />
      {props.watermarkPath && (
        <img 
          ref={watermarkRef}
          src={props.watermarkPath}
          className="absolute inset-0 w-full h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
          style={{ 
            maxWidth: `${imageProps.pictureDimensions?.find((dimension) => dimension[0] === props.src?.data?.[0])?.[1].height}px`
          }}
          alt="James French Photography Watermark"
        />
      )}
    </div>
  )
}