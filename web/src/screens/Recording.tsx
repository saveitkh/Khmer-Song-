import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { clock } from "../lib/format";
import { Icon, Km, Pill, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { haptic, notify } from "../telegram";

const MAX_SECONDS = 30;
type Phase = "ready" | "denied" | "unsupported" | "recording" | "recorded" | "saving";

export default function Recording() {
  const nav = useNavigate();
  const loc = useLocation();
  const { script = "", name = "សំឡេងរបស់ខ្ញុំ" } = (loc.state as { script?: string; name?: string } | null) ?? {};

  const [phase, setPhase] = useState<Phase>(
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) ? "ready" : "unsupported",
  );
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0); // 0..1 current input loudness
  const [noiseOk, setNoiseOk] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const draw = useCallback((analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    const render = () => {
      analyser.getByteFrequencyData(data);
      const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
      const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
      ctx.clearRect(0, 0, w, h);
      const bars = 40;
      const step = Math.floor(bins / bars);
      let sum = 0;
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255;
        sum += v;
        const barH = Math.max(2 * devicePixelRatio, v * h);
        const x = i * barW + barW * 0.2;
        const grad = ctx.createLinearGradient(0, h, 0, h - barH);
        grad.addColorStop(0, "#3db88f");
        grad.addColorStop(1, "#40c2fd");
        ctx.fillStyle = grad;
        const r = barW * 0.3;
        roundRect(ctx, x, h - barH, barW * 0.6, barH, r);
        ctx.fill();
      }
      const avg = sum / bars;
      setLevel(avg);
      setNoiseOk(avg < 0.85); // crude clipping/too-loud indicator
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  }, []);

  const start = async () => {
    try {
      haptic("medium");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx: AudioContext = new AC();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      draw(analyser);

      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase("recorded");
      };
      rec.start();
      setSeconds(0);
      setPhase("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stop();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setPhase("denied");
    }
  };

  const stop = () => {
    haptic("light");
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  };

  const reRecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setSeconds(0);
    setPhase("ready");
  };

  const save = async () => {
    setPhase("saving");
    try {
      // In real mode the blob is uploaded to R2 via a presigned PUT first, and
      // its key passed here. Mock mode accepts the voice without the upload.
      let refKey: string | undefined;
      const blob = blobRef.current;
      if (blob) {
        try {
          const presign = await api.presignUpload({ contentType: blob.type || "audio/webm", sizeBytes: blob.size, kind: "voice-ref" });
          if (presign.url && !presign.url.startsWith("mock:")) {
            await fetch(presign.url, { method: "PUT", headers: presign.headers, body: blob });
          }
          refKey = presign.key;
        } catch {
          /* mock mode / presign unavailable — continue without upload */
        }
      }
      const voice = await api.createVoice({ name, style: "custom", transcript: script, consent: true, refKey });
      notify("success");
      nav("/clone/compare", { state: { voiceId: voice.id, name } });
    } catch {
      notify("error");
      setPhase("recorded");
    }
  };

  if (phase === "unsupported" || phase === "denied") {
    return (
      <>
        <TopBar back title="ថតសំឡេង" />
        <StateView
          kind="error"
          title={phase === "unsupported" ? "ឧបករណ៍មិនគាំទ្រ" : "ត្រូវការសិទ្ធិមីក្រូហ្វូន"}
          message={phase === "unsupported" ? "កម្មវិធីរុករកនេះមិនអាចថតសំឡេងបានទេ" : "សូមអនុញ្ញាតឲ្យកម្មវិធីប្រើមីក្រូហ្វូន រួចព្យាយាមម្ដងទៀត"}
          onRetry={phase === "denied" ? () => setPhase("ready") : undefined}
        />
      </>
    );
  }

  return (
    <>
      <TopBar back title="ថតសំឡេង" subtitle={phase === "recording" ? "កំពុងថត…" : "រួចរាល់ដើម្បីថត"} />
      <div className="flex flex-col items-center gap-space-xl pt-space-lg pb-6">
        {/* Script reminder */}
        {script && (
          <div className="rounded-lg bg-surface-container-low p-space-md w-full">
            <Km className="font-body-md text-body-md text-on-surface" style={{ lineHeight: 1.7 }}>
              “{script}”
            </Km>
          </div>
        )}

        {/* Frequency meter */}
        <div className="w-full rounded-lg bg-surface-container-lowest p-space-lg shadow-sm flex flex-col items-center gap-space-md">
          <canvas ref={canvasRef} className="w-full h-28" />
          <div className="flex items-center gap-space-sm">
            <span className="font-display-lg text-display-lg text-on-surface font-mono">{clock(seconds)}</span>
            <span className="font-label-md text-label-md text-on-surface-variant">/ {clock(MAX_SECONDS)}</span>
          </div>
          {/* Quality / noise indicator */}
          <div className={`inline-flex items-center gap-space-xs px-space-md py-1 rounded-full font-label-sm text-label-sm ${noiseOk ? "bg-primary-fixed/30 text-on-surface" : "bg-error-container text-on-error-container"}`}>
            <Icon name={noiseOk ? "verified" : "warning"} size={14} />
            <Km>{phase === "recording" ? (noiseOk ? (level > 0.08 ? "គុណភាពល្អ" : "និយាយឲ្យឮជាងនេះ") : "សំឡេងខ្លាំងពេក") : "រង់ចាំ"}</Km>
          </div>
        </div>

        {/* Controls */}
        {phase === "ready" && (
          <button onClick={start} className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <Icon name="mic" size={36} />
          </button>
        )}
        {phase === "recording" && (
          <button onClick={stop} className="w-20 h-20 rounded-full bg-error text-on-error flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-pulse">
            <Icon name="stop" size={36} />
          </button>
        )}
        {(phase === "recorded" || phase === "saving") && (
          <div className="w-full flex flex-col gap-space-md">
            {previewUrl && <audio controls src={previewUrl} className="w-full" />}
            <div className="grid grid-cols-2 gap-gutter">
              <Pill variant="ghost" leading="refresh" onClick={reRecord} disabled={phase === "saving"}>
                ថតម្ដងទៀត
              </Pill>
              <Pill variant="primary" leading="save" onClick={save} disabled={phase === "saving"}>
                {phase === "saving" ? "កំពុងរក្សាទុក…" : "រក្សាទុក"}
              </Pill>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
