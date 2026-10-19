import { type ReactNode, type ButtonHTMLAttributes } from "react";

/** Material Symbol icon. */
export function Icon({ name, className = "", size = 22 }: { name: string; className?: string; size?: number }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }} aria-hidden>
      {name}
    </span>
  );
}

/** Khmer-aware text block (correct font + line-height for stacked glyphs). */
export function Km({
  children,
  className = "",
  as: As = "span",
  ...rest
}: { children: ReactNode; className?: string; as?: any } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As lang="km" className={`khmer-text ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-lg bg-surface-container-lowest p-space-md shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  full?: boolean;
  leading?: string;
};
export function Pill({ variant = "primary", full, leading, className = "", children, ...rest }: PillProps) {
  const styles: Record<string, string> = {
    primary: "bg-primary-container text-on-primary-container shadow-sm",
    secondary: "bg-primary-fixed/30 text-on-surface",
    ghost: "bg-surface-container text-on-surface",
    danger: "bg-error-container text-on-error-container",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-space-xs rounded-full h-13 px-space-lg font-label-lg text-label-lg active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 ${styles[variant]} ${full ? "w-full" : ""} ${className}`}
      style={{ height: 52 }}
      {...rest}
    >
      {leading && <Icon name={leading} size={20} />}
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors ${
        active ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-space-md">
      <div className="min-w-0">
        <Km as="h2" className="font-headline-sm text-headline-sm text-on-surface">
          {title}
        </Km>
        {subtitle && (
          <Km as="p" className="font-label-sm text-label-sm text-on-surface-variant">
            {subtitle}
          </Km>
        )}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-primary-container border-t-transparent animate-spin"
      style={{ width: size, height: size }}
      role="status"
      aria-label="កំពុងផ្ទុក"
    />
  );
}

/** Loading / empty / error / offline state, shared by every screen. */
export function StateView({
  kind,
  title,
  message,
  onRetry,
}: {
  kind: "loading" | "empty" | "error" | "offline";
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  if (kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-space-md py-16 text-on-surface-variant">
        <Spinner size={32} />
        <Km className="font-body-md text-body-md">{title ?? "កំពុងផ្ទុក…"}</Km>
      </div>
    );
  }
  const icon = kind === "offline" ? "wifi_off" : kind === "error" ? "error" : "inbox";
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-16 px-space-lg text-center">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
        <Icon name={icon} size={28} />
      </div>
      <Km className="font-headline-sm text-headline-sm text-on-surface">{title ?? "គ្មានទិន្នន័យ"}</Km>
      {message && <Km className="font-body-md text-body-md text-on-surface-variant max-w-xs">{message}</Km>}
      {onRetry && (
        <button onClick={onRetry} className="mt-space-sm font-label-md text-label-md text-primary-container underline">
          ព្យាយាមម្ដងទៀត
        </button>
      )}
    </div>
  );
}

/** Static or animated vertical waveform bars (used as a lightweight preview). */
export function WaveBars({
  count = 14,
  animate = false,
  progress = 0,
  className = "",
}: {
  count?: number;
  animate?: boolean;
  progress?: number; // 0..1 how much is "played" (mint vs grey)
  className?: string;
}) {
  const heights = Array.from({ length: count }, (_, i) => 8 + ((i * 37) % 24));
  const playedUpto = Math.round(progress * count);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${i < playedUpto ? "bg-primary-container" : "bg-outline-variant"} ${animate ? "bar-animate" : ""}`}
          style={{ height: h, animationDelay: `${(i % 7) * 90}ms` }}
        />
      ))}
    </div>
  );
}
