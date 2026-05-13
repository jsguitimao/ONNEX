import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (value == null ? undefined : typeof value === "string" ? value.trim() : value),
    z.string().max(max).optional().default(""),
  );

const optionalEmail = z.preprocess(
  (value) => (value == null ? undefined : typeof value === "string" ? value.trim() : value),
  z
    .string()
    .max(120)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "Email inválido",
    })
    .optional()
    .default(""),
);

const optionalPhone = z.preprocess(
  (value) => (value == null ? undefined : typeof value === "string" ? value.trim() : value),
  z
    .string()
    .max(30)
    .refine((v) => v === "" || /^[+()\-\s\d]{6,30}$/.test(v), {
      message: "Telefone inválido",
    })
    .optional()
    .default(""),
);

export const createCustomerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Nome obrigatório").max(80),
    email: optionalEmail,
    phone: optionalPhone,
    notes: optionalString(280),
  })
  .refine((value) => value.email !== "" || value.phone !== "", {
    message: "Indica pelo menos email ou telefone",
    path: ["phone"],
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
