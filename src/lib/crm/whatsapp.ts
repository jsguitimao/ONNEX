import { db } from "@/lib/db";

export type WhatsappConfig = {
  whatsappNumber: string | null;
  reminderLeadMinutes: number | null;
};

export async function getWhatsappConfig(businessId: string): Promise<WhatsappConfig> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { whatsappNumber: true, reminderLeadMinutes: true },
  });
  return {
    whatsappNumber: business?.whatsappNumber ?? null,
    reminderLeadMinutes: business?.reminderLeadMinutes ?? null,
  };
}

export async function updateWhatsappConfig(
  businessId: string,
  data: WhatsappConfig,
): Promise<void> {
  await db.business.update({
    where: { id: businessId },
    data: {
      whatsappNumber: data.whatsappNumber,
      reminderLeadMinutes: data.reminderLeadMinutes,
    },
  });
}
