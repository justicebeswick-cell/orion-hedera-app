import { useEffect, useState } from "react";
import helloHAsset from "@/assets/hello-hbar-h.png.asset.json";

const WORDS = ["World", "Future", "Hedera"];
// The upload's H sits inside a padded frame (124x133 at a 4px pad); scale from
// the glyph's true width so the logo aligns with the text cap height.
const GLYPH_W = 124;
const GLYPH_H = 133;
const CAP_EM = 0.74; // matches the cap height of the light-weight greeting text

/** "Hello" stays fixed with the Hedera H logo as its H; the word after it cycles. */
export function HelloGreeting() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), 2600);
    return () => window.clearInterval(t);
  }, []);
  return (
    <h1 className="hello-line" aria-label={`Hello ${WORDS[i]}`}>
      <span aria-hidden="true" className="inline-flex items-baseline">
        <img
          src={helloHAsset.url}
          alt=""
          className="hello-hbar-h"
          style={{
            height: `calc(${CAP_EM}em * ${GLYPH_H / (GLYPH_H - 8)})`,
            width: `calc(${CAP_EM}em * ${GLYPH_H / (GLYPH_H - 8)} * ${GLYPH_W / GLYPH_H})`,
          }}
          decoding="async"
          draggable={false}
        />
        <span>ello</span>
      </span>
      <span className="hello-word-slot" aria-hidden="true">
        {WORDS.map((w, n) => (
          <span key={w} className={`hello-word ${n === i ? "is-on" : ""}`}>{w}</span>
        ))}
        <span className="invisible">Future</span>
      </span>
    </h1>
  );
}
