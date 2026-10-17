import { useEffect, useState } from "react";

/** Company that hosts each mainnet node → its website, used for the logo. */
const DOMAINS: [RegExp, string][] = [
  [/\bLG\b/, "lg.com"], [/Swirlds/, "swirlds.com"], [/Nomura/, "nomura.com"], [/Google/, "google.com"],
  [/Zain/, "zain.com"], [/Magalu/, "magazineluiza.com.br"], [/DLA Piper/, "dlapiper.com"],
  [/Tata Comm/, "tatacommunications.com"], [/IBM/, "ibm.com"], [/Deutsche Telekom/, "telekom.com"],
  [/Dentons/, "dentons.com"], [/Australian Payments/, "auspayplus.com.au"], [/EDF/, "edf.fr"],
  [/Shinhan/, "shinhan.com"], [/Chainlink/, "chain.link"], [/LSE/, "lse.ac.uk"], [/IIT Madras/, "iitm.ac.in"],
  [/Ubisoft/, "ubisoft.com"], [/Aberdeen/, "aberdeeninvestments.com"], [/Mondel/, "mondelezinternational.com"],
  [/BitGo/, "bitgo.com"], [/Arrow/, "arrow.com"], [/Nairobi Securities/, "nse.co.ke"],
  [/Blockchain for Energy/, "blockchainforenergy.net"], [/Repsol/, "repsol.com"], [/McLaren/, "mclaren.com"],
  [/FedEx/, "fedex.com"], [/Accenture/, "accenture.com"], [/Dell/, "dell.com"], [/Standard Bank/, "standardbank.com"],
  [/Boeing/, "boeing.com"], [/Wipro/, "wipro.com"], [/Ubs|UBS/, "ubs.com"], [/Hitachi/, "hitachi.com"],
];

export const nodeCompany = (desc?: string) => desc?.match(/Hosted by ([^|]+)/)?.[1]?.trim() ?? "";

const logoAssets = import.meta.glob<{ default: { url: string } }>("../assets/nodes/*.asset.json", { eager: true });

export function NodeLogo({ description, size = 48 }: { description?: string | undefined; size?: number }) {
  const [broken, setBroken] = useState(false);
  const domain = DOMAINS.find(([re]) => re.test(description ?? ""))?.[1];
  const name = nodeCompany(description) || "?";
  const asset = domain ? logoAssets[`../assets/nodes/${domain}.png.asset.json`]?.default : undefined;
  useEffect(() => setBroken(false), [domain]);
  const box = { width: size, height: size };
  if (!asset || broken)
    return (
      <span style={box} className="flex shrink-0 items-center justify-center font-display text-xl font-medium text-muted-foreground">
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  return (
    <span style={box} className="flex shrink-0 items-center justify-center">
      <img src={asset.url} alt={`${name} logo`} loading="lazy"
        className="node-logo-image h-full w-full object-contain" onError={() => setBroken(true)} />
    </span>
  );
}
