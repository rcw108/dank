import { Suspense } from "react";
import { LiveUpdates } from "@/components/app/live-updates";
import { TabBar } from "@/components/app/tab-bar";
import { getCurrentUser } from "@/lib/auth/user";

// Static app chrome: prerendered once, so tab switches feel instant.
// Account data streams into each page behind its own Suspense boundary.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <TabBar />
      {/* Reads the session, so it streams in without holding the chrome. */}
      <Suspense fallback={null}>
        <Live />
      </Suspense>
    </>
  );
}

async function Live() {
  const user = await getCurrentUser();
  return <LiveUpdates userId={user.id} />;
}
