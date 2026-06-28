"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openCustomerPortalAction } from "@/app/billing/actions";

type Props = {
  label?: string;
  variant?: "default" | "outline";
  size?: "default" | "lg";
  fullWidth?: boolean;
};

export function ManageSubscriptionButton({
  label = "Gerir subscrição",
  variant = "outline",
  size = "default",
  fullWidth = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const result = await openCustomerPortalAction();
    if (result.ok) {
      window.location.href = result.url;
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className={fullWidth ? "flex w-full flex-col items-center gap-2" : "flex flex-col items-end gap-1"}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={loading}
        className={fullWidth ? "w-full" : undefined}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        {loading ? "A abrir…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
