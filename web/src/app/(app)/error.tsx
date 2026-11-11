"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/section";

export default function AppError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Card className="mt-[max(2rem,env(safe-area-inset-top))] p-6">
      <h2 className="text-lg">We couldn&apos;t load your account</h2>
      <p className="mt-2 text-muted">
        Check your connection and try again. If it keeps happening, contact DANK
        Capital support.
      </p>
      <Button onClick={reset} className="mt-6 w-full uppercase">
        Try again
      </Button>
    </Card>
  );
}
