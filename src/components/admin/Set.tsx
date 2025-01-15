import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { FC, HTMLAttributes, useEffect, useRef, useState } from 'react'
import { PhotoSet } from '../../types'
import { invariant } from '@tanstack/react-router'
import {
    draggable,
    dropTargetForElements,
  } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { HiOutlineMenu } from 'react-icons/hi'
import DropIndicator from '../common/DropIndicator'
import { createPortal } from 'react-dom'

type SetState = |
{
    type: 'idle'
} | {
    type: 'preview'
    container: HTMLElement,
} | {
    type: 'is-dragging'
} | {
    type: 'is-dragging-over',
    closestEdge: Edge | null,
}

const stateStyle: { [Key in SetState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
    'is-dragging': 'opacity-40'
}

const idle: SetState = { type: 'idle' }

function isSetData(data: Record<string | symbol, unknown>): data is PhotoSet {
    return data[Symbol('photoset')] === true
}

const component: FC<{set: PhotoSet }> = ({ set }) => {
    const ref = useRef<HTMLDivElement | null>(null)
    const [state, setState] = useState<SetState>(idle)

    useEffect(() => {
        const element = ref.current
        invariant(element)

        return combine(
            draggable({
                element,
                getInitialData() {
                    return set
                },
                onGenerateDragPreview({ nativeSetDragImage }){
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
                },
            }),
            dropTargetForElements({
                element,
                canDrop({ source }) {
                    if(source.element === element){
                        return false
                    }
                    return isSetData(source.data) 
                },
                getData({ input }) {
                    const data = set
                    return attachClosestEdge(data, {
                        element,
                        input,
                        allowedEdges: ['top', 'bottom']
                    })
                },
                getIsSticky(){
                    return true
                },
                onDragEnter({ self }){
                    const closestEdge = extractClosestEdge(self.data)

                    setState((current) => {
                        if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge){
                            return current
                        }
                        return { type: 'is-dragging-over', closestEdge }
                    })
                },
                onDragLeave(){
                    setState(idle)
                },
                onDrop(){
                    setState(idle)
                }
            })
        )
    }, [set])

    return (
        <>
            <div className='relative'>
                <div
                    data-set-id={set.id}
                    ref={ref}
                    className={`flex text-sm bg-white flex-row items-center border border-solid rounded p-2 pl-0
                         hover:bg-slate-100 hover:cursor-grab ${stateStyle[state.type] ?? ''}`}
                >
                    <div className="w-6 flex justify-center">
                        <HiOutlineMenu size={10} />
                    </div>
                    <span className="truncate flex-grow flex-shrink">{set.name}</span>
                    {state.type === 'is-dragging-over' && state.closestEdge && (
                        <DropIndicator edge={state.closestEdge} gap={'8px'} />
                    )}
                </div>
            </div>
            {state.type === 'preview' && createPortal(<DragPreview set={set} />, state.container)}
        </>
    )
}

const DragPreview: FC<{set: PhotoSet}> = ({ set }) => {
    return <div className="border-solid rounded p-2 bg-white">{set.name}</div>;
}

export default component