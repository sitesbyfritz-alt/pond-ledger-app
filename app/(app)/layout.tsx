import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Topbar } from "@/components/shell/topbar";
import { PaletteStub } from "@/components/shell/palette-stub";
import { AppGate } from "@/components/shell/app-gate";

/** Shared chrome for every in-app screen: desktop sidebar, mobile bottom-nav +
 *  FAB, sticky topbar, and the ⌘K palette stub. AppGate handles first-run
 *  onboarding redirect and the PIN lock. Route group — URLs unchanged. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGate>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="min-h-dvh lg:pl-60">
        <Sidebar />
        <Topbar />
        {/* pb leaves room for the mobile bottom-nav; none needed on desktop */}
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-10">
          {children}
        </main>
        <BottomNav />
        <PaletteStub />
      </div>
    </AppGate>
  );
}
