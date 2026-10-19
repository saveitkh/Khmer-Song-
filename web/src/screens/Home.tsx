import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../lib/useAsync";
import { clock, num, relativeKm } from "../lib/format";
import { Card, Icon, Km, SectionHeader, StateView, WaveBars } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { Waveform } from "../components/Waveform";
import { tgUser, haptic } from "../telegram";

export default function Home() {
  const nav = useNavigate();
  const me = useAsync(() => api.me(), []);
  const trending = useAsync(() => api.trending(), []);
  const recent = useAsync(() => api.recentProjects(), []);

  const firstName = tgUser()?.first_name ?? me.data?.displayName ?? "";

  return (
    <>
      <TopBar
        logo
        title="Khmer Sonic AI"
        subtitle="សំឡេង និងទំនុកច្រៀង AI"
        right={
          <button className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant active:scale-95" aria-label="ជូនដំណឹង">
            <Icon name="notifications" size={22} />
          </button>
        }
      />

      <div className="flex flex-col gap-space-xl pb-6">
        {/* Greeting pod */}
        <section className="relative overflow-hidden rounded-lg bg-surface-container-low p-space-lg shadow-sm">
          <div className="relative z-10 flex flex-col gap-space-sm">
            <span className="inline-flex items-center gap-space-xs self-start px-space-md py-1 rounded-full bg-surface-container-lowest shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
              <span className="font-label-sm text-label-sm text-primary-container uppercase tracking-wider">Khmer Neural V3 Studio</span>
            </span>
            <div>
              <Km as="h1" className="font-headline-lg text-headline-lg text-on-surface">
                សួស្តី{firstName ? `, ${firstName}` : ""} 👋
              </Km>
              <Km className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                បង្កើតតន្ត្រី និងក្លូនសំឡេងខ្មែរជាមួយ AI ដោយរលូន
              </Km>
            </div>
          </div>
          <svg className="absolute -right-8 -bottom-8 w-44 h-44 text-primary-container/10 pointer-events-none" fill="currentColor" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" />
            <circle className="text-secondary-container/15" cx="160" cy="40" r="30" />
          </svg>
        </section>

        {/* Quota */}
        <Card>
          {me.status === "loading" && <div className="h-10 flex items-center"><WaveBars count={20} animate className="h-6 opacity-40" /></div>}
          {me.status === "error" && <Km className="font-body-sm text-body-sm text-on-surface-variant">មិនអាចផ្ទុកកូតា</Km>}
          {me.status === "ok" && (
            <>
              <div className="flex items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-full bg-primary-fixed/40 flex items-center justify-center text-primary-container">
                    <Icon name="graphic_eq" size={20} />
                  </div>
                  <div className="flex flex-col">
                    <Km className="font-label-md text-label-md text-on-surface">កូតាសំឡេងក្លូន</Km>
                    <Km className="font-label-sm text-label-sm text-on-surface-variant">
                      {me.data.voiceSlotsUsed}/{me.data.voiceSlotsMax} ម៉ូដែល · {num(me.data.creditsBalance)} ក្រេឌីត
                    </Km>
                  </div>
                </div>
                {me.data.plan === "free" && (
                  <button onClick={() => haptic("medium")} className="px-space-md py-1.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md active:scale-95">
                    ដំឡើង VIP
                  </button>
                )}
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full mt-space-md overflow-hidden p-0.5">
                <div
                  className="bg-primary-container h-full rounded-full transition-all duration-500"
                  style={{ width: `${me.data.voiceSlotsMax ? (me.data.voiceSlotsUsed / me.data.voiceSlotsMax) * 100 : 0}%` }}
                />
              </div>
            </>
          )}
        </Card>

        {/* Two action cards */}
        <section className="grid grid-cols-2 gap-gutter">
          <ActionCard
            icon="record_voice_over"
            tag="VoxCPM2"
            title="ក្លូនសំឡេងថ្មី"
            desc="សំយោគសំឡេងខ្មែរតាមគំរូ"
            cta="ចាប់ផ្តើម"
            accent="primary"
            onClick={() => nav("/clone")}
          />
          <ActionCard
            icon="library_music"
            tag="AI Lyrics"
            title="តែងទំនុកច្រៀង"
            desc="និពន្ធកាព្យភ្លេងខ្មែរ"
            cta="តែងភ្លាមៗ"
            accent="secondary"
            onClick={() => nav("/lyrics")}
          />
        </section>

        {/* Trending */}
        <section className="flex flex-col gap-space-md">
          <SectionHeader title="សំឡេងកំពុងពេញនិយម" subtitle="ម៉ូដែលសំឡេងខ្មែរប្រើច្រើនជាងគេ" />
          {trending.status === "loading" && <StateView kind="loading" />}
          {trending.status === "error" && <StateView kind={trending.error.code === "offline" ? "offline" : "error"} message={trending.error.message} onRetry={trending.reload} />}
          {trending.status === "ok" &&
            (trending.data.voices.length === 0 ? (
              <StateView kind="empty" title="មិនទាន់មានសំឡេងសាធារណៈ" message="សំឡេងនឹងបង្ហាញនៅទីនេះ នៅពេលម្ចាស់បើកជាសាធារណៈ" />
            ) : (
              trending.data.voices.map((v) => (
                <Card key={v.id} className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <Avatar url={v.avatarUrl} />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs">
                          <Km className="font-headline-sm text-headline-sm text-on-surface truncate">{v.name}</Km>
                          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary-fixed/30 text-on-surface shrink-0">{v.style}</span>
                        </div>
                        <Km className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          គំរូ៖ {v.sampleTitle} ({clock(v.durationS)})
                        </Km>
                      </div>
                    </div>
                  </div>
                  <Waveform src={v.sampleUrl} durationS={v.durationS} compact />
                </Card>
              ))
            ))}
        </section>

        {/* Recent projects */}
        <section className="flex flex-col gap-space-md">
          <SectionHeader title="គម្រោងថ្មីៗ" action={<button className="font-label-md text-label-md text-primary-container">មើលបន្ថែម</button>} />
          {recent.status === "loading" && <StateView kind="loading" />}
          {recent.status === "error" && <StateView kind={recent.error.code === "offline" ? "offline" : "error"} message={recent.error.message} onRetry={recent.reload} />}
          {recent.status === "ok" &&
            (recent.data.projects.length === 0 ? (
              <StateView kind="empty" title="មិនទាន់មានគម្រោង" message="ចាប់ផ្តើមក្លូនសំឡេង ឬតែងទំនុកច្រៀង ដើម្បីបង្កើតគម្រោងដំបូង" />
            ) : (
              <div className="flex flex-col gap-space-sm">
                {recent.data.projects.map((p) => (
                  <Card
                    key={p.id}
                    role="button"
                    onClick={() => p.kind === "song" && nav(`/song/${p.id}`)}
                    className="flex items-center justify-between gap-space-md"
                  >
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className={`w-12 h-12 rounded flex items-center justify-center shrink-0 ${p.kind === "song" ? "bg-surface-container-high text-primary-container" : "bg-surface-container-high text-secondary"}`}>
                        <Icon name={p.kind === "song" ? "audiotrack" : "edit_note"} size={26} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs">
                          <Km className="font-label-lg text-label-lg text-on-surface truncate">{p.title}</Km>
                          {p.badge && <span className="shrink-0 px-1.5 rounded bg-primary-fixed/40 font-label-sm text-label-sm text-on-surface">{p.badge}</span>}
                        </div>
                        <Km className="font-body-sm text-body-sm text-on-surface-variant truncate">{p.subtitle} · {relativeKm(p.createdAt)}</Km>
                      </div>
                    </div>
                    <Icon name="chevron_right" size={20} className="text-on-surface-variant shrink-0" />
                  </Card>
                ))}
              </div>
            ))}
        </section>

        {/* Tip */}
        <section className="rounded-lg bg-surface-container-high/60 p-space-md flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm min-w-0">
            <Icon name="tips_and_updates" size={24} className="text-primary-container shrink-0" />
            <div className="flex flex-col min-w-0">
              <Km className="font-label-md text-label-md text-on-surface">គន្លឹះសំឡេងស្អាត</Km>
              <Km className="font-body-sm text-body-sm text-on-surface-variant truncate">ថតនៅកន្លែងស្ងាត់ គ្មានសំឡេងបន្ទរ ផ្ដល់លទ្ធផលល្អ</Km>
            </div>
          </div>
          <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
        </section>
      </div>
    </>
  );
}

function ActionCard({ icon, tag, title, desc, cta, accent, onClick }: { icon: string; tag: string; title: string; desc: string; cta: string; accent: "primary" | "secondary"; onClick: () => void }) {
  const color = accent === "primary" ? "text-primary-container" : "text-secondary";
  const bg = accent === "primary" ? "bg-primary-fixed/50" : "bg-secondary-fixed/50";
  return (
    <div role="button" onClick={() => { haptic("light"); onClick(); }} className="group relative overflow-hidden rounded-lg bg-surface-container-lowest p-space-md shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between min-h-[160px]">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center ${color} shadow-sm`}>
          <Icon name={icon} size={22} />
        </div>
        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{tag}</span>
      </div>
      <div>
        <Km as="h2" className="font-headline-sm text-headline-sm text-on-surface">{title}</Km>
        <Km className="font-body-sm text-body-sm text-on-surface-variant mt-1">{desc}</Km>
      </div>
      <div className={`flex items-center gap-1 ${color} font-label-sm text-label-sm pt-space-xs`}>
        <Km>{cta}</Km>
        <Icon name="arrow_forward" size={16} />
      </div>
    </div>
  );
}

function Avatar({ url }: { url: string | null }) {
  if (url) return <img className="w-12 h-12 rounded-full object-cover" src={url} alt="" />;
  return (
    <div className="w-12 h-12 rounded-full bg-primary-fixed/40 flex items-center justify-center text-primary-container">
      <Icon name="person" size={24} />
    </div>
  );
}
