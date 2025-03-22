import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { FC, type HTMLAttributes, useEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';
import { createPortal } from 'react-dom';
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getSetData, isSetData } from './SetData';
import { DropIndicator } from '../../common/DropIndicator';
import { HiOutlineMenu } from 'react-icons/hi';
import { PhotoCollection, PhotoSet } from '../../../types';
import { useMutation } from '@tanstack/react-query';
import { createSetMutation, CreateSetParams } from '../../../services/photoSetService';
import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';

type SetState =
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-over';
      closestEdge: Edge | null;
    };

const stateStyles: { [Key in SetState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
};

const idle: SetState = { type: 'idle' };

interface SetProps {
  set: PhotoSet, 
  onClick: () => void, 
  collection?: PhotoCollection,
  selectedSet: boolean
  onSubmit: (set: PhotoSet) => void,
  onCancel: () => void,
  updateParent: (name: string) => void
}

export const Set: FC<SetProps> = ({ set, onClick, collection, selectedSet, onSubmit, onCancel, updateParent }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<SetState>(idle);
  const [allowDragging, setAllowDragging] = useState(false)
  const [name, setName] = useState(set.name)

  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element,
        getInitialData() {
          return getSetData(set);
        },
        canDrag: () => allowDragging,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px',
            }),
            render({ container }) {
              setState({ type: 'preview', container });
            },
          });
        },
        onDragStart() {
          setState({ type: 'is-dragging' });
        },
        onDrop() {
          setState(idle);
          setAllowDragging(false)
        },
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          // not allowing dropping on yourself
          if (source.element === element) {
            return false;
          }
          // only allowing tasks to be dropped on me
          return isSetData(source.data);
        },
        getData({ input }) {
          const data = getSetData(set);
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['top', 'bottom'],
          });
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setState({ type: 'is-dragging-over', closestEdge });
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data);

          // Only need to update react state if nothing has changed.
          // Prevents re-rendering.
          setState((current) => {
            if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current;
            }
            return { type: 'is-dragging-over', closestEdge };
          });
        },
        onDragLeave() {
          setState(idle);
        },
        onDrop() {
          setState(idle);
        },
      }),
    );
  }, [set, allowDragging]);

  const createSet = useMutation({
    mutationFn: (params: CreateSetParams) => createSetMutation(params),
    onSettled: (set) => {
      if(set){
        onSubmit({
          ...set,
          name: name
        })
      }
    }
  })

  return (
    <>
      <div className="relative">
        <div
          data-task-id={set.id}
          ref={ref}
          className={`flex text-sm ${selectedSet ? 'bg-gray-200' : 'bg-white'} flex-row items-center border border-gray-300 border-solid rounded p-2 pl-0 ${collection === undefined ? 'hover:bg-gray-100' : ''} ${stateStyles[state.type] ?? ''}`}
          onClick={onClick}
        >
          <button className="w-6 flex justify-center hover:cursor-grab" 
            onMouseEnter={() => setAllowDragging(true) }
            onMouseLeave={() => setAllowDragging(false) }
          >
            <HiOutlineMenu size={14} />
          </button>
          {collection === undefined ? (
            <span className="truncate flex-grow flex-shrink w-full text-start h-full hover:cursor-pointer">{set.name}</span>
          ) : (
            <div className='flex flex-row justify-between w-full'>
              <input
                autoFocus
                className='focus:outline-none border-b-black border-b'
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  updateParent(event.target.value)
                }}
                onKeyDown={(event) => {
                  if(event.key === 'Enter'){
                    createSet.mutate({
                      name: name,
                      collection: collection
                    })
                  }
                  else if(event.key === 'Escape'){
                    onCancel()
                  }
                }}
              />
              <div className='flex flex-row gap-4'>
                <button 
                  onClick={() => {
                    createSet.mutate({
                      collection: collection,
                      name: name,
                      options: {
                        logging: true
                      }
                    }
                    )}}>
                  <HiOutlineCheckCircle className="text-3xl text-green-400 hover:text-green-600"/>
                </button>
                <button onClick={() => onCancel()}>
                  <HiOutlineXCircle className="text-3xl text-red-500 hover:text-red-700" />
                </button>
              </div>
            </div>
          )}
        </div>
        {state.type === 'is-dragging-over' && state.closestEdge ? (
          <DropIndicator edge={state.closestEdge} gap={'8px'} />
        ) : null}
      </div>
      {state.type === 'preview' ? createPortal(<DragPreview set={set} />, state.container) : null}
    </>
  );
}

function DragPreview({ set }: { set: PhotoSet }) {
  return <div className="border-solid rounded p-2 bg-white">{set.name}</div>;
}
