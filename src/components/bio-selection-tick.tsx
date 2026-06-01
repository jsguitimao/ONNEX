import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "card" | "photo";

type Props = {
  active: boolean;
  variant?: Variant;
};

/**
 * Affordance for selectable card-like items across the bio surface.
 * - `card` variant: assumes a white card background (gray ghost border)
 * - `photo` variant: assumes a photo background underneath (white ghost border + backdrop)
 * Selected state is identical in both: filled blue accent + white check.
 */
export function BioSelectionTick({ active, variant = "card" }: Props) {
  const isPhoto = variant === "photo";

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-out",
        isPhoto ? "size-6" : "size-[22px]",
        active
          ? "bg-[var(--bio-accent)] text-[var(--bio-accent-foreground)]"
          : isPhoto
            ? "border-[1.5px] border-white/90 bg-black/20 backdrop-blur-md"
            : "border-[1.5px] border-muted-foreground/40 bg-transparent",
      )}
    >
      <Check
        className={cn(
          "transition-all duration-200 ease-out",
          isPhoto ? "size-3.5" : "size-3",
          active ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
        strokeWidth={3}
      />
    </span>
  );
}
