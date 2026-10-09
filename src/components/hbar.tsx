export function HbarLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`inline-block shrink-0 ${className}`}
      aria-label="HBAR"
      role="img"
    >
      <defs>
        <linearGradient id="hbar-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#E879F9" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#hbar-grad)" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontSize="17"
        fontWeight="700"
        fill="#0C0A12"
        fontFamily="JetBrains Mono, monospace"
      >
        ℏ
      </text>
    </svg>
  );
}
