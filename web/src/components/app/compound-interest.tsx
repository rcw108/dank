"use client";

import { useRef } from "react";
import { Info } from "lucide-react";
import { X } from "lucide-react";

// Same explanation as the "Compound Interest" popup on dank.capital/account.
export function CompoundInterestInfo() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:text-fg"
        aria-label="What is compound interest?"
      >
        <Info size={18} aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(32rem,calc(100%-2.5rem))] rounded-card border border-line bg-surface p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl">Compound interest</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-mt-1 -mr-2 inline-flex size-9 items-center justify-center rounded-full text-muted hover:text-fg"
              aria-label="Close"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <span
            aria-hidden
            className="mt-3 mb-4 block h-[3px] w-[26px] bg-accent"
          />
          <p className="leading-relaxed text-muted">
            Compound interest is the addition of interest to the principal sum
            of a loan or deposit — in other words, interest on interest. It
            comes from reinvesting interest rather than paying it out, so the
            next period earns interest on the principal plus the interest
            already accumulated.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            Your net annualized return shows how fast your capital has grown per
            year with this effect included.
          </p>
        </div>
      </dialog>
    </>
  );
}
