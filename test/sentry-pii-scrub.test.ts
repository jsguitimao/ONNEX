import { describe, expect, it } from "vitest";

import {
  EMAIL_MASK,
  CIRCULAR_MASK,
  PHONE_MASK,
  VALUE_MASK,
  scrubPii,
  scrubString,
} from "@/lib/scrub-pii";
import { getClientSentryOptions, getServerSentryOptions } from "@/lib/sentry-options";

describe("scrubString mascara PII por valor", () => {
  it("mascara telefone E.164 isolado", () => {
    expect(scrubString("+351912345678")).toBe(PHONE_MASK);
  });

  it("mascara telefone embutido numa mensagem livre", () => {
    expect(scrubString("Falha ao enviar para +351912345678 via Twilio")).toBe(
      `Falha ao enviar para ${PHONE_MASK} via Twilio`,
    );
  });

  it("mascara emails", () => {
    expect(scrubString("contacto: cliente@example.com")).toBe(`contacto: ${EMAIL_MASK}`);
  });

  it("mascara telefone E email na mesma string", () => {
    const out = scrubString("cliente@example.com / +14155552671");
    expect(out).toBe(`${EMAIL_MASK} / ${PHONE_MASK}`);
  });

  it("NÃO mascara sequências curtas demais para serem E.164 (<8 dígitos)", () => {
    expect(scrubString("ref +1234567")).toBe("ref +1234567");
  });
});

describe("scrubPii percorre objetos em profundidade", () => {
  it("mascara telefone em context/extra preservando bookingId e businessId", () => {
    const scrubbed = scrubPii({
      bookingId: "bk_abc123",
      businessId: "biz_xyz789",
      recipient: "+351912345678",
      customerEmail: "cliente@example.com",
    });

    // IDs de domínio mantêm-se intactos — são essenciais para triagem.
    expect(scrubbed.bookingId).toBe("bk_abc123");
    expect(scrubbed.businessId).toBe("biz_xyz789");
    // PII por valor é mascarada.
    expect(scrubbed.recipient).toBe(PHONE_MASK);
    expect(scrubbed.customerEmail).toBe(EMAIL_MASK);
  });

  it("redige tokens públicos e idempotency keys por nome de campo", () => {
    const scrubbed = scrubPii({
      bookingId: "bk_1",
      publicToken: "tok_live_abc",
      idempotencyKey: "idem_9f8e7d",
      authorization: "Bearer super-secret",
    });

    expect(scrubbed.bookingId).toBe("bk_1");
    expect(scrubbed.publicToken).toBe(VALUE_MASK);
    expect(scrubbed.idempotencyKey).toBe(VALUE_MASK);
    expect(scrubbed.authorization).toBe(VALUE_MASK);
  });

  it("desce em objetos e arrays aninhados", () => {
    const scrubbed = scrubPii({
      businessId: "biz_1",
      nested: {
        phone: "+14155552671",
        note: "liga para +351912000111",
      },
      recipients: ["+351912345678", "outro@example.com"],
    });

    expect(scrubbed.businessId).toBe("biz_1");
    expect(scrubbed.nested.phone).toBe(PHONE_MASK);
    expect(scrubbed.nested.note).toBe(`liga para ${PHONE_MASK}`);
    expect(scrubbed.recipients).toEqual([PHONE_MASK, EMAIL_MASK]);
  });

  it("aguenta referências cíclicas sem entrar em loop", () => {
    const cyclic: Record<string, unknown> = { bookingId: "bk_1", phone: "+351912345678" };
    cyclic.self = cyclic;

    const scrubbed = scrubPii(cyclic) as Record<string, unknown>;
    expect(scrubbed.bookingId).toBe("bk_1");
    expect(scrubbed.phone).toBe(PHONE_MASK);
    expect(scrubbed.self).toBe(CIRCULAR_MASK);
  });
});

describe("opções do Sentry desligam PII e aplicam o scrub final", () => {
  it("sendDefaultPii é false no servidor e no cliente", () => {
    expect(getServerSentryOptions().sendDefaultPii).toBe(false);
    expect(getClientSentryOptions().sendDefaultPii).toBe(false);
  });

  it("beforeSend mascara message/extra/contexts mas mantém os IDs", () => {
    const { beforeSend } = getServerSentryOptions();

    // O evento que o Sentry passaria ao beforeSend; só nos interessam os campos
    // que carregam PII, por isso usamos uma forma parcial.
    const event = {
      message: "envio falhou para +351912345678",
      extra: {
        recipient: "+351912345678",
        bookingId: "bk_42",
        businessId: "biz_42",
        idempotencyKey: "idem_xyz",
      },
      contexts: {
        booking: { value: "cliente@example.com" },
      },
    } as never;

    const scrubbed = beforeSend!(event, {} as never) as {
      message: string;
      extra: Record<string, unknown>;
      contexts: { booking: { value: string } };
    };

    expect(scrubbed.message).toBe(`envio falhou para ${PHONE_MASK}`);
    expect(scrubbed.extra.recipient).toBe(PHONE_MASK);
    expect(scrubbed.extra.idempotencyKey).toBe(VALUE_MASK);
    expect(scrubbed.extra.bookingId).toBe("bk_42");
    expect(scrubbed.extra.businessId).toBe("biz_42");
    expect(scrubbed.contexts.booking.value).toBe(EMAIL_MASK);
  });
});
