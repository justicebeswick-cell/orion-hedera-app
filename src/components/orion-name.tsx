import lettering from "@/assets/orion-lettering-subtle.png.asset.json";

export function OrionName({ className = "" }: { className?: string }) {
  return <img src={lettering.url} alt="Orion" width={1065} height={195} className={`orion-lettering block max-w-full shrink-0 object-contain ${className}`} />;
}