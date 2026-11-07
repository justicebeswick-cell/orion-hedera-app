import lettering from "@/assets/orion-lettering.png";

export function OrionName({ className = "" }: { className?: string }) {
  return <img src={lettering} alt="Orion" width={1065} height={195} className={`block max-w-full shrink-0 object-contain ${className}`} />;
}