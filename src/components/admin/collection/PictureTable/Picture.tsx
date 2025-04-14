import { FC, HTMLAttributes, useEffect, useRef, useState } from "react";
import { PicturePath } from "../../../../types";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { invariant } from "@tanstack/react-router";
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { getPictureData, isPictureData } from "./PictureData";
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { DropIndicator } from "../../../common/DropIndicator";
import { createPortal } from "react-dom";

type PictureState = 
  | {
    type: 'idle'
    }
  | {
    type: 'preview';
    container: HTMLElement
    }
  | {
    type: 'is-dragging';
    }
  | {
    type: 'is-dragging-over';
    closestEdge: Edge | null
  }

const stateStyles: { [Key in PictureState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
}

const idle: PictureState = { type: 'idle' }

interface PictureProps {
  // picture: PicturePath
  item: { id: string, content: string }
}

export const Picture: FC<PictureProps> = ({ item }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<PictureState>(idle)

  useEffect(() => {
    const element = ref.current
    invariant(element)
    return combine(
      draggable({
        element,
        getInitialData() {
          return getPictureData(item.id)
        },
        canDrag: () => true,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container }) {
              setState({ type: 'preview', container })
            }
          })
        },
        onDragStart() {
          setState({ type: 'is-dragging' })
        },
        onDrop() {
          setState(idle)
        }
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) {
            return false
          }

          return isPictureData(source.data)
        },
        getData({ input }) {
          const data = getPictureData(item.id)
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['left', 'right']
          })
        },
        getIsSticky(){
          return true
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          setState({ type: 'is-dragging-over', closestEdge })
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data)

          setState((current) => {
            if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current
            }
            return { type: 'is-dragging-over', closestEdge }
          })
        },
        onDragLeave() {
          setState(idle)
        },
        onDrop() {
          setState(idle)
        }
      })
    )
  }, [item])

  return (
    <>
      <div className="relative">
        <div
          data-picture-id={item.id}
          ref={ref}
          className={`
            flex text-sm flex-row items-center border border-gray-300 border-soli 
            rounded p-2 pl-0 ${stateStyles[state.type] ?? ''}
          `}
        >
          <span>{item.content}</span>
        </div>
        {state.type === 'is-dragging-over' && state.closestEdge && (
          <DropIndicator edge={state.closestEdge} gap='8px' />
        )}
      </div>
      {state.type === 'preview' && createPortal(<DragPreview item={item} />, state.container)}
    </>
  )
}

function DragPreview({ item }: { item: { id: string, content: string}}) {
  return <div className="border-solid rounded p-2 bg-white">{item.content}</div>
}