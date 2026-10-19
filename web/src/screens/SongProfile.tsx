import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { clock } from "../lib/format";
import { Card, Icon, Km, Pill, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { Waveform } from "../components/Waveform";
import { haptic, notify } from "../telegram";
import type { Song } from "../lib/types";

export default function SongProfile() {
  const { id = "" } = useParams();
  const [song, setSong] = useState<Song | null>(null);
  const [state, setState] = useState<"loading" | "generating" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.getSong(id);
        if (!alive) return;
        setSong(s);
        setTitle(s.title);
        setArtist(s.artistName);
        if (s.status === "done") {
          setState("ready");
        } else if (s.status === "failed" || s.status === "canceled") {
          setState("error");
        } else {
          setState("generating");
          setProgress((p) => Math.min(95, p + 12));
          timer.current = setTimeout(tick, 1500);
        }
      } catch {
        if (alive) setState("error");
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id]);

  const share = async () => {
    haptic("light");
    const url = song?.masterUrl ?? location.href;
    try {
      if (navigator.share) await navigator.share({ title: song?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        notify("success");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (state === "loading" || state === "generating") {
    return (
      <>
        <TopBar back title="បទចម្រៀង" subtitle={state === "generating" ? "កំពុងបង្កើត…" : undefined} />
        <div className="pt-10">
          <StateView kind="loading" title={state === "generating" ? `AI កំពុងបង្កើតបទចម្រៀង… ${progress}%` : "កំពុងផ្ទុក…"} />
        </div>
      </>
    );
  }
  if (state === "error" || !song) {
    return (
      <>
        <TopBar back title="បទចម្រៀង" />
        <StateView kind="error" title="បង្កើតបទបរាជ័យ" message="លទ្ធផលប្រែប្រួលតាមដង្ហើមម្ដងៗ — សូមបង្កើតម្ដងទៀត" />
      </>
    );
  }

  return (
    <>
      <TopBar
        back
        title="បទចម្រៀង"
        right={
          <button onClick={() => setEditing((e) => !e)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant active:scale-95" aria-label="កែ">
            <Icon name={editing ? "check" : "edit"} size={20} />
          </button>
        }
      />
      <div className="flex flex-col gap-space-lg pb-6">
        {/* Cover + title */}
        <div className="flex flex-col items-center gap-space-md pt-space-sm">
          <div className="w-44 h-44 rounded-lg overflow-hidden shadow-sm bg-surface-container-high flex items-center justify-center">
            {song.coverUrl ? (
              <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-fixed to-secondary-fixed flex items-center justify-center text-on-primary-container">
                <Icon name="music_note" size={56} />
              </div>
            )}
          </div>
          {editing ? (
            <div className="w-full flex flex-col gap-space-sm">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-center rounded bg-surface-container-lowest border border-outline-variant/60 px-space-md py-2 font-headline-md text-headline-md khmer-text" />
              <input value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full text-center rounded bg-surface-container-lowest border border-outline-variant/60 px-space-md py-2 font-body-md text-body-md khmer-text" />
            </div>
          ) : (
            <div className="text-center">
              <Km className="font-headline-lg text-headline-lg text-on-surface">{title}</Km>
              <Km className="font-body-md text-body-md text-on-surface-variant">{artist}</Km>
            </div>
          )}
          {song.aiGenerated && (
            <span className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-secondary-fixed/40 text-on-surface font-label-sm text-label-sm">
              <Icon name="verified" size={14} /> AI-generated · watermarked
            </span>
          )}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap justify-center gap-space-sm">
          {song.mood && <Meta icon="mood" label={song.mood} />}
          {song.bpm != null && <Meta icon="speed" label={`${song.bpm} BPM`} />}
          {song.key && <Meta icon="piano" label={song.key} />}
          {song.durationS != null && <Meta icon="schedule" label={clock(song.durationS)} />}
        </div>

        {/* Master player */}
        <Card className="flex flex-col gap-space-sm">
          <Km className="font-label-md text-label-md text-on-surface-variant">បទពេញ (Master)</Km>
          <Waveform src={song.masterUrl} durationS={song.durationS} />
        </Card>

        {/* Stems */}
        {song.stems.length > 0 && (
          <div className="flex flex-col gap-space-sm">
            <Km className="font-label-md text-label-md text-on-surface-variant">ស្រទាប់សំឡេង (Stems)</Km>
            {song.stems.map((st) => (
              <Card key={st.kind} className="flex flex-col gap-space-xs bg-surface-container-low">
                <div className="flex items-center gap-space-sm">
                  <Icon name={stemIcon(st.kind)} size={18} className="text-primary-container" />
                  <Km className="font-label-md text-label-md text-on-surface">{stemLabel(st.kind)}</Km>
                  <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant uppercase">{st.format}</span>
                </div>
                {st.kind !== "lrc" && <Waveform src={st.url} compact />}
              </Card>
            ))}
          </div>
        )}

        {/* Engine info */}
        <div className="flex items-center justify-center gap-space-xs">
          <Icon name="memory" size={14} className="text-on-surface-variant" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">Song Engine · {song.provider}</span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-gutter">
          <Pill variant="ghost" leading="share" onClick={share}>ចែករំលែក</Pill>
          <Pill
            variant="primary"
            leading="download"
            onClick={() => { haptic("light"); if (song.masterUrl) window.open(song.masterUrl, "_blank"); }}
            disabled={!song.masterUrl}
          >
            ទាញយក
          </Pill>
        </div>
      </div>
    </>
  );
}

function Meta({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface">
      <Icon name={icon} size={14} /> <Km>{label}</Km>
    </span>
  );
}
function stemIcon(k: Song["stems"][number]["kind"]) {
  return k === "vocal" ? "mic" : k === "backing" ? "piano" : "lyrics";
}
function stemLabel(k: Song["stems"][number]["kind"]) {
  return k === "vocal" ? "សំឡេងច្រៀង" : k === "backing" ? "ភ្លេងបម្រុង" : "ទំនុកស៊ីង (LRC)";
}
