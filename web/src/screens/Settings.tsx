import { useState } from "react";
import { api } from "../api";
import { useAsync } from "../lib/useAsync";
import { num } from "../lib/format";
import { Card, Icon, Km, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { haptic, notify, tgUser } from "../telegram";
import type { Me, UserSettings } from "../lib/types";

export default function Settings() {
  const me = useAsync(() => api.me(), []);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<UserSettings | null>(null);
  const [purged, setPurged] = useState(false);

  const settings = local ?? (me.status === "ok" ? me.data.settings : null);

  const update = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setLocal(next);
    setSaving(true);
    haptic("light");
    try {
      const updated = await api.updateSettings(patch);
      setLocal(updated.settings);
      notify("success");
    } catch {
      notify("error");
    } finally {
      setSaving(false);
    }
  };

  const purge = async () => {
    haptic("medium");
    try {
      await api.purgeCache();
      setPurged(true);
      notify("success");
    } catch {
      notify("error");
    }
  };

  if (me.status === "loading") return (<><TopBar logo title="ការកំណត់" /><StateView kind="loading" /></>);
  if (me.status === "error") return (<><TopBar logo title="ការកំណត់" /><StateView kind={me.error.code === "offline" ? "offline" : "error"} message={me.error.message} onRetry={me.reload} /></>);

  const user: Me = me.data;
  const tgu = tgUser();

  return (
    <>
      <TopBar logo title="ការកំណត់" subtitle="Studio Settings" />
      <div className="flex flex-col gap-space-lg pb-6">
        {/* Profile */}
        <Card className="flex items-center gap-space-md">
          {tgu?.photo_url ? (
            <img src={tgu.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-fixed/40 flex items-center justify-center text-primary-container"><Icon name="person" size={28} /></div>
          )}
          <div className="flex flex-col min-w-0">
            <Km className="font-headline-sm text-headline-sm text-on-surface truncate">{tgu?.first_name ?? user.displayName}</Km>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {user.plan === "vip" ? "VIP" : "Free"} · {num(user.creditsBalance)} ក្រេឌីត · {user.voiceSlotsUsed}/{user.voiceSlotsMax} ម៉ូដែល
            </span>
          </div>
        </Card>

        {/* Engine */}
        <Group title="ម៉ាស៊ីន AI (Engine)">
          <SelectRow
            icon="record_voice_over"
            label="ម៉ាស៊ីនក្លូនសំឡេង"
            value={settings?.engineVoice ?? "mock"}
            options={[["mock", "សាកល្បង (Mock)"], ["voxcpm2", "VoxCPM2 (GPU)"], ["gemini-tts", "Gemini TTS"]]}
            onChange={(v) => update({ engineVoice: v as UserSettings["engineVoice"] })}
          />
          <SelectRow
            icon="library_music"
            label="ម៉ាស៊ីនបង្កើតបទ"
            value={settings?.engineMusic ?? "mock"}
            options={[["mock", "សាកល្បង (Mock)"], ["gemini-lyria", "Gemini Lyria"]]}
            onChange={(v) => update({ engineMusic: v as UserSettings["engineMusic"] })}
          />
          <SelectRow
            icon="high_quality"
            label="គុណភាព Export"
            value={settings?.exportQuality ?? "standard"}
            options={[["standard", "ស្តង់ដារ"], ["high", "គុណភាពខ្ពស់"]]}
            onChange={(v) => update({ exportQuality: v as UserSettings["exportQuality"] })}
          />
        </Group>

        {/* Privacy */}
        <Group title="ឯកជនភាព & សុវត្ថិភាព">
          <ToggleRow
            icon="shield"
            label="ការពារសំឡេង AI (Watermark)"
            desc="បន្ថែមសញ្ញាទឹកមើលមិនឃើញ + ស្លាក AI-generated"
            on={settings?.watermark ?? true}
            onToggle={() => update({ watermark: !(settings?.watermark ?? true) })}
          />
          <ToggleRow
            icon="public"
            label="បង្ហាញសំឡេងជាសាធារណៈ"
            desc="អនុញ្ញាតឲ្យអ្នកដទៃឃើញក្នុង Trending"
            on={settings?.publicProfile ?? false}
            onToggle={() => update({ publicProfile: !(settings?.publicProfile ?? false) })}
          />
          <button onClick={purge} className="flex items-center gap-space-md w-full py-space-sm text-left">
            <div className="w-9 h-9 rounded-full bg-error-container/50 flex items-center justify-center text-on-error-container shrink-0"><Icon name="delete_sweep" size={20} /></div>
            <div className="flex flex-col">
              <Km className="font-label-md text-label-md text-on-surface">លុបសំឡេងដែលផ្ទុកទុក</Km>
              <Km className="font-body-sm text-body-sm text-on-surface-variant">{purged ? "បានលុបរួចរាល់" : "សម្អាត cache សំឡេងបណ្ដោះអាសន្ន"}</Km>
            </div>
          </button>
        </Group>

        {/* Help / about */}
        <Group title="ជំនួយ">
          <LinkRow icon="help" label="របៀបប្រើប្រាស់" />
          <LinkRow icon="gavel" label="លក្ខខណ្ឌ & គោលការណ៍ឯកជនភាព" />
          <LinkRow icon="info" label="អំពី Khmer Sonic AI" />
        </Group>

        <div className="flex items-center justify-center gap-space-xs pt-space-sm">
          {saving ? <span className="font-label-sm text-label-sm text-on-surface-variant">កំពុងរក្សាទុក…</span> : <span className="font-label-sm text-label-sm text-on-surface-variant">Khmer Sonic AI · v0.1</span>}
        </div>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-space-sm">
      <Km className="font-label-md text-label-md text-on-surface-variant px-space-xs">{title}</Km>
      <Card className="flex flex-col divide-y divide-outline-variant/30">{children}</Card>
    </section>
  );
}

function ToggleRow({ icon, label, desc, on, onToggle }: { icon: string; label: string; desc?: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-space-md py-space-sm">
      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0"><Icon name={icon} size={20} /></div>
      <div className="flex flex-col min-w-0 flex-1">
        <Km className="font-label-md text-label-md text-on-surface">{label}</Km>
        {desc && <Km className="font-body-sm text-body-sm text-on-surface-variant">{desc}</Km>}
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={`w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 ${on ? "bg-primary-container" : "bg-outline-variant"}`}
      >
        <span className={`block w-6 h-6 rounded-full bg-surface-container-lowest transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function SelectRow({ icon, label, value, options, onChange }: { icon: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-space-md py-space-sm">
      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0"><Icon name={icon} size={20} /></div>
      <Km className="font-label-md text-label-md text-on-surface flex-1">{label}</Km>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full bg-surface-container px-space-md py-1.5 font-label-md text-label-md text-on-surface border-none focus:outline-none focus:ring-2 focus:ring-primary-container/40 khmer-text"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}

function LinkRow({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex items-center gap-space-md py-space-sm w-full text-left">
      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0"><Icon name={icon} size={20} /></div>
      <Km className="font-label-md text-label-md text-on-surface flex-1">{label}</Km>
      <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
    </button>
  );
}
