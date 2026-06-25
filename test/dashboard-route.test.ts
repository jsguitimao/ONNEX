import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  getCurrentBusiness: vi.fn(async () => ({ id: "biz_1" })),
  loadEditorDraft: vi.fn(async () => ({ ok: true })),
  saveEditorDraft: vi.fn(async () => undefined),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: h.auth,
}));

// revalidatePath exige o store de geração estática do Next, ausente quando o
// handler é chamado diretamente no teste. Mockamos para no-op.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/business-modules/core", () => ({
  getCurrentBusiness: h.getCurrentBusiness,
}));

vi.mock("@/lib/page-editor/load", () => ({
  loadEditorDraft: h.loadEditorDraft,
}));

vi.mock("@/lib/page-editor/save", async () => {
  const actual = await vi.importActual<typeof import("@/lib/page-editor/save")>(
    "@/lib/page-editor/save",
  );
  return {
    ...actual,
    saveEditorDraft: h.saveEditorDraft,
  };
});

import { GET, PUT } from "@/app/api/dashboard/route";

const validDraft = {
  name: "Barbearia",
  slug: "barbearia",
  city: "Lisboa",
  headline: "Cortes",
  description: "",
  theme: "dark",
  onlineBooking: true,
  showTeam: true,
  showPrices: true,
  showDurations: true,
  hero: null,
  phone: "",
  whatsappEnabled: true,
  instagramUrl: "",
  tiktokUrl: "",
  facebookUrl: "",
  mapsAddress: "",
  seoTitle: "",
  seoDescription: "",
  services: [],
  staffMembers: [],
  galleryImages: [],
};

function putRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://www.onnex.pt/api/dashboard", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
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

describe("/api/dashboard", () => {
  it("requires authentication for reads", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: false });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(h.loadEditorDraft).not.toHaveBeenCalled();
  });

  it("rejects authenticated writes without origin signals", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true });

    const response = await PUT(putRequest(validDraft));

    expect(response.status).toBe(403);
    expect(h.saveEditorDraft).not.toHaveBeenCalled();
  });

  it("rejects cross-origin authenticated writes", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true });

    const response = await PUT(
      putRequest(validDraft, {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(h.saveEditorDraft).not.toHaveBeenCalled();
  });

  it("saves same-origin authenticated writes", async () => {
    h.auth.mockResolvedValue({ isAuthenticated: true });

    const response = await PUT(
      putRequest(validDraft, {
        origin: "https://www.onnex.pt",
        "sec-fetch-site": "same-origin",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(h.saveEditorDraft).toHaveBeenCalledWith("biz_1", expect.objectContaining({
      slug: "barbearia",
    }));
  });
});
