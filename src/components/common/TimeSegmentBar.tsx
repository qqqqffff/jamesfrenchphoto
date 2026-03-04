import React, { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from "react";
import { v4 } from 'uuid'
import { Segment, UserTag } from "../../types";
import { Duration } from "luxon";

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const SNAP = 5;
const MIN_GAP_TO_ADD = 30;

function minutesToDate(minutes: number) {
  const d = new Date();
  d.setHours(START_HOUR + Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function formatTime(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function snap(val: number) {
  return Math.round(val / SNAP) * SNAP;
}

function snapToInterval(value: number, interval: number, anchor: number): number {
  const offset = value - anchor;
  return anchor + Math.round(offset / interval) * interval;
}

function ceilToInterval(value: number, interval: number, anchor: number): number {
  const offset = value - anchor;
  const remainder = offset % interval;
  if (remainder === 0) return value;
  return anchor + offset - remainder + interval;
}

const INTERVALS = [5, 10, 15, 20, 30, 60];

interface DragSegment {
  id: string;
  type: 'left' | 'right' | 'move';
  startX: number;
  origStart: number;
  origEnd: number;
  didMove: boolean;
}

interface TimeSegmentBarProps {
  segments: Segment[];
  setSegments: Dispatch<SetStateAction<Segment[]>>;
  individual?: boolean
  header?: JSX.Element;
  activeTag?: UserTag;
  activeOptions?:  {
    noshowFee?: number,
    description?: string,
    cancelationFee?: {
        amount: number,
        window: Duration
    }
  }
}

export function TimeSegmentBar(props: TimeSegmentBarProps) {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const popupsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const segmentsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const dragRef = useRef<DragSegment | null>(null);

  // Keep stable refs so event listeners always see current values without
  // needing to be re-registered (avoids stale closure bugs).
  const focusedIdRef = useRef<string | null>(null);
  const segmentsRef_ = useRef<Segment[]>(props.segments);

  useEffect(() => { focusedIdRef.current = focusedId; }, [focusedId]);
  useEffect(() => { segmentsRef_.current = props.segments; }, [props.segments]);

  const pctOf = (min: number) => (min / TOTAL_MINUTES) * 100;

  // ── Drag start ────────────────────────────────────────────────────────────
  const startDrag = useCallback(
    (e: React.MouseEvent, id: string, type: 'move' | 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();
      const seg = props.segments.find((s) => s.id === id);
      if (!seg) return;
      dragRef.current = {
        id,
        type,
        startX: e.clientX,
        origStart: seg.startMin,
        origEnd: seg.endMin,
        didMove: false,
      };
      document.body.style.cursor = type === "move" ? "grabbing" : "col-resize";
    },
    [props.segments]
  );

  useEffect(() => {
    const MOVE_THRESHOLD_PX = 4;

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !barRef.current) return;
      const { id, type, startX, origStart, origEnd } = dragRef.current;

      if (!dragRef.current.didMove && Math.abs(e.clientX - startX) >= MOVE_THRESHOLD_PX) {
        dragRef.current.didMove = true;
      }

      const rect = barRef.current.getBoundingClientRect();
      const deltaMinsFull = (e.clientX - startX) / rect.width * TOTAL_MINUTES;

      props.setSegments((prev) => {
        // Build neighbour bounds for the segment being dragged
        const others = prev.filter((s) => s.id !== id).sort((a, b) => a.startMin - b.startMin);
        const seg = prev.find((s) => s.id === id);
        if (!seg) return prev;

        // Nearest neighbour to the left and right of this segment's ORIGINAL position
        const leftNeighbourEnd = Math.max(
          0,
          ...others.filter((s) => s.endMin <= origStart).map((s) => s.endMin)
        );
        const rightNeighbourStart = Math.min(
          TOTAL_MINUTES,
          ...others.filter((s) => s.startMin >= origEnd).map((s) => s.startMin),
          // also catch any segment whose start is between origStart..origEnd (shouldn't normally exist)
          ...others.filter((s) => s.startMin > origStart).map((s) => s.startMin)
        );

        if (type === "left") {
          const rawStart = origStart + deltaMinsFull;
          const snapped = snapToInterval(rawStart, seg.interval, origEnd);
          const newStart = Math.max(leftNeighbourEnd, Math.min(snapped, seg.endMin - seg.interval));
          return prev.map((s) => s.id !== id ? s : { ...s, startMin: newStart });

        } else if (type === "right") {
          const rawEnd = origEnd + deltaMinsFull;
          const snapped = snapToInterval(rawEnd, seg.interval, origStart);
          const newEnd = Math.min(rightNeighbourStart, Math.max(snapped, seg.startMin + seg.interval));
          return prev.map((s) => s.id !== id ? s : { ...s, endMin: newEnd });

        } else {
          // move — preserve exact duration, snap to 5-min grid
          const dur = origEnd - origStart;
          const rawStart = origStart + deltaMinsFull;
          const clampedStart = snap(
            Math.max(leftNeighbourEnd, Math.min(rightNeighbourStart - dur, rawStart))
          );
          return prev.map((s) => s.id !== id ? s : { ...s, startMin: clampedStart, endMin: clampedStart + dur });
        }
      });
    };

    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
    };

    const onMouseDown = (e: MouseEvent) => {
      const currentFocusedId = focusedIdRef.current;
      if (currentFocusedId === null) return;

      const popupEl = popupsRef.current.get(currentFocusedId);
      const segmentEl = segmentsRef.current.get(currentFocusedId);
      const target = e.target as Node;

      const clickedInsidePopup = popupEl?.contains(target) ?? false;
      const clickedInsideSegment = segmentEl?.contains(target) ?? false;

      if (!clickedInsidePopup && !clickedInsideSegment) {
        setFocusedId(null);
        setActivePopup(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't fire if a drag is in progress
      if (dragRef.current) return;

      const currentFocusedId = focusedIdRef.current;
      if (currentFocusedId === null) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;

      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      e.preventDefault();
      props.setSegments((prev) => prev.filter((s) => s.id !== currentFocusedId));
      setFocusedId(null);
      setActivePopup(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const clearFocus = () => {
    setFocusedId(null);
    setActivePopup(null);
  };

  const largestGap = () => {
    const sorted = [...props.segments].sort((a, b) => a.startMin - b.startMin);
    let best = 0;
    let prev = 0;
    for (const s of sorted) {
      best = Math.max(best, s.startMin - prev);
      prev = s.endMin;
    }
    best = Math.max(best, TOTAL_MINUTES - prev);
    return best;
  };

  const canAddSegment = largestGap() >= MIN_GAP_TO_ADD && !props.individual;

  const addSegment = () => {
    if (!canAddSegment) return;
    const sorted = [...props.segments].sort((a, b) => a.startMin - b.startMin);
    const gaps: { from: number; to: number }[] = [];
    let prev = 0;
    for (const s of sorted) {
      if (s.startMin - prev >= MIN_GAP_TO_ADD) gaps.push({ from: prev, to: s.startMin });
      prev = s.endMin;
    }
    if (TOTAL_MINUTES - prev >= MIN_GAP_TO_ADD) gaps.push({ from: prev, to: TOTAL_MINUTES });
    const gap = gaps.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
    const mid = snap((gap.from + gap.to) / 2);
    const half = Math.min(30, Math.floor((gap.to - gap.from) / 2 / SNAP) * SNAP);
    const newStart = snap(Math.max(gap.from, mid - half));
    const newEnd = snap(Math.min(gap.to, newStart + half * 2));
    props.setSegments((prev) => [
      ...prev,
      { id: v4(), startMin: newStart, endMin: newEnd, interval: 15, userTag: props.activeTag, options: props.activeOptions },
    ]);
  };

  const removeSegment = (id: string) => {
    props.setSegments((prev) => prev.filter((s) => s.id !== id));
    if (focusedIdRef.current === id) setFocusedId(null);
    setActivePopup(null);
  };

  const setInterval_ = (id: string, interval: number) => {
    props.setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const ceiled = ceilToInterval(s.endMin, interval, s.startMin);
        const newEnd = Math.min(TOTAL_MINUTES, Math.max(ceiled, s.startMin + interval));
        return { ...s, interval, endMin: newEnd };
      })
    );
  };

  const hourTicks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i);

  return (
    <div
      className="flex items-center justify-center px-6"
      onClick={clearFocus}
    >
      <div className="w-full max-w-4xl flex flex-col gap-2">
        {/* Header */}
        <div className="flex flex-row items-end justify-between w-full">
          <div>
            {props.header}
          </div>
          <div>
            {!props.individual && (
              <button
                onClick={(e) => { e.stopPropagation(); addSegment(); }}
                disabled={!canAddSegment}
                title={!canAddSegment ? "No 30-minute gap available" : undefined}
                className="gap-2 px-4 py-2 rounded-lg border text-sm enabled:hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Add Segment</span>
              </button>
            )}
          </div>
        </div>

        {/* Bar + popups wrapper */}
        <div className="relative">

          {/* Popups — rendered above the bar track */}
          <div className="relative h-0">
            {props.segments.map((seg) => {
              if (activePopup !== seg.id) return null;
              const centerPct = ((seg.startMin + seg.endMin) / 2 / TOTAL_MINUTES) * 100;
              return (
                <div
                  ref={(el) => popupsRef.current.set(seg.id, el)}
                  key={seg.id}
                  className="absolute z-40"
                  style={{ left: `${centerPct}%`, transform: "translateX(-50%)", bottom: "12px" }}
                >
                  <div className="rounded-xl p-3 shadow-2xl min-w-[200px] border bg-white">
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {INTERVALS.map((iv) => (
                        <button
                          key={iv}
                          onClick={() => { setInterval_(seg.id, iv); setActivePopup(null); }}
                          className={`
                            py-1.5 rounded-md text-xs font-mono border
                            ${seg.interval === iv
                              ? 'bg-gray-200 cursor-not-allowed'
                              : 'hover:border-gray-400'
                            }
                          `}
                          disabled={seg.interval === iv}
                        >
                          {iv}m
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => removeSegment(seg.id)}
                      className="w-full py-1.5 rounded-md text-xs font-mono"
                      style={{
                        background: "rgba(244,63,94,0.1)",
                        border: "1px solid rgba(244,63,94,0.3)",
                        color: "#fda4af",
                      }}
                    >
                      Remove segment
                    </button>
                  </div>
                  {/* Caret */}
                  <div className="flex justify-center overflow-hidden" style={{ height: "8px" }}>
                    <div className="w-3 h-3 rotate-45 border bg-white" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* The bar track */}
          <div
            ref={barRef}
            className="relative h-24 rounded-2xl border border-slate-800/80"
          >
            {/* Hour grid lines */}
            {hourTicks.slice(1, -1).map((h) => (
              <div
                key={h}
                className="absolute top-0 h-full w-px pointer-events-none bg-gray-200"
                style={{ left: `${(h * 60 / TOTAL_MINUTES) * 100}%` }}
              />
            ))}

            {/* Empty state */}
            {props.segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-sm font-mono">
                No segments — click "+ Add Segment" to start
              </div>
            )}

            {/* Segments */}
            {props.segments.map((seg, index) => {
              const leftPct = pctOf(seg.startMin);
              const widthPct = pctOf(seg.endMin - seg.startMin);
              const durationMins = seg.endMin - seg.startMin;
              const isActive = activePopup === seg.id;
              const isFocused = focusedId === seg.id;
              const tickCount = Math.floor(durationMins / seg.interval) - 1;

              return (
                <div
                  ref={(el) => segmentsRef.current.set(seg.id, el)}
                  key={seg.id}
                  className={`
                    absolute top-2 bottom-2 rounded-xl
                    flex items-center justify-center select-none
                    border border-gray-400 bg-opacity-40
                    transition-shadow duration-150
                    ${seg.userTag?.color ? `bg-${seg.userTag.color}` : ''}
                    ${isFocused ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
                  `}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    cursor: "grab",
                    outline: "none",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedId(seg.id);
                  }}
                  tabIndex={index}
                  onMouseDown={(e) => {
                    startDrag(e, seg.id, "move");
                  }}
                >
                  {/* Interval ticks */}
                  <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                    {Array.from({ length: tickCount }).map((_, ti) => {
                      const tickPct = ((ti + 1) * seg.interval / durationMins) * 100;
                      return (
                        <div
                          key={ti}
                          className="absolute top-0 bottom-0 w-px opacity-20 bg-gray-500"
                          style={{ left: `${tickPct}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Label / popup trigger */}
                  <button
                    className="flex flex-col items-center gap-0.5 z-10 px-2 py-1 rounded-lg transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedId(seg.id);
                      setActivePopup(isActive ? null : seg.id);
                    }}
                  >
                    <span className="text-sm font-mono font-medium leading-none">{seg.interval}m</span>
                    <span className="text-xs opacity-50 font-mono mt-1">
                      {formatTime(minutesToDate(seg.startMin))} – {formatTime(minutesToDate(seg.endMin))}
                    </span>
                  </button>

                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center rounded-l-xl cursor-col-resize z-20 group/lh"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, seg.id, "left");
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/lh:opacity-90 bg-gray-500" />
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/lh:opacity-90 bg-gray-500" />
                    </div>
                  </div>

                  {/* Right resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center rounded-r-xl cursor-col-resize z-20 group/rh"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, seg.id, "right");
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/rh:opacity-90 bg-gray-500" />
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/rh:opacity-90 bg-gray-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time axis */}
          <div className="relative h-7 mt-1">
            {hourTicks.map((h) => {
              const pct = (h * 60 / TOTAL_MINUTES) * 100;
              const hour = START_HOUR + h;
              const label = hour === 12 ? "12p" : hour > 12 ? `${hour - 12}p` : `${hour}a`;
              return (
                <div
                  key={h}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                >
                  <div className="w-px h-1.5 bg-slate-700" />
                  <span className="text-xs text-slate-600 font-mono mt-0.5">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}