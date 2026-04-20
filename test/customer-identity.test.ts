import { describe, expect, it } from "vitest";
import {
  normalizeCustomerEmail,
  normalizeCustomerName,
  normalizeCustomerPhone,
  sanitizeBookingCustomerInput,
} from "@/lib/customer-identity";

describe("normalizeCustomerName", () => {
  it("trims whitespace", () => {
    expect(normalizeCustomerName("  João Silva  ")).toBe("João Silva");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeCustomerName("João   Silva")).toBe("João Silva");
  });

  it("returns 'Cliente' for empty string", () => {
    expect(normalizeCustomerName("")).toBe("Cliente");
    expect(normalizeCustomerName("   ")).toBe("Cliente");
  });
});

describe("normalizeCustomerEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeCustomerEmail("  CLIENTE@Example.COM ")).toBe("cliente@example.com");
  });

  it("returns null for empty/undefined", () => {
    expect(normalizeCustomerEmail("")).toBeNull();
    expect(normalizeCustomerEmail(null)).toBeNull();
    expect(normalizeCustomerEmail(undefined)).toBeNull();
  });
});

describe("normalizeCustomerPhone", () => {
  it("strips non-digit characters but keeps + prefix", () => {
    expect(normalizeCustomerPhone(" +351 912-345-678 ")).toBe("+351912345678");
  });

  it("handles phone without + prefix", () => {
    expect(normalizeCustomerPhone("912 345 678")).toBe("912345678");
  });

  it("returns null for empty/whitespace", () => {
    expect(normalizeCustomerPhone("  ")).toBeNull();
    expect(normalizeCustomerPhone(null)).toBeNull();
    expect(normalizeCustomerPhone(undefined)).toBeNull();
  });
});

describe("sanitizeBookingCustomerInput", () => {
  it("normalizes all fields together", () => {
    const result = sanitizeBookingCustomerInput({
      fullName: "  Maria   Costa  ",
      email: "  MARIA@TEST.COM  ",
      phone: "+351 912 345 678",
    });
    expect(result.fullName).toBe("Maria Costa");
    expect(result.email).toBe("maria@test.com");
    expect(result.phone).toBe("+351912345678");
  });

  it("uses fallback name and nulls for missing data", () => {
    const result = sanitizeBookingCustomerInput({
      fullName: "   ",
      email: undefined,
      phone: undefined,
    });
    expect(result.fullName).toBe("Cliente");
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });
});
