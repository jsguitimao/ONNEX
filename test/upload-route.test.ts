import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

const h = vi.hoisted(() => ({
  getCurrentBusiness: vi.fn(async () => ({ id: "biz_1" })),
  handleUpload: vi.fn(),
}));

vi.mock("@/lib/business-modules/core", () => ({
  getCurrentBusiness: h.getCurrentBusiness,
}));

vi.mock("@vercel/blob/client", () => ({
  handleUpload: h.handleUpload,
}));

import { POST } from "@/app/api/upload/route";

function uploadRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://www.onnex.pt/api/upload", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const generateTokenBody = {
  type: "blob.generate-client-token",
  payload: {
    pathname: "hero.jpg",
    callbackUrl: "https://www.onnex.pt/api/upload",
    clientPayload: null,
    multipart: false,
  },
};

afterEach(() => {
  vi.clearAllMocks();
  resetRateLimitStoreForTests();
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("POST /api/upload", () => {
  it("rejects client token generation without an origin signal", async () => {
    h.handleUpload.mockResolvedValue({ type: "blob.generate-client-token", clientToken: "tok" });

    const response = await POST(uploadRequest(generateTokenBody));

    expect(response.status).toBe(403);
    expect(h.handleUpload).not.toHaveBeenCalled();
  });

  it("keeps Vercel Blob completion callbacks unblocked by browser-origin checks", async () => {
    h.handleUpload.mockResolvedValue({ type: "blob.upload-completed", response: "ok" });

    const response = await POST(
      uploadRequest({
        type: "blob.upload-completed",
        payload: {
          blob: {
            url: "https://example.public.blob.vercel-storage.com/hero.jpg",
            pathname: "hero.jpg",
            contentType: "image/jpeg",
            size: 1024,
          },
          tokenPayload: JSON.stringify({ businessId: "biz_1" }),
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(h.handleUpload).toHaveBeenCalledTimes(1);
  });

  it("generates narrow content-type permissions from the file extension", async () => {
    h.handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      const tokenOptions = await onBeforeGenerateToken("cover.png", null, false);
      return { type: "blob.generate-client-token", tokenOptions };
    });

    const response = await POST(
      uploadRequest(generateTokenBody, {
        origin: "https://www.onnex.pt",
        "sec-fetch-site": "same-origin",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.tokenOptions.allowedContentTypes).toEqual(["image/png"]);
    expect(payload.tokenOptions.maximumSizeInBytes).toBe(10 * 1024 * 1024);
  });

  it("rejects unsupported or path-traversal upload names", async () => {
    h.handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      await onBeforeGenerateToken("../shell.php", null, false);
    });

    const response = await POST(
      uploadRequest(generateTokenBody, {
        origin: "https://www.onnex.pt",
        "sec-fetch-site": "same-origin",
      }),
    );

    expect(response.status).toBe(400);
  });
});
