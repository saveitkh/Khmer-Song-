import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, pollJob } from "../api";
import { Card, Chip, Icon, Km, Pill, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { haptic, notify } from "../telegram";
import type { Lyrics } from "../lib/types";

const MOODS = ["ស្នេហា", "កើយកើយ", "រីករាយ", "កំសត់", "ឆ្លើយឆ្លង", "ស្រឡាញ់ស្រុក"];
const GENRES = ["Pop", "Ballad", "Rap", "Pleng Khmer", "R&B", "Acoustic"];

export default function LyricGenerator() {
  const nav = useNavigate();
  const loc = useLocation();
  const voiceId = (loc.state as { voiceId?: string } | null)?.voiceId ?? null;

  const [prompt, setPrompt] = useState("");
  const [mood, setMood] = useState(MOODS[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [phase, setPhase] = useState<"idle" | "generating" | "done" | "failed">("idle");
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [making, setMaking] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || phase === "generating") return;
    haptic("medium");
    setPhase("generating");
    setLyrics(null);
    try {
      const job = await api.generateLyrics({ prompt: prompt.trim(), mood, genre });
      const done = await pollJob(job.id);
      if (done.status === "done") {
        const out = done.output as { lyricsId: string };
        const full = await api.getLyrics(out.lyricsId);
        setLyrics(full);
        setPhase("done");
        notify("success");
      } else {
        setPhase("failed");
        notify("error");
      }
    } catch {
      setPhase("failed");
      notify("error");
    }
  };

  const plainText = (l: Lyrics) =>
    l.sections.map((s) => `[${s.label}]\n${s.lines.map((ln) => ln.text).join("\n")}`).join("\n\n");

  const copy = async () => {
    if (!lyrics) return;
    try {
      await navigator.clipboard.writeText(plainText(lyrics));
      notify("success");
    } catch {
      notify("error");
    }
  };

  const makeSong = async () => {
    if (!lyrics || making) return;
    setMaking(true);
    try {
      const job = await api.createSong({ lyricsId: lyrics.id, voiceId, style: genre });
      const out = job.output as { songId?: string } | null;
      // The song job is async; navigate to the profile which polls to completion.
      const songId = out?.songId ?? job.id;
      nav(`/song/${songId}`, { state: { jobId: job.id } });
    } catch {
      notify("error");
      setMaking(false);
    }
  };

  return (
    <>
      <TopBar back title="តែងទំនុកច្រៀង" subtitle="Lyric Generator" />
      <div className="flex flex-col gap-space-lg pb-6">
        {/* Prompt */}
        <div className="flex flex-col gap-space-sm">
          <Km className="font-label-md text-label-md text-on-surface-variant">តើចង់បានបទអំពីអ្វី?</Km>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="ឧ. បទស្នេហាអំពីការរង់ចាំមនុស្សម្នាក់នៅរដូវភ្លៀង ទីក្រុងភ្នំពេញ"
            className="w-full rounded bg-surface-container-lowest border border-outline-variant/60 px-space-md py-space-md font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary-container focus:outline-none focus:ring-4 focus:ring-primary-container/15 resize-none khmer-text"
          />
        </div>

        {/* Mood */}
        <div className="flex flex-col gap-space-sm">
          <Km className="font-label-md text-label-md text-on-surface-variant">អារម្មណ៍</Km>
          <div className="flex flex-wrap gap-space-sm">
            {MOODS.map((m) => (
              <Chip key={m} active={mood === m} onClick={() => { haptic("light"); setMood(m); }}>
                <Km>{m}</Km>
              </Chip>
            ))}
          </div>
        </div>

        {/* Genre */}
        <div className="flex flex-col gap-space-sm">
          <Km className="font-label-md text-label-md text-on-surface-variant">ចង្វាក់ភ្លេង</Km>
          <div className="flex flex-wrap gap-space-sm">
            {GENRES.map((g) => (
              <Chip key={g} active={genre === g} onClick={() => { haptic("light"); setGenre(g); }}>
                {g}
              </Chip>
            ))}
          </div>
        </div>

        <Pill full leading="auto_awesome" onClick={generate} disabled={!prompt.trim() || phase === "generating"}>
          {phase === "generating" ? "កំពុងនិពន្ធ…" : "បង្កើតទំនុកច្រៀង"}
        </Pill>

        {phase === "generating" && <StateView kind="loading" title="AI កំពុងនិពន្ធកំណាព្យខ្មែរ…" />}
        {phase === "failed" && <StateView kind="error" title="និពន្ធបរាជ័យ" message="សូមព្យាយាមម្ដងទៀត" onRetry={generate} />}

        {lyrics && phase === "done" && (
          <>
            <Card className="flex flex-col gap-space-lg">
              {lyrics.sections.map((s, i) => (
                <div key={i} className="flex flex-col gap-space-xs">
                  <span className="self-start font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary-fixed/30 text-on-surface uppercase tracking-wide">
                    {s.label}
                  </span>
                  <div className="flex flex-col gap-1">
                    {s.lines.map((ln, j) => (
                      <div key={j} className="flex items-start justify-between gap-space-md">
                        <Km className="font-body-lg text-body-lg text-on-surface" style={{ lineHeight: 1.7 }}>
                          {renderHighlighted(ln.text, ln.highlights)}
                        </Km>
                        <span className="shrink-0 mt-1 font-label-sm text-label-sm text-on-surface-variant font-mono">{ln.syllables}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>

            <div className="flex items-center gap-space-xs">
              <Icon name="info" size={14} className="text-on-surface-variant" />
              <Km className="font-label-sm text-label-sm text-on-surface-variant">ពាក្យដែលបន្លិច = ចុងសម្រាយ · លេខ = ចំនួនព្យាង្គ</Km>
            </div>

            <div className="grid grid-cols-2 gap-gutter">
              <Pill variant="ghost" leading="content_copy" onClick={copy}>ចម្លង</Pill>
              <Pill variant="secondary" leading="library_music" onClick={makeSong} disabled={making}>
                {making ? "កំពុងបង្កើត…" : "បង្កើតបទចម្រៀង"}
              </Pill>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Wrap rhyme words (by word index) in a mint highlight. */
function renderHighlighted(text: string, highlights: number[]) {
  if (!highlights?.length) return text;
  const words = text.split(/(\s+)/);
  const set = new Set(highlights);
  let wordIdx = -1;
  return words.map((w, i) => {
    if (w.trim() === "") return <span key={i}>{w}</span>;
    wordIdx++;
    return set.has(wordIdx) ? (
      <mark key={i} className="bg-primary-fixed/50 text-on-surface rounded px-0.5">{w}</mark>
    ) : (
      <span key={i}>{w}</span>
    );
  });
}
