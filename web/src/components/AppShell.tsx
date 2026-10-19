import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

/** Layout for the four bottom-nav tabs. Each tab renders its own TopBar.
 * `pt-16` clears the fixed top bar, `pb-24` clears the bottom nav. */
export function AppShell() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <main className="flex-1 w-full max-w-md mx-auto px-margin pt-16 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

/** Layout for full-screen sub-flows (recording, comparison, song profile):
 * top bar only, no bottom nav. */
export function FlowShell() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <main className="flex-1 w-full max-w-md mx-auto px-margin pt-16 pb-8">
        <Outlet />
      </main>
    </div>
  );
}
