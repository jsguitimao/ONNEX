import { del } from "@vercel/blob";
import { captureException } from "@/lib/observability";

// Assets carregados pela app vivem no Vercel Blob, cujo host publico e
// `<storeId>.public.blob.vercel-storage.com`. So apagamos URLs deste dominio:
// avatares do Clerk (`img.clerk.com`), links externos (Instagram, etc.) e
// data:/blob: locais nao nos pertencem e nao devem ser tocados.
const MANAGED_BLOB_HOST = "blob.vercel-storage.com";
const MANAGED_BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

const DELETE_BATCH_SIZE = 100;

export function isManagedBlobUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  return host === MANAGED_BLOB_HOST || host.endsWith(MANAGED_BLOB_HOST_SUFFIX);
}

function addUrl(target: Set<string>, value: unknown) {
  if (isManagedBlobUrl(value)) {
    target.add(value.trim());
  }
}

function addJsonArrayUrls(target: Set<string>, value: unknown) {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    addUrl(target, item);
  }
}

export type ErasableBusinessAssets = {
  logoUrl?: unknown;
  coverImageUrl?: unknown;
  bookingPage?: {
    heroImageUrl?: unknown;
    heroPosterUrl?: unknown;
    galleryImages?: unknown;
  } | null;
  staffMembers?: ReadonlyArray<{
    avatarUrl?: unknown;
    portfolioImages?: unknown;
  }> | null;
};

/**
 * Recolhe todos os URLs de assets que vivem no nosso Blob a partir dos negocios
 * de um utilizador. Devolve uma lista deduplicada, ignorando qualquer URL que
 * nao seja do Vercel Blob (ex.: avatar do Clerk, links externos).
 *
 * Tem de correr ANTES da cascata de DB apagar as rows que referenciam estes
 * URLs, caso contrario perde-se a referencia e os ficheiros ficam orfaos.
 */
export function collectBusinessAssetUrls(
  businesses: ReadonlyArray<ErasableBusinessAssets>,
): string[] {
  const urls = new Set<string>();

  for (const business of businesses) {
    addUrl(urls, business.logoUrl);
    addUrl(urls, business.coverImageUrl);

    if (business.bookingPage) {
      addUrl(urls, business.bookingPage.heroImageUrl);
      addUrl(urls, business.bookingPage.heroPosterUrl);
      addJsonArrayUrls(urls, business.bookingPage.galleryImages);
    }

    for (const staff of business.staffMembers ?? []) {
      addUrl(urls, staff.avatarUrl);
      addJsonArrayUrls(urls, staff.portfolioImages);
    }
  }

  return [...urls];
}

export type BlobCleanupResult = {
  requested: number;
  deleted: number;
  failed: number;
};

/**
 * Apaga assets do Blob em lotes, best-effort. Filtra por seguranca para so
 * tocar em URLs geridos por nos. Nunca lanca: uma falha de cleanup nao deve
 * reverter uma erasure de conta que ja removeu os dados da base de dados.
 */
export async function deleteManagedBlobs(
  urls: ReadonlyArray<string>,
): Promise<BlobCleanupResult> {
  const managed = [...new Set(urls.filter(isManagedBlobUrl))];
  const result: BlobCleanupResult = {
    requested: managed.length,
    deleted: 0,
    failed: 0,
  };

  if (managed.length === 0) {
    return result;
  }

  for (let i = 0; i < managed.length; i += DELETE_BATCH_SIZE) {
    const batch = managed.slice(i, i + DELETE_BATCH_SIZE);
    try {
      await del(batch);
      result.deleted += batch.length;
    } catch (error) {
      result.failed += batch.length;
      captureException("account.delete.blob_cleanup_failed", error, {
        batchSize: batch.length,
      });
    }
  }

  return result;
}
