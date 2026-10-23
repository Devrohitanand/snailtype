import type { SVGProps } from "react";
const baseProps = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function TuneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props} stroke="#ffffff">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1.2-3.5 4.4-5.5 8-5.5s6.8 2 8 5.5" />
    </svg>
  );
}

export function RestartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 9 8 9" />
    </svg>
  );
}

export function KeyboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <line x1="6" x2="6" y1="10" y2="10" />
      <line x1="10" x2="10" y1="10" y2="10" />
      <line x1="14" x2="14" y1="10" y2="10" />
      <line x1="18" x2="18" y1="10" y2="10" />
      <line x1="7" x2="17" y1="16" y2="16" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <polyline points="4 12 10 18 20 6" />
    </svg>
  );
}
