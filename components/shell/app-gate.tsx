"use client";

// Client gate wrapped around the app shell: on first run (no farm) it sends the
// user to onboarding; when a PIN lock is set and active it shows the lock screen
// instead of app content. Renders nothing until the check resolves to avoid a flash.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { repo } from "@/lib/repository";
import { isOnboarded } from "@/lib/app-settings";
import { useSession } from "@/stores/session";
import { LockScreen } from "./lock-screen";

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locked = useSession((s) => s.locked);
  const hasPin = useSession((s) => s.hasPin);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const farms = await repo.listFarms();
      if (!active) return;
      if (farms.length === 0 && !isOnboarded()) {
        router.replace("/onboarding");
        return; // keep the gate closed during navigation
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) return null;
  if (hasPin && locked) return <LockScreen />;
  return <>{children}</>;
}
