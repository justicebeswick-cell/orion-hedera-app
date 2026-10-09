export function HbarLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1280 1280"
      className={`inline-block shrink-0 ${className}`}
      aria-label="HBAR"
      role="img"
    >
      <circle cx="640" cy="640" r="640" fill="#000000" />
      <path
        fill="#FFFFFF"
        d="M380 356h81v168h358V356h81v560h-81V744H461v172h-81z M465 590v89h357v-89z"
        fillRule="evenodd"
      />
    </svg>
  );
}
