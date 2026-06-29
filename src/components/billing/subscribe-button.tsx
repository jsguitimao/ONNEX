"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startProCheckoutAction } from "@/app/billing/actions";
import type { PlanId } from "@/lib/stripe";

export function SubscribeButton({
  label = "Começar 7 dias grátis",
  plan = "monthly",
  variant = "default",
}: {
  label?: string;
  plan?: PlanId;
  variant?: "default" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const result = await startProCheckoutAction(plan);
    if (result.ok) {
      window.location.href = result.url;
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" variant={variant} onClick={handleClick} disabled={loading} size="lg" className="w-full">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {loading ? "A abrir pagamento…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
