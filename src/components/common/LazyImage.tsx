import { UseQueryResult } from "@tanstack/react-query"
import { 
  ComponentProps, 
  Dispatch, 
  SetStateAction, 
  useEffect, 
  useRef, 
} from "react"
import { PicturePath } from "../../types"

interface LazyImageProps extends ComponentProps<'img'> {
  path?: PicturePath
  watermarkQuery?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  srcPathQuery?: UseQueryResult<[string | undefined, string] | undefined, Error>
  overrideSrc?: string,
  pictureDimensions?: [string, { width: number, height: number}][]
  parentSetPictureDimensions?: Dispatch<SetStateAction<[string, { width: number, height: number}][]>>
}

export const LazyImage = (props: LazyImageProps) => {
  const watermarkRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const now = new Date().getTime()
    const fifteenMinutes = 15 * 60 * 1000
    if(
      props.watermarkQuery !== undefined && 
      (now - props.watermarkQuery.dataUpdatedAt) >= fifteenMinutes
    ) {
      props.watermarkQuery.refetch()
    }
  }, [props.watermarkQuery])

  const height = props.path?.height !== undefined && props.path.height !== 0 ? 
    props.path.height 
  : 
    props.pictureDimensions?.find((dimension) => dimension[0] === props.srcPathQuery?.data?.[0])?.[1].height
  const width = props.path?.width && props.path.width !== 0 ? 
    props.path.width 
  : 
    props.pictureDimensions?.find((dimension) => dimension[0] === props.srcPathQuery?.data?.[0])?.[1].width

  useEffect(() => {
    const now = new Date().getTime()
    const fifteenMinutes = 15 * 60 * 1000
    if(
      props.srcPathQuery !== undefined && 
      (now - props.srcPathQuery.dataUpdatedAt) >= fifteenMinutes
    ) {
      props.srcPathQuery.refetch()
    }
  }, [props.srcPathQuery])

  if(
    (props.srcPathQuery == undefined && props.overrideSrc === undefined) ||
    props.srcPathQuery !== undefined && (
      props.srcPathQuery.isPending || 
      props.srcPathQuery.data?.[1] === undefined || 
      props.srcPathQuery.isLoading ||
      props.srcPathQuery.isFetching
    ) || (
      props.watermarkQuery !== undefined &&
      (
        props.watermarkQuery.isPending ||
        props.watermarkQuery.isLoading ||
        props.watermarkQuery.isFetching ||
        props.watermarkQuery.data?.[1] === undefined
      )
    )
  ) {
    return (
      <div 
        className={`${props.className} flex items-center animate-pulse duration-500 `}
        style={props.style?.minHeight !== undefined && props.style.minWidth !== undefined ? {
          minHeight: props.style.minHeight,
          minWidth: props.style.minWidth
        } : {
          minHeight: `${height}px`,
          minWidth: `${width}px`
        }}
      >
        <svg className="text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
          <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
        </svg>
      </div>
    )
  }

  const imageProps = {...props}
  delete(imageProps.srcPathQuery)
  delete(imageProps.path)
  delete(imageProps.watermarkQuery)
  delete(imageProps.overrideSrc)
  delete(imageProps.pictureDimensions)
  delete(imageProps.parentSetPictureDimensions)

  
  const src = props.srcPathQuery?.data?.[1]
  const path = props.path

  return (
    <div
      id='lazy-image-container'
      className="relative"
      style={width && height ? {
        minHeight: `${height}px`,
        minWidth: `${width}px`
      } : undefined}
    >
      <img 
        {...imageProps}
        src={props.overrideSrc ? props.overrideSrc : src}
        ref={props.ref}
        onLoad={(load) => {
          if(
            (load.currentTarget.clientHeight === undefined && load.currentTarget.clientHeight === 0)|| 
            (load.currentTarget.clientWidth === undefined && load.currentTarget.clientWidth === 0) || 
            props.pictureDimensions === undefined ||
            props.parentSetPictureDimensions === undefined||
            src === undefined ||
            path === undefined
          ) return

          const temp = [...props.pictureDimensions]

          if(!temp.some((dimension) => dimension[0] === path.id)) {
            temp.push([path.id, { 
              width: load.currentTarget.clientWidth,
              height: load.currentTarget.clientHeight
            }])
          }
          else {
            temp.map((dimension) => dimension[0] === path.id ? ([
              path.id, { 
                width: load.currentTarget.clientWidth,
                height: load.currentTarget.clientHeight
              }
            ]) : dimension)
          }

          props.parentSetPictureDimensions(temp)
        }}
      />
      {props.watermarkQuery !== undefined && (
        <img 
          ref={watermarkRef}
          src={props.watermarkQuery.data?.[1]}
          className="absolute inset-0 w-full h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
          style={width && height ? { 
            maxWidth: `${height}px`
          } : undefined}
          alt="James French Photography Watermark"
        />
      )}
    </div>
  )
}