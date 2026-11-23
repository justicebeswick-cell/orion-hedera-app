import lettering from "@/assets/orion-lettering-complete.png";
import { useId } from "react";

export function OrionName({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return <span role="img" aria-label="Orion" className={`orion-lettering pointer-events-none block max-w-full shrink-0 ${className}`}>
    <svg viewBox="0 0 1065 195" width="1065" height="195" aria-hidden="true" className="block !h-auto !w-full aspect-[1065/195]">
    <defs>
      <linearGradient id={`${id}-shade`}>
        <stop offset="0%" stopColor="white" />
        <stop offset="58%" stopColor="white" />
        <stop offset="59.5%" stopColor="white" stopOpacity="0.38" />
        <stop offset="63%" stopColor="white" stopOpacity="0.78" />
        <stop offset="68%" stopColor="white" />
        <stop offset="100%" stopColor="white" />
      </linearGradient>
      <mask id={`${id}-o`}><rect width="1065" height="195" fill={`url(#${id}-shade)`} /></mask>
    </defs>
    <image href={lettering} width="1065" height="195" mask={`url(#${id}-o)`} />
    </svg>
  </span>;
}