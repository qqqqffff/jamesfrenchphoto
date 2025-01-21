import { FC, useEffect, useState } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { flushSync } from 'react-dom';
import { isSetData } from './SetData';
import Set from './Set';
import { PhotoSet } from '../../../types';
import { useMutation } from '@tanstack/react-query';
import { reorderSetsMutation, ReorderSetsParams } from '../../../services/collectionService';

const component: FC<{setList: PhotoSet[], setSelectedSet: (set: PhotoSet) => void, collectionId: string}> = ({ setList, setSelectedSet, collectionId }) => {
  const [sets, setSets] = useState<PhotoSet[]>(setList);

  const reorderSets = useMutation({
    mutationFn: (params: ReorderSetsParams) => reorderSetsMutation(params)
  })

  useEffect(() => {
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

        reorderSets.mutate({
          collectionId: collectionId,
          sets: sets,
          options: {
            logging: true
          }
        })

        const closestEdgeOfTarget = extractClosestEdge(targetData);

        flushSync(() => {
          setSets(
            reorderWithEdge({
              list: sets.map((set) => {
                if(set.id === sourceData.setId){
                  set.order = indexOfTarget
                }
                else if(set.id === targetData.setId){
                  set.order = indexOfSource
                }
                return set
              }),
              startIndex: indexOfSource,
              indexOfTarget,
              closestEdgeOfTarget,
              axis: 'vertical',
            }),
          );
        });

        const element = document.querySelector(`[data-task-id="${sourceData.setId}"]`);
        if (element instanceof HTMLElement) {
          triggerPostMoveFlash(element);
        }
      },
    });
  }, [sets]);

  return (
    <div className="pt-6 my-0 mx-auto">
      <div className="flex flex-col gap-2 border border-solid rounded p-2">
        {sets
          .sort((a, b) => a.order - b.order)
          .map((set) => (
            <Set key={set.id} set={set} onClick={() => setSelectedSet(set)}/>
        ))}
      </div>
    </div>
  );
}

export default component