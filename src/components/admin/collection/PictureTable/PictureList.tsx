import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ComponentProps, useEffect, useState } from "react";
import { isPictureData } from "./PictureData";
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { flushSync } from "react-dom";
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { Picture } from "./Picture";

interface PictureListProps extends ComponentProps<'div'> {
  itemList: { id: string, content: string }[]
}

export const PictureList = (props: PictureListProps) => {
  const [pictures, setPictures] = useState<{id: string, content: string}[]>(props.itemList)

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return isPictureData(source.data)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if(!target) {
          return
        }

        const sourceData = source.data
        const targetData = target.data

        if(!isPictureData(sourceData) || !isPictureData(targetData)) {
          return
        }

        const indexOfSource = pictures.findIndex((picture) => picture.id === sourceData.pictureId)
        const indexOfTarget = pictures.findIndex((picture) => picture.id === targetData.pictureId)

        if(indexOfTarget < 0 || indexOfTarget < 0) {
          return
        }

        //TODO: add mutation here

        const closestEdgeOfTarget = extractClosestEdge(targetData)

        flushSync(() => {
          const newPictures = reorderWithEdge({
            list: pictures,
              // TODO: implement reordering
              // .map((picture) => {
              //   if(picture.id === sourceData.pictureId) {
              //     picture.
              //   }
              // })
            startIndex: indexOfSource,
            indexOfTarget,
            closestEdgeOfTarget,
            axis: 'horizontal'
          })
          setPictures(newPictures)
        })

        const element = document.querySelector(`[data-picture-id="${sourceData.pictureId}"]`)
        if(element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      }
    })
  }, [pictures, props.itemList])

  return (
    <div className="pt-6 my-0 mx-auto">
      <div className="grid grid-cols-4 gap-4 bg-white rounded-lg shadow">
        {pictures.map((item) => {
          return (
            <Picture 
              item={item}
            />
          )
        })}
      </div>
    </div>
  )
}