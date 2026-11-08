import { afterEach, describe, expect, it } from "vitest";
import { setCurrencyRates } from "@/lib/display-currency";
import { fmtUsdParts, setRound } from "@/lib/display";
import { savePreferences } from "@/lib/preferences";
import { totalInHbar } from "@/lib/portfolio";
import { saveSecurityPreferences } from "@/lib/security-preferences";

afterEach(() => localStorage.clear());

describe("Portfolio balance display", () => {
  it("splits the big figures from the cents", () => {
    setRound(false);
    expect(fmtUsdParts(20946.81)).toEqual({ main: "$20,946", frac: ".81" });
  });

  it("keeps cents on amounts under one dollar", () => {
    setRound(false);
    expect(fmtUsdParts(0.42)).toEqual({ main: "$0", frac: ".4200" });
  });

  it("drops the cents when decimals are hidden", () => {
    setRound(true);
    expect(fmtUsdParts(20946.81)).toEqual({ main: "$20,946", frac: "" });
  });

  it("hides the amount when balances are hidden", () => {
    saveSecurityPreferences({ hideBalance: true });
    expect(fmtUsdParts(20946.81)).toEqual({ main: "••••", frac: "" });
  });

  it("uses the currency chosen in settings", () => {
    setCurrencyRates({ EUR: 0.9 });
    savePreferences({ currency: "EUR" });
    expect(fmtUsdParts(100)).toEqual({ main: "€90", frac: ".00" });
  });

  it("adds every priced token to the HBAR balance", () => {
    expect(totalInHbar(100, [{ inHbar: 20.5 }, { inHbar: null }])).toBe(120.5);
  });

  it("stays unknown until the HBAR balance is known", () => {
    expect(totalInHbar(null, [{ inHbar: 20.5 }])).toBeNull();
  });
});
