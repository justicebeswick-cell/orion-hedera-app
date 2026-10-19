import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ bio: vi.fn(), claim: vi.fn() }));
vi.mock("@/lib/signer", () => ({ signMode: () => ({ kind: "device" }) }));
vi.mock("@/lib/biometric", () => ({ bioEnrolled: () => true, bioPassphrase: mock.bio }));
vi.mock("@/lib/staking", () => ({ claimStakingRewards: mock.claim }));
import { ClaimRewards } from "@/components/claim-rewards";

afterEach(() => vi.clearAllMocks());
describe("Biometric reward approval", () => {
  it("uses the biometric-unlocked passphrase to sign and displays the confirmed payout", async () => {
    mock.bio.mockResolvedValue("locally-unlocked-passphrase");
    mock.claim.mockResolvedValue({ txId: "0.0.123@1.0", timestamp: "123.0", paidTinybar: 12345678 });
    const root = createRootRoute({ component: () => <QueryClientProvider client={new QueryClient()}><ClaimRewards accountId="0.0.123" pendingReward={12345678} /></QueryClientProvider> });
    const router = createRouter({ routeTree: root });
    await router.load();
    render(<RouterProvider router={router} />);
    fireEvent.click(await screen.findByRole("button", { name: /Claim rewards:/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Claim with Face ID/ }));
    await waitFor(() => expect(mock.claim).toHaveBeenCalledWith("0.0.123", "locally-unlocked-passphrase"));
    expect(await screen.findByRole("status")).toHaveTextContent("Claimed 0.12345678 ℏ");
  });
});