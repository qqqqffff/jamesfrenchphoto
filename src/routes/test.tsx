import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef } from 'react';
import {
  draggable,
  dropTargetForElements,
  monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { flushSync } from 'react-dom';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { PictureList } from '../components/admin/collection/PictureTable/PictureList';

// Generate sample items
const getItems = (count: number) =>
  Array.from({ length: count }, (_, k) => k).map(k => ({
    id: `item-${k}`,
    content: `Item ${k}`
  }));

const AtlaskitDragDropGrid = () => {
  // Single array of items
  const [items, setItems] = useState<{id: string, content: string}[]>(getItems(20));
  
  // Track which item is being dragged and where the drop indicator should appear
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    targetId: string | null;
    edge: 'top' | 'bottom' | 'left' | 'right' | null;
  }>({ targetId: null, edge: null });
  
  // Store a drag preview element
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const [dragPreviewContent, setDragPreviewContent] = useState<string | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState({ x: 0, y: 0 });

  // Use ref to keep track of draggable items and the grid container
  const itemRefs = useRef(new Map());
  const gridRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Set up a drag and drop monitor
    const cleanup = monitorForElements({
      onDragStart: ({ source }) => {
        // Store the dragging item ID
        setDraggingItemId(source.data.itemId as string);
        
        // Set up drag preview content
        const item = items.find(item => item.id === source.data.itemId);
        if (item) {
          setDragPreviewContent(item.content);
        }
        
        // Add dragging class to the source element
        source.element.classList.add('opacity-50');
      },
      onDrag: ({ location }) => {
        // Update drag preview position
        setDragPreviewPosition({
          x: location.current.input.clientX + 10, // Offset slightly from cursor
          y: location.current.input.clientY + 10
        });
        
        // Update drop indicator
        if (location.current.dropTargets.length) {
          const dropTarget = location.current.dropTargets[0];
          // console.log(dropTarget)
          
          if (dropTarget.data.isGrid) {
            setDropIndicator({ targetId: null, edge: null });
            return;
          }
          
          if (dropTarget.data.itemId !== draggingItemId) {
            
            const edge = extractClosestEdge(dropTarget.data);
            console.log(edge)
            setDropIndicator({
              targetId: dropTarget.data.itemId as string,
              edge: edge
            });
          }
        } else {
          setDropIndicator({ targetId: null, edge: null });
        }
      },
      onDrop: ({ location, source }) => {
        // Reset states
        setDraggingItemId(null);
        setDropIndicator({ targetId: null, edge: null });
        setDragPreviewContent(null);
        
        // Remove dragging class
        source.element.classList.remove('opacity-50');

        if (!location.current.dropTargets.length) {
          return;
        }

        const dropTarget = location.current.dropTargets[0];
        const sourceItemId = source.data.itemId;
        const sourceIndex = items.findIndex(item => item.id === sourceItemId);

        // If we're dropping into the grid container (not onto an item)
        if (dropTarget.data.isGrid) {
          return;
        }

        const targetItemId = dropTarget.data.itemId;
        const targetIndex = items.findIndex(item => item.id === targetItemId);
        
        // Get the edge we're closest to
        const edge = extractClosestEdge(dropTarget.data);
        
        // Adjust target index based on edge
        flushSync(() => {
          const newItems = reorderWithEdge({
            list: items,
            startIndex: sourceIndex,
            indexOfTarget: targetIndex,
            closestEdgeOfTarget: edge,
            axis: 'horizontal'
          })
          setItems(newItems);
        })
        
        const element = document.querySelector(`[data-item-id="${sourceItemId}"]`)
        if(element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      }
    });

    return cleanup;
  }, [items, draggingItemId]);

  // Set up grid as drop target
  React.useEffect(() => {
    if (!gridRef.current) return;
    
    const cleanup = dropTargetForElements({
      element: gridRef.current,
      getData: () => ({
        isGrid: true,
      }),
    });
    
    return cleanup;
  }, []);

  // Set up items as draggable
  React.useEffect(() => {
    const cleanupFns: (() => void)[] = [];

    // Clean up previous draggables
    itemRefs.current.forEach((_, key) => {
      if (!items.some(item => item.id === key)) {
        itemRefs.current.delete(key);
      }
    });

    // Set up each item as draggable
    items.forEach(item => {
      const itemRef = itemRefs.current.get(item.id);
      if (!itemRef) return;

      const cleanupDraggable = draggable({
        element: itemRef,
        getInitialData: () => ({
          itemId: item.id,
        }),
      });

      const cleanupDropTarget = dropTargetForElements({
        element: itemRef,
        getIsSticky: () => true,
        getData: closestEdgeDetails => ({
          itemId: item.id,
          closestEdgeDetails,
        }),
      });

      cleanupFns.push(cleanupDraggable, cleanupDropTarget);
    });

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [items]);

  const setItemRef = (itemId: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(itemId, element);
    }
  };

  // Helper to determine indicator styles based on closest edge
  const getIndicatorStyles = (itemId: string, edge: string | null) => {
    if (dropIndicator.targetId !== itemId || !edge) {
      return {};
    }
    
    const baseStyles = {
      position: 'absolute',
      backgroundColor: '#4f46e5', // Indigo color for indicator
      zIndex: 10,
    };
    
    switch (edge) {
      case 'top':
        return {
          ...baseStyles,
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
        };
      case 'bottom':
        return {
          ...baseStyles,
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
        };
      case 'left':
        return {
          ...baseStyles,
          top: 0,
          left: 0,
          bottom: 0,
          width: '3px',
        };
      case 'right':
        return {
          ...baseStyles,
          top: 0,
          right: 0,
          bottom: 0,
          width: '3px',
        };
      default:
        return {};
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center">Atlaskit Drag and Drop Grid</h1>
      <div 
        ref={gridRef}
        className="grid grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow"
      >
        {items.map((item) => (
          <div
            data-item-id={item.id}
            key={item.id}
            ref={(el) => setItemRef(item.id, el)}
            className="p-4 bg-white border border-gray-200 rounded shadow-sm cursor-move hover:bg-gray-50 transition-colors relative"
            style={{
              opacity: draggingItemId === item.id ? 0.4 : 1
            }}
          >
            {item.content}
            {/* Drop indicator */}
            <div style={getIndicatorStyles(item.id, dropIndicator.edge)} />
          </div>
        ))}
      </div>

      {/* Drag preview */}
      {dragPreviewContent && (
        <div
          ref={dragPreviewRef}
          className="fixed p-4 bg-white border border-indigo-300 rounded shadow-lg pointer-events-none z-50 opacity-90"
          style={{
            left: `${dragPreviewPosition.x}px`,
            top: `${dragPreviewPosition.y}px`,
            maxWidth: '200px',
          }}
        >
          {dragPreviewContent}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/test')({
  component: () => (<PictureList itemList={getItems(20)} />),
})
