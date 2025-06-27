import { Dispatch, SetStateAction, useState } from "react"
import { PhotoCollection, Watermark } from "../../../types"
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import tempImage from '../../../assets/home-carousel/carousel-7.jpg'
import { Button, Checkbox } from "flowbite-react"
import { parsePathName } from "../../../utils"
import { applyWatermarkMutation, ApplyWatermarkParams } from "../../../services/watermarkService"
import { LazyImage } from "../../common/LazyImage"

interface WatermarkPanelProps {
  collection: PhotoCollection
  updateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  updateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  watermarkObjects: Watermark[],
  watermarkPaths: UseQueryResult<[string | undefined, string] | undefined>[],
  selectedWatermark?: Watermark,
  setSelectedWatermark: Dispatch<SetStateAction<Watermark | undefined>>
}

export const WatermarkPanel = (props: WatermarkPanelProps) => {
  const [collectionWatermark, setCollectionWatermark] = useState(props.collection.watermarkPath)
  const [setWatermarks, setSetWatermarks] = useState<Record<string, string | undefined>>(
    Object.fromEntries(props.collection.sets.map((set) => [set.id, set.watermarkPath]))
  )
  const [loading, setLoading] = useState(false)

  const changes = (() => {
    if(props.collection.watermarkPath !== collectionWatermark) return true
    return props.collection.sets.reduce((prev, cur) => {
      if(prev === true) return true
      if(cur.watermarkPath !== setWatermarks[cur.id]) return true
      return false
    }, false)
  })()

  const applyWatermark = useMutation({
    mutationFn: (params: ApplyWatermarkParams) => applyWatermarkMutation(params),
    onSettled: () => setLoading(false)
  })


  
  return (
    <>
      <div className="flex flex-row gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 w-[270px] items-center">
            <span className="text-xl">Preview</span>
            <LazyImage 
              overrideSrc={tempImage}
              className="rounded-lg border-2 max-w-full"
              watermarkPath={props.selectedWatermark?.url}
              watermarkQuery={props.watermarkPaths.find((path) => path.data?.[0] === props.selectedWatermark?.id)}
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl">Apply Watermark</span>
          <div className="flex flex-row w-full border rounded-lg py-3 px-6 gap-10">
            <div className="flex flex-col place-self-start justify-self-center">
              <button 
                className="flex flex-row items-center gap-1" 
                onClick={() => {
                  setCollectionWatermark(collectionWatermark === undefined ? props.selectedWatermark?.path : undefined)
                }}
              >
                <Checkbox checked={props.selectedWatermark !== undefined && props.selectedWatermark?.path === collectionWatermark} readOnly />
                <span>Collection</span>
              </button>
              {collectionWatermark !== undefined  && (
                <span className="ms-2 text-sm italic font-light">({parsePathName(collectionWatermark)})</span>
              )}
            </div>
            <div className="flex flex-col place-self-start justify-self-center gap-1.5">
              {props.collection.sets.map((set, index) => {
                const selected = (setWatermarks[set.id] === props.selectedWatermark?.path) && props.selectedWatermark !== undefined
                const disabled = collectionWatermark !== undefined
                return (
                  <div className="flex flex-col" key={index}>
                    <button 
                      className={`flex flex-row items-center gap-1 ${disabled ? 'cursor-not-allowed' : ''}`}
                      disabled={disabled}
                      onClick={() => {
                        const temp = {...setWatermarks}
                        if(selected){
                          temp[set.id] = undefined
                        }
                        else {
                          temp[set.id] = props.selectedWatermark?.path
                        }
                        setSetWatermarks(temp)
                      }}
                    >
                      <Checkbox checked={selected} readOnly disabled={disabled} className={`${disabled ? 'cursor-not-allowed' : ''}`}/>
                      <span className={`${disabled ? 'text-gray-500 cursor-not-allowed' : ''}`}>{set.name}</span>
                    </button>
                    <span className="ms-2 text-sm italic font-light">
                      {setWatermarks[set.id] !== undefined ? `(${parsePathName(setWatermarks[set.id] ?? '')})` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <Button 
            className="self-end me-2" 
            disabled={!changes} 
            isProcessing={loading}
            onClick={() => {
              setLoading(true)
              const tempCollection: PhotoCollection = {
                ...props.collection,
                watermarkPath: collectionWatermark,
                sets: props.collection.sets.map((set) => {
                  return ({
                    ...set,
                    watermarkPath: setWatermarks[set.id]
                  })
                })
              }
              props.updateCollection(tempCollection)
              props.updateCollections((prev) => {
                const temp = [...prev]
                
                return temp.map((col) => {
                  if(col.id === tempCollection.id) return tempCollection
                  return col
                })
              })
              applyWatermark.mutate({
                collection: props.collection,
                collectionWatermark: collectionWatermark,
                setWatermarks: setWatermarks,
                options: {
                  logging: true
                }
              })
            }}
          >Apply</Button>
        </div>
      </div>
    </>
  )
}