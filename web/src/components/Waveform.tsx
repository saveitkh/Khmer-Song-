import { useEffect, useRef, useState } from "react";
import { Icon, WaveBars } from "./ui";
import { clock } from "../lib/format";
import { haptic } from "../telegram";

/**
 * Audio player with a real wavesurfer.js waveform when a playable src is
 * given. wavesurfer is lazy-imported so it is only fetched on screens that
 * actually show audio. With no src (mock mode) it falls back to a tappable
 * animated bar strip so the UI is still demonstrable end to end.
 */
export function Waveform({
  src,
  durationS,
  compact = false,
}: {
  src: string | null;
  durationS?: number | null;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(durationS ?? 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || !containerRef.current) return;
    let disposed = false;
    let ws: any;
    (async () => {
      try {
        const { default: WaveSurfer } = await import("wavesurfer.js");
        if (disposed || !containerRef.current) return;
        ws = WaveSurfer.create({
          container: containerRef.current,
          height: compact ? 28 : 44,
          barWidth: 2.5,
          barGap: 2,
          barRadius: 3,
          cursorWidth: 0,
          waveColor: "#bccac1",
          progressColor: "#3db88f",
          url: src,
        });
        wsRef.current = ws;
        ws.on("ready", () => {
          if (disposed) return;
          setReady(true);
          setDur(ws.getDuration());
        });
        ws.on("timeupdate", (t: number) => setCur(t));
        ws.on("play", () => setPlaying(true));
        ws.on("pause", () => setPlaying(false));
        ws.on("finish", () => setPlaying(false));
        ws.on("error", () => setFailed(true));
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      try {
        ws?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [src, compact]);

  const toggle = () => {
    haptic("light");
    if (wsRef.current && ready) {
      wsRef.current.playPause();
    } else {
      // Mock fallback: fake a progress sweep so the control feels alive.
      setPlaying((p) => !p);
    }
  };

  const progress = dur ? cur / dur : 0;

  return (
    <div className="flex items-center gap-space-sm">
      <button
        onClick={toggle}
        className="w-10 h-10 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center active:scale-90 transition-transform shadow-sm"
        aria-label={playing ? "ផ្អាក" : "ចាក់"}
      >
        <Icon name={playing ? "pause" : "play_arrow"} size={22} />
      </button>
      <div className="flex-1 min-w-0">
        {src && !failed ? (
          <div ref={containerRef} className="w-full" />
        ) : (
          <WaveBars count={compact ? 18 : 28} animate={playing} progress={progress} className="h-8" />
        )}
      </div>
      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono shrink-0">
        {clock(cur)} / {clock(dur || durationS || 0)}
      </span>
    </div>
  );
}
