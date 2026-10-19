/** The ℏ symbol in AURION's brand purple (#9963e2), sampled from the app artwork. */
export function HbarLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="HBAR"
      style={{ fontSize: size, lineHeight: 1, color: "#9963e2" }}
      className={`inline-block shrink-0 font-semibold ${className}`}
    >
      ℏ
    </span>
  );
}
