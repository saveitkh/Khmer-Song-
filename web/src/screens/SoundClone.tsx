import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../lib/useAsync";
import { relativeKm } from "../lib/format";
import { Card, Icon, Km, Pill, SectionHeader, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { haptic, notify } from "../telegram";
import type { Voice } from "../lib/types";

// The liveness script: the user must READ one of these aloud on screen, which
// is what proves the recording is their own voice. In real mode the server
// picks and verifies the prompt; this set backs the mock + instant UX.
const SCRIPTS = [
  "ខ្ញុំយល់ព្រមឲ្យប្រើសំឡេងរបស់ខ្ញុំ ដើម្បីបង្កើតម៉ូដែលសំឡេង AI នៅថ្ងៃនេះ។",
  "សូមស្តាប់សំឡេងរបស់ខ្ញុំ ខ្ញុំកំពុងថតដើម្បីក្លូនសំឡេងផ្ទាល់ខ្លួន។",
  "នេះជាសំឡេងពិតរបស់ខ្ញុំ ហើយខ្ញុំអនុញ្ញាតឲ្យប្រើវាក្នុងកម្មវិធីនេះ។",
];

export default function SoundClone() {
  const nav = useNavigate();
  const voices = useAsync(() => api.listVoices(), []);
  const script = useMemo(() => SCRIPTS[Math.floor(Math.random() * SCRIPTS.length)], []);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);

  const start = () => {
    if (!consent) return;
    haptic("medium");
    nav("/clone/record", { state: { script, name: name.trim() || "សំឡេងរបស់ខ្ញុំ" } });
  };

  return (
    <>
      <TopBar back title="ក្លូនសំឡេង" subtitle="Sound Clone Studio" />
      <div className="flex flex-col gap-space-xl pb-6">
        {/* Script to read */}
        <Card className="bg-surface-container-low flex flex-col gap-space-md">
          <div className="flex items-center gap-space-sm">
            <Icon name="menu_book" size={22} className="text-primary-container" />
            <Km className="font-headline-sm text-headline-sm text-on-surface">អត្ថបទដែលត្រូវអាន</Km>
          </div>
          <div className="rounded bg-surface-container-lowest p-space-lg border border-outline-variant/40">
            <Km className="font-body-lg text-body-lg text-on-surface" style={{ lineHeight: 1.7 }}>
              “{script}”
            </Km>
          </div>
          <Km className="font-body-sm text-body-sm text-on-surface-variant">
            អានប្រយោគនេះឲ្យច្បាស់ ក្នុងកន្លែងស្ងាត់ ប្រហែល ២០–៣០ វិនាទី។ នេះជាការបញ្ជាក់ថាសំឡេងជារបស់អ្នកពិតប្រាកដ។
          </Km>
        </Card>

        {/* Name */}
        <div className="flex flex-col gap-space-sm">
          <Km className="font-label-md text-label-md text-on-surface-variant">ឈ្មោះម៉ូដែលសំឡេង</Km>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ឧ. សំឡេងរបស់ខ្ញុំ"
            className="w-full rounded bg-surface-container-lowest border border-outline-variant/60 px-space-md py-space-md font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary-container focus:outline-none focus:ring-4 focus:ring-primary-container/15"
          />
        </div>

        {/* Consent */}
        <button
          onClick={() => { haptic("light"); setConsent((c) => !c); }}
          className="flex items-start gap-space-md text-left"
        >
          <span className={`w-6 h-6 mt-0.5 shrink-0 rounded-full flex items-center justify-center border-2 ${consent ? "bg-primary-container border-primary-container text-on-primary-container" : "border-outline-variant"}`}>
            {consent && <Icon name="check" size={16} />}
          </span>
          <Km className="font-body-sm text-body-sm text-on-surface-variant">
            ខ្ញុំបញ្ជាក់ថានេះជាសំឡេងផ្ទាល់ខ្លួនរបស់ខ្ញុំ ហើយខ្ញុំយល់ព្រមតាម
            <span className="text-primary-container"> លក្ខខណ្ឌប្រើប្រាស់</span>។
            ការក្លែងសំឡេងអ្នកដទៃ ការបន្លំ និងព័ត៌មានក្លែងក្លាយ ត្រូវបានហាមឃាត់។
          </Km>
        </button>

        <Pill full leading="mic" disabled={!consent} onClick={start}>
          ចាប់ផ្តើមថត
        </Pill>

        {/* Saved voices */}
        <section className="flex flex-col gap-space-md">
          <SectionHeader title="សំឡេងរបស់អ្នក" subtitle="ម៉ូដែលដែលបានរក្សាទុក" />
          {voices.status === "loading" && <StateView kind="loading" />}
          {voices.status === "error" && <StateView kind={voices.error.code === "offline" ? "offline" : "error"} message={voices.error.message} onRetry={voices.reload} />}
          {voices.status === "ok" &&
            (voices.data.voices.length === 0 ? (
              <StateView kind="empty" title="មិនទាន់មានសំឡេង" message="ថតសំឡេងដំបូងរបស់អ្នកខាងលើ" />
            ) : (
              voices.data.voices.map((v) => <VoiceRow key={v.id} v={v} onDeleted={voices.reload} />)
            ))}
        </section>
      </div>
    </>
  );
}

function VoiceRow({ v, onDeleted }: { v: Voice; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const statusMeta: Record<Voice["status"], { label: string; cls: string; icon: string }> = {
    ready: { label: "រួចរាល់", cls: "bg-primary-fixed/40 text-on-surface", icon: "check_circle" },
    processing: { label: "កំពុងដំណើរការ", cls: "bg-secondary-fixed/40 text-on-surface", icon: "hourglass_top" },
    recording: { label: "កំពុងថត", cls: "bg-surface-container text-on-surface-variant", icon: "mic" },
    failed: { label: "បរាជ័យ", cls: "bg-error-container text-on-error-container", icon: "error" },
  };
  const m = statusMeta[v.status];
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.deleteVoice(v.id);
      notify("success");
      onDeleted();
    } catch {
      notify("error");
      setBusy(false);
    }
  };
  return (
    <Card className="flex items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md min-w-0">
        <div className="w-11 h-11 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary-container shrink-0">
          <Icon name="graphic_eq" size={22} />
        </div>
        <div className="flex flex-col min-w-0">
          <Km className="font-label-lg text-label-lg text-on-surface truncate">{v.name}</Km>
          <div className="flex items-center gap-space-xs">
            <span className={`px-1.5 rounded font-label-sm text-label-sm inline-flex items-center gap-0.5 ${m.cls}`}>
              <Icon name={m.icon} size={12} /> {m.label}
            </span>
            {v.quality?.matchPct != null && (
              <span className="font-label-sm text-label-sm text-on-surface-variant">{v.quality.matchPct}% ដូច</span>
            )}
            <span className="font-label-sm text-label-sm text-on-surface-variant">· {relativeKm(v.createdAt)}</span>
          </div>
        </div>
      </div>
      <button onClick={remove} disabled={busy} className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant active:scale-95 disabled:opacity-40" aria-label="លុប">
        <Icon name="delete" size={20} />
      </button>
    </Card>
  );
}
