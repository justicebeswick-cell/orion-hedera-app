import { useEffect, useState } from "react";

const WORDS = ["World", "Future", "Hedera"];

/** "Hello" stays fixed; the word after it cycles with a soft rise-and-fade. */
export function HelloGreeting() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), 2600);
    return () => window.clearInterval(t);
  }, []);
  return (
    <h1 className="hello-line" aria-label={`Hello ${WORDS[i]}`}>
      <span>Hello</span>
      <span className="hello-word-slot" aria-hidden="true">
        {WORDS.map((w, n) => (
          <span key={w} className={`hello-word ${n === i ? "is-on" : ""}`}>{w}</span>
        ))}
        <span className="invisible">Future</span>
      </span>
    </h1>
  );
}
