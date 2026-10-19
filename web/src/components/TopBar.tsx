import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Km } from "./ui";
import { haptic } from "../telegram";

/** The fixed translucent top app bar. `back` shows a back chevron; `right`
 * holds trailing actions (notifications, avatar, etc.). */
export function TopBar({
  title,
  subtitle,
  back = false,
  right,
  logo = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  right?: ReactNode;
  logo?: boolean;
}) {
  const nav = useNavigate();
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-margin flex items-center justify-between gap-space-md max-w-md mx-auto">
        <div className="flex items-center gap-space-md min-w-0">
          {back && (
            <button
              onClick={() => {
                haptic("light");
                nav(-1);
              }}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full active:scale-95 text-on-surface"
              aria-label="ថយក្រោយ"
            >
              <Icon name="arrow_back" size={22} />
            </button>
          )}
          {logo && (
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
              <Icon name="graphic_eq" size={18} />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <Km className="font-headline-sm text-headline-sm text-on-surface truncate">{title}</Km>
              {logo && <span className="w-2 h-2 rounded-full bg-primary-container shrink-0 animate-pulse" />}
            </div>
            {subtitle && <Km className="font-label-sm text-label-sm text-on-surface-variant truncate">{subtitle}</Km>}
          </div>
        </div>
        {right && <div className="flex items-center gap-space-sm shrink-0">{right}</div>}
      </div>
    </header>
  );
}
