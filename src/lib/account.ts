import { useEffect, useState } from "react";

export type KycStatus = "none" | "pending" | "approved" | "rejected" | "retry";
const KEY = "aurion.account";

/** Account binding for this device. */
export function useAccount() {
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const cur = localStorage.getItem(KEY);
    setId(cur);
    if (cur) import("./keystore").then((k) => k.rememberAccount(cur));
    setReady(true);
  }, []);
  const bind = (v: string | null) => {
    if (v) { localStorage.setItem(KEY, v); import("./keystore").then((k) => k.rememberAccount(v)); }
    else localStorage.removeItem(KEY);
    setId(v);
  };
  // Identity verification is not connected yet, so status is always "none".
  const kyc: KycStatus = "none";
  return { id, ready, bind, kyc };
}
