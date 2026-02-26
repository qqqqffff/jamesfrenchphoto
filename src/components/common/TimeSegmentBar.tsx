import React, { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from "react";
import { v4 } from 'uuid'

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const MIN_SEG = 15;
const SNAP = 5;

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

const COLORS = [
  { bg: "rgba(139,92,246,0.18)", border: "rgba(139,92,246,0.5)", text: "#a78bfa", dot: "#8b5cf6", glow: "rgba(139,92,246,0.3)" },
  { bg: "rgba(6,182,212,0.18)", border: "rgba(6,182,212,0.5)", text: "#67e8f9", dot: "#06b6d4", glow: "rgba(6,182,212,0.3)" },
  { bg: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.5)", text: "#fcd34d", dot: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  { bg: "rgba(244,63,94,0.18)", border: "rgba(244,63,94,0.5)", text: "#fda4af", dot: "#f43f5e", glow: "rgba(244,63,94,0.3)" },
  { bg: "rgba(16,185,129,0.18)", border: "rgba(16,185,129,0.5)", text: "#6ee7b7", dot: "#10b981", glow: "rgba(16,185,129,0.3)" },
  { bg: "rgba(249,115,22,0.18)", border: "rgba(249,115,22,0.5)", text: "#fdba74", dot: "#f97316", glow: "rgba(249,115,22,0.3)" },
];

const INTERVALS = [5, 10, 15, 20, 30, 60];


//move me to types.ts
export interface Segment {
  id: string,
  startMin: number,
  endMin: number,
  interval: number,
}

interface DragSegment {
  id: string,
  type: 'left' | 'right' | 'move'
  startX: number,
  origStart: number,
  origEnd: number,
}

interface TimeSegmentBarProps {
  segments: Segment[]
  setSegments: Dispatch<SetStateAction<Segment[]>>
}

export function TimeSegmentBar(props: TimeSegmentBarProps) {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSegment | null>(null);
  const colorMap = useRef<Record<string, number>>({});
  const colorCounter = useRef(0);

  props.segments.forEach((s) => {
    if (colorMap.current[s.id] === undefined) {
      colorMap.current[s.id] = colorCounter.current++ % COLORS.length;
    }
  });

  const pctOf = (min: number) => (min / TOTAL_MINUTES) * 100;

  const startDrag = useCallback((e: React.MouseEvent, id: string, type: 'move' | 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    const seg = props.segments.find((s) => s.id === id);
    if(!seg) return
    dragRef.current = { id, type, startX: e.clientX, origStart: seg.startMin, origEnd: seg.endMin };
    document.body.style.cursor = type === "move" ? "grabbing" : "col-resize";
  }, [props.segments]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !barRef.current) return;
      const { id, type, startX, origStart, origEnd } = dragRef.current;
      const rect = barRef.current.getBoundingClientRect();
      const deltaMins = snap((e.clientX - startX) / rect.width * TOTAL_MINUTES);

      props.setSegments((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          if (type === "left") {
            const newStart = Math.max(0, Math.min(origStart + deltaMins, s.endMin - MIN_SEG));
            return { ...s, startMin: snap(newStart) };
          } else if (type === "right") {
            const newEnd = Math.min(TOTAL_MINUTES, Math.max(origEnd + deltaMins, s.startMin + MIN_SEG));
            return { ...s, endMin: snap(newEnd) };
          } else {
            const dur = origEnd - origStart;
            const newStart = snap(Math.max(0, Math.min(TOTAL_MINUTES - dur, origStart + deltaMins)));
            return { ...s, startMin: newStart, endMin: newStart + dur };
          }
        })
      );
    };
    const onUp = () => { dragRef.current = null; document.body.style.cursor = ""; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const addSegment = () => {
    const sorted = [...props.segments].sort((a, b) => a.startMin - b.startMin);
    const gaps = [];
    let prev = 0;
    for (const s of sorted) {
      if (s.startMin - prev >= 60) gaps.push({ from: prev, to: s.startMin });
      prev = s.endMin;
    }
    if (TOTAL_MINUTES - prev >= 60) gaps.push({ from: prev, to: TOTAL_MINUTES });
    if (gaps.length === 0) return;
    const gap = gaps.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
    const mid = snap((gap.from + gap.to) / 2);
    const newStart = snap(Math.max(gap.from, mid - 30));
    const newEnd = snap(Math.min(gap.to, newStart + 60));
    props.setSegments((prev) => [...prev, { id: v4(), startMin: newStart, endMin: newEnd, interval: 15 }]);
  };

  const removeSegment = (id: string) => {
    props.setSegments((prev) => prev.filter((s) => s.id !== id));
    setActivePopup(null);
  };

  const setInterval_ = (id: string, interval: number) => {
    props.setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, interval } : s)));
  };

  const hourTicks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1025 50%, #0d1a2e 100%)" }}
      onClick={() => setActivePopup(null)}
    >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-slate-500 uppercase mb-1 font-mono">Schedule Builder</p>
            <h1 className="text-3xl font-light text-slate-100" style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.02em" }}>
              Time Segments
            </h1>
          </div>
          <button
            onClick={addSegment}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 text-sm hover:border-slate-500 hover:bg-slate-700/60 transition-all duration-200 font-mono"
          >
            <span className="text-lg leading-none">+</span> Add Segment
          </button>
        </div>

        {/* Pills */}
        <div className="flex gap-2 mb-6 flex-wrap min-h-[28px]">
          {[...props.segments].sort((a, b) => a.startMin - b.startMin).map((seg) => {
            const c = COLORS[colorMap.current[seg.id] % COLORS.length];
            return (
              <div key={seg.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border"
                style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                {formatTime(minutesToDate(seg.startMin))} – {formatTime(minutesToDate(seg.endMin))}
                <span style={{ color: "rgba(148,163,184,0.4)" }}>·</span>
                {seg.interval}m
              </div>
            );
          })}
        </div>

        {/* Bar + popups wrapper */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>

          {/* Popups — rendered above the bar track */}
          <div className="relative h-0">
            {props.segments.map((seg) => {
              if (activePopup !== seg.id) return null;
              const c = COLORS[colorMap.current[seg.id] % COLORS.length];
              const centerPct = ((seg.startMin + seg.endMin) / 2 / TOTAL_MINUTES) * 100;
              return (
                <div key={seg.id} className="absolute z-40" style={{ left: `${centerPct}%`, transform: "translateX(-50%)", bottom: "12px" }}>
                  <div className="rounded-xl p-3 shadow-2xl min-w-[200px]"
                    style={{ background: "#0d0d1f", border: `1px solid ${c.border}`, boxShadow: `0 0 32px ${c.glow}` }}>
                    <p className="text-slate-400 text-xs font-mono mb-2 tracking-wider uppercase">Interval</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {INTERVALS.map((iv) => (
                        <button key={iv}
                          onClick={() => { setInterval_(seg.id, iv); setActivePopup(null); }}
                          className="py-1.5 rounded-md text-xs font-mono transition-all"
                          style={seg.interval === iv
                            ? { background: c.bg, border: `1px solid ${c.border}`, color: c.text }
                            : { background: "#1a1a2e", border: "1px solid #2a3040", color: "#94a3b8" }}>
                          {iv}m
                        </button>
                      ))}
                    </div>
                    <button onClick={() => removeSegment(seg.id)}
                      className="w-full py-1.5 rounded-md text-xs font-mono"
                      style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af" }}>
                      Remove segment
                    </button>
                  </div>
                  {/* Caret */}
                  <div className="flex justify-center overflow-hidden" style={{ height: "8px" }}>
                    <div className="w-3 h-3 rotate-45" style={{
                      background: "#0d0d1f",
                      border: `1px solid ${c.border}`,
                      borderTop: "none", borderLeft: "none",
                      marginTop: "-6px"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* The bar track */}
          <div
            ref={barRef}
            className="relative h-24 rounded-2xl border border-slate-800/80"
            style={{ background: "rgba(8,8,20,0.95)" }}
          >
            {/* Subtle grid lines */}
            {hourTicks.slice(1, -1).map((h) => (
              <div key={h} className="absolute top-0 h-full w-px pointer-events-none"
                style={{ left: `${(h * 60 / TOTAL_MINUTES) * 100}%`, background: "rgba(148,163,184,0.05)" }} />
            ))}

            {/* Empty state */}
            {props.segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-sm font-mono">
                No segments — click "+ Add Segment" to start
              </div>
            )}

            {/* Segments */}
            {props.segments.map((seg) => {
              const c = COLORS[colorMap.current[seg.id] % COLORS.length];
              const leftPct = pctOf(seg.startMin);
              const widthPct = pctOf(seg.endMin - seg.startMin);
              const durationMins = seg.endMin - seg.startMin;
              const isActive = activePopup === seg.id;
              const tickCount = Math.floor(durationMins / seg.interval) - 1;

              return (
                <div
                  key={seg.id}
                  className="absolute top-2 bottom-2 rounded-xl flex items-center justify-center select-none"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    boxShadow: isActive ? `0 0 24px ${c.glow}, inset 0 0 12px ${c.glow}` : `inset 0 0 0 0 transparent`,
                    cursor: "grab",
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseDown={(e) => {
                    startDrag(e, seg.id, "move")
                  }}
                >
                  {/* Interval ticks */}
                  <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                    {Array.from({ length: tickCount }).map((_, ti) => {
                      const tickPct = ((ti + 1) * seg.interval / durationMins) * 100;
                      return (
                        <div key={ti} className="absolute top-0 bottom-0 w-px"
                          style={{ left: `${tickPct}%`, background: c.dot, opacity: 0.18 }} />
                      );
                    })}
                  </div>

                  {/* Label */}
                  <button
                    className="flex flex-col items-center gap-0.5 z-10 px-2 py-1 rounded-lg transition-colors"
                    style={{ color: c.text }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setActivePopup(isActive ? null : seg.id); }}
                  >
                    <span className="text-sm font-mono font-medium leading-none">{seg.interval}m</span>
                    <span className="text-xs opacity-50 font-mono mt-1">
                      {formatTime(minutesToDate(seg.startMin))} – {formatTime(minutesToDate(seg.endMin))}
                    </span>
                  </button>

                  {/* Left handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center rounded-l-xl cursor-col-resize z-20 group/lh"
                    onMouseDown={(e) => startDrag(e, seg.id, "left")}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/lh:opacity-90" style={{ background: c.dot }} />
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/lh:opacity-90" style={{ background: c.dot }} />
                    </div>
                  </div>

                  {/* Right handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center rounded-r-xl cursor-col-resize z-20 group/rh"
                    onMouseDown={(e) => startDrag(e, seg.id, "right")}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/rh:opacity-90" style={{ background: c.dot }} />
                      <span className="block w-0.5 h-3 rounded-full transition-opacity opacity-30 group-hover/rh:opacity-90" style={{ background: c.dot }} />
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
                <div key={h} className="absolute flex flex-col items-center" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
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