/** Shared outlined lettering keeps the name sharp at every existing display size. */
export function OrionName({ className = "" }: { className?: string }) {
  return <span role="img" aria-label="Oreon" className={`orion-lettering pointer-events-none block max-w-full shrink-0 ${className}`}>
    <svg viewBox="0 0 1065 195" width="1065" height="195" aria-hidden="true" className="block !h-auto !w-full aspect-[1065/195]" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="square" strokeLinejoin="round">
      <ellipse cx="102" cy="97.5" rx="88" ry="90" />
      <path d="M244 187V8h72c112 0 112 101 0 101h-72m72 0 87 78" />
      <path d="M617 8H453v179h164M453 97.5h141" />
      <ellipse cx="749" cy="97.5" rx="88" ry="90" />
      <path d="M890 187V8l161 179V8" />
    </svg>
  </span>;
}
