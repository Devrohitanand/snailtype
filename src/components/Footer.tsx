"use client";

export default function Footer() {
  return (
    <footer
      className="relative z-10 mt-2 w-full max-w-4xl place-self-center px-2 sm:px-4 py-3 select-none"
      aria-label="Site footer"
    >
      <div className="flex flex-col items-start justify-between gap-2 text-[11px] uppercase tracking-[0.04em] text-[#94858D] sm:flex-row sm:items-center">
        <div className="flex-1 text-left">
          <span className="font-normal normal-case tracking-normal text-[12px] text-[#a58a90]">
            A little slower. A little better.
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2">
          <KeyChip>tab</KeyChip>
          <span className="text-[#94858D]">+</span>
          <KeyChip>enter</KeyChip>
          <span className="ml-1 normal-case tracking-normal text-[#94858D]">
            to restart
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <a
            href="https://www.instagram.com/hxr.shhhhhhh/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-0.5 normal-case tracking-normal transition-colors hover:text-[#f0eaed]"
          >
            <span className="text-[#ff6b9f]">@</span>
            <span className="underline-offset-4 group-hover:underline">
              hxr.shhhhhhh
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-[#30212A] bg-[#1d1b1d] px-1.5 py-0.5 text-[11px] font-medium text-[#f0eaed]">
      {children}
    </span>
  );
}
