import { beforeEach, describe, expect, it, vi } from "vitest";

// `del` e o unico efeito externo do helper. Mockamos para verificar o que e
// pedido ao Blob sem tocar em rede/credenciais. (Prefixo `mock` exigido pelo
// hoisting de vi.mock.)
const mockDel = vi.fn();
vi.mock("@vercel/blob", () => ({
  del: (urls: string[] | string) => mockDel(urls),
}));

import {
  collectBusinessAssetUrls,
  deleteManagedBlobs,
  isManagedBlobUrl,
} from "@/lib/blob-cleanup";

const BLOB_A = "https://abc123.public.blob.vercel-storage.com/media/logo.png";
const BLOB_B = "https://abc123.public.blob.vercel-storage.com/media/hero.jpg";
const BLOB_C = "https://store.blob.vercel-storage.com/media/photo.webp";
const CLERK_AVATAR = "https://img.clerk.com/u/abc123";
const EXTERNAL = "https://www.instagram.com/barbearia";

describe("isManagedBlobUrl", () => {
  it("aceita URLs https do Vercel Blob", () => {
    expect(isManagedBlobUrl(BLOB_A)).toBe(true);
    expect(isManagedBlobUrl(BLOB_C)).toBe(true);
  });

  it("rejeita avatares do Clerk e links externos", () => {
    expect(isManagedBlobUrl(CLERK_AVATAR)).toBe(false);
    expect(isManagedBlobUrl(EXTERNAL)).toBe(false);
  });

  it("rejeita http, data:, blob:, vazios e nao-strings", () => {
    expect(isManagedBlobUrl("http://abc123.public.blob.vercel-storage.com/x.png")).toBe(false);
    expect(isManagedBlobUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isManagedBlobUrl("blob:https://app/uuid")).toBe(false);
    expect(isManagedBlobUrl("")).toBe(false);
    expect(isManagedBlobUrl("   ")).toBe(false);
    expect(isManagedBlobUrl(null)).toBe(false);
    expect(isManagedBlobUrl(undefined)).toBe(false);
    expect(isManagedBlobUrl(42)).toBe(false);
  });

  it("nao confunde dominio look-alike", () => {
    expect(isManagedBlobUrl("https://blob.vercel-storage.com.evil.com/x.png")).toBe(false);
  });
});

describe("collectBusinessAssetUrls", () => {
  it("recolhe todos os assets geridos e ignora os externos", () => {
    const urls = collectBusinessAssetUrls([
      {
        logoUrl: BLOB_A,
        coverImageUrl: CLERK_AVATAR, // ignorado (nao e nosso)
        bookingPage: {
          heroImageUrl: BLOB_B,
          heroPosterUrl: null,
          galleryImages: [BLOB_C, EXTERNAL, ""],
        },
        staffMembers: [
          { avatarUrl: CLERK_AVATAR, portfolioImages: [BLOB_A] },
          { avatarUrl: null, portfolioImages: null },
        ],
      },
    ]);

    expect(urls).toContain(BLOB_A);
    expect(urls).toContain(BLOB_B);
    expect(urls).toContain(BLOB_C);
    expect(urls).not.toContain(CLERK_AVATAR);
    expect(urls).not.toContain(EXTERNAL);
  });

  it("deduplica URLs repetidos entre campos/negocios", () => {
    const urls = collectBusinessAssetUrls([
      { logoUrl: BLOB_A, staffMembers: [{ portfolioImages: [BLOB_A, BLOB_A] }] },
      { coverImageUrl: BLOB_A },
    ]);

    expect(urls.filter((u) => u === BLOB_A)).toHaveLength(1);
  });

  it("lida com negocios sem bookingPage/staff", () => {
    const urls = collectBusinessAssetUrls([
      { logoUrl: null, coverImageUrl: undefined, bookingPage: null, staffMembers: null },
    ]);
    expect(urls).toEqual([]);
  });
});

describe("deleteManagedBlobs", () => {
  beforeEach(() => {
    mockDel.mockReset();
    mockDel.mockResolvedValue(undefined);
  });

  it("apaga apenas URLs geridos e devolve o sumario", async () => {
    const result = await deleteManagedBlobs([BLOB_A, BLOB_B, CLERK_AVATAR, EXTERNAL]);

    expect(mockDel).toHaveBeenCalledTimes(1);
    expect(mockDel).toHaveBeenCalledWith([BLOB_A, BLOB_B]);
    expect(result).toEqual({ requested: 2, deleted: 2, failed: 0 });
  });

  it("nao chama o Blob quando nao ha URLs geridos", async () => {
    const result = await deleteManagedBlobs([CLERK_AVATAR, EXTERNAL]);

    expect(mockDel).not.toHaveBeenCalled();
    expect(result).toEqual({ requested: 0, deleted: 0, failed: 0 });
  });

  it("conta falhas sem lancar quando o del rejeita", async () => {
    mockDel.mockRejectedValueOnce(new Error("blob 500"));

    const result = await deleteManagedBlobs([BLOB_A, BLOB_B]);

    expect(result.requested).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.deleted).toBe(0);
  });
});
