import React, { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from "react";
import { v4 } from 'uuid'
import { Segment, UserTag } from "../../types";
import { Duration } from "luxon";

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;
const ABS_MIN_HOUR = 6;
const ABS_MAX_HOUR = 23;
const SNAP = 5;
const MIN_GAP_TO_ADD = 30;
const EDGE_SCROLL_COOLDOWN_MS = 600;
const EDGE_SCROLL_MARGIN_MINS = 30;

function minutesToDate(minutes: number, windowTopHour: number) {
  const d = new Date();
  d.setHours(windowTopHour + Math.floor(minutes / 60), minutes % 60, 0, 0);
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

function deriveWindow(
  segments: Segment[],
  currentTop: number,
): { top: number; bottom: number } {
  if (segments.length === 0) {
    return { top: DEFAULT_START_HOUR, bottom: DEFAULT_END_HOUR };
  }

  const absStarts = segments.map((s) => currentTop + Math.floor(s.startMin / 60));
  const absEnds = segments.map((s) => currentTop + Math.ceil(s.endMin / 60));

  const minAbsHour = Math.min(...absStarts);
  const maxAbsHour = Math.max(...absEnds);

  const padding = Math.min(3, Math.max(((maxAbsHour - minAbsHour) / (ABS_MAX_HOUR - ABS_MIN_HOUR)) * 3, 1));

  const newTop = Math.max(ABS_MIN_HOUR, Math.floor(minAbsHour - padding));
  const newBottom = Math.min(ABS_MAX_HOUR, Math.ceil(maxAbsHour + padding));

  return { top: newTop, bottom: newBottom };
}

function totalMinutes(window: { top: number; bottom: number }) {
  return (window.bottom - window.top) * 60;
}

function rebaseSegments(
  segments: Segment[],
  oldTopHour: number,
  newTopHour: number
): Segment[] {
  const delta = (oldTopHour - newTopHour) * 60;
  if (delta === 0) return segments;
  return segments.map((s) => ({
    ...s,
    startMin: s.startMin + delta,
    endMin:   s.endMin   + delta,
  }));
}

function segmentInLastHour(segments: Segment[], tw: { top: number; bottom: number }): boolean {
  const lastHourStart = totalMinutes(tw) - 60;
  return segments.some((s) => s.endMin > lastHourStart);
}

function segmentInFirstHour(segments: Segment[]): boolean {
  const firstHourEnd = 60;
  return segments.some((s) => s.startMin < firstHourEnd);
}

const INTERVALS = [5, 10, 15, 20, 30, 60];

interface DragSegment {
  id: string;
  type: 'top' | 'bottom' | 'move';
  startY: number;
  origStart: number;
  origEnd: number;
  didMove: boolean;
}

interface TimeSegmentBarProps {
  segments: Segment[];
  setSegments: Dispatch<SetStateAction<Segment[]>>;
  individual: {
    individual: false
    setSelectedSegement: Dispatch<SetStateAction<Segment | undefined>>
    selectedSegment?: Segment
  } | {
    individual: true
  };
  header?: JSX.Element;
  activeTag?: UserTag;
  activeOptions?: {
    noshowFee?: number;
    description?: string;
    cancelationFee?: {
      amount: number;
      window: Duration;
    };
  };
}

export function TimeSegmentBar(props: TimeSegmentBarProps) {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const barRef = useRef<HTMLDivElement | null>(null);
  const popupsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const segmentsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const dragRef = useRef<DragSegment | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const lastEdgeScrollRef = useRef<number>(0);

  const [timeWindow, setTimeWindow] = useState<{ top: number; bottom: number }>(deriveWindow(props.segments, DEFAULT_START_HOUR));
  const timeWindowRef = useRef(timeWindow);
  const rebasedTopRef = useRef<number>(timeWindow.top);

  useEffect(() => { timeWindowRef.current = timeWindow; }, [timeWindow]);
  useEffect(() => { focusedIdRef.current = focusedId; }, [focusedId]);


  useEffect(() => {
    if (dragRef.current !== null) return;

    const tw = timeWindowRef.current;
    const newWindow = deriveWindow(props.segments, tw.top);

    if (newWindow.top === tw.top && newWindow.bottom === tw.bottom) return;

    if (newWindow.top !== tw.top && rebasedTopRef.current !== newWindow.top) {
      rebasedTopRef.current = newWindow.top;
      props.setSegments((segs) => rebaseSegments(segs, tw.top, newWindow.top));
    }

    setTimeWindow(newWindow);
    timeWindowRef.current = newWindow;
  }, [props.segments]);

  const startDrag = useCallback(
    (e: React.MouseEvent, id: string, type: 'move' | 'top' | 'bottom') => {
      e.preventDefault();
      e.stopPropagation();
      const seg = props.segments.find((s) => s.id === id);
      if (!seg) return;
      dragRef.current = {
        id, type,
        startY: e.clientY,
        origStart: seg.startMin,
        origEnd:   seg.endMin,
        didMove: false,
      };
      document.body.style.cursor = type === "move" ? "grabbing" : "row-resize";
    },
    [props.segments]
  );

  useEffect(() => {
    const MOVE_THRESHOLD_PX = 4;

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !barRef.current) return;
      const { id, type, startY, origStart, origEnd } = dragRef.current;

      if (!dragRef.current.didMove && Math.abs(e.clientY - startY) >= MOVE_THRESHOLD_PX) {
        dragRef.current.didMove = true;
      }

      const rect = barRef.current.getBoundingClientRect();
      const tw = timeWindowRef.current;
      const totMins = totalMinutes(tw);
      // In vertical mode Y increases downward, so positive deltaY → later time
      const deltaMinsFull = (e.clientY - startY) / rect.height * totMins;

      const dur = origEnd - origStart;
      let projectedStart: number;
      let projectedEnd: number;

      if (type === "top") {
        projectedStart = origStart + deltaMinsFull;
        projectedEnd = origEnd;
      } else if (type === "bottom") {
        projectedStart = origStart;
        projectedEnd = origEnd + deltaMinsFull;
      } else {
        projectedStart = origStart + deltaMinsFull;
        projectedEnd = projectedStart + dur;
      }

      const now = Date.now();
      const cooldownOk = now - lastEdgeScrollRef.current > EDGE_SCROLL_COOLDOWN_MS;

      if (cooldownOk) {
        // nearTop = segment approaching the top (early) edge of the window
        // nearBottom = segment approaching the bottom (late) edge of the window
        const nearTop    = projectedStart < EDGE_SCROLL_MARGIN_MINS && tw.top    > ABS_MIN_HOUR;
        const nearBottom = projectedEnd   > totMins - EDGE_SCROLL_MARGIN_MINS && tw.bottom < ABS_MAX_HOUR;

        if (nearTop || nearBottom) {
          lastEdgeScrollRef.current = now;

          let newTop    = tw.top;
          let newBottom = tw.bottom;

          if (nearTop) {
            newTop = tw.top - 1;

            const candidateTw = { top: newTop, bottom: newBottom };
            const rebasedSegs = rebaseSegments(props.segments, tw.top, newTop);
            if (!segmentInLastHour(rebasedSegs, candidateTw) && tw.bottom > ABS_MIN_HOUR + 2) {
              newBottom = tw.bottom - 1;
            }
          } else {
            newBottom = tw.bottom + 1;

            if (!segmentInFirstHour(props.segments) && tw.top < ABS_MAX_HOUR - 1) {
              newTop = tw.top + 1;
            }
          }

          const newTw = { top: newTop, bottom: newBottom };

          if (newTop !== tw.top) {
            const addedMins = (tw.top - newTop) * 60;
            dragRef.current = {
              ...dragRef.current,
              origStart: origStart + addedMins,
              origEnd:   origEnd   + addedMins,
              startY:    startY - (addedMins / totalMinutes(newTw)) * rect.height,
            };
            rebasedTopRef.current = newTop;
            props.setSegments((segs) => rebaseSegments(segs, tw.top, newTop));
          }

          setTimeWindow(newTw);
          timeWindowRef.current = newTw;
          return;
        }
      }

      props.setSegments((prev) => {
        const others = prev.filter((s) => s.id !== id).sort((a, b) => a.startMin - b.startMin);
        const seg = prev.find((s) => s.id === id);
        if (!seg) return prev;

        const topNeighbourEnd = Math.max(
          0,
          ...others.filter((s) => s.endMin <= origStart).map((s) => s.endMin)
        );
        const bottomNeighbourStart = Math.min(
          totMins,
          ...others.filter((s) => s.startMin >= origEnd).map((s) => s.startMin),
          ...others.filter((s) => s.startMin > origStart).map((s) => s.startMin)
        );

        if (type === "top") {
          const snapped  = snapToInterval(origStart + deltaMinsFull, seg.interval, origEnd);
          const newStart = Math.max(topNeighbourEnd, Math.min(snapped, seg.endMin - seg.interval));
          return prev.map((s) => s.id !== id ? s : { ...s, startMin: newStart });

        } else if (type === "bottom") {
          const snapped = snapToInterval(origEnd + deltaMinsFull, seg.interval, origStart);
          const newEnd  = Math.min(bottomNeighbourStart, Math.max(snapped, seg.startMin + seg.interval));
          return prev.map((s) => s.id !== id ? s : { ...s, endMin: newEnd });

        } else {
          const clampedStart = snap(Math.max(topNeighbourEnd, Math.min(bottomNeighbourStart - dur, origStart + deltaMinsFull)));
          return prev.map((s) => s.id !== id ? s : { ...s, startMin: clampedStart, endMin: clampedStart + dur });
        }
      });
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      lastEdgeScrollRef.current = 0;

      const tw = timeWindowRef.current;
      props.setSegments((segs) => {
        const newWindow = deriveWindow(segs, tw.top);
        const topChanged = newWindow.top !== tw.top;
        if (topChanged) rebasedTopRef.current = newWindow.top;
        const rebased = topChanged ? rebaseSegments(segs, tw.top, newWindow.top) : segs;
        setTimeWindow(newWindow);
        timeWindowRef.current = newWindow;
        return rebased;
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      const cfid = focusedIdRef.current;
      if (cfid === null) return;
      const popupEl = popupsRef.current.get(cfid);
      const segmentEl = segmentsRef.current.get(cfid);
      const target = e.target as Node;
      if (
        (
          !(popupEl?.contains(target) ?? false) && !(segmentEl?.contains(target) ?? false)
        )  && (
          (
            !props.individual.individual && props.individual.selectedSegment === undefined
          ) || props.individual.individual
        )
      ) {
        setFocusedId(null);
        setActivePopup(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (dragRef.current) return;
      const cfid = focusedIdRef.current;
      if (cfid === null) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      props.setSegments((prev) => prev.filter((s) => s.id !== cfid));
      setFocusedId(null);
      setActivePopup(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const clearFocus = () => { setFocusedId(null); setActivePopup(null); };

  const largestGap = () => {
    const sorted = [...props.segments].sort((a, b) => a.startMin - b.startMin);
    let best = 0, prev = 0;
    for (const s of sorted) { best = Math.max(best, s.startMin - prev); prev = s.endMin; }
    best = Math.max(best, totalMinutes(timeWindow) - prev);
    return best;
  };

  const canAddSegment = largestGap() >= MIN_GAP_TO_ADD && !props.individual.individual;

  const addSegment = () => {
    if (!canAddSegment) return;
    const totMin = totalMinutes(timeWindow);
    const sorted = [...props.segments].sort((a, b) => a.startMin - b.startMin);
    const gaps: { from: number; to: number }[] = [];
    let prev = 0;
    for (const s of sorted) {
      if (s.startMin - prev >= MIN_GAP_TO_ADD) gaps.push({ from: prev, to: s.startMin });
      prev = s.endMin;
    }
    if (totMin - prev >= MIN_GAP_TO_ADD) gaps.push({ from: prev, to: totMin });
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
    if (focusedId === id) setFocusedId(null);
    setActivePopup(null);
  };

  const setInterval_ = (id: string, interval: number) => {
    props.setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const ceiled = ceilToInterval(s.endMin, interval, s.startMin);
        const newEnd = Math.min(totalMinutes(timeWindow), Math.max(ceiled, s.startMin + interval));
        return { ...s, interval, endMin: newEnd };
      })
    );
  };

  const windowSpanHours = timeWindow.bottom - timeWindow.top;
  const hourTicks = Array.from({ length: windowSpanHours + 1 }, (_, i) => i);

  return (
    <div className="flex flex-col px-6 border rounded-lg py-2" onClick={clearFocus}>
      <div className="w-full flex flex-col gap-2">

        <div className="flex flex-row w-full">
          <div className="flex justify-center w-full">{props.header}</div>
          <div>
            {!props.individual.individual && (
              <button
                onClick={(e) => { e.stopPropagation(); addSegment(); }}
                disabled={!canAddSegment}
                title={!canAddSegment ? "No 30-minute gap available" : undefined}
                className="gap-2 px-4 py-2 rounded-lg border text-sm text-nowrap enabled:hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Add Segment</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative flex flex-row gap-2 justify-center w-full py-2">

          {/* Time axis — left side, ticks at each hour */}
          <div className="relative w-10 flex-shrink-0" style={{ height: `${Math.max(550, windowSpanHours * 48)}px` }}>
            {hourTicks.map((h) => {
              const pct = (h * 60 / totalMinutes(timeWindow)) * 100;
              const absHour = timeWindow.top + h;
              const label = absHour === 12 ? (
                "12p"
              ) : (
                absHour > 12 ? (
                  `${absHour - 12}p`
                ) : (
                  absHour === 0 ? (
                    "12a"
                  ) : (
                    `${absHour}a`
                  )
                )
              );
              return (
                <div
                  key={h}
                  className="absolute flex flex-row items-center justify-end gap-1 w-full"
                  style={{ top: `${pct}%`, transform: "translateY(-50%)" }}
                >
                  <span className="text-xs text-slate-600 font-mono">{label}</span>
                  <div className="h-px w-1.5 bg-slate-700" />
                </div>
              );
            })}
          </div>

          {/* Bar track */}
          <div
            ref={barRef}
            className="relative flex-1 rounded-2xl border border-slate-800/80 max-w-[300px]"
            style={{ height: `${Math.max(550, windowSpanHours * 48)}px` }}
          >
            {/* Hour grid lines — horizontal */}
            {hourTicks.slice(1, -1).map((h) => (
              <div
                key={h}
                className="absolute left-0 w-full h-px pointer-events-none bg-gray-200"
                style={{ top: `${(h * 60 / totalMinutes(timeWindow)) * 100}%` }}
              />
            ))}

            {props.segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-sm font-mono">
                No segments — click "+ Add Segment" to start
              </div>
            )}

            {/* Segments */}
            {props.segments.map((seg, index) => {
              const totMin = totalMinutes(timeWindow);
              const topPct  = (seg.startMin / totMin) * 100;
              const heightPct = ((seg.endMin - seg.startMin) / totMin) * 100;
              const durationMins = seg.endMin - seg.startMin;
              const isActive = activePopup === seg.id;
              const isFocused = focusedId === seg.id;
              const tickCount = Math.floor(durationMins / seg.interval) - 1;

              return (
                <div
                  ref={(el) => { segmentsRef.current.set(seg.id, el) }}
                  key={seg.id}
                  className="absolute left-2 right-2 flex flex-col select-none"
                  style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                >
                  {/* Popup — rendered to the right of the segment */}
                  {activePopup === seg.id && (
                    <div
                      ref={(el) => popupsRef.current.set(seg.id, el)}
                      className="absolute z-40 left-[calc(100%+8px)]"
                      style={{ top: "50%", transform: "translateY(-50%)" }}
                    >
                      <div className="flex flex-row items-center">
                        <div className="w-2 h-2 rotate-45 border bg-white border-r-0 border-t-0" />
                        <div className="rounded-xl p-3 shadow-2xl min-w-[200px] border bg-white">
                          <div className="grid grid-cols-3 gap-1.5 mb-3">
                            {INTERVALS.map((iv) => (
                              <button
                                key={iv}
                                onClick={() => { setInterval_(seg.id, iv); setActivePopup(null); }}
                                className={`py-1.5 rounded-md text-xs font-mono border ${
                                  seg.interval === iv ? 'bg-gray-200 cursor-not-allowed' : 'hover:border-gray-400'
                                }`}
                                disabled={seg.interval === iv}
                              >
                                {iv}m
                              </button>
                            ))}
                          </div>
                          {!props.individual.individual && (
                            <button
                              onClick={() => removeSegment(seg.id)}
                              className="w-full py-1.5 rounded-md text-xs font-mono"
                              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af" }}
                            >
                              Remove segment
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* The segment block */}
                  <div
                    className={`
                      relative flex-1 rounded-xl
                      flex flex-col items-center justify-center
                      border border-gray-400 bg-opacity-40
                      transition-shadow duration-150
                      ${seg.userTag?.color ? `bg-${seg.userTag.color}` : ''}
                      ${isFocused ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
                    `}
                    style={{ cursor: "grab", outline: "none" }}
                    tabIndex={index}
                    onMouseDown={(e) => { startDrag(e, seg.id, "move"); }}
                  >
                    {/* Interval ticks — horizontal lines */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                      {Array.from({ length: tickCount }).map((_, ti) => {
                        const tickPct = ((ti + 1) * seg.interval / durationMins) * 100;
                        return (
                          <div key={ti} className="absolute left-0 right-0 h-px opacity-20 bg-gray-500" style={{ top: `${tickPct}%` }} />
                        );
                      })}
                    </div>

                    {/* Label / popup trigger */}
                    <button
                      className="flex flex-col items-center gap-0.5 z-10 px-2 py-1 rounded-lg"
                      onMouseDown={(e) => e.stopPropagation()}
                      
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedId(seg.id);
                        setActivePopup(isActive ? null : seg.id);
                      }}
                    >
                      <span
                        className={`
                          text-sm font-mono font-medium leading-none 
                          ${hoveredId === seg.id ? 'underline' : ''}
                        `}
                        onMouseEnter={() => setHoveredId(seg.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {seg.interval}m
                      </span>
                      <span
                        className={`
                          text-xs opacity-50 font-mono text-nowrap
                          ${hoveredId === seg.id ? 'underline' : ''}
                        `}
                        onMouseEnter={() => setHoveredId(seg.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {formatTime(minutesToDate(seg.startMin, timeWindow.top))} - {formatTime(minutesToDate(seg.endMin, timeWindow.top))}
                      </span>
                    </button>
                    {!props.individual.individual && (
                      <button 
                        className="text-sm font-mono text-nowrap border-black border px-3 rounded-lg"
                        onClick={() => {
                          if(!props.individual.individual) {
                            if(props.individual.selectedSegment?.id === seg.id) {
                              props.individual.setSelectedSegement(undefined)
                            }
                            else {
                              props.individual.setSelectedSegement(seg)
                            }
                          }
                        }}
                      >{props.individual.selectedSegment?.id === seg.id ? 'Done' : 'Edit'}</button>
                    )}

                    {/* Top resize handle */}
                    {!props.individual.individual && (
                      <div
                        className="absolute top-0 left-0 right-0 h-4 flex items-center justify-center rounded-t-xl cursor-row-resize z-20 group/th"
                        onMouseDown={(e) => { e.stopPropagation(); startDrag(e, seg.id, "top"); }}
                      >
                        <div className="flex flex-row gap-0.5">
                          <span className="block h-0.5 w-3 rounded-full transition-opacity opacity-30 group-hover/th:opacity-90 bg-gray-500" />
                          <span className="block h-0.5 w-3 rounded-full transition-opacity opacity-30 group-hover/th:opacity-90 bg-gray-500" />
                        </div>
                      </div>
                    )}

                    {/* Bottom resize handle */}
                    {!props.individual.individual && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center rounded-b-xl cursor-row-resize z-20 group/bh"
                        onMouseDown={(e) => { e.stopPropagation(); startDrag(e, seg.id, "bottom"); }}
                      >
                        <div className="flex flex-row gap-0.5">
                          <span className="block h-0.5 w-3 rounded-full transition-opacity opacity-30 group-hover/bh:opacity-90 bg-gray-500" />
                          <span className="block h-0.5 w-3 rounded-full transition-opacity opacity-30 group-hover/bh:opacity-90 bg-gray-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}