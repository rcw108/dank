"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Browser "Save as PDF". The store version (stage 2) swaps this for a native share sheet.
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="w-full uppercase">
      <Printer size={18} aria-hidden />
      Save as PDF
    </Button>
  );
}
