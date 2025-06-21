import { ComponentProps, useEffect, useState } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { flushSync } from 'react-dom';
import { isSetData } from './SetData';
import { Set } from './Set';
import { PhotoCollection, PhotoSet } from '../../../types';
import { useMutation } from '@tanstack/react-query';
import { reorderSetsMutation, ReorderSetsParams } from '../../../services/collectionService';

interface SetListProps extends ComponentProps<'div'> {
  setList: PhotoSet[],
  selectedSet: PhotoSet | undefined
  setSelectedSet: (set?: PhotoSet) => void
  collection: PhotoCollection,
  updateSet: (set: PhotoSet, remove: boolean) => void,
  reorderSets: (sets: PhotoSet[]) => void
}

export const SetList = (props: SetListProps) => {
  const [sets, setSets] = useState<PhotoSet[]>(props.setList);

  const reorderSets = useMutation({
    mutationFn: (params: ReorderSetsParams) => reorderSetsMutation(params)
  })

  useEffect(() => {
    if(props.setList.reduce((prev, cur, index) => {
      if(sets[index]?.id !== cur.id || prev) {
        return true
      }
      return false
    }, false)) {
      setSets(props.setList)
    }
    
    return monitorForElements({
      canMonitor({ source }) {
        return isSetData(source.data);
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;

        if (!isSetData(sourceData) || !isSetData(targetData)) {
          return;
        }

        const indexOfSource = sets.findIndex((set) => set.id === sourceData.setId);
        const indexOfTarget = sets.findIndex((set) => set.id === targetData.setId);

        if (indexOfTarget < 0 || indexOfSource < 0) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);

        const updatedSets: PhotoSet[] = []

        if(closestEdgeOfTarget === 'top') {
          updatedSets.push(
            ...sets.slice(0, indexOfTarget)
          )
          updatedSets.push({...sets[indexOfSource], order: indexOfTarget})
          updatedSets.push(
            ...sets.slice(indexOfTarget)
          )
        }
        else {
          updatedSets.push(
            ...sets.slice(0, indexOfTarget + 1)
          )
          updatedSets.push({...sets[indexOfSource], order: indexOfTarget})
          updatedSets.push(
            ...sets.slice(indexOfTarget + 1)
          )
        }

        flushSync(() => {
          const newSets = updatedSets.filter((set) => set.order !== indexOfSource).map((set, index) => ({ ...set, order: index }))
          setSets(newSets);
          props.reorderSets(newSets)
          reorderSets.mutate({
            collectionId: props.collection.id,
            sets: newSets,
            options: {
              logging: true
            }
          })
        });

        const element = document.querySelector(`[data-set-id="${sourceData.setId}"]`);
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element);
        }
      },
    });
  }, [props.setList]);



  return (
    <div className="pt-2 my-0 mx-auto">
      <div className="flex flex-col gap-2 border border-solid rounded p-2">
        {sets.length === 0 ? (
          <div
            className={`flex text-sm bg-white flex-row items-center border-solid rounded p-2 pl-0`}
          >
            <span className="w-full text-start h-full italic ps-4 font-light">Create A Set to See Here</span>
          </div>
        ) : (
          sets
          .sort((a, b) => a.order - b.order)
          .map((set, index) => {
            return (
              <Set 
                key={index} 
                set={set} 
                onClick={() => props.setSelectedSet(set)}
                selectedSet={props.selectedSet?.id === set.id}
                onSubmit={(submittedSet) => {
                  //submitted set will not have creating tag
                  if(set.creating){
                    const updatedSets = sets.map((pSet) => set.id === submittedSet.id ? submittedSet : pSet)

                    props.setSelectedSet(submittedSet)
                    props.updateSet(submittedSet, false)
                    setSets(updatedSets)
                  }
                }}
                onCancel={() => {
                  if(set.creating){
                    setSets(sets.filter((cSet) => cSet.id !== set.id))
                    props.updateSet(set, true)
                  }
                }}
              />
            )
          })
        )}
      </div>
    </div>
  );
}