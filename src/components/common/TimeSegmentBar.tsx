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

/**
 * Returns true if any segment occupies any time within the last `hour` of the window.
 * "Last hour" = the 60-minute block at the top end (bottom - 1h to bottom).
 * Used to decide whether it's safe to shrink the trailing edge during a scroll.
 */
function segmentInLastHour(segments: Segment[], tw: { top: number; bottom: number }): boolean {
  const lastHourStart = totalMinutes(tw) - 60;
  return segments.some((s) => s.endMin > lastHourStart);
}

/**
 * Returns true if any segment occupies any time within the first `hour` of the window.
 * "First hour" = the 60-minute block at the bottom end (top to top + 1h).
 */
function segmentInFirstHour(segments: Segment[]): boolean {
  const firstHourEnd = 60;
  return segments.some((s) => s.startMin < firstHourEnd);
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
  individual?: boolean;
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
  const [segmentWidths, setSegmentWidths] = useState<Map<string, number>>(new Map());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
    const newWidths = new Map<string, number>(
      Array.from(segmentsRef.current.entries()).map(([id, el]) => {
        if (el) return [id, el.clientWidth];
      }).filter((value) => value !== undefined) as [string, number][]
    );
    setSegmentWidths(newWidths);
  }, [segmentsRef.current.size]);

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
    (e: React.MouseEvent, id: string, type: 'move' | 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();
      const seg = props.segments.find((s) => s.id === id);
      if (!seg) return;
      dragRef.current = {
        id, type,
        startX: e.clientX,
        origStart: seg.startMin,
        origEnd:   seg.endMin,
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
      const tw = timeWindowRef.current;
      const totMins = totalMinutes(tw);
      const deltaMinsFull = (e.clientX - startX) / rect.width * totMins;

      const dur = origEnd - origStart;
      let projectedStart: number;
      let projectedEnd: number;

      if (type === "left") {
        projectedStart = origStart + deltaMinsFull;
        projectedEnd = origEnd;
      } else if (type === "right") {
        projectedStart = origStart;
        projectedEnd = origEnd + deltaMinsFull;
      } else {
        projectedStart = origStart + deltaMinsFull;
        projectedEnd = projectedStart + dur;
      }

      const now = Date.now();
      const cooldownOk = now - lastEdgeScrollRef.current > EDGE_SCROLL_COOLDOWN_MS;

      if (cooldownOk) {
        const nearLeft  = projectedStart < EDGE_SCROLL_MARGIN_MINS && tw.top    > ABS_MIN_HOUR;
        const nearRight = projectedEnd   > totMins - EDGE_SCROLL_MARGIN_MINS && tw.bottom < ABS_MAX_HOUR;

        if (nearLeft || nearRight) {
          lastEdgeScrollRef.current = now;

          let newTop    = tw.top;
          let newBottom = tw.bottom;

          if (nearLeft) {
            newTop = tw.top - 1;

            // After expanding left the rebase will shift all offsets +60.
            // Check post-rebase positions against the candidate final window
            // to decide whether the right edge can be safely trimmed.
            const candidateTw = { top: newTop, bottom: newBottom };
            const rebasedSegments = rebaseSegments(props.segments, tw.top, newTop);
            if (!segmentInLastHour(rebasedSegments, candidateTw) && tw.bottom > ABS_MIN_HOUR + 2) {
              newBottom = tw.bottom - 1;
            }
          } else {
            newBottom = tw.bottom + 1;

            // No rebase happens when expanding right, so check current offsets
            // against a candidate window with the potential left shrink applied.
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
              startX:    startX - (addedMins / totalMinutes(newTw)) * rect.width,
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

        const leftNeighbourEnd = Math.max(
          0,
          ...others.filter((s) => s.endMin <= origStart).map((s) => s.endMin)
        );
        const rightNeighbourStart = Math.min(
          totMins,
          ...others.filter((s) => s.startMin >= origEnd).map((s) => s.startMin),
          ...others.filter((s) => s.startMin > origStart).map((s) => s.startMin)
        );

        if (type === "left") {
          const snapped  = snapToInterval(origStart + deltaMinsFull, seg.interval, origEnd);
          const newStart = Math.max(leftNeighbourEnd, Math.min(snapped, seg.endMin - seg.interval));
          return prev.map((s) => s.id !== id ? s : { ...s, startMin: newStart });

        } else if (type === "right") {
          const snapped = snapToInterval(origEnd + deltaMinsFull, seg.interval, origStart);
          const newEnd  = Math.min(rightNeighbourStart, Math.max(snapped, seg.startMin + seg.interval));
          return prev.map((s) => s.id !== id ? s : { ...s, endMin: newEnd });

        } else {
          const clampedStart = snap(Math.max(leftNeighbourEnd, Math.min(rightNeighbourStart - dur, origStart + deltaMinsFull)));
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
      const popupEl   = popupsRef.current.get(cfid);
      const segmentEl = segmentsRef.current.get(cfid);
      const target = e.target as Node;
      if (!(popupEl?.contains(target) ?? false) && !(segmentEl?.contains(target) ?? false)) {
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

  const canAddSegment = largestGap() >= MIN_GAP_TO_ADD && !props.individual;

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
    <div className="flex items-center justify-center px-6" onClick={clearFocus}>
      <div className="w-full max-w-4xl flex flex-col gap-2">

        <div className="flex flex-row items-end justify-between w-full">
          <div>{props.header}</div>
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

        <div className="relative">

          <div className="relative h-0">
            {props.segments.map((seg) => {
              if (activePopup !== seg.id) return null;
              const totMin = totalMinutes(timeWindow);
              const centerPct = ((seg.startMin + seg.endMin) / 2 / totMin) * 100;
              return (
                <div
                  ref={(el) => popupsRef.current.set(seg.id, el)}
                  key={seg.id}
                  className="absolute z-40"
                  style={{ left: `${centerPct}%`, transform: "translateX(-50%)", top: "100px" }}
                >
                  <div className="flex justify-center overflow-hidden" style={{ height: "8px" }}>
                    <div className="w-3 h-3 rotate-45 border bg-white" />
                  </div>
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
                    {!props.individual && (
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
              );
            })}
          </div>

          <div ref={barRef} className="relative h-24 rounded-2xl border border-slate-800/80">

            {hourTicks.slice(1, -1).map((h) => (
              <div
                key={h}
                className="absolute top-0 h-full w-px pointer-events-none bg-gray-200"
                style={{ left: `${(h * 60 / totalMinutes(timeWindow)) * 100}%` }}
              />
            ))}

            {props.segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-sm font-mono">
                No segments — click "+ Add Segment" to start
              </div>
            )}

            {props.segments.map((seg, index) => {
              const totMin = totalMinutes(timeWindow);
              const leftPct = (seg.startMin / totMin) * 100;
              const widthPct = ((seg.endMin - seg.startMin) / totMin) * 100;
              const durationMins = seg.endMin - seg.startMin;
              const isActive = activePopup === seg.id;
              const isFocused = focusedId === seg.id;
              const tickCount = Math.floor(durationMins / seg.interval) - 1;

              return (
                <div
                  ref={(el) => { segmentsRef.current.set(seg.id, el) }}
                  key={seg.id}
                  className={`
                    absolute top-2 bottom-2 rounded-xl
                    flex items-center justify-center select-none
                    border border-gray-400 bg-opacity-40
                    transition-shadow duration-150
                    ${seg.userTag?.color ? `bg-${seg.userTag.color}` : ''}
                    ${isFocused ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
                  `}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, cursor: "grab", outline: "none" }}
                  tabIndex={index}
                  onMouseDown={(e) => { startDrag(e, seg.id, "move"); }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                    {Array.from({ length: tickCount }).map((_, ti) => {
                      const tickPct = ((ti + 1) * seg.interval / durationMins) * 100;
                      return (
                        <div key={ti} className="absolute top-0 bottom-0 w-px opacity-20 bg-gray-500" style={{ left: `${tickPct}%` }} />
                      );
                    })}
                  </div>

                  <button
                    className="flex flex-col items-center gap-0.5 z-10 px-2 py-1 rounded-lg"
                    onMouseEnter={() => {
                      if(!isFocused) {
                        setHoveredId(seg.id)
                      }
                    }}
                    onMouseLeave={() => {
                      if(hoveredId !== null) {
                        setHoveredId(null)
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedId(seg.id);
                      setActivePopup(isActive ? null : seg.id);
                    }}
                  >
                    <span 
                      className="text-sm font-mono font-medium leading-none"
                      style={{
                        textDecorationLine: hoveredId === seg.id ? 'underline' : 'none'
                      }}
                    >{seg.interval}m</span>
                    <span
                      className={`text-xs opacity-50 font-mono mt-1 ${hoveredId === seg.id ? 'text-nowrap' : 'truncate'}`}
                      style={{ 
                        maxWidth: `calc(${segmentWidths.get(seg.id) ?? 20}px - 2px)`,
                        
                      }}
                    >
                      {formatTime(minutesToDate(seg.startMin, timeWindow.top))} - {formatTime(minutesToDate(seg.endMin, timeWindow.top))}
                    </span>
                  </button>

                  {!props.individual && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center rounded-l-xl cursor-col-resize z-20 group/lh"
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e, seg.id, "left"); }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/lh:opacity-90 bg-gray-500" />
                        <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/lh:opacity-90 bg-gray-500" />
                      </div>
                    </div>
                  )}

                  {!props.individual && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center rounded-r-xl cursor-col-resize z-20 group/rh"
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e, seg.id, "right"); }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/rh:opacity-90 bg-gray-500" />
                        <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/rh:opacity-90 bg-gray-500" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative h-7 mt-1">
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