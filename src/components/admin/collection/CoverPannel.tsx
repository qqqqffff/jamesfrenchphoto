import { useEffect, useState } from "react"
import { CoverType, PhotoCollection } from "../../../types"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { PublishCollectionParams } from "../../../services/collectionService"
import { Cover } from "../../collection/Cover"

interface CoverPannelProps {
  collection: PhotoCollection
  cover?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  updatePublishStatus: UseMutationResult<string | undefined, Error, PublishCollectionParams, unknown>
}

export const CoverPannel = (props: CoverPannelProps) => {
  const [coverType, setCoverType] = useState<CoverType | undefined>(props.collection.coverType)

  useEffect(() => {
    if(
      props.collection.coverType?.bgColor !== coverType?.bgColor ||
      props.collection.coverType?.textColor !== coverType?.textColor ||
      props.collection.coverType?.date !== coverType?.date ||
      props.collection.coverType?.placement !== coverType?.placement
    ) {
      setCoverType(props.collection.coverType)
    }
  }, [props.collection.coverType])

  return (
    <div className="h-[96vh] w-full px-4 flex flex-col items-center gap-2">
      {props.cover?.data ? (
        <>
          <span className="font-light italic text-xl">Cover Preview</span>
          <Cover 
            path={props.cover.data[1]}
            collection={props.collection}
            style={{ maxHeight: '92vh', maxWidth: '100%' }}
            className="rounded-lg"
          />
        </>
      ) : (
        <>
          <span className="font-light italic text-xl">Collection has no Cover</span>
          <span className="font-light italic text-base hover:underline underline-offset-1">Please upload a cover first</span>
        </>
      )}
    </div>
  )
}