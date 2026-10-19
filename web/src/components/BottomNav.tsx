import { NavLink } from "react-router-dom";
import { Icon } from "./ui";
import { haptic } from "../telegram";

const ITEMS = [
  { to: "/", icon: "home", label: "ទំព័រដើម", end: true },
  { to: "/clone", icon: "mic", label: "ក្លូនសំឡេង", end: false },
  { to: "/lyrics", icon: "auto_awesome", label: "តែងទំនុក", end: false },
  { to: "/settings", icon: "tune", label: "ការកំណត់", end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-space-md flex items-center justify-around gap-space-xs max-w-md mx-auto">
        {ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={() => haptic("light")}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[72px] h-11 px-space-sm rounded-full transition-all ${
                isActive ? "text-primary-container bg-primary-fixed/25 font-bold" : "text-on-surface-variant"
              }`
            }
          >
            <Icon name={it.icon} size={20} />
            <span lang="km" className="khmer-text font-label-sm text-label-sm leading-none mt-0.5">
              {it.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
