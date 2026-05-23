import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: h.auth,
}));

vi.mock("@/lib/account-data", () => ({
  deleteAccount: h.deleteAccount,
}));

import { POST } from "@/app/api/account/delete/route";

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://www.onnex.pt/api/account/delete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.onnex.pt",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  resetRateLimitStoreForTests();
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("POST /api/account/delete", () => {
  it("requires authentication", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: false, userId: null });

    const response = await POST(request({ confirmation: "APAGAR CONTA" }));

    expect(response.status).toBe(401);
    expect(h.deleteAccount).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true, userId: "user_1" });

    const response = await POST(
      request(
        { confirmation: "APAGAR CONTA" },
        { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      ),
    );

    expect(response.status).toBe(403);
    expect(h.deleteAccount).not.toHaveBeenCalled();
  });

  it("requires the exact confirmation phrase", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true, userId: "user_1" });

    const response = await POST(request({ confirmation: "apagar conta" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_CONFIRMATION");
    expect(h.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the account when authenticated and confirmed", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true, userId: "user_1" });
    h.deleteAccount.mockResolvedValue(undefined);

    const response = await POST(request({ confirmation: "APAGAR CONTA" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(h.deleteAccount).toHaveBeenCalledTimes(1);
  });

  it("rate limits repeated delete attempts per user", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true, userId: "user_1" });
    h.deleteAccount.mockResolvedValue(undefined);

    await POST(request({ confirmation: "APAGAR CONTA" }));
    await POST(request({ confirmation: "APAGAR CONTA" }));
    await POST(request({ confirmation: "APAGAR CONTA" }));
    const response = await POST(request({ confirmation: "APAGAR CONTA" }));

    expect(response.status).toBe(429);
    expect(h.deleteAccount).toHaveBeenCalledTimes(3);
  });
});
