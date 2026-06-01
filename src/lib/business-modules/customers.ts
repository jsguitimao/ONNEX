import type { Prisma } from "@prisma/client";
import { sanitizeBookingCustomerInput } from "@/lib/customer-identity";
import { db } from "@/lib/db";

type PrismaClientLike = typeof db | Prisma.TransactionClient;

async function findCustomerByNormalizedPhone(
  businessId: string,
  phone: string,
  client: PrismaClientLike = db
) {
  return client.customer.findFirst({
    where: {
      businessId,
      phone,
    },
    orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function upsertBookingCustomer(
  input: {
    businessId: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    lastBookedAt: Date;
  },
  client: PrismaClientLike = db
) {
  const sanitized = sanitizeBookingCustomerInput({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  });

  let existingCustomer = null;

  if (sanitized.email) {
    existingCustomer = await client.customer.findFirst({
      where: {
        businessId: input.businessId,
        email: {
          equals: sanitized.email,
          mode: "insensitive",
        },
      },
      orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  if (!existingCustomer && sanitized.phone) {
    existingCustomer = await findCustomerByNormalizedPhone(input.businessId, sanitized.phone, client);
  }

  if (!existingCustomer) {
    return client.customer.create({
      data: {
        businessId: input.businessId,
        fullName: sanitized.fullName,
        email: sanitized.email,
        phone: sanitized.phone,
        lastBookedAt: input.lastBookedAt,
      },
    });
  }

  const nextLastBookedAt =
    existingCustomer.lastBookedAt && existingCustomer.lastBookedAt > input.lastBookedAt
      ? existingCustomer.lastBookedAt
      : input.lastBookedAt;

  return client.customer.update({
    where: { id: existingCustomer.id },
    data: {
      fullName: sanitized.fullName,
      email: sanitized.email ?? existingCustomer.email,
      phone: sanitized.phone ?? existingCustomer.phone,
      lastBookedAt: nextLastBookedAt,
    },
  });
}
