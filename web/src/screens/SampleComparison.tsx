import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, pollJob } from "../api";
import { useAsync } from "../lib/useAsync";
import { Card, Icon, Km, Pill, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { Waveform } from "../components/Waveform";
import { haptic, notify } from "../telegram";

export default function SampleComparison() {
  const nav = useNavigate();
  const loc = useLocation();
  const { voiceId, name } = (loc.state as { voiceId?: string; name?: string } | null) ?? {};

  const voice = useAsync(() => (voiceId ? api.getVoice(voiceId) : Promise.reject(new Error("no voice"))), [voiceId]);
  const [tab, setTab] = useState<"original" | "cloned">("cloned");
  const [clonedUrl, setClonedUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const startedRef = useRef(false);

  // Synthesize the sample sentence in the cloned voice, once.
  useEffect(() => {
    if (!voiceId || startedRef.current) return;
    startedRef.current = true;
    setPreviewState("running");
    (async () => {
      try {
        const job = await api.previewVoice(voiceId, "នេះជាសំឡេងក្លូនរបស់អ្នក ស្តាប់ទៅដូចដើមប៉ុណ្ណា?");
        const done = await pollJob(job.id);
        if (done.status === "done") {
          const out = done.output as { url?: string } | null;
          setClonedUrl(out?.url ?? null);
          setPreviewState("done");
        } else {
          setPreviewState("failed");
        }
      } catch {
        setPreviewState("failed");
      }
    })();
  }, [voiceId]);

  if (!voiceId) {
    return (
      <>
        <TopBar back title="ប្រៀបធៀបសំឡេង" />
        <StateView kind="error" title="គ្មានសំឡេង" message="សូមត្រឡប់ទៅថតសំឡេងម្ដងទៀត" onRetry={() => nav("/clone")} />
      </>
    );
  }

  const q = voice.status === "ok" ? voice.data.quality : null;

  return (
    <>
      <TopBar back title="ប្រៀបធៀបសំឡេង" subtitle="Original vs Cloned" />
      <div className="flex flex-col gap-space-xl pb-6">
        {/* A/B segmented switch */}
        <div className="flex items-center p-1 rounded-full bg-surface-container-low">
          {(["original", "cloned"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { haptic("light"); setTab(t); }}
              className={`flex-1 py-space-sm rounded-full font-label-md text-label-md transition-all ${tab === t ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
            >
              {t === "original" ? "សំឡេងដើម" : "សំឡេងក្លូន"}
            </button>
          ))}
        </div>

        {/* Player for the selected track */}
        <Card className="flex flex-col gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tab === "cloned" ? "bg-primary-fixed/40 text-primary-container" : "bg-secondary-fixed/40 text-secondary"}`}>
              <Icon name={tab === "cloned" ? "auto_awesome" : "person"} size={22} />
            </div>
            <Km className="font-headline-sm text-headline-sm text-on-surface">{tab === "cloned" ? "សំឡេងក្លូន (AI)" : "សំឡេងដើម (គំរូ)"}</Km>
          </div>
          {tab === "cloned" && previewState === "running" ? (
            <StateView kind="loading" title="កំពុងសំយោគសំឡេងក្លូន…" />
          ) : tab === "cloned" && previewState === "failed" ? (
            <StateView kind="error" title="សំយោគបរាជ័យ" message="សូមព្យាយាមម្ដងទៀត" onRetry={() => nav(0)} />
          ) : (
            <Waveform
              src={tab === "cloned" ? clonedUrl : voice.status === "ok" ? voice.data.sampleUrl : null}
              durationS={voice.status === "ok" ? voice.data.durationS : null}
            />
          )}
        </Card>

        {/* Quality scores — only real metrics; omitted entirely if unknown. */}
        {q && (q.matchPct != null || q.noiseDb != null) && (
          <div className="grid grid-cols-2 gap-gutter">
            {q.matchPct != null && <Score icon="target" label="ភាពដូចគ្នា" value={`${q.matchPct}%`} />}
            {q.noiseDb != null && <Score icon="graphic_eq" label="កម្រិតសំឡេងរំខាន" value={`${q.noiseDb} dB`} />}
          </div>
        )}

        <div className="grid grid-cols-2 gap-gutter">
          <Pill variant="ghost" leading="refresh" onClick={() => nav("/clone")}>
            ថតម្ដងទៀត
          </Pill>
          <Pill
            variant="primary"
            leading="check"
            onClick={() => { notify("success"); nav("/lyrics", { state: { voiceId, name } }); }}
          >
            យល់ព្រម & បន្ត
          </Pill>
        </div>
      </div>
    </>
  );
}

function Score({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-space-xs items-start">
      <div className="w-8 h-8 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary-container">
        <Icon name={icon} size={18} />
      </div>
      <span className="font-headline-md text-headline-md text-on-surface">{value}</span>
      <Km className="font-label-sm text-label-sm text-on-surface-variant">{label}</Km>
    </Card>
  );
}
