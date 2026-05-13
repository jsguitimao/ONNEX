import { db } from "@/lib/db";

export type CrmAutomationConfig = {
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  confirmationToleranceMinutes: number;
};

export const DEFAULT_AUTOMATION: CrmAutomationConfig = {
  reminderEnabled: true,
  reminderMinutesBefore: 30,
  confirmationToleranceMinutes: 10,
};

type AutomationRow = {
  businessId: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  confirmationToleranceMinutes: number;
};

type AutomationSelect = {
  reminderEnabled: true;
  reminderMinutesBefore: true;
  confirmationToleranceMinutes: true;
};

type BusinessAutomationDelegate = {
  findUnique(args: {
    where: { businessId: string };
    select: AutomationSelect;
  }): Promise<Omit<AutomationRow, "businessId"> | null>;
  findMany(args: {
    where: { businessId: { in: string[] } } | { reminderEnabled: true };
    select: AutomationSelect & { businessId: true };
  }): Promise<AutomationRow[]>;
  upsert(args: {
    where: { businessId: string };
    create: AutomationRow;
    update: Omit<AutomationRow, "businessId">;
    select: AutomationSelect;
  }): Promise<Omit<AutomationRow, "businessId">>;
};

/**
 * Pode devolver `null` quando o cliente Prisma ainda não foi regenerado depois
 * das migrations (caso típico em ambiente local onde o `next dev` mantém o
 * engine carregado e bloqueia `prisma generate`).
 *
 * Quando devolve `null`, todas as funções abaixo caem no comportamento default
 * — equivalente a "lembretes ligados com timings padrão" — para a página
 * continuar a funcionar.
 */
function getDelegate(): BusinessAutomationDelegate | null {
  const delegate = (db as unknown as { businessAutomation?: BusinessAutomationDelegate })
    .businessAutomation;
  return delegate ?? null;
}

function isMissingTableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  if (code === "P2021") return true;
  return /does not exist|relation .* does not exist/i.test(error.message);
}

function fromRow(row: Omit<AutomationRow, "businessId">): CrmAutomationConfig {
  return {
    reminderEnabled: row.reminderEnabled,
    reminderMinutesBefore: row.reminderMinutesBefore,
    confirmationToleranceMinutes: row.confirmationToleranceMinutes,
  };
}

/**
 * Devolve a configuração de automação do negócio. Se ainda não existe registo
 * (negócios criados antes desta feature), devolvemos o default seguro.
 */
export async function getBusinessAutomation(businessId: string): Promise<CrmAutomationConfig> {
  const delegate = getDelegate();
  if (!delegate) return DEFAULT_AUTOMATION;
  try {
    const row = await delegate.findUnique({
      where: { businessId },
      select: {
        reminderEnabled: true,
        reminderMinutesBefore: true,
        confirmationToleranceMinutes: true,
      },
    });
    if (!row) return DEFAULT_AUTOMATION;
    return fromRow(row);
  } catch (error) {
    if (isMissingTableError(error)) return DEFAULT_AUTOMATION;
    throw error;
  }
}

export async function getBusinessAutomationMap(
  businessIds: string[],
): Promise<Map<string, CrmAutomationConfig>> {
  if (businessIds.length === 0) return new Map();
  const delegate = getDelegate();
  if (!delegate) return new Map();
  try {
    const rows = await delegate.findMany({
      where: { businessId: { in: businessIds } },
      select: {
        businessId: true,
        reminderEnabled: true,
        reminderMinutesBefore: true,
        confirmationToleranceMinutes: true,
      },
    });
    const map = new Map<string, CrmAutomationConfig>();
    for (const row of rows) {
      map.set(row.businessId, fromRow(row));
    }
    return map;
  } catch (error) {
    if (isMissingTableError(error)) return new Map();
    throw error;
  }
}

export class CrmAutomationUnavailableError extends Error {
  constructor() {
    super("Configuração de automação ainda não está disponível neste ambiente.");
  }
}

export async function updateBusinessAutomation(
  businessId: string,
  patch: Partial<Omit<CrmAutomationConfig, never>>,
): Promise<CrmAutomationConfig> {
  const delegate = getDelegate();
  if (!delegate) throw new CrmAutomationUnavailableError();
  const current = await getBusinessAutomation(businessId);
  const next: CrmAutomationConfig = { ...current, ...patch };
  try {
    const row = await delegate.upsert({
      where: { businessId },
      create: { businessId, ...next },
      update: next,
      select: {
        reminderEnabled: true,
        reminderMinutesBefore: true,
        confirmationToleranceMinutes: true,
      },
    });
    return fromRow(row);
  } catch (error) {
    if (isMissingTableError(error)) throw new CrmAutomationUnavailableError();
    throw error;
  }
}
