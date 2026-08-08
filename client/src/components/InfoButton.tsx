"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

/** Small "i" button that opens a popover explaining how to win a game. */
export function InfoButton({ title = "How to win", children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={title}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white transition-transform hover:-translate-y-0.5"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-base border-4 border-black bg-white p-4 text-left shadow-[6px_6px_0_0_#000]">
            <p className="mb-2 font-heading text-sm">{title}</p>
            <div className="flex flex-col gap-1.5 text-xs font-base leading-relaxed text-black/80">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
